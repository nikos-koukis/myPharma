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
function buildCommand(url: string, useProxy: boolean, includeCookies: boolean): string {
  const proxyUrl = config.scraper.proxyUrl;
  const timeout = Math.floor(config.scraper.timeout / 1000);

  // Randomize Chrome version for each request
  const curlBin = randomElement(CHROME_VERSIONS);
  const acceptLang = randomElement(ACCEPT_LANGUAGES);
  const referer = randomElement(REFERERS);

  const curlArgs = [
    '-s',                    // Silent
    '-L',                    // Follow redirects
    '-i',                    // Include headers (for Set-Cookie parsing)
    `-m ${timeout}`,         // Max time
    '-w "\\n%{http_code}"',  // Output status code at end
    `-H "accept-language: ${acceptLang}"`,
    '-H "accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"',
    '-H "cache-control: max-age=0"',
    '-H "sec-ch-ua-mobile: ?0"',
    '-H "sec-ch-ua-platform: \\"Windows\\""',
    '-H "upgrade-insecure-requests: 1"',
  ];

  // Add cookies if we have them (human-like persistence)
  if (includeCookies) {
    const cookieStr = getCookieString();
    if (cookieStr) {
      curlArgs.push(`-b "${cookieStr}"`);
    }
  }

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

    // Last line is status code (from -w flag)
    const lines = stdout.split('\n');
    const statusCode = parseInt(lines.pop() || '0', 10);
    const fullResponse = lines.join('\n');

    // Separate headers from body (headers end at first \r\n\r\n or \n\n)
    // With -L (follow redirects), there may be multiple header blocks
    let html = fullResponse;
    let headers = '';

    // Find the last header/body separator (in case of redirects)
    const separatorMatch = fullResponse.match(/^([\s\S]*?\r?\n\r?\n)([\s\S]*)$/);
    if (separatorMatch) {
      // There might be multiple redirects, find the final body
      const parts = fullResponse.split(/\r?\n\r?\n/);
      // Last part is the body, everything before is headers
      html = parts[parts.length - 1];
      headers = parts.slice(0, -1).join('\n\n');

      // Parse and store cookies from all headers
      parseCookies(headers);
    }

    // Increment request counter
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

    // Check for Docker not running
    if (error.stderr?.includes('Cannot connect to the Docker daemon')) {
      throw new Error('Docker is not running. Please start Docker Desktop.');
    }

    throw new Error(`curl-impersonate failed: ${error.message}`);
  }
}

/**
 * Fetch a page using curl-impersonate (no retries - fail fast)
 */
export async function fetchPage(url: string): Promise<FetchResult> {
  // Extract city slug from URL for cleaner logging
  const slug = url.match(/farmakeia\/([^/?]+)/)?.[1] || url;

  // Check if we should refresh cookies (start fresh session)
  if (shouldRefreshCookies()) {
    refreshCookies();
  }

  const useProxy = false;
  // Use cookies if we have them (after first successful request)
  const useCookies = cookieJar.cookies.size > 0;

  console.log(`[fetch] ${slug}${useCookies ? ' [cookies]' : ''}`);

  const result = await executeCurl(url, useProxy, useCookies);

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
}

/**
 * No-op for compatibility
 */
export async function closeBrowser(): Promise<void> {
  // No browser to close - but reset cookies silently for next run
  cookieJar.cookies.clear();
  cookieJar.requestCount = 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
