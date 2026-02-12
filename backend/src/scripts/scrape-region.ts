/**
 * Scrape a single region/prefecture.
 *
 * Usage:
 *   npx tsx src/scripts/scrape-region.ts Αττικής
 *   npx tsx src/scripts/scrape-region.ts Αχαΐας
 *   npx tsx src/scripts/scrape-region.ts --list
 */

import { runScraper } from '../scraper';
import { getPrefectures, filterCitiesByPrefecture } from '../scraper/city-list';

async function main() {
  const arg = process.argv[2];

  if (!arg || arg === '--list') {
    console.log('Available regions:\n');
    for (const p of getPrefectures()) {
      const count = filterCitiesByPrefecture(p).length;
      console.log(`  ${p} (${count} cities)`);
    }
    console.log('\nUsage: npx tsx src/scripts/scrape-region.ts <region>');
    return;
  }

  const cities = filterCitiesByPrefecture(arg);

  if (cities.length === 0) {
    console.log(`No cities found for region: ${arg}`);
    console.log('Run with --list to see available regions');
    process.exit(1);
  }

  console.log(`Scraping ${cities.length} cities in ${arg}:\n`);
  for (const c of cities) {
    console.log(`  - ${c.name}`);
  }
  console.log('');

  process.env.SCRAPE_PREFECTURES = arg;
  await runScraper();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
