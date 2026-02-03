import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

import { discoverCities, syncCitiesToDb, getCitiesFromDb, CityEntry } from './cities';
import { parsePharmacyPage, PharmacyData } from './parser';
import { geocodeAddress, sleep } from './geocoder';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { invalidatePattern } from '../cache/redis';
import { config } from '../config';

function getProxyConfig() {
  const { server, username, password } = config.proxy;
  if (!server) return undefined;
  console.log(`[scraper] Using proxy: ${server}`);
  return { server, username, password };
}

export interface ScrapeFilter {
  city?: string;
  region?: string;
}

export async function runScraper(filter?: ScrapeFilter): Promise<void> {
  console.log(`[scraper] Starting scrape...`);

  const proxy = getProxyConfig();
  const browser = await chromium.launch({
    headless: true,
    proxy: proxy ? { server: proxy.server } : undefined,
  });

  try {
    // 1. Get cities — from DB if available, otherwise discover from vrisko.gr
    let cities: CityEntry[];
    const dbCities = await getCitiesFromDb();

    if (filter) {
      // When filtering, use DB cities only — don't do full discovery
      cities = dbCities;
      if (filter.city) {
        const q = filter.city.toLowerCase();
        cities = cities.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
        console.log(`[scraper] Filtered by city "${filter.city}" → ${cities.length} matches`);
      } else if (filter.region) {
        const q = filter.region.toLowerCase();
        cities = cities.filter((c) => c.prefecture.toLowerCase().includes(q));
        console.log(`[scraper] Filtered by region "${filter.region}" → ${cities.length} matches`);
      }
      if (cities.length === 0) {
        console.log('[scraper] No cities matched the filter. Run "npm run sync-regions" first to populate the city list.');
        return;
      }
    } else if (dbCities.length > 0 && !config.scraper.scrapeRegions) {
      cities = dbCities;
    } else {
      console.log('[scraper] No cities in DB or scrapeRegions=true, discovering from vrisko.gr...');
      const discoveryContext = await browser.newContext({
        userAgent: randomUserAgent(),
        viewport: { width: 1920, height: 1080 },
        locale: 'el-GR',
        httpCredentials: proxy ? { username: proxy.username, password: proxy.password } : undefined,
        ignoreHTTPSErrors: !!proxy,
      });
      const discoveryPage = await discoveryContext.newPage();
      await syncCitiesToDb(discoveryPage);
      await discoveryPage.close();
      await discoveryContext.close();
      cities = await getCitiesFromDb();
    }

    console.log(`[scraper] Will scrape ${cities.length} cities...`);

    // 2. Scrape pharmacies from each city and save + geocode immediately
    let totalScraped = 0;
    let saved = 0;

    const totalCities = cities.length;
    for (let i = 0; i < totalCities; i += config.scraper.concurrency) {
      const batch = cities.slice(i, i + config.scraper.concurrency);
      const batchEnd = Math.min(i + config.scraper.concurrency, totalCities);
      console.log(`[scraper] Scraping cities [${i + 1}-${batchEnd}/${totalCities}]...`);

      const batchResults = await Promise.allSettled(
        batch.map((city) => scrapeCity(browser, city))
      );

      for (const result of batchResults) {
        if (result.status !== 'fulfilled') {
          console.error(`[scraper] Batch error:`, result.reason);
          continue;
        }

        const pharmacies = result.value;
        totalScraped += pharmacies.length;

        for (const data of pharmacies) {
          try {
            console.log(`[scraper] Saving ${data.name} (${data.city})`);
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

            // Upsert duty record with all duty slots
            await prisma.pharmacyDuty.upsert({
              where: {
                pharmacyId_dutyDate: {
                  pharmacyId: pharmacy.id,
                  dutyDate: new Date(data.dutyDate),
                },
              },
              update: {
                scrapedAt: new Date(),
                duties: data.duties as unknown as Prisma.InputJsonValue,
              },
              create: {
                pharmacyId: pharmacy.id,
                dutyDate: new Date(data.dutyDate),
                duties: data.duties as unknown as Prisma.InputJsonValue,
              },
            });

            saved++;
          } catch (err) {
            console.error(`[scraper] Failed to save pharmacy ${data.name}:`, err);
          }
        }
      }
    }

    console.log(`[scraper] Scraped ${totalScraped}, saved ${saved} pharmacies`);

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
    const proxy = getProxyConfig();
    const context = await browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'el-GR',
      httpCredentials: proxy ? { username: proxy.username, password: proxy.password } : undefined,
      ignoreHTTPSErrors: !!proxy,
    });
    const page = await context.newPage();

    try {
      console.log(`[scraper] Scraping ${city.name} (${city.prefecture})${attempts > 0 ? ` (retry ${attempts}/${config.scraper.retries})` : ''}...`);
      console.log(`[scraper] URL: ${url}`);
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: config.scraper.timeout });
      console.log(`[scraper] Response: ${response?.status()} ${response?.statusText()}`);

      const pharmacies = await parsePharmacyPage(page, city.name);

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
