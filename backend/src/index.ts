import cron from 'node-cron';
import { startServer } from './api/server';
import { runScraper } from './scraper';
import { runCoordValidation } from './scraper/coord-validator';
import { config } from './config';

async function main() {
  // Start the API server
  await startServer();

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
  });

  console.log(`[cron] Pharmacy scrape scheduled: ${config.scraper.pharmacyCron}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
