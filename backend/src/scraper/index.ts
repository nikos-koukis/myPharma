import { launchBrowser, createPage, randomUserAgent, Browser, Page } from './browser';
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
  const browser = await launchBrowser({
    headless: config.scraper.headless,
    display: config.scraper.display,
    proxy,
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
      const discoveryPage = await createPage(browser, {
        userAgent: randomUserAgent(),
        viewport: { width: 1920, height: 1080 },
        proxy: proxy ? { username: proxy.username, password: proxy.password } : undefined,
      });
      await syncCitiesToDb(discoveryPage);
      await discoveryPage.close();
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
        batch.map((city) => scrapeCity(browser, city, proxy))
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

async function scrapeCity(
  browser: Browser,
  city: CityEntry,
  proxy?: { server: string; username: string; password: string }
): Promise<PharmacyData[]> {
  const url = city.url.startsWith('http') ? city.url : `https://www.vrisko.gr${city.url}`;
  let attempts = 0;

  while (attempts <= config.scraper.retries) {
    const page = await createPage(browser, {
      userAgent: randomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      proxy: proxy ? { username: proxy.username, password: proxy.password } : undefined,
    });

    try {
      console.log(`[scraper] Scraping ${city.name} (${city.prefecture})${attempts > 0 ? ` (retry ${attempts}/${config.scraper.retries})` : ''}...`);
      console.log(`[scraper] URL: ${url}`);

      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.scraper.timeout
      });
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
    }
  }

  return [];
}
