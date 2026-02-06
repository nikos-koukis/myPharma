/**
 * Lightweight HTTP fetcher using Node.js native fetch.
 * Alternative to Puppeteer for memory-constrained environments.
 * Supports proxy on retry via SCRAPER_PROXY_URL env variable.
 */

import { config } from '../config';
import { ProxyAgent } from 'undici';

// User agents pool for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Build headers mimicking a real browser request
 */
function buildHeaders(): Record<string, string> {
  return {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'el-GR,el;q=0.9,en;q=0.8',
    'cache-control': 'max-age=0',
    'priority': 'u=0, i',
    'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': randomUserAgent(),
  };
}

export interface FetchResult {
  html: string;
  status: number;
  url: string;
  usedProxy: boolean;
}

/**
 * Create proxy agent if configured
 */
function getProxyAgent(): ProxyAgent | undefined {
  const proxyUrl = config.scraper.proxyUrl;
  if (!proxyUrl) return undefined;
  return new ProxyAgent(proxyUrl);
}

/**
 * Fetch a URL with browser-like headers
 * Uses proxy on retry if SCRAPER_PROXY_URL is configured
 */
export async function fetchPage(url: string, retries = 3): Promise<FetchResult> {
  let lastError: Error | null = null;
  const proxyAgent = getProxyAgent();

  for (let attempt = 1; attempt <= retries; attempt++) {
    // Use proxy on retry (attempt 2+) if configured
    const useProxy = attempt > 1 && proxyAgent;

    try {
      if (useProxy) {
        console.log(`[curl] 🔄 USING PROXY for retry ${attempt}/${retries}: ${url}`);
      } else {
        console.log(`[curl] Fetching ${url}${attempt > 1 ? ` (retry ${attempt}/${retries})` : ''}`);
      }

      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: buildHeaders(),
        redirect: 'follow',
      };

      // Add proxy dispatcher on retry
      if (useProxy) {
        (fetchOptions as any).dispatcher = proxyAgent;
      }

      const response = await fetch(url, fetchOptions);

      console.log(`[curl] Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Check for Cloudflare challenge page
      if (html.includes('challenge-running') || html.includes('cf-challenge')) {
        throw new Error('Cloudflare challenge detected - curl mode cannot bypass this');
      }

      // Check for access denied
      if (html.includes('Access Denied') || html.includes('403 Forbidden')) {
        throw new Error('Access denied - site may be blocking requests');
      }

      return {
        html,
        status: response.status,
        url: response.url,
        usedProxy: !!useProxy,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[curl] Attempt ${attempt} failed:`, lastError.message);

      if (attempt < retries) {
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[curl] Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Failed to fetch page');
}

/**
 * Fetch multiple pages with concurrency control
 */
export async function fetchPages(
  urls: string[],
  concurrency = 3
): Promise<Map<string, FetchResult | Error>> {
  const results = new Map<string, FetchResult | Error>();

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (url) => {
        const result = await fetchPage(url);
        return { url, result };
      })
    );

    for (const res of batchResults) {
      if (res.status === 'fulfilled') {
        results.set(res.value.url, res.value.result);
      } else {
        // Find the URL that failed
        const failedUrl = batch[batchResults.indexOf(res)];
        results.set(failedUrl, res.reason);
      }
    }

    // Small delay between batches to be nice to the server
    if (i + concurrency < urls.length) {
      await sleep(500 + Math.random() * 500);
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
