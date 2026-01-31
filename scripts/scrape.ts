import { runScraper } from '../src/scraper';
import { prisma } from '../src/db/client';
import { redis } from '../src/cache/redis';

async function main() {
  try {
    await runScraper();
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
