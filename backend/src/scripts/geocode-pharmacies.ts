/**
 * Script to geocode pharmacy addresses and update lat/lng in the database.
 *
 * Usage:
 *   npx tsx src/scripts/geocode-pharmacies.ts              # Geocode all pharmacies missing lat/lng
 *   npx tsx src/scripts/geocode-pharmacies.ts --all        # Re-geocode ALL pharmacies
 *   npx tsx src/scripts/geocode-pharmacies.ts --dry-run    # Preview without updating DB
 *   npx tsx src/scripts/geocode-pharmacies.ts --limit 10   # Process only 10 pharmacies
 */

import { prisma } from '../db/client';
import { geocodeAddress, sleep } from '../scraper/geocoder';
import { config } from '../config';

interface Args {
  all: boolean;
  dryRun: boolean;
  limit?: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  return {
    all: args.includes('--all'),
    dryRun: args.includes('--dry-run'),
    limit: args.includes('--limit')
      ? parseInt(args[args.indexOf('--limit') + 1], 10)
      : undefined,
  };
}

async function main() {
  const args = parseArgs();

  console.log('🗺️  Pharmacy Geocoder Script');
  console.log('─'.repeat(40));
  console.log(`Mode: ${args.all ? 'All pharmacies' : 'Missing coordinates only'}`);
  console.log(`Dry run: ${args.dryRun ? 'Yes (no DB updates)' : 'No'}`);
  if (args.limit) console.log(`Limit: ${args.limit}`);
  console.log('─'.repeat(40));

  // Query pharmacies
  const whereClause = args.all ? {} : { OR: [{ lat: null }, { lng: null }] };

  const pharmacies = await prisma.pharmacy.findMany({
    where: whereClause,
    take: args.limit,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${pharmacies.length} pharmacies to geocode\n`);

  if (pharmacies.length === 0) {
    console.log('✅ All pharmacies already have coordinates!');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const pharmacy of pharmacies) {
    process.stdout.write(`[${success + failed + 1}/${pharmacies.length}] ${pharmacy.name} (${pharmacy.city})... `);

    const result = await geocodeAddress(pharmacy.address, pharmacy.city);

    if (result) {
      console.log(`✅ ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`);

      if (!args.dryRun) {
        await prisma.pharmacy.update({
          where: { id: pharmacy.id },
          data: { lat: result.lat, lng: result.lng },
        });
      }
      success++;
    } else {
      console.log('❌ Failed');
      failed++;
    }

    // Rate limiting: wait between requests
    await sleep(config.geocoder.rateLimit);
  }

  console.log('\n' + '─'.repeat(40));
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);

  if (args.dryRun) {
    console.log('\n⚠️  Dry run - no changes were saved to the database');
  }
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
