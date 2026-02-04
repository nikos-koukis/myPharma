import { launchBrowser, createPage, randomUserAgent } from './browser';
import { syncCitiesToDb } from './cities';
import { config } from '../config';

export async function runRegionSync(prefectureFilter?: string): Promise<void> {
  console.log('[region-sync] Starting region discovery...');

  const { server, username, password } = config.proxy;
  const hasProxy = !!server;
  if (hasProxy) console.log(`[region-sync] Using proxy: ${server}`);

  const browser = await launchBrowser({
    headless: config.scraper.headless,
    display: config.scraper.display,
    proxy: hasProxy ? { server, username, password } : undefined,
  });

  try {
    const page = await createPage(browser, {
      userAgent: randomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      proxy: hasProxy ? { username, password } : undefined,
    });

    if (prefectureFilter) {
      console.log(`[region-sync] Filtering by prefecture: "${prefectureFilter}"`);
    }
    const count = await syncCitiesToDb(page, prefectureFilter);

    await page.close();

    console.log(`[region-sync] Done — ${count} cities synced`);
  } finally {
    await browser.close();
  }
}
