import client from 'prom-client';

// Default Node.js metrics (CPU, memory, event loop, heap, GC)
client.collectDefaultMetrics({
  prefix: 'mypharma_',
});

// HTTP request duration
export const httpRequestDuration = new client.Histogram({
  name: 'mypharma_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// HTTP request counter
export const httpRequestsTotal = new client.Counter({
  name: 'mypharma_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});

// Cache metrics
export const cacheHitsTotal = new client.Counter({
  name: 'mypharma_cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['key_prefix'] as const,
});

export const cacheMissesTotal = new client.Counter({
  name: 'mypharma_cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['key_prefix'] as const,
});

// Scraper gauges
export const scraperLastRunDuration = new client.Gauge({
  name: 'mypharma_scraper_last_run_duration_seconds',
  help: 'Duration of the last scraper run in seconds',
});

export const scraperLastRunTimestamp = new client.Gauge({
  name: 'mypharma_scraper_last_run_timestamp',
  help: 'Unix timestamp of the last scraper run',
});

export const scraperLastRunPharmacies = new client.Gauge({
  name: 'mypharma_scraper_last_run_pharmacies',
  help: 'Number of pharmacies found in last scraper run',
});

export { client };
