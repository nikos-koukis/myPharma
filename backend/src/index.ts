import cron from 'node-cron';
import { startServer } from './api/server';
import { runScraper } from './scraper';
import { runRegionSync } from './scraper/region-sync';
import { config } from './config';

async function main() {
  // Start the API server
  await startServer();

  // Daily: scrape pharmacies (reads cities from DB)
  cron.schedule(config.scraper.pharmacyCron, async () => {
    console.log('[cron] Running daily pharmacy scrape...');
    try {
      await runScraper();
    } catch (err) {
      console.error('[cron] Pharmacy scrape failed:', err);
    }
  });

  // Weekly: refresh region/city list from vrisko.gr
  cron.schedule(config.scraper.regionCron, async () => {
    console.log('[cron] Running weekly region sync...');
    try {
      await runRegionSync();
    } catch (err) {
      console.error('[cron] Region sync failed:', err);
    }
  });

  console.log(`[cron] Pharmacy scrape scheduled: ${config.scraper.pharmacyCron}`);
  console.log(`[cron] Region sync scheduled: ${config.scraper.regionCron}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
