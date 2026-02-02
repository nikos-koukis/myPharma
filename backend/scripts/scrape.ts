import { runScraper, ScrapeFilter } from '../src/scraper';
import { prisma } from '../src/db/client';
import { redis } from '../src/cache/redis';

function parseArgs(): ScrapeFilter {
  const args = process.argv.slice(2);
  const filter: ScrapeFilter = {};

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--city' || args[i] === '-c') && args[i + 1]) {
      filter.city = args[++i];
    } else if ((args[i] === '--region' || args[i] === '-r') && args[i + 1]) {
      filter.region = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: npm run scrape -- [options]

Options:
  --city,   -c <name>   Scrape only cities matching name/slug (e.g. "patra", "thessaloniki")
  --region, -r <name>   Scrape only cities in matching prefecture (e.g. "ΑΧΑΪΑΣ", "ΑΤΤΙΚΗΣ")
  --help,   -h          Show this help

Examples:
  npm run scrape                          # Scrape all cities
  npm run scrape -- --city patra          # Scrape only Patra
  npm run scrape -- --city thessaloniki   # Scrape only Thessaloniki
  npm run scrape -- --region ΑΧΑΪΑΣ       # Scrape all cities in Achaia
  npm run scrape -- -r ΑΤΤΙΚΗΣ            # Scrape all cities in Attica
`);
      process.exit(0);
    }
  }

  return filter;
}

async function main() {
  const filter = parseArgs();
  try {
    await runScraper(Object.keys(filter).length > 0 ? filter : undefined);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
