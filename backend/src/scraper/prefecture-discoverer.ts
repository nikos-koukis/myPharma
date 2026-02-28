/**
 * Prefecture city discoverer
 * Dynamically discovers cities from prefecture pages on xo.gr
 */

import * as cheerio from 'cheerio';
import { fetchPage } from './hybrid-fetcher';
import { CityConfig, PrefectureConfig } from './types';
import { sleep } from './geocoder';
import { config } from '../config';

const BASE_URL = 'https://www.xo.gr/efimerevonta-farmakeia';

/**
 * Discover all cities for a prefecture by scraping the prefecture page
 * Handles pagination automatically
 */
export async function discoverCities(prefecture: PrefectureConfig): Promise<CityConfig[]> {
  const allCities: CityConfig[] = [];
  const seen = new Set<string>();
  let page = 1;
  let hasMorePages = true;

  console.log(`[discoverer] Discovering cities for ${prefecture.name}...`);

  while (hasMorePages) {
    const url = page === 1
      ? `${BASE_URL}/${prefecture.slug}/`
      : `${BASE_URL}/${prefecture.slug}/?page=${page}`;

    console.log(`[discoverer] Fetching page ${page}: ${url}`);

    try {
      const { html, status } = await fetchPage(url);

      console.log(`[discoverer] HTTP status: ${status}, HTML length: ${html.length}`);

      const cities = parseCitiesFromHtml(html, prefecture.name);

      // Add new cities (deduped)
      let newCitiesCount = 0;
      for (const city of cities) {
        if (!seen.has(city.slug)) {
          seen.add(city.slug);
          allCities.push(city);
          newCitiesCount++;
        }
      }

      console.log(`[discoverer] Page ${page}: found ${cities.length} cities (${newCitiesCount} new)`);

      // Check for next page
      hasMorePages = hasNextPage(html, page);
      if (hasMorePages) {
        page++;
        await sleep(config.scraper.paginationDelayMs); // Rate limit between pagination requests
      }
    } catch (err) {
      console.error(`[discoverer] Failed to fetch page ${page}:`, err);
      hasMorePages = false;
    }
  }

  console.log(`[discoverer] Total cities discovered for ${prefecture.name}: ${allCities.length}`);
  return allCities;
}

/**
 * Parse city links from prefecture page HTML
 * Data is in __NUXT_DATA__ JSON (client-side rendered page)
 * Each location item has: { id, code, name, isCapital }
 */
function parseCitiesFromHtml(html: string, prefectureName: string): CityConfig[] {
  const cities: CityConfig[] = [];
  const seen = new Set<string>();

  // Extract __NUXT_DATA__ JSON - handle different attribute orders
  const nuxtMatch = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nuxtMatch) {
    console.log(`[discoverer] No __NUXT_DATA__ found, trying DOM parsing`);
    return parseCitiesFromDom(html, prefectureName);
  }


  try {
    const nuxtData = JSON.parse(nuxtMatch[1]) as unknown[];

    // Helper to resolve references in Nuxt data
    const resolve = (val: unknown): unknown => {
      if (typeof val === 'number' && val >= 0 && val < nuxtData.length) {
        return nuxtData[val];
      }
      return val;
    };

    const resolveString = (val: unknown): string | undefined => {
      const resolved = resolve(val);
      return typeof resolved === 'string' ? resolved : undefined;
    };

    // Find the "items" array that contains only this prefecture's locations
    // The structure is: { data: { prefectureData: { items: [...] } } }
    // We need to find an array that specifically contains this prefecture's cities

    // Find all "items" arrays and use the smallest one with location objects
    // The prefecture-specific array is smaller than the all-locations array
    let prefectureItems: unknown[] | null = null;
    let smallestSize = Infinity;

    for (let i = 0; i < nuxtData.length; i++) {
      const item = nuxtData[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const obj = item as Record<string, unknown>;
        if ('items' in obj) {
          const itemsRef = resolve(obj.items);
          if (Array.isArray(itemsRef) && itemsRef.length > 0) {
            // Check if first item is a location object
            const firstItem = resolve(itemsRef[0]);
            if (firstItem && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
              const firstObj = firstItem as Record<string, unknown>;
              // Location objects have id, code, name, isCapital
              if ('id' in firstObj && 'code' in firstObj && 'name' in firstObj) {
                // Use the smallest items array (prefecture-specific)
                if (itemsRef.length < smallestSize) {
                  smallestSize = itemsRef.length;
                  prefectureItems = itemsRef;
                }
              }
            }
          }
        }
      }
    }

    if (prefectureItems) {
      console.log(`[discoverer] Using prefecture items array with ${prefectureItems.length} entries`);

      // Parse locations from the prefecture-specific array
      for (const itemRef of prefectureItems) {
        const item = resolve(itemRef);
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const obj = item as Record<string, unknown>;
          const code = resolveString(obj.code);
          const name = resolveString(obj.name);

          if (code && name) {
            if (code.startsWith('nomos-')) continue;
            if (seen.has(code)) continue;

            seen.add(code);
            cities.push({
              name,
              slug: code,
              prefecture: prefectureName,
            });
          }
        }
      }
    } else {
      console.log(`[discoverer] Could not find prefecture items array`);
    }

    console.log(`[discoverer] Found ${cities.length} cities in NUXT_DATA`);
  } catch (err) {
    console.error(`[discoverer] Failed to parse NUXT_DATA:`, err);
    return parseCitiesFromDom(html, prefectureName);
  }

  return cities;
}

/**
 * Fallback: Parse cities from DOM (if page is server-rendered)
 */
function parseCitiesFromDom(html: string, prefectureName: string): CityConfig[] {
  const $ = cheerio.load(html);
  const cities: CityConfig[] = [];
  const seen = new Set<string>();

  $('a.prefecture-locations__link, a[href*="/efimerevonta-farmakeia/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();

    if (!href || !text) return;

    const match = href.match(/\/efimerevonta-farmakeia\/([^/?]+)\/?/);
    if (!match) return;

    const slug = match[1];
    if (slug.startsWith('nomos-')) return;
    if (seen.has(slug)) return;
    seen.add(slug);

    cities.push({
      name: text,
      slug,
      prefecture: prefectureName,
    });
  });

  return cities;
}

/**
 * Check if there's a next page in the pagination
 */
function hasNextPage(html: string, currentPage: number): boolean {
  const $ = cheerio.load(html);

  // Look for pagination patterns
  // Pattern 1: ?page=N links
  const nextPageUrl = `page=${currentPage + 1}`;
  if (html.includes(nextPageUrl)) {
    return true;
  }

  // Pattern 2: rel="next" link
  if ($('link[rel="next"]').length > 0 || $('a[rel="next"]').length > 0) {
    return true;
  }

  // Pattern 3: Numbered pagination with next button
  const nextButton = $('a:contains("Επόμενη")').length > 0 ||
                     $('a:contains("Next")').length > 0 ||
                     $('[aria-label="Next"]').length > 0;
  if (nextButton) {
    return true;
  }

  return false;
}

/**
 * Discover cities for multiple prefectures
 * NOTE: This function is now deprecated - use parallel discovery in runScraper() instead
 */
export async function discoverAllCities(prefectures: PrefectureConfig[]): Promise<Map<string, CityConfig[]>> {
  const result = new Map<string, CityConfig[]>();

  for (const prefecture of prefectures) {
    const cities = await discoverCities(prefecture);
    result.set(prefecture.slug, cities);
    await sleep(config.scraper.paginationDelayMs); // Rate limit between prefectures
  }

  return result;
}

/**
 * Discover all prefectures from the main xo.gr pharmacy page
 * Returns all Greek prefectures (nomoi) with their slugs
 */
export async function discoverAllPrefectures(): Promise<PrefectureConfig[]> {
  const url = `${BASE_URL}/`;
  console.log(`[discoverer] Fetching all prefectures from ${url}`);

  const { html } = await fetchPage(url);

  const nuxtMatch = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nuxtMatch) {
    throw new Error('No __NUXT_DATA__ found on main page');
  }

  const nuxtData = JSON.parse(nuxtMatch[1]) as unknown[];
  const prefectures: PrefectureConfig[] = [];
  const seen = new Set<string>();

  // Helper to resolve references
  const resolve = (val: unknown): unknown => {
    if (typeof val === 'number' && val >= 0 && val < nuxtData.length) {
      return nuxtData[val];
    }
    return val;
  };

  const resolveString = (val: unknown): string | undefined => {
    const resolved = resolve(val);
    return typeof resolved === 'string' ? resolved : undefined;
  };

  // Find all objects with code starting with "nomos-"
  for (let i = 0; i < nuxtData.length; i++) {
    const item = nuxtData[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      const code = resolveString(obj.code);
      const name = resolveString(obj.name);

      if (code && code.startsWith('nomos-') && name && !seen.has(code)) {
        seen.add(code);
        // Clean up name: "Νομός Αχαΐας" -> "Αχαΐας"
        const cleanName = name.replace(/^Νομός\s+/i, '').replace(/^Ν\.\s+/i, '');
        prefectures.push({
          name: cleanName,
          slug: code,
        });
      }
    }
  }

  // Sort alphabetically by Greek name
  prefectures.sort((a, b) => a.name.localeCompare(b.name, 'el'));

  console.log(`[discoverer] Found ${prefectures.length} prefectures`);
  return prefectures;
}
