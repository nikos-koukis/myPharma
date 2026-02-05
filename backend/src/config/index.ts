import dotenv from 'dotenv';
dotenv.config();

function env(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function envInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export const config = {
  server: {
    port: envInt('PORT', 3000),
    host: env('HOST', '0.0.0.0'),
  },

  db: {
    url: env('DATABASE_URL'),
  },

  redis: {
    url: env('REDIS_URL', 'redis://localhost:6380'),
  },

  cache: {
    defaultTTL: 3600,
    nearbyPrecision: 2,
    enabled: true,
  },

  scraper: {
    pharmacyCron: '41 12 * * *',          // Daily at 6 AM
    concurrency: 3,
    timeout: 30000,
    retries: 3,
    baseUrl: 'https://www.vrisko.gr/efimeries-farmakeion',
  },

  geocoder: {
    provider: 'nominatim' as 'nominatim' | 'google' | 'geoapify',
    apiKey: env('GEOCODER_API_KEY', ''),
    rateLimit: 1000,
  },
};
