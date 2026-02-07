/**
 * Script to generate city-list.ts by scraping xo.gr
 *
 * This script:
 * 1. Visits the main pharmacy page
 * 2. Clicks on each prefecture tab to load its cities
 * 3. Scrapes all cities with their slugs
 * 4. Generates a complete city-list.ts file
 *
 * Run with: npx tsx scripts/generate-city-list.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
declare const require: (module: string) => any;
declare const __dirname: string;

import { chromium, type Page } from 'playwright';

const fs: any = require('fs');
const path: any = require('path');

interface CityEntry {
  name: string;
  slug: string;
  prefecture: string;
}

const BASE_URL = 'https://www.xo.gr/efimerevonta-farmakeia/';

interface PrefectureInfo {
  name: string;
  slug: string;
  url: string;
}

// Hardcoded prefecture URLs - extracted from xo.gr main page
const PREFECTURE_URLS: PrefectureInfo[] = [
  { name: 'Αττικής', slug: 'attikis', url: 'https://www.xo.gr/efimerevonta-farmakeia/nomos/attikis/' },
  // Add more prefectures here as needed
];

async function main() {
  console.log('🚀 Starting city list generation...\n');

  const browser = await chromium.launch({
    headless: false, // Show the browser window
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      locale: 'el-GR',
      timezoneId: 'Europe/Athens',
    });

    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    console.log('📄 Visiting main page:', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // Wait for dynamic content to load

    // Accept cookie consent if present
    try {
      const cookieAccept = page.locator('#cookiescript_accept');
      if (await cookieAccept.isVisible({ timeout: 3000 })) {
        console.log('🍪 Accepting cookies...');
        await cookieAccept.click();
        // Wait for cookie dialog to disappear and page to reload
        await page.waitForSelector('#cookiescript_injected', { state: 'hidden', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(3000);
        console.log('   Cookies accepted, page reloaded');
      }
    } catch {
      console.log('   No cookie dialog found, continuing...');
    }

    // Get all prefectures from the ΝΟΜΟΣ section
    const prefectures = await getPrefectureList(page);
    console.log(`\n📍 Found ${prefectures.length} prefectures:\n`);
    prefectures.forEach(p => console.log(`   - ${p.name} (${p.slug})`));

    const allCities: CityEntry[] = [];

    // For each prefecture, navigate to its page and scrape cities
    for (let i = 0; i < prefectures.length; i++) {
      const pref = prefectures[i];
      console.log(`\n🏛️ [${i + 1}/${prefectures.length}] Scraping: ${pref.name}`);

      try {
        // Navigate to the prefecture page
        console.log(`   📄 Navigating to: ${pref.url}`);
        await page.goto(pref.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        // Scrape all cities from the prefecture page
        const cities = await scrapeCitiesFromPrefecturePage(page, pref.name);
        console.log(`   ✓ Found ${cities.length} cities`);

        allCities.push(...cities);
      } catch (err) {
        console.log(`   ⚠️ Error scraping ${pref.name}:`, (err as Error).message);
      }
    }

    // Remove duplicates (same slug)
    const uniqueCities = removeDuplicates(allCities);
    console.log(`\n📊 Total unique cities: ${uniqueCities.length}`);

    // Generate the TypeScript file
    const outputPath = path.join(__dirname, '../src/scraper/city-list.ts');
    generateCityListFile(uniqueCities, outputPath);

    console.log(`\n✅ Generated city-list.ts`);
    console.log(`📁 Output: ${outputPath}`);

  } finally {
    await browser.close();
  }
}

async function getPrefectureList(page: Page): Promise<PrefectureInfo[]> {
  // Find all prefecture links in the ΝΟΜΟΣ section
  // Links are like: /efimerevonta-farmakeia/nomos/attikis/
  const prefectures = await page.evaluate(() => {
    const results: { name: string; slug: string; url: string }[] = [];
    const seen = new Set<string>();

    // Find all links that go to /nomos/ pages
    const links = document.querySelectorAll('a[href*="/efimerevonta-farmakeia/nomos/"]');

    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      const name = link.textContent?.trim() || '';

      // Extract slug from URL like: /efimerevonta-farmakeia/nomos/attikis/
      const slugMatch = href.match(/\/nomos\/([^\/]+)\/?$/);
      if (!slugMatch || !name) return;

      const slug = slugMatch[1];
      if (seen.has(slug)) return;
      seen.add(slug);

      results.push({
        name,
        slug,
        url: `https://www.xo.gr${href}`,
      });
    });

    return results;
  });

  return prefectures;
}

async function scrapeCitiesFromPrefecturePage(page: Page, prefectureName: string): Promise<CityEntry[]> {
  // Scroll to load all content
  await autoScroll(page);

  const cities = await page.evaluate((prefecture) => {
    const results: { name: string; slug: string; prefecture: string }[] = [];
    const seen = new Set<string>();

    // Find all city links on the prefecture page
    // Links are like: /efimerevonta-farmakeia/athina/
    // But NOT /efimerevonta-farmakeia/nomos/xxx/
    const links = document.querySelectorAll('a[href*="/efimerevonta-farmakeia/"]');

    links.forEach(link => {
      const href = link.getAttribute('href') || '';

      // Skip nomos links and the main page
      if (href.includes('/nomos/')) return;

      // Extract slug from URL like: /efimerevonta-farmakeia/athina/
      const slugMatch = href.match(/\/efimerevonta-farmakeia\/([^\/\?]+)\/?$/);
      if (!slugMatch) return;

      const slug = slugMatch[1];

      // Skip main page, duplicates, and invalid slugs
      if (!slug || slug === 'efimerevonta-farmakeia' || seen.has(slug)) return;
      seen.add(slug);

      // Get the city name from the link text
      const name = link.textContent?.trim() || '';

      if (name && name.length > 1) {
        results.push({
          name,
          slug,
          prefecture,
        });
      }
    });

    return results;
  }, prefectureName);

  return cities;
}

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);

      // Safety timeout
      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, 10000);
    });
  });
}

function removeDuplicates(cities: CityEntry[]): CityEntry[] {
  const seen = new Map<string, CityEntry>();

  for (const city of cities) {
    if (!seen.has(city.slug)) {
      seen.set(city.slug, city);
    }
  }

  return Array.from(seen.values());
}

function generateCityListFile(cities: CityEntry[], outputPath: string) {
  // Group by prefecture
  const byPrefecture = new Map<string, CityEntry[]>();

  for (const city of cities) {
    const pref = city.prefecture || 'UNKNOWN';
    if (!byPrefecture.has(pref)) {
      byPrefecture.set(pref, []);
    }
    byPrefecture.get(pref)!.push(city);
  }

  // Sort prefectures alphabetically
  const sortedPrefectures = Array.from(byPrefecture.keys()).sort((a, b) => a.localeCompare(b, 'el'));

  const lines: string[] = [
    '/**',
    ' * Auto-generated city list from xo.gr',
    ` * Generated on: ${new Date().toISOString()}`,
    ` * Total cities: ${cities.length}`,
    ' * ',
    ' * To regenerate: npx tsx scripts/generate-city-list.ts',
    ' */',
    '',
    'export interface CityConfig {',
    '  name: string;',
    '  slug: string;',
    '  prefecture: string;',
    '}',
    '',
    '// Organized by prefecture',
    'export const CITY_LIST: CityConfig[] = [',
  ];

  for (const pref of sortedPrefectures) {
    const prefCities = byPrefecture.get(pref)!;

    // Sort cities by name
    prefCities.sort((a, b) => a.name.localeCompare(b.name, 'el'));

    lines.push('');
    lines.push(`  // ${pref} (${prefCities.length} cities)`);

    for (const city of prefCities) {
      // Escape single quotes in names
      const escapedName = city.name.replace(/'/g, "\\'");
      lines.push(`  { name: '${escapedName}', slug: '${city.slug}', prefecture: '${pref}' },`);
    }
  }

  lines.push('];');
  lines.push('');

  // Add helper functions
  lines.push(`/**
 * Build full URL for a city with optional date parameter
 * @param city - City configuration
 * @param date - Optional date in format DD/MM/YYYY (xo.gr format)
 */
export function getCityUrl(city: CityConfig, date?: string): string {
  const baseUrl = \`https://www.xo.gr/efimerevonta-farmakeia/\${city.slug}/\`;
  if (date) {
    return \`\${baseUrl}?date=\${date}\`;
  }
  return baseUrl;
}

/**
 * Format a Date object to xo.gr date format (DD/MM/YYYY)
 */
export function formatDateForXo(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return \`\${day}/\${month}/\${year}\`;
}

/**
 * Get today's date formatted for xo.gr
 */
export function getTodayForXo(): string {
  return formatDateForXo(new Date());
}

/**
 * Get tomorrow's date formatted for xo.gr
 */
export function getTomorrowForXo(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateForXo(tomorrow);
}

/**
 * Filter cities by prefecture
 */
export function filterCitiesByPrefecture(prefecture: string): CityConfig[] {
  const q = prefecture.toLowerCase();
  return CITY_LIST.filter((c) => c.prefecture.toLowerCase().includes(q));
}

/**
 * Filter cities by name
 */
export function filterCitiesByName(name: string): CityConfig[] {
  const q = name.toLowerCase();
  return CITY_LIST.filter(
    (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
  );
}

/**
 * Get all unique prefectures
 */
export function getPrefectures(): string[] {
  return [...new Set(CITY_LIST.map((c) => c.prefecture))].sort((a, b) =>
    a.localeCompare(b, 'el')
  );
}

/**
 * Get filtered city list based on SCRAPE_PREFECTURES env var.
 */
export function getActiveCities(): CityConfig[] {
  const filter = process.env.SCRAPE_PREFECTURES?.trim();

  if (!filter) {
    return CITY_LIST;
  }

  const prefectures = filter.split(',').map(p => p.trim().toUpperCase());

  return CITY_LIST.filter(city =>
    prefectures.some(p => city.prefecture.toUpperCase().includes(p))
  );
}
`);

  fs.writeFileSync(outputPath, lines.join('\n'));
}

main().catch(console.error);
