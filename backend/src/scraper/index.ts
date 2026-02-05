import { fetchPage } from './curl-fetcher';
import { parsePharmacyHtml, PharmacyData } from './html-parser';
import { CITY_LIST, CityConfig, getCityUrl } from './city-list';
import { geocodeAddress, sleep } from './geocoder';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { invalidatePattern } from '../cache/redis';
import { config } from '../config';

/**
 * Main scraper entry point — scrapes all cities from the hardcoded city list
 */
export async function runScraper(): Promise<void> {
  const cities = CITY_LIST;
  console.log(`[scraper] Will scrape ${cities.length} cities...`);

  let totalScraped = 0;
  let saved = 0;

  const totalCities = cities.length;
  for (let i = 0; i < totalCities; i += config.scraper.concurrency) {
    const batch = cities.slice(i, i + config.scraper.concurrency);
    const batchEnd = Math.min(i + config.scraper.concurrency, totalCities);
    console.log(`[scraper] Scraping cities [${i + 1}-${batchEnd}/${totalCities}]...`);

    const batchResults = await Promise.allSettled(
      batch.map((city) => scrapeCity(city))
    );

    for (const result of batchResults) {
      if (result.status !== 'fulfilled') {
        console.error(`[scraper] Batch error:`, result.reason);
        continue;
      }

      const pharmacies = result.value;
      totalScraped += pharmacies.length;

      for (const data of pharmacies) {
        saved += await savePharmacy(data);
      }
    }
  }

  console.log(`[scraper] Scraped ${totalScraped}, saved ${saved} pharmacies`);
  await invalidatePattern('pharmacies:*');
  console.log('[scraper] Cache invalidated');
  console.log('[scraper] Done');
}

/**
 * Scrape a single city using HTTP fetch + cheerio
 */
async function scrapeCity(city: CityConfig): Promise<PharmacyData[]> {
  const url = getCityUrl(city);

  try {
    console.log(`[scraper] Scraping ${city.name} (${city.prefecture})...`);
    console.log(`[scraper] URL: ${url}`);

    const { html, status } = await fetchPage(url, config.scraper.retries);
    console.log(`[scraper] Response: ${status}`);

    const pharmacies = parsePharmacyHtml(html, city.name, city.prefecture);

    const enriched = pharmacies.map((p) => ({
      ...p,
      region: p.region || city.prefecture,
    }));

    return enriched;
  } catch (err) {
    console.error(`[scraper] Failed to scrape ${city.name}:`, err);
    return [];
  }
}

/**
 * Save pharmacy data to database
 */
async function savePharmacy(data: PharmacyData): Promise<number> {
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

    // Upsert duty record
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

    return 1;
  } catch (err) {
    console.error(`[scraper] Failed to save pharmacy ${data.name}:`, err);
    return 0;
  }
}
