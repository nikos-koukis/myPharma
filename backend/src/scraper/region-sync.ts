import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

import { syncCitiesToDb } from './cities';
import { config } from '../config';

const USER_AGENTS = [
  // Desktop
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15',
  // Mobile
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/143.0.7499.151 Mobile/15E148 Safari/604.1',
];

export async function runRegionSync(prefectureFilter?: string): Promise<void> {
  console.log('[region-sync] Starting region discovery...');

  const { server, username, password } = config.proxy;
  const hasProxy = !!server;
  if (hasProxy) console.log(`[region-sync] Using proxy: ${server}`);

  const browser = await chromium.launch({
    headless: true,
    proxy: hasProxy ? { server } : undefined,
  });

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      viewport: { width: 1920, height: 1080 },
      locale: 'el-GR',
      httpCredentials: hasProxy ? { username, password } : undefined,
      ignoreHTTPSErrors: hasProxy,
    });
    const page = await context.newPage();

    if (prefectureFilter) {
      console.log(`[region-sync] Filtering by prefecture: "${prefectureFilter}"`);
    }
    const count = await syncCitiesToDb(page, prefectureFilter);

    await page.close();
    await context.close();

    console.log(`[region-sync] Done — ${count} cities synced`);
  } finally {
    await browser.close();
  }
}
