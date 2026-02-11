import cron from 'node-cron';
import { startServer } from './api/server';
import { runScraper } from './scraper';
import { config } from './config';

async function main() {
  // Start the API server
  await startServer();

  // Cron disabled temporarily
  // cron.schedule(config.scraper.pharmacyCron, async () => {
  //   console.log('[cron] Running pharmacy scrape...');
  //   try {
  //     await runScraper();
  //   } catch (err) {
  //     console.error('[cron] Pharmacy scrape failed:', err);
  //   }
  // });

  console.log(`[cron] Pharmacy scrape DISABLED (was: ${config.scraper.pharmacyCron})`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
