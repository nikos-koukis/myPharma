import { runRegionSync } from '../src/scraper/region-sync';

const args = process.argv.slice(2);
let filter: string | undefined;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--region' || args[i] === '-r') && args[i + 1]) {
    filter = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Usage: npm run sync-regions -- [options]

Options:
  --region, -r <name>   Sync only matching prefecture (e.g. "ΑΧΑΪΑΣ", "ΑΤΤΙΚΗΣ")
  --help,   -h          Show this help

Examples:
  npm run sync-regions                      # Sync all prefectures
  npm run sync-regions -- --region ΑΧΑΪΑΣ   # Sync only Achaia
  npm run sync-regions -- -r ΑΤΤΙΚΗΣ        # Sync only Attica
`);
    process.exit(0);
  }
}

runRegionSync(filter)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Region sync failed:', err);
    process.exit(1);
  });
