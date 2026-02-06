import { fetchPage } from './curl-fetcher';
import { parsePharmacyHtml, PharmacyData } from './html-parser';
import { getActiveCities, CityConfig, getCityUrl } from './city-list';
import { geocodeAddress, sleep } from './geocoder';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { invalidatePattern } from '../cache/redis';
import { config } from '../config';

/**
 * Main scraper entry point — scrapes all cities from the hardcoded city list
 */
export async function runScraper(): Promise<void> {
  const cities = getActiveCities();
  console.log(`[scraper] Will scrape ${cities.length} cities...`);

  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      totalCities: cities.length,
      status: 'running',
    },
  });

  const startTime = Date.now();
  let totalScraped = 0;
  let saved = 0;
  let successCities = 0;
  let failedCities = 0;

  try {
    const totalCities = cities.length;
    for (let i = 0; i < totalCities; i += config.scraper.concurrency) {
      const batch = cities.slice(i, i + config.scraper.concurrency);
      const batchEnd = Math.min(i + config.scraper.concurrency, totalCities);
      console.log(`[scraper] Scraping cities [${i + 1}-${batchEnd}/${totalCities}]...`);

      const batchResults = await Promise.allSettled(
        batch.map((city) => scrapeCityTracked(city, scrapeRun.id))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          totalScraped += result.value.pharmaciesFound;
          saved += result.value.dutiesSaved;
          if (result.value.success) successCities++;
          else failedCities++;
        } else {
          failedCities++;
          console.error(`[scraper] Batch error:`, result.reason);
        }
      }
    }

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        successCities,
        failedCities,
        totalPharmacies: totalScraped,
        totalDuties: saved,
        durationMs: Date.now() - startTime,
      },
    });

    console.log(`[scraper] Scraped ${totalScraped}, saved ${saved} pharmacies`);
    await invalidatePattern('pharmacies:*');
    console.log('[scraper] Cache invalidated');
    console.log('[scraper] Done');
  } catch (err) {
    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        successCities,
        failedCities,
        totalPharmacies: totalScraped,
        totalDuties: saved,
        durationMs: Date.now() - startTime,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

interface CityScrapResult {
  pharmaciesFound: number;
  dutiesSaved: number;
  success: boolean;
}

/**
 * Scrape a single city with tracking — records results to scrape_city_results
 */
async function scrapeCityTracked(city: CityConfig, scrapeRunId: string): Promise<CityScrapResult> {
  const cityStart = Date.now();
  const url = getCityUrl(city);

  try {
    console.log(`[scraper] Scraping ${city.name} (${city.prefecture})...`);
    console.log(`[scraper] URL: ${url}`);

    const { html, status: httpStatus } = await fetchPage(url, config.scraper.retries);
    console.log(`[scraper] Response: ${httpStatus}`);

    const pharmacies = parsePharmacyHtml(html, city.name, city.prefecture);
    const enriched = pharmacies.map((p) => ({
      ...p,
      region: p.region || city.prefecture,
    }));

    let dutiesSaved = 0;
    for (const data of enriched) {
      dutiesSaved += await savePharmacy(data);
    }

    await prisma.scrapeCityResult.create({
      data: {
        scrapeRunId,
        city: city.name,
        prefecture: city.prefecture,
        status: enriched.length > 0 ? 'success' : 'no_data',
        url,
        pharmaciesFound: enriched.length,
        dutiesFound: dutiesSaved,
        durationMs: Date.now() - cityStart,
        httpStatus,
      },
    });

    return { pharmaciesFound: enriched.length, dutiesSaved, success: true };
  } catch (err) {
    console.error(`[scraper] Failed to scrape ${city.name}:`, err);

    await prisma.scrapeCityResult.create({
      data: {
        scrapeRunId,
        city: city.name,
        prefecture: city.prefecture,
        status: 'failed',
        url,
        durationMs: Date.now() - cityStart,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });

    return { pharmaciesFound: 0, dutiesSaved: 0, success: false };
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
