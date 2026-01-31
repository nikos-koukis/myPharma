import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from '../src/config';

chromium.use(StealthPlugin());

async function testScrape() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'el-GR',
  });
  const page = await context.newPage();

  try {
    // 1. Main page - get prefectures
    const mainUrl = `${config.scraper.baseUrl}/`;
    console.log(`[test] Loading main page: ${mainUrl}`);
    await page.goto(mainUrl, { waitUntil: 'networkidle', timeout: config.scraper.timeout });

    // Accept cookies
    const acceptBtn = page.locator('#accept-btn');
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
    }

    console.log(`[test] Page title: ${await page.title()}`);

    // Dump the prefecture/region links area
    const mainHtml = await page.evaluate(() => {
      // Look for alphabetical prefecture listings
      const body = document.body.innerHTML;
      return body.substring(0, 5000);
    });
    console.log(`\n[test] === MAIN PAGE HTML (first 5000) ===`);
    console.log(mainHtml);

    // Find all links that look like prefecture/city links
    const links = await page.evaluate(() => {
      const allLinks: Array<{ text: string; href: string }> = [];
      document.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href') ?? '';
        if (href.includes('efimeries-farmakeion') || href.includes('pharmacy-duties')) {
          allLinks.push({ text: a.textContent?.trim() ?? '', href });
        }
      });
      return allLinks;
    });
    console.log(`\n[test] === PHARMACY-RELATED LINKS ===`);
    links.forEach((l) => console.log(`  ${l.text} → ${l.href}`));

    // 2. Now try a prefecture page
    const prefectureUrl = `${config.scraper.baseUrl}?SelectedPrefecture=%ce%91%ce%a7%ce%91%ce%aa%ce%91%ce%a3`;
    console.log(`\n[test] Loading prefecture page (ΑΧΑΙΑΣ): ${prefectureUrl}`);
    await page.goto(prefectureUrl, { waitUntil: 'networkidle', timeout: config.scraper.timeout });

    const prefHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 3000));
    console.log(`\n[test] === PREFECTURE PAGE HTML (first 3000) ===`);
    console.log(prefHtml);

    // Find city links within prefecture
    const cityLinks = await page.evaluate(() => {
      const links: Array<{ text: string; href: string }> = [];
      document.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href') ?? '';
        if (href.includes('efimeries-farmakeion/') && !href.includes('SelectedPrefecture')) {
          links.push({ text: a.textContent?.trim() ?? '', href });
        }
      });
      return links;
    });
    console.log(`\n[test] === CITY LINKS IN ΑΧΑΙΑΣ ===`);
    cityLinks.forEach((l) => console.log(`  ${l.text} → ${l.href}`));

  } catch (err) {
    console.error(`[test] Error:`, err);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

testScrape();
