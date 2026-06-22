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

function envBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
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
    pharmacyCron: '0 */8 * * *', // Every 4 hours

    // ===== PARALLELIZATION =====
    // Number of cities to scrape concurrently (start conservative, increase if no 429s)
    concurrency: envInt('SCRAPER_CONCURRENCY', 4),

    // Number of prefectures to discover concurrently
    prefectureConcurrency: envInt('SCRAPER_PREFECTURE_CONCURRENCY', 3),

    // ===== RATE LIMITING =====
    // Minimum delay between requests (ms) - actual delay is 1x to 1.5x this value
    minDelayMs: envInt('SCRAPER_MIN_DELAY_MS', 1500),

    // Delay between pagination requests (ms)
    paginationDelayMs: envInt('SCRAPER_PAGINATION_DELAY_MS', 2000),

    // Delay before retrying failed cities (ms)
    retryDelayMs: envInt('SCRAPER_RETRY_DELAY_MS', 10000),

    // ===== TIMEOUTS =====
    timeout: envInt('SCRAPER_TIMEOUT', 30000),
    retries: envInt('SCRAPER_RETRIES', 3),

    // ===== SMART SCRAPING =====
    // Only scrape tomorrow if overnight pharmacies detected today
    smartTomorrowScrape: envBool('SCRAPER_SMART_TOMORROW', true),

    // Skip geocoding for pharmacies that already have coordinates
    skipExistingGeocode: envBool('SCRAPER_SKIP_EXISTING_GEOCODE', true),

    // ===== BATCHING =====
    // Batch size for database operations
    dbBatchSize: envInt('SCRAPER_DB_BATCH_SIZE', 50),

    baseUrl: 'https://www.xo.gr/efimerevonta-farmakeia',
    proxyUrl: env('SCRAPER_PROXY_URL', ''),
    // When true, route EVERY request through proxyUrl (e.g. a SOCKS5 proxy),
    // not just the final retry. Use this to replace a system-wide VPN.
    proxyAlways: envBool('SCRAPER_PROXY_ALWAYS', false),

    // FlareSolverr — when set (e.g. http://127.0.0.1:8191/v1), fetch pages
    // through a headless browser that solves Cloudflare's "Just a moment"
    // managed challenge. Required because xo.gr challenges datacenter IPs and
    // cf_clearance is bound to the browser's TLS fingerprint (can't be reused
    // by curl-impersonate). Takes precedence over curl-impersonate when set.
    flaresolverrUrl: env('FLARESOLVERR_URL', ''),
    flaresolverrSession: env('FLARESOLVERR_SESSION', 'xo'),
    flaresolverrTimeout: envInt('FLARESOLVERR_MAX_TIMEOUT', 60000),

    // ===== FAILED URL RETRY =====
    // Cron schedule for retrying failed URLs (default: every hour)
    retryFailedCron: env('SCRAPER_RETRY_FAILED_CRON', '0 * * * *'),
    // Max URLs to retry per run
    retryBatchSize: envInt('SCRAPER_RETRY_BATCH_SIZE', 50),
    // Max retry attempts before giving up
    maxRetryAttempts: envInt('SCRAPER_MAX_RETRY_ATTEMPTS', 5),
  },

  geocoder: {
    provider: 'nominatim' as 'nominatim' | 'google' | 'geoapify',
    apiKey: env('GEOCODER_API_KEY', ''),
    // Reduced from 1000ms - Geoapify allows 3 req/s on free tier
    rateLimit: envInt('GEOCODER_RATE_LIMIT', 350),
  },
};
