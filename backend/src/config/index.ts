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
    mode: env('SCRAPER_MODE', 'curl') as 'puppeteer' | 'curl', // 'curl' for lightweight, 'puppeteer' for full browser
    pharmacyCron: '0 6 * * *',          // Daily at 6 AM — scrape pharmacies
    regionCron: '0 5 * * 0',            // Weekly Sunday at 5 AM — refresh regions
    scrapeRegions: false,                // If true, daily cron also refreshes regions
    concurrency: 3,
    timeout: 30000,
    retries: 3,
    baseUrl: 'https://www.vrisko.gr/efimeries-farmakeion',
    headless: env('SCRAPER_HEADLESS', 'true') === 'true',  // Set to false to see browser
    display: process.env.SCRAPER_DISPLAY ? envInt('SCRAPER_DISPLAY', 0) : undefined, // X11 display (e.g., 0 for :0)
  },

  proxy: {
    server: env('PROXY_SERVER', ''),
    username: env('PROXY_USERNAME', ''),
    password: env('PROXY_PASSWORD', ''),
  },

  geocoder: {
    provider: 'nominatim' as 'nominatim' | 'google' | 'geoapify',
    apiKey: env('GEOCODER_API_KEY', ''),
    rateLimit: 1000,
  },
};
