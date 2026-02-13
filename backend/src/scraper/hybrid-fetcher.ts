/**
 * curl-impersonate fetcher
 * Uses curl-impersonate to mimic Chrome's TLS fingerprint and bypass Cloudflare
 * - Linux: uses native curl_chrome116 (must be installed)
 * - macOS: uses Docker with platform emulation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import { config } from '../config';
import { scraperHttpStatusTotal } from '../metrics';

const execAsync = promisify(exec);

export interface FetchResult {
  html: string;
  status: number;
  url: string;
  usedProxy: boolean;
}

// Docker image for curl-impersonate Chrome variant (macOS only)
const DOCKER_IMAGE = 'lwthiker/curl-impersonate:0.6-chrome';
const IS_LINUX = platform() === 'linux';

// VPN interface - set VPN_INTERFACE env var (e.g., 'tun0') to route through VPN
const VPN_INTERFACE: string | null = process.env.VPN_INTERFACE || null;

// Randomization options to avoid detection
const CHROME_VERSIONS = ['curl_chrome116', 'curl_chrome110', 'curl_chrome107', 'curl_chrome104'];

const ACCEPT_LANGUAGES = [
  'el-GR,el;q=0.9,en;q=0.8',
  'el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7',
  'el,en-US;q=0.9,en;q=0.8',
  'el-GR,el;q=0.8,en-GB;q=0.6,en;q=0.4',
];

const REFERERS = [
  'https://www.google.com/',
  'https://www.google.gr/',
  'https://www.xo.gr/',
  null, // No referer sometimes
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Build curl-impersonate command with randomized headers
 * Uses native binary on Linux, Docker on macOS
 */
function buildCommand(url: string, useProxy: boolean): string {
  const proxyUrl = config.scraper.proxyUrl;
  const timeout = Math.floor(config.scraper.timeout / 1000);

  // Randomize Chrome version for each request
  const curlBin = randomElement(CHROME_VERSIONS);
  const acceptLang = randomElement(ACCEPT_LANGUAGES);
  const referer = randomElement(REFERERS);

  const curlArgs = [
    '-s',                    // Silent
    '-L',                    // Follow redirects
    `-m ${timeout}`,         // Max time
    '-w "\\n%{http_code}"',  // Output status code at end
    `-H "accept-language: ${acceptLang}"`,
    '-H "accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"',
    '-H "cache-control: max-age=0"',
    '-H "sec-ch-ua-mobile: ?0"',
    '-H "sec-ch-ua-platform: \\"Windows\\""',
    '-H "upgrade-insecure-requests: 1"',
  ];

  // Add referer randomly (sometimes browsers don't send it)
  if (referer) {
    curlArgs.push(`-H "referer: ${referer}"`);
  }

  // Route through VPN interface (Linux only, set VPN_INTERFACE=tun0)
  if (VPN_INTERFACE) {
    curlArgs.push(`--interface ${VPN_INTERFACE}`);
  }

  if (useProxy && proxyUrl) {
    curlArgs.push('-k');  // Skip SSL verification (required for Bright Data MITM proxy)
    curlArgs.push(`-x "${proxyUrl}"`);
  }

  curlArgs.push(`"${url}"`);

  if (IS_LINUX) {
    // Native curl-impersonate on Linux
    return `${curlBin} ${curlArgs.join(' ')}`;
  }

  // Docker on macOS (with platform emulation for ARM)
  return `docker run --platform linux/amd64 --rm ${DOCKER_IMAGE} ${curlBin} ${curlArgs.join(' ')}`;
}

/**
 * Execute curl-impersonate via Docker
 */
async function executeCurl(url: string, useProxy: boolean): Promise<FetchResult> {
  const cmd = buildCommand(url, useProxy);

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      maxBuffer: 20 * 1024 * 1024, // 20MB
      timeout: config.scraper.timeout + 30000, // Extra time for Docker
    });

    if (stderr && !stderr.includes('Warning') && !stderr.includes('Pulling')) {
      console.warn('[fetch] stderr:', stderr.substring(0, 100));
    }

    // Last line is status code
    const lines = stdout.split('\n');
    const statusCode = parseInt(lines.pop() || '0', 10);
    const html = lines.join('\n');

    return {
      html,
      status: statusCode,
      url,
      usedProxy: useProxy,
    };
  } catch (err) {
    const error = err as Error & { killed?: boolean; code?: string | number; stderr?: string };

    if (error.killed) {
      throw new Error('Request timed out');
    }

    // Check for Docker not running
    if (error.stderr?.includes('Cannot connect to the Docker daemon')) {
      throw new Error('Docker is not running. Please start Docker Desktop.');
    }

    throw new Error(`curl-impersonate failed: ${error.message}`);
  }
}

/**
 * Fetch a page using curl-impersonate
 */
export async function fetchPage(url: string, retries = 3): Promise<FetchResult> {
  let lastError: Error | null = null;

  // Extract city slug from URL for cleaner logging
  const slug = url.match(/farmakeia\/([^/?]+)/)?.[1] || url;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const useProxy = false;

    try {
      console.log(`[fetch] ${slug}${attempt > 1 ? ` (retry ${attempt})` : ''}`);

      const result = await executeCurl(url, useProxy);

      // Track HTTP status code in metrics
      scraperHttpStatusTotal.inc({ status_code: String(result.status) });

      // Check for blocked
      if (result.status === 403 || result.status === 429) {
        throw new Error(`HTTP ${result.status}: Blocked`);
      }

      if (result.status === 0 || result.status >= 500) {
        throw new Error(`HTTP ${result.status}: Server error`);
      }

      // Check for Cloudflare challenge (shouldn't happen with impersonate)
      if (result.html.includes('challenge-running') || result.html.includes('cf-challenge') || result.html.includes('Just a moment')) {
        throw new Error('Cloudflare challenge detected');
      }

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[fetch] Failed ${slug}: ${lastError.message}`);

      if (attempt < retries) {
        // Randomized exponential backoff (adds 0-50% jitter)
        const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        const jitter = baseDelay * Math.random() * 0.5;
        await sleep(baseDelay + jitter);
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
        const failedUrl = batch[batchResults.indexOf(res)];
        results.set(failedUrl, res.reason);
      }
    }

    // Delay between batches
    if (i + concurrency < urls.length) {
      await sleep(500 + Math.random() * 500);
    }
  }

  return results;
}

/**
 * No-op for compatibility
 */
export async function closeBrowser(): Promise<void> {
  // No browser to close
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
