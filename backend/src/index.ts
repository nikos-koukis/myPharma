import cron from 'node-cron';
import { startServer } from './api/server';
import { runScraper } from './scraper';
import { runCoordValidation } from './scraper/coord-validator';
import { retryFailedUrls, cleanupResolvedUrls } from './scraper/retry-failed';
import { config } from './config';

async function main() {
  // Start the API server
  await startServer();

  // Main scraper cron (daily at 11:00 Europe/Athens by default)
  cron.schedule(config.scraper.pharmacyCron, async () => {
    console.log('[cron] Running pharmacy scrape...');
    try {
      await runScraper();

      // Run coordinate validation after scraping
      console.log('[cron] Running coordinate validation...');
      await runCoordValidation({ thresholdKm: 1.0 });
    } catch (err) {
      console.error('[cron] Pharmacy scrape failed:', err);
    }
  }, { timezone: config.scraper.cronTimezone });

  // Retry failed URLs cron (every hour by default)
  cron.schedule(config.scraper.retryFailedCron, async () => {
    console.log('[cron] Retrying failed URLs...');
    try {
      const result = await retryFailedUrls();
      console.log(`[cron] Retry complete: ${result.success} success, ${result.failed} failed`);

      // Clean up old resolved entries once a day (at midnight)
      const hour = new Date().getHours();
      if (hour === 0) {
        await cleanupResolvedUrls();
      }
    } catch (err) {
      console.error('[cron] Failed URL retry failed:', err);
    }
  }, { timezone: config.scraper.cronTimezone });

  console.log(`[cron] Pharmacy scrape scheduled: ${config.scraper.pharmacyCron}`);
  console.log(`[cron] Failed URL retry scheduled: ${config.scraper.retryFailedCron}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
