import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

import { syncCitiesToDb } from './cities';

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
];

export async function runRegionSync(): Promise<void> {
  console.log('[region-sync] Starting region discovery...');

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      viewport: { width: 1920, height: 1080 },
      locale: 'el-GR',
    });
    const page = await context.newPage();

    const count = await syncCitiesToDb(page);

    await page.close();
    await context.close();

    console.log(`[region-sync] Done — ${count} cities synced`);
  } finally {
    await browser.close();
  }
}
