import { config } from '../config';

interface GeoResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string, city: string): Promise<GeoResult | null> {
  const query = `${address}, ${city}, Greece`;

  // Try Nominatim first (free)
  let result = await geocodeNominatim(query);

  // Fallback to Geoapify if Nominatim fails and API key is set
  if (!result && config.geocoder.apiKey) {
    result = await geocodeGeoapify(query);
  }

  if (result) {
    console.log(`[geo] ${city}: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
  }

  return result;
}

async function geocodeNominatim(query: string): Promise<GeoResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'myPharma/1.0' },
  });

  if (!res.ok) return null;

  const data = await res.json() as Array<{ lat: string; lon: string }>;
  if (data.length === 0) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function geocodeGeoapify(query: string): Promise<GeoResult | null> {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${config.geocoder.apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json() as {
    features: Array<{ properties: { lat: number; lon: number } }>;
  };
  if (data.features.length === 0) return null;

  const props = data.features[0].properties;
  return { lat: props.lat, lng: props.lon };
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
