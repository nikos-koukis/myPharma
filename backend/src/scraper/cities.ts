import { Page } from 'puppeteer';
import { config } from '../config';
import { prisma } from '../db/client';

export interface CityEntry {
  name: string;
  slug: string;
  url: string;
  prefecture: string;
}

/**
 * Dynamically discovers all cities from vrisko.gr by:
 * 1. Scraping the main page to get all prefecture links
 * 2. For each prefecture, scraping the city links
 */
export async function discoverCities(page: Page, prefectureFilter?: string): Promise<CityEntry[]> {
  const baseUrl = config.scraper.baseUrl;
  const allCities: CityEntry[] = [];

  // 1. Load main page to get prefecture links
  console.log(`[cities] Loading main page: ${baseUrl}/`);
  const response = await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2', timeout: config.scraper.timeout });
  console.log(`[cities] Response: ${response?.status()} ${response?.statusText()} (url: ${response?.url()})`);

  // Accept cookies
  try {
    const acceptBtn = await page.$('#accept-btn');
    if (acceptBtn) {
      const isVisible = await page.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, acceptBtn);
      if (isVisible) {
        await acceptBtn.click();
        console.log(`[cities] Accepted cookie consent`);
      }
    }
  } catch {
    // Ignore cookie consent errors
  }

  // 2. Extract prefecture links — only from the alphabetical section (.blockContentPrefecture)
  const prefectureLinks = await page.evaluate((base: string) => {
    const links: Array<{ name: string; url: string; isDirect: boolean }> = [];
    const seen = new Set<string>();

    // Only search within the alphabetical prefectures grid, skip "Δημοφιλείς νομοί"
    const container = document.querySelector('.blockContentPrefecture') ?? document;

    container.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href') ?? '';
      const text = a.textContent?.trim() ?? '';

      if (!text || seen.has(text)) return;

      // Prefecture with cities: ?SelectedPrefecture=...
      if (href.includes('SelectedPrefecture=')) {
        seen.add(text);
        links.push({ name: text, url: href, isDirect: false });
      }
      // Direct city link: /efimeries-farmakeion/city-slug (no SelectedPrefecture)
      else if (
        href.includes('/efimeries-farmakeion/') &&
        href !== `${base}/` &&
        !href.includes('?') &&
        !href.includes('Locale')
      ) {
        const slug = href.replace(/\/$/, '').split('/efimeries-farmakeion/')[1] ?? '';
        if (slug) {
          seen.add(text);
          links.push({ name: text, url: href, isDirect: true });
        }
      }
    });

    return links;
  }, baseUrl);

  // Sort alphabetically by prefecture name
  prefectureLinks.sort((a, b) => a.name.localeCompare(b.name, 'el'));

  console.log(`[cities] Found ${prefectureLinks.length} prefecture entries (alphabetical)`);

  // Filter prefectures if requested
  if (prefectureFilter) {
    const q = prefectureFilter.toLowerCase();
    const before = prefectureLinks.length;
    const filtered = prefectureLinks.filter((p) => p.name.toLowerCase().includes(q));
    prefectureLinks.length = 0;
    prefectureLinks.push(...filtered);
    console.log(`[cities] Filtered by "${prefectureFilter}" → ${prefectureLinks.length}/${before} prefectures`);
  }

  // 3. Process each prefecture (with retries)
  const totalPrefs = prefectureLinks.length;
  const maxRetries = 3;

  for (let pi = 0; pi < totalPrefs; pi++) {
    const pref = prefectureLinks[pi];
    if (pref.isDirect) {
      // Direct city link (single city prefecture like ΓΡΕΒΕΝΩΝ → /grebena)
      const slug = pref.url.split('/efimeries-farmakeion/')[1]?.replace('/', '') ?? '';
      allCities.push({
        name: pref.name,
        slug,
        url: pref.url,
        prefecture: pref.name,
      });
      console.log(`[cities] [${pi + 1}/${totalPrefs}] ${pref.name} → direct city: ${slug}`);
    } else {
      // Prefecture with multiple cities - need to load the page with retries
      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        attempt++;
        try {
          console.log(`[cities] [${pi + 1}/${totalPrefs}] Loading prefecture: ${pref.name}${attempt > 1 ? ` (retry ${attempt}/${maxRetries})` : ''}`);
          const prefResponse = await page.goto(pref.url, { waitUntil: 'networkidle2', timeout: config.scraper.timeout });
          console.log(`[cities] [${pi + 1}/${totalPrefs}] Response: ${prefResponse?.status()} ${prefResponse?.statusText()}`);

          const cityLinks = await page.evaluate((base: string) => {
            const links: Array<{ name: string; url: string; slug: string }> = [];
            document.querySelectorAll('a').forEach((a) => {
              const href = a.getAttribute('href') ?? '';
              const text = a.textContent?.trim() ?? '';

              if (
                href.includes('/efimeries-farmakeion/') &&
                !href.includes('SelectedPrefecture') &&
                !href.includes('Locale') &&
                href.endsWith('/') &&
                href !== `${base}/`
              ) {
                const slug = href.split('/efimeries-farmakeion/')[1]?.replace('/', '');
                if (slug && slug !== '') {
                  links.push({ name: text, url: href, slug });
                }
              }
            });
            return links;
          }, baseUrl);

          // Filter out navigation links
          const uniqueCities = cityLinks.filter(
            (c) =>
              c.name !== 'Εφημερεύοντα Φαρμακεία' &&
              c.name !== 'Εφημερίες Φαρμακείων' &&
              c.name !== 'Εφημερεύοντα & Ανοιχτά Φαρμακεία'
          );

          for (const city of uniqueCities) {
            allCities.push({
              name: city.name,
              slug: city.slug,
              url: city.url,
              prefecture: pref.name,
            });
          }
          console.log(`[cities] [${pi + 1}/${totalPrefs}] ${pref.name} → ${uniqueCities.length} cities`);
          success = true;
        } catch (err) {
          if (attempt >= maxRetries) {
            console.error(`[cities] [${pi + 1}/${totalPrefs}] ${pref.name} FAILED after ${maxRetries} retries:`, err);
          } else {
            console.warn(`[cities] [${pi + 1}/${totalPrefs}] ${pref.name} attempt ${attempt} failed, retrying...`);
          }
        }
      }
    }
  }

  console.log(`[cities] Total: ${allCities.length} cities discovered`);
  return allCities;
}

/**
 * Syncs discovered cities to the database.
 * Upserts all found cities and marks missing ones as inactive.
 */
export async function syncCitiesToDb(page: Page, prefectureFilter?: string): Promise<number> {
  const cities = await discoverCities(page, prefectureFilter);

  const discoveredSlugs = new Set<string>();

  const totalCities = cities.length;
  for (let ci = 0; ci < totalCities; ci++) {
    const city = cities[ci];
    discoveredSlugs.add(city.slug);
    console.log(`[cities] [${ci + 1}/${totalCities}] Syncing ${city.name} (${city.prefecture})`);
    await prisma.scraperCity.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        url: city.url,
        prefecture: city.prefecture,
        active: true,
      },
      create: {
        name: city.name,
        slug: city.slug,
        url: city.url,
        prefecture: city.prefecture,
        active: true,
      },
    });
  }

  // Mark cities not found in this discovery as inactive (only when syncing all)
  if (!prefectureFilter) {
    const allDb = await prisma.scraperCity.findMany({ select: { slug: true } });
    const toDeactivate = allDb
      .filter((c) => !discoveredSlugs.has(c.slug))
      .map((c) => c.slug);

    if (toDeactivate.length > 0) {
      await prisma.scraperCity.updateMany({
        where: { slug: { in: toDeactivate } },
        data: { active: false },
      });
      console.log(`[cities] Deactivated ${toDeactivate.length} cities no longer found`);
    }
  }

  console.log(`[cities] Synced ${cities.length} cities to database`);
  return cities.length;
}

/**
 * Reads active cities from the database (no browser needed).
 */
export async function getCitiesFromDb(): Promise<CityEntry[]> {
  const rows = await prisma.scraperCity.findMany({
    where: { active: true },
    orderBy: { prefecture: 'asc' },
  });

  console.log(`[cities] Loaded ${rows.length} cities from database`);

  return rows.map((r) => ({
    name: r.name,
    slug: r.slug,
    url: r.url,
    prefecture: r.prefecture,
  }));
}
