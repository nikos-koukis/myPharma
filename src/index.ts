import cron from 'node-cron';
import { startServer } from './api/server';
import { runScraper } from './scraper';
import { config } from './config';

async function main() {
  // Start the API server
  await startServer();

  // Schedule the scraper
  cron.schedule(config.scraper.cronSchedule, async () => {
    console.log('[cron] Running scheduled scrape...');
    try {
      await runScraper();
    } catch (err) {
      console.error('[cron] Scrape failed:', err);
    }
  });

  console.log(`[cron] Scraper scheduled: ${config.scraper.cronSchedule}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
