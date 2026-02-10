/**
 * Geocode a single pharmacy by ID or search by name.
 *
 * Usage:
 *   npx tsx src/scripts/geocode-one.ts <pharmacy-id>
 *   npx tsx src/scripts/geocode-one.ts --search "ΦΡΑΓΚΟΥ"
 */

import { prisma } from '../db/client';
import { geocodeAddress } from '../scraper/geocoder';

async function main() {
  const arg = process.argv[2];
  const searchTerm = process.argv[3];

  if (!arg) {
    console.log('Usage:');
    console.log('  npx tsx src/scripts/geocode-one.ts <pharmacy-id>');
    console.log('  npx tsx src/scripts/geocode-one.ts --search "name"');
    process.exit(1);
  }

  // Search mode - find pharmacies by name
  if (arg === '--search') {
    const pharmacies = await prisma.pharmacy.findMany({
      where: { name: { contains: searchTerm, mode: 'insensitive' } },
      take: 10,
    });
    console.log(`Found ${pharmacies.length} pharmacies matching "${searchTerm}":\n`);
    for (const p of pharmacies) {
      console.log(`ID: ${p.id}`);
      console.log(`   Name: ${p.name}`);
      console.log(`   Address: ${p.address}, ${p.city}`);
      console.log(`   Coords: lat=${p.lat}, lng=${p.lng}\n`);
    }
    return;
  }

  // Direct ID lookup
  const id = arg;
  console.log(`Looking up pharmacy ID: ${id}`);

  const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });

  if (!pharmacy) {
    console.log(`❌ Pharmacy not found: ${id}`);
    console.log('\nListing first 5 pharmacies in DB:');
    const sample = await prisma.pharmacy.findMany({ take: 5 });
    for (const p of sample) {
      console.log(`  ${p.id} - ${p.name}`);
    }
    process.exit(1);
  }

  console.log(`\nPharmacy: ${pharmacy.name}`);
  console.log(`Address:  ${pharmacy.address}`);
  console.log(`City:     ${pharmacy.city}`);
  console.log(`Region:   ${pharmacy.region}`);
  console.log(`Current:  lat=${pharmacy.lat}, lng=${pharmacy.lng}\n`);

  const query = `${pharmacy.address}, ${pharmacy.city}, Greece`;
  console.log(`Geocode query: "${query}"`);
  console.log(`URL encoded:   ${encodeURIComponent(query)}\n`);

  const result = await geocodeAddress(pharmacy.address, pharmacy.city);

  if (result) {
    console.log(`\n✅ New coords: lat=${result.lat}, lng=${result.lng}`);

    await prisma.pharmacy.update({
      where: { id },
      data: { lat: result.lat, lng: result.lng },
    });

    console.log('✅ Updated in database');
    console.log(`\nGoogle Maps: https://www.google.com/maps?q=${result.lat},${result.lng}`);
  } else {
    console.log('❌ Could not geocode address');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
