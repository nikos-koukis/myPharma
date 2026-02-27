/**
 * CLI script for coordinate validation.
 *
 * Usage:
 *   npx tsx src/scripts/validate-coords.ts              # Validate all
 *   npx tsx src/scripts/validate-coords.ts --region Αχαΐας  # Validate specific region
 *   npx tsx src/scripts/validate-coords.ts --threshold 2    # Custom threshold (km)
 *   npx tsx src/scripts/validate-coords.ts --fix            # Auto-fix invalid coordinates
 */

import { prisma } from '../db/client';
import { runCoordValidation } from '../scraper/coord-validator';

async function main() {
  const args = process.argv.slice(2);

  let region: string | undefined;
  let thresholdKm: number | undefined;
  let fix = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--region' && args[i + 1]) {
      region = args[i + 1];
      i++;
    } else if (args[i] === '--threshold' && args[i + 1]) {
      thresholdKm = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--fix') {
      fix = true;
    }
  }

  const summary = await runCoordValidation({ region, thresholdKm, fix });

  console.log('\n=== Validation Summary ===');
  console.log(`Total:   ${summary.total}`);
  console.log(`Valid:   ${summary.valid} (${((summary.valid / summary.total) * 100).toFixed(1)}%)`);
  console.log(`Invalid: ${summary.invalid} (${((summary.invalid / summary.total) * 100).toFixed(1)}%)`);
  console.log('\n[validate] View in Grafana: SELECT * FROM geo_validations WHERE is_valid = false ORDER BY distance_km DESC');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
