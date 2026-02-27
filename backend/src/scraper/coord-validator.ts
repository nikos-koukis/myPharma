/**
 * Coordinate validation module.
 * Validates pharmacy coordinates against geocoder results.
 * Results are stored in geo_validations table for Grafana dashboards.
 */

import { prisma } from '../db/client';
import { geocodeAddress, sleep } from './geocoder';
import { config } from '../config';
import {
  geoValidationTotal,
  geoValidationValid,
  geoValidationInvalid,
  geoValidationLastRun,
} from '../metrics';

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

interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
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
  const R = 6371;
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

  if (pharmacy.lat === null || pharmacy.lng === null) {
    result.isValid = false;
    result.issue = 'Missing coordinates';
    return result;
  }

  const geocoded = await geocodeAddress(pharmacy.address, pharmacy.city);

  if (!geocoded) {
    result.isValid = false;
    result.issue = 'Geocoding failed';
    return result;
  }

  result.expectedLat = geocoded.lat;
  result.expectedLng = geocoded.lng;

  const distance = haversineDistance(
    pharmacy.lat,
    pharmacy.lng,
    geocoded.lat,
    geocoded.lng
  );
  result.distanceKm = Math.round(distance * 1000) / 1000;

  if (distance > thresholdKm) {
    result.isValid = false;
    result.issue = `Distance ${result.distanceKm.toFixed(2)}km exceeds threshold ${thresholdKm}km`;
  }

  return result;
}

export interface ValidateOptions {
  region?: string;
  thresholdKm?: number;
  fix?: boolean; // Auto-fix invalid coordinates
}

/**
 * Run coordinate validation for all pharmacies (or filtered by region).
 * Stores results in geo_validations table.
 */
export async function runCoordValidation(
  options: ValidateOptions = {}
): Promise<ValidationSummary> {
  const { region, thresholdKm = DEFAULT_THRESHOLD_KM, fix = false } = options;

  console.log('[validate] Starting coordinate validation...');
  console.log(`[validate] Threshold: ${thresholdKm}km`);
  if (region) console.log(`[validate] Region filter: ${region}`);
  if (fix) console.log('[validate] Auto-fix enabled');

  const where = region ? { region: { contains: region } } : {};
  const pharmacies = await prisma.pharmacy.findMany({
    where,
    orderBy: { region: 'asc' },
  });

  console.log(`[validate] Found ${pharmacies.length} pharmacies to validate`);

  // Clear previous validation results
  if (region) {
    await prisma.geoValidation.deleteMany({
      where: { region: { contains: region } },
    });
  } else {
    await prisma.geoValidation.deleteMany({});
  }

  const results: ValidationResult[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let fixedCount = 0;

  for (let i = 0; i < pharmacies.length; i++) {
    const pharmacy = pharmacies[i];

    if ((i + 1) % 50 === 0 || i === pharmacies.length - 1) {
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

      // Auto-fix if enabled and we have expected coordinates
      if (fix && result.expectedLat !== null && result.expectedLng !== null) {
        await prisma.pharmacy.update({
          where: { id: pharmacy.id },
          data: { lat: result.expectedLat, lng: result.expectedLng },
        });
        fixedCount++;
        console.log(`[validate] ✅ Fixed coordinates for ${pharmacy.name}`);
      }
    }

    await sleep(config.geocoder.rateLimit);
  }

  // Save validation results
  if (results.length > 0) {
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
  }

  console.log(`[validate] Done! Valid: ${validCount}, Invalid: ${invalidCount}${fix ? `, Fixed: ${fixedCount}` : ''}`);

  // Update Prometheus metrics for Grafana
  geoValidationTotal.set(pharmacies.length);
  geoValidationValid.set(validCount);
  geoValidationInvalid.set(invalidCount);
  geoValidationLastRun.set(Date.now() / 1000);

  return { total: pharmacies.length, valid: validCount, invalid: invalidCount };
}
