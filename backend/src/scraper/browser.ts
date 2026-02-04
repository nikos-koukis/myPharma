import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { Browser, Page } from 'puppeteer';
import { config } from '../config';

// Add stealth and adblocker plugins
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Randomize slowMo for more human-like behavior
const SLOW_MO_OPTIONS = [25, 50, 75, 100];

// Randomize language
const LANGUAGES = [
  'el-GR,el;q=0.9,en;q=0.8',
  'en-US,en;q=0.9',
  'en-GB,en;q=0.8',
];

// Randomize window size
const WINDOW_SIZES = ['1920,1080', '1600,1200', '1400,900', '1366,768'];

// User agents pool
const USER_AGENTS = [
  // Desktop Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  // Desktop Firefox
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  // Desktop Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15',
  // Mobile
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/143.0.7499.151 Mobile/15E148 Safari/604.1',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomUserAgent(): string {
  return randomItem(USER_AGENTS);
}

function randomSlowMo(): number {
  return randomItem(SLOW_MO_OPTIONS);
}

function randomLanguage(): string {
  return randomItem(LANGUAGES);
}

function randomWindowSize(): string {
  return randomItem(WINDOW_SIZES);
}

export interface BrowserOptions {
  headless?: boolean;
  display?: number; // X11 display number (e.g., 0 for :0)
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export async function launchBrowser(options: BrowserOptions = {}): Promise<Browser> {
  const { headless = true, display, proxy } = options;
  const windowSize = randomWindowSize();
  const language = randomLanguage();

  // Build Chrome args for anti-detection and headless server compatibility
  const args = [
    // Essential for VPS/Docker
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    // X11 display for visible browser (Linux)
    ...(display !== undefined ? [`--display=:${display}`] : []),
    `--window-size=${windowSize}`,
    `--lang=${language}`,
    // Anti-detection
    '--disable-blink-features=AutomationControlled',
    '--disable-notifications',
    '--disable-infobars',
    '--start-maximized',
    '--disable-popup-blocking',
    '--disable-extensions',
    '--no-default-browser-check',
    '--disable-sync',
    '--ignore-certificate-errors',
    // Reduce resource usage
    '--no-first-run',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-translate',
    '--metrics-recording-only',
  ];

  // Add proxy if configured
  if (proxy?.server) {
    args.push(`--proxy-server=${proxy.server}`);
  } else {
    args.push('--no-proxy-server');
  }

  const browser = await puppeteer.launch({
    args,
    headless,
    slowMo: randomSlowMo(),
    defaultViewport: null,
  });

  return browser as unknown as Browser;
}

export interface PageOptions {
  userAgent?: string;
  viewport?: { width: number; height: number };
  proxy?: {
    username?: string;
    password?: string;
  };
}

export async function createPage(browser: Browser, options: PageOptions = {}): Promise<Page> {
  const page = await browser.newPage();

  // Set user agent
  const userAgent = options.userAgent ?? randomUserAgent();
  await page.setUserAgent(userAgent);

  // Set viewport
  const viewport = options.viewport ?? { width: 1920, height: 1080 };
  await page.setViewport(viewport);

  // Set extra HTTP headers for Greek locale
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
  });

  // Authenticate with proxy if credentials provided
  if (options.proxy?.username && options.proxy?.password) {
    await page.authenticate({
      username: options.proxy.username,
      password: options.proxy.password,
    });
  }

  return page;
}

/**
 * Human-like scroll behavior to bypass bot detection
 */
export async function humanScroll(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      window.scrollBy(
        Math.floor(Math.random() * 50) + 25,
        window.innerHeight + Math.floor(Math.random() * 50) + 25
      );
    });
    await sleep(Math.floor(Math.random() * 500) + 500);

    await page.evaluate(() => {
      window.scrollBy(
        Math.floor(Math.random() * 75) + 50,
        window.innerHeight + Math.floor(Math.random() * 75) + 50
      );
    });
    await sleep(Math.floor(Math.random() * 1000) + 1000);
  } catch {
    // Ignore scroll errors
  }
}

/**
 * Wait for Cloudflare challenge to complete
 */
export async function waitForChallenge(page: Page): Promise<void> {
  try {
    const challengeEl = await page.$('#challenge-running');
    if (challengeEl) {
      await sleep(Math.floor(Math.random() * (11000 - 10000) + 10000));
    }
  } catch {
    // Ignore challenge errors
  }
}

/**
 * Navigate to URL with human-like behavior
 */
export async function navigateTo(
  page: Page,
  url: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? config.scraper.timeout;

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout,
  });

  // Handle potential Cloudflare challenge
  await waitForChallenge(page);

  // Scroll like a human
  await humanScroll(page);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { puppeteer, Browser, Page };
