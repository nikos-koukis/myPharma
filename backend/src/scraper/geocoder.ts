import { config } from '../config';

interface GeoResult {
  lat: number;
  lng: number;
}

/**
 * Clean address to extract just street + number
 * "Τρικούπη Χαρίλαου 33, Άνω Τριανδρια, 55337 Τριανδρία" → "Τρικούπη Χαρίλαου 33"
 */
function cleanAddress(address: string): string {
  // Take only the first part before comma (street + number)
  const streetPart = address.split(',')[0].trim();
  // Remove intersection part if present (e.g., "& Εξάρχη Λάζου")
  return streetPart.split('&')[0].trim();
}

/**
 * Extract main city from address using postal code pattern
 * "Αγίας Σοφίας 54, Αγία Σοφία, 26223 Πάτρα Αχαΐας" → "Πάτρα"
 */
function extractMainCity(address: string): string | null {
  // Match postal code followed by city name (5 digits + space + Greek word)
  const match = address.match(/\d{5}\s+([^\s,]+)/);
  return match ? match[1] : null;
}

/**
 * Clean city name to remove parentheses content
 * "Άνω Τριανδρια (Τριανδρία Θεσσαλονίκης)" → "Άνω Τριανδρια"
 */
function cleanCity(city: string): string {
  return city.replace(/\s*\([^)]*\)/g, '').trim();
}

export async function geocodeAddress(address: string, city: string): Promise<GeoResult | null> {
  if (!config.geocoder.apiKey) {
    console.warn('[geo] No Geoapify API key configured');
    return null;
  }

  const cleanedAddress = cleanAddress(address);
  // Try to extract main city from address (e.g., "26223 Πάτρα" → "Πάτρα")
  // This helps disambiguate neighborhoods like "Αγία Σοφία" that exist in multiple cities
  const mainCity = extractMainCity(address);
  const cleanedCity = mainCity || cleanCity(city);
  const query = `${cleanedAddress}, ${cleanedCity}, Greece`;

  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${config.geocoder.apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json() as {
    features: Array<{ properties: { lat: number; lon: number } }>;
  };
  if (data.features.length === 0) return null;

  const props = data.features[0].properties;
  const result = { lat: props.lat, lng: props.lon };

  console.log(`[geo] ${cleanedCity}: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
  return result;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
