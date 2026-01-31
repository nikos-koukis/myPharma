import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

import { discoverCities, CityEntry } from './cities';
import { parsePharmacyPage, PharmacyData } from './parser';
import { geocodeAddress, sleep } from './geocoder';
import { prisma } from '../db/client';
import { invalidatePattern } from '../cache/redis';
import { config } from '../config';

export async function runScraper(): Promise<void> {
  console.log(`[scraper] Starting scrape...`);

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Discover all cities dynamically from vrisko.gr
    const discoveryContext = await browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'el-GR',
    });
    const discoveryPage = await discoveryContext.newPage();

    const cities = await discoverCities(discoveryPage);
    await discoveryPage.close();
    await discoveryContext.close();

    console.log(`[scraper] Will scrape ${cities.length} cities...`);

    // 2. Scrape pharmacies from each city in batches
    const allPharmacies: PharmacyData[] = [];

    for (let i = 0; i < cities.length; i += config.scraper.concurrency) {
      const batch = cities.slice(i, i + config.scraper.concurrency);

      const batchResults = await Promise.allSettled(
        batch.map((city) => scrapeCity(browser, city))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allPharmacies.push(...result.value);
        } else {
          console.error(`[scraper] Batch error:`, result.reason);
        }
      }
    }

    console.log(`[scraper] Scraped ${allPharmacies.length} pharmacies total`);

    // 3. Upsert into database
    let saved = 0;
    for (const data of allPharmacies) {
      try {
        const pharmacy = await prisma.pharmacy.upsert({
          where: {
            name_address_city: {
              name: data.name,
              address: data.address,
              city: data.city,
            },
          },
          update: {
            phone: data.phone,
            region: data.region,
          },
          create: {
            name: data.name,
            address: data.address,
            phone: data.phone,
            city: data.city,
            region: data.region,
          },
        });

        // Geocode if missing coordinates
        if (pharmacy.lat === null || pharmacy.lng === null) {
          const coords = await geocodeAddress(data.address, data.city);
          if (coords) {
            await prisma.pharmacy.update({
              where: { id: pharmacy.id },
              data: { lat: coords.lat, lng: coords.lng },
            });
          }
          await sleep(config.geocoder.rateLimit);
        }

        // Upsert duty record
        await prisma.pharmacyDuty.upsert({
          where: {
            pharmacyId_dutyDate_shift: {
              pharmacyId: pharmacy.id,
              dutyDate: new Date(data.dutyDate),
              shift: data.shift,
            },
          },
          update: { scrapedAt: new Date() },
          create: {
            pharmacyId: pharmacy.id,
            dutyDate: new Date(data.dutyDate),
            shift: data.shift,
          },
        });

        saved++;
      } catch (err) {
        console.error(`[scraper] Failed to save pharmacy ${data.name}:`, err);
      }
    }

    console.log(`[scraper] Saved ${saved} pharmacies to database`);

    // Invalidate cache
    await invalidatePattern('pharmacies:*');
    console.log('[scraper] Cache invalidated');
  } finally {
    await browser.close();
  }

  console.log('[scraper] Done');
}

const USER_AGENTS = [
  // Desktop
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15',
  // Mobile
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/143.0.7499.151 Mobile/15E148 Safari/604.1',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function scrapeCity(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer B> ? B : never,
  city: CityEntry
): Promise<PharmacyData[]> {
  const url = city.url.startsWith('http') ? city.url : `https://www.vrisko.gr${city.url}`;
  let attempts = 0;

  while (attempts <= config.scraper.retries) {
    const context = await browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'el-GR',
    });
    const page = await context.newPage();

    try {
      console.log(`[scraper] Scraping ${city.name} (${city.prefecture}) - attempt ${attempts + 1}...`);
      console.log(`[scraper] URL: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: config.scraper.timeout });

      const pharmacies = await parsePharmacyPage(page, city.slug);

      // Set prefecture as region if parser didn't find one
      const enriched = pharmacies.map((p) => ({
        ...p,
        region: p.region || city.prefecture,
      }));

      console.log(`[scraper] Found ${enriched.length} pharmacies in ${city.name}`);
      return enriched;
    } catch (err) {
      attempts++;
      if (attempts > config.scraper.retries) {
        console.error(`[scraper] Failed to scrape ${city.name} after ${config.scraper.retries} retries:`, err);
        return [];
      }
    } finally {
      await page.close();
      await context.close();
    }
  }

  return [];
}
