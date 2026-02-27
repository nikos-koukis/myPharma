/**
 * Validate pharmacy coordinates against geocoder results.
 * Stores results in geo_validations table for Grafana dashboards.
 *
 * Usage:
 *   npx tsx src/scripts/validate-coords.ts              # Validate all
 *   npx tsx src/scripts/validate-coords.ts --region Αχαΐας  # Validate specific region
 *   npx tsx src/scripts/validate-coords.ts --threshold 2    # Custom threshold (km)
 *   npx tsx src/scripts/validate-coords.ts --dry-run        # Don't save to DB
 */

import { prisma } from '../db/client';
import { geocodeAddress, sleep } from '../scraper/geocoder';
import { config } from '../config';

// Default distance threshold in km - coords are invalid if distance > this
const DEFAULT_THRESHOLD_KM = 1.0;

interface ValidationResult {
  pharmacyId: string;
  pharmacyName: string;
  address: string;
  city: string;
  region: string;
  currentLat: number | null;
  currentLng: number | null;
  expectedLat: number | null;
  expectedLng: number | null;
  distanceKm: number | null;
  isValid: boolean;
  issue: string | null;
}

/**
 * Haversine formula to calculate distance between two points in km
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function validatePharmacy(
  pharmacy: {
    id: string;
    name: string;
    address: string;
    city: string;
    region: string;
    lat: number | null;
    lng: number | null;
  },
  thresholdKm: number
): Promise<ValidationResult> {
  const result: ValidationResult = {
    pharmacyId: pharmacy.id,
    pharmacyName: pharmacy.name,
    address: pharmacy.address,
    city: pharmacy.city,
    region: pharmacy.region,
    currentLat: pharmacy.lat,
    currentLng: pharmacy.lng,
    expectedLat: null,
    expectedLng: null,
    distanceKm: null,
    isValid: true,
    issue: null,
  };

  // Check if pharmacy has coordinates
  if (pharmacy.lat === null || pharmacy.lng === null) {
    result.isValid = false;
    result.issue = 'Missing coordinates';
    return result;
  }

  // Geocode the address
  const geocoded = await geocodeAddress(pharmacy.address, pharmacy.city);

  if (!geocoded) {
    result.isValid = false;
    result.issue = 'Geocoding failed';
    return result;
  }

  result.expectedLat = geocoded.lat;
  result.expectedLng = geocoded.lng;

  // Calculate distance
  const distance = haversineDistance(
    pharmacy.lat,
    pharmacy.lng,
    geocoded.lat,
    geocoded.lng
  );
  result.distanceKm = Math.round(distance * 1000) / 1000; // Round to 3 decimals

  // Check if distance exceeds threshold
  if (distance > thresholdKm) {
    result.isValid = false;
    result.issue = `Distance ${result.distanceKm.toFixed(2)}km exceeds threshold ${thresholdKm}km`;
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let region: string | null = null;
  let thresholdKm = DEFAULT_THRESHOLD_KM;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--region' && args[i + 1]) {
      region = args[i + 1];
      i++;
    } else if (args[i] === '--threshold' && args[i + 1]) {
      thresholdKm = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  console.log('[validate] Starting coordinate validation...');
  console.log(`[validate] Threshold: ${thresholdKm}km`);
  if (region) console.log(`[validate] Region filter: ${region}`);
  if (dryRun) console.log('[validate] Dry run - results will not be saved');

  // Query pharmacies
  const where = region ? { region: { contains: region } } : {};
  const pharmacies = await prisma.pharmacy.findMany({
    where,
    orderBy: { region: 'asc' },
  });

  console.log(`[validate] Found ${pharmacies.length} pharmacies to validate`);

  // Clear previous validation results for this region
  if (!dryRun) {
    if (region) {
      await prisma.geoValidation.deleteMany({
        where: { region: { contains: region } },
      });
    } else {
      await prisma.geoValidation.deleteMany({});
    }
    console.log('[validate] Cleared previous validation results');
  }

  const results: ValidationResult[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < pharmacies.length; i++) {
    const pharmacy = pharmacies[i];

    // Progress indicator
    if ((i + 1) % 10 === 0 || i === pharmacies.length - 1) {
      console.log(`[validate] Progress: ${i + 1}/${pharmacies.length}`);
    }

    const result = await validatePharmacy(pharmacy, thresholdKm);
    results.push(result);

    if (result.isValid) {
      validCount++;
    } else {
      invalidCount++;
      console.log(
        `[validate] ❌ ${pharmacy.name} (${pharmacy.city}): ${result.issue}`
      );
      if (result.distanceKm !== null) {
        console.log(
          `           Current: ${pharmacy.lat?.toFixed(4)}, ${pharmacy.lng?.toFixed(4)}`
        );
        console.log(
          `           Expected: ${result.expectedLat?.toFixed(4)}, ${result.expectedLng?.toFixed(4)}`
        );
      }
    }

    // Rate limit geocoding requests
    await sleep(config.geocoder.rateLimit);
  }

  // Save results to database
  if (!dryRun && results.length > 0) {
    await prisma.geoValidation.createMany({
      data: results.map((r) => ({
        pharmacyId: r.pharmacyId,
        pharmacyName: r.pharmacyName,
        address: r.address,
        city: r.city,
        region: r.region,
        currentLat: r.currentLat,
        currentLng: r.currentLng,
        expectedLat: r.expectedLat,
        expectedLng: r.expectedLng,
        distanceKm: r.distanceKm,
        isValid: r.isValid,
        issue: r.issue,
      })),
    });
    console.log(`[validate] Saved ${results.length} validation results to database`);
  }

  // Summary
  console.log('\n=== Validation Summary ===');
  console.log(`Total:   ${pharmacies.length}`);
  console.log(`Valid:   ${validCount} (${((validCount / pharmacies.length) * 100).toFixed(1)}%)`);
  console.log(`Invalid: ${invalidCount} (${((invalidCount / pharmacies.length) * 100).toFixed(1)}%)`);

  // List invalid by issue type
  const issueGroups = results
    .filter((r) => !r.isValid)
    .reduce(
      (acc, r) => {
        const key = r.issue || 'Unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  if (Object.keys(issueGroups).length > 0) {
    console.log('\nIssues breakdown:');
    for (const [issue, count] of Object.entries(issueGroups)) {
      console.log(`  ${issue}: ${count}`);
    }
  }

  console.log('\n[validate] Done!');
  console.log('[validate] View results in Grafana: SELECT * FROM geo_validations WHERE is_valid = false ORDER BY distance_km DESC');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
