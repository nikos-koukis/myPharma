import { Page } from 'playwright';
import { config } from '../config';

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
export async function discoverCities(page: Page): Promise<CityEntry[]> {
  const baseUrl = config.scraper.baseUrl;
  const allCities: CityEntry[] = [];

  // 1. Load main page to get prefecture links
  console.log(`[cities] Loading main page: ${baseUrl}/`);
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: config.scraper.timeout });

  // Accept cookies
  const acceptBtn = page.locator('#accept-btn');
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.click();
    console.log(`[cities] Accepted cookie consent`);
  }

  // 2. Extract prefecture links
  const prefectureLinks = await page.evaluate((base: string) => {
    const links: Array<{ name: string; url: string; isDirect: boolean }> = [];
    const seen = new Set<string>();

    document.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href') ?? '';
      const text = a.textContent?.trim() ?? '';

      if (!text || seen.has(text)) return;

      // Prefecture with cities: ?SelectedPrefecture=...
      if (href.includes('SelectedPrefecture=')) {
        seen.add(text);
        links.push({ name: text, url: href, isDirect: false });
      }
      // Direct city link: /efimeries-farmakeion/city-slug/
      else if (
        href.includes('/efimeries-farmakeion/') &&
        href !== `${base}/` &&
        !href.includes('?') &&
        !href.includes('Locale') &&
        href.endsWith('/')
      ) {
        const slug = href.split('/efimeries-farmakeion/')[1]?.replace('/', '');
        if (slug && slug !== '') {
          seen.add(text);
          links.push({ name: text, url: href, isDirect: true });
        }
      }
    });

    return links;
  }, baseUrl);

  console.log(`[cities] Found ${prefectureLinks.length} prefecture entries`);

  // 3. Process each prefecture
  for (const pref of prefectureLinks) {
    if (pref.isDirect) {
      // Direct city link (single city prefecture like ΓΡΕΒΕΝΩΝ → /grebena)
      const slug = pref.url.split('/efimeries-farmakeion/')[1]?.replace('/', '') ?? '';
      allCities.push({
        name: pref.name,
        slug,
        url: pref.url,
        prefecture: pref.name,
      });
      console.log(`[cities] ${pref.name} → direct city: ${slug}`);
    } else {
      // Prefecture with multiple cities - need to load the page
      console.log(`[cities] Loading prefecture: ${pref.name}`);
      await page.goto(pref.url, { waitUntil: 'networkidle', timeout: config.scraper.timeout });

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
      console.log(`[cities] ${pref.name} → ${uniqueCities.length} cities`);
    }
  }

  console.log(`[cities] Total: ${allCities.length} cities discovered`);
  return allCities;
}
