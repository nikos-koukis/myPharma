/**
 * Simple CLI to geocode a single address.
 *
 * Usage:
 *   npx tsx src/scripts/geocode.ts "Ηρακλείτου 2" "Χαλάνδρι"
 *   npx tsx src/scripts/geocode.ts "Πατησίων 76" "Αθήνα"
 */

import { geocodeAddress } from '../scraper/geocoder';

async function main() {
  const [address, city] = process.argv.slice(2);

  if (!address || !city) {
    console.log('Usage: npx tsx src/scripts/geocode.ts <address> <city>');
    console.log('Example: npx tsx src/scripts/geocode.ts "Ηρακλείτου 2" "Χαλάνδρι"');
    process.exit(1);
  }

  console.log(`Geocoding: ${address}, ${city}, Greece\n`);

  const result = await geocodeAddress(address, city);

  if (result) {
    console.log(`lat: ${result.lat}`);
    console.log(`lng: ${result.lng}`);
    console.log(`\nGoogle Maps: https://www.google.com/maps?q=${result.lat},${result.lng}`);
  } else {
    console.log('❌ Could not geocode address');
    process.exit(1);
  }
}

main().catch(console.error);
