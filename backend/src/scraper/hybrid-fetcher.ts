/**
 * curl-impersonate fetcher with exponential backoff
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
// Available tags: 0.5-chrome, 0.6-chrome (latest stable)
const DOCKER_IMAGE = 'lwthiker/curl-impersonate:0.6-chrome';
const IS_LINUX = platform() === 'linux';

// Cookie persistence for human-like behavior
interface CookieJar {
  cookies: Map<string, string>;
  requestCount: number;
  lastRefresh: number;
}

const cookieJar: CookieJar = {
  cookies: new Map(),
  requestCount: 0,
  lastRefresh: Date.now(),
};

// Refresh cookies every 50-70 requests (randomized)
const COOKIE_REFRESH_MIN = 50;
const COOKIE_REFRESH_MAX = 70;
let nextCookieRefresh = randomInt(COOKIE_REFRESH_MIN, COOKIE_REFRESH_MAX);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if we should refresh cookies (new session)
 */
function shouldRefreshCookies(): boolean {
  return cookieJar.requestCount >= nextCookieRefresh;
}

/**
 * Reset cookie jar for fresh session
 */
function refreshCookies(): void {
  cookieJar.cookies.clear();
  cookieJar.requestCount = 0;
  cookieJar.lastRefresh = Date.now();
  nextCookieRefresh = randomInt(COOKIE_REFRESH_MIN, COOKIE_REFRESH_MAX);
  console.log(`[fetch] Cookie refresh - next in ${nextCookieRefresh} requests`);
}

/**
 * Parse Set-Cookie headers from response and store in jar
 */
function parseCookies(headers: string): void {
  const setCookieRegex = /set-cookie:\s*([^=]+)=([^;]+)/gi;
  let match;
  while ((match = setCookieRegex.exec(headers)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    cookieJar.cookies.set(name, value);
  }
}

/**
 * Get cookie string for curl -b flag
 */
function getCookieString(): string {
  if (cookieJar.cookies.size === 0) return '';
  const pairs: string[] = [];
  cookieJar.cookies.forEach((value, name) => {
    pairs.push(`${name}=${value}`);
  });
  return pairs.join('; ');
}

// VPN interface - set VPN_INTERFACE env var (e.g., 'tun0') to route through VPN
const VPN_INTERFACE: string | null = process.env.VPN_INTERFACE || null;

// ===== ANTI-DETECTION RANDOMIZATION =====

// Chrome versions available in curl-impersonate 0.6
const CHROME_VERSIONS = [
  'curl_chrome116',
  'curl_chrome110',
  'curl_chrome107',
  'curl_chrome104',
  'curl_chrome99',
  'curl_chrome99_android',  // Mobile fingerprint variety
];

const ACCEPT_LANGUAGES = [
  'el-GR,el;q=0.9,en;q=0.8',
  'el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7',
  'el,en-US;q=0.9,en;q=0.8',
  'el-GR,el;q=0.8,en-GB;q=0.6,en;q=0.4',
  'el-GR,el;q=0.9,en-GB;q=0.8,en;q=0.7',
  'en-US,en;q=0.9,el;q=0.8',  // English primary sometimes
];

const REFERERS = [
  'https://www.google.com/',
  'https://www.google.gr/',
  'https://www.google.com/search?q=efimerevonta+farmakeia',
  'https://www.xo.gr/',
  'https://www.xo.gr/efimerevonta-farmakeia/',
  null, // No referer (direct navigation)
  null, // Increase chance of no referer
];

// Additional randomization: Accept-Encoding variations
const ACCEPT_ENCODINGS = [
  'gzip, deflate, br',
  'gzip, deflate',
  'gzip, deflate, br, zstd',
  'br, gzip, deflate',
];

// Sec-CH-UA variations (browser hints) - shell-safe versions without problematic chars
const SEC_CH_UA = [
  'Chromium;v=116, Not-A.Brand;v=24, Google-Chrome;v=116',
  'Chromium;v=110, Not-A.Brand;v=24, Google-Chrome;v=110',
  'Google-Chrome;v=107, Chromium;v=107, Not-A.Brand;v=24',
  'Chromium;v=104, Google-Chrome;v=104, Not-A.Brand;v=99',
  'Google-Chrome;v=99, Chromium;v=99, Not-A.Brand;v=99',
];

// Track requests for human-like pause pattern
let requestsSinceBreak = 0;
const REQUESTS_BEFORE_BREAK_MIN = 15;
const REQUESTS_BEFORE_BREAK_MAX = 35;

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Escape string for shell (single quotes)
 */
function shellEscape(str: string): string {
  // Use single quotes and escape any single quotes within
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

/**
 * Build curl-impersonate command with randomized headers
 */
function buildCommand(url: string, useProxy: boolean, includeCookies: boolean): string {
  const proxyUrl = config.scraper.proxyUrl;
  const timeout = Math.floor(config.scraper.timeout / 1000);

  // Randomize everything for each request
  const curlBin = randomElement(CHROME_VERSIONS);
  const acceptLang = randomElement(ACCEPT_LANGUAGES);
  const referer = randomElement(REFERERS);
  const acceptEncoding = randomElement(ACCEPT_ENCODINGS);
  const secChUa = randomElement(SEC_CH_UA);
  const isMobile = curlBin.includes('android');

  const curlArgs = [
    '-s',                    // Silent
    '-L',                    // Follow redirects
    '-i',                    // Include headers (for Set-Cookie parsing)
    `-m ${timeout}`,         // Max time
    `-w '\\n%{http_code}'`,  // Output status code at end
    `-H ${shellEscape('accept-language: ' + acceptLang)}`,
    `-H ${shellEscape('accept-encoding: ' + acceptEncoding)}`,
    `-H ${shellEscape('accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8')}`,
    `-H ${shellEscape('cache-control: max-age=0')}`,
    `-H ${shellEscape('sec-ch-ua: ' + secChUa)}`,
    `-H ${shellEscape('sec-ch-ua-mobile: ' + (isMobile ? '?1' : '?0'))}`,
    `-H ${shellEscape('sec-ch-ua-platform: ' + (isMobile ? 'Android' : 'Windows'))}`,
    `-H ${shellEscape('upgrade-insecure-requests: 1')}`,
  ];

  // Add cookies if we have them (human-like persistence)
  if (includeCookies) {
    const cookieStr = getCookieString();
    if (cookieStr) {
      curlArgs.push(`-b ${shellEscape(cookieStr)}`);
    }
  }

  // Add referer randomly (sometimes browsers don't send it)
  if (referer) {
    curlArgs.push(`-H ${shellEscape('referer: ' + referer)}`);
  }

  // Route through VPN interface (Linux only)
  if (VPN_INTERFACE) {
    curlArgs.push(`--interface ${VPN_INTERFACE}`);
  }

  if (useProxy && proxyUrl) {
    curlArgs.push('-k');  // Skip SSL verification (required for MITM proxy)
    curlArgs.push(`-x ${shellEscape(proxyUrl)}`);
  }

  curlArgs.push(shellEscape(url));

  if (IS_LINUX) {
    return `${curlBin} ${curlArgs.join(' ')}`;
  }

  // Docker on macOS
  return `docker run --platform linux/amd64 --rm ${DOCKER_IMAGE} ${curlBin} ${curlArgs.join(' ')}`;
}

/**
 * Execute curl-impersonate
 */
async function executeCurl(url: string, useProxy: boolean, useCookies: boolean): Promise<FetchResult> {
  const cmd = buildCommand(url, useProxy, useCookies);

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
    const fullResponse = lines.join('\n');

    // Separate headers from body
    let html = fullResponse;
    let headers = '';

    const separatorMatch = fullResponse.match(/^([\s\S]*?\r?\n\r?\n)([\s\S]*)$/);
    if (separatorMatch) {
      const parts = fullResponse.split(/\r?\n\r?\n/);
      html = parts[parts.length - 1];
      headers = parts.slice(0, -1).join('\n\n');
      parseCookies(headers);
    }

    cookieJar.requestCount++;

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

    if (error.stderr?.includes('Cannot connect to the Docker daemon')) {
      throw new Error('Docker is not running. Please start Docker Desktop.');
    }

    throw new Error(`curl-impersonate failed: ${error.message}`);
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 * @param attempt - Attempt number (1-based)
 * @param baseMs - Base delay in milliseconds
 * @returns Delay in milliseconds
 */
function getBackoffDelay(attempt: number, baseMs: number = 2000): number {
  // Exponential: 2s, 4s, 8s, 16s...
  const exponential = Math.pow(2, attempt) * baseMs;
  // Add jitter: ±25%
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
  // Cap at 30 seconds
  return Math.min(exponential + jitter, 30000);
}

/**
 * Check if we should take a human-like break (occasional longer pause)
 */
function shouldTakeBreak(): boolean {
  const threshold = randomInt(REQUESTS_BEFORE_BREAK_MIN, REQUESTS_BEFORE_BREAK_MAX);
  return requestsSinceBreak >= threshold;
}

/**
 * Take a human-like break (5-15 seconds)
 */
async function takeHumanBreak(): Promise<void> {
  const breakDuration = randomInt(5000, 15000);
  console.log(`[fetch] Taking human-like break for ${Math.round(breakDuration / 1000)}s...`);
  await sleep(breakDuration);
  requestsSinceBreak = 0;
}

/**
 * Fetch a page using curl-impersonate with exponential backoff retry
 * @param url - URL to fetch
 * @param maxRetries - Maximum number of retries (default from config)
 */
export async function fetchPage(url: string, maxRetries: number = config.scraper.retries): Promise<FetchResult> {
  // Extract city slug for logging
  const slug = url.match(/farmakeia\/([^/?]+)/)?.[1] || url;

  // Human-like break: occasionally pause for longer (like getting distracted)
  if (shouldTakeBreak()) {
    await takeHumanBreak();
  }
  requestsSinceBreak++;

  // Check if we should refresh cookies
  if (shouldRefreshCookies()) {
    refreshCookies();
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const useProxy = false; // Only use proxy on final retry
    const useCookies = cookieJar.cookies.size > 0;

    if (attempt > 1) {
      const backoffMs = getBackoffDelay(attempt - 1);
      console.log(`[fetch] Retry ${attempt}/${maxRetries} for ${slug} after ${Math.round(backoffMs)}ms`);
      await sleep(backoffMs);
    } else {
      console.log(`[fetch] ${slug}${useCookies ? ' [cookies]' : ''}`);
    }

    try {
      const result = await executeCurl(url, useProxy, useCookies);

      // Track HTTP status code in metrics
      scraperHttpStatusTotal.inc({ status_code: String(result.status) });

      // Success - return result
      if (result.status >= 200 && result.status < 400) {
        // Check for Cloudflare challenge
        if (result.html.includes('challenge-running') ||
            result.html.includes('cf-challenge') ||
            result.html.includes('Just a moment')) {
          lastError = new Error('Cloudflare challenge detected');
          continue; // Retry
        }
        return result;
      }

      // Rate limited - retry with backoff
      if (result.status === 429 || result.status === 403) {
        lastError = new Error(`HTTP ${result.status}: Rate limited`);
        // Clear cookies on rate limit (might be flagged)
        if (result.status === 429) {
          refreshCookies();
        }
        continue; // Retry
      }

      // Server error - retry
      if (result.status >= 500) {
        lastError = new Error(`HTTP ${result.status}: Server error`);
        continue; // Retry
      }

      // Other error (4xx except 403/429) - don't retry
      throw new Error(`HTTP ${result.status}: Client error`);

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Timeout or network error - retry
      if (lastError.message.includes('timed out') || lastError.message.includes('network')) {
        continue;
      }

      // Docker not running - fatal, don't retry
      if (lastError.message.includes('Docker')) {
        throw lastError;
      }

      // Other errors - retry
      continue;
    }
  }

  // All retries exhausted
  throw lastError || new Error('Fetch failed after all retries');
}

/**
 * No-op for compatibility - reset cookies silently
 */
export async function closeBrowser(): Promise<void> {
  cookieJar.cookies.clear();
  cookieJar.requestCount = 0;
}
