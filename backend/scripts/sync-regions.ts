import { runRegionSync } from '../src/scraper/region-sync';

runRegionSync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Region sync failed:', err);
    process.exit(1);
  });
