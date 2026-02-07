import { fetchPage, closeBrowser } from './hybrid-fetcher';
import { parsePharmacyHtml, PharmacyData } from './html-parser';
import { getActiveCities, CityConfig, getCityUrl, getTodayForXo, getTomorrowForXo } from './city-list';
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
    // Parallel scraping in batches
    for (let i = 0; i < cities.length; i += config.scraper.concurrency) {
      const batch = cities.slice(i, i + config.scraper.concurrency);
      const batchEnd = Math.min(i + config.scraper.concurrency, cities.length);
      console.log(`[scraper] [${i + 1}-${batchEnd}/${cities.length}]`);

      const results = await Promise.allSettled(
        batch.map((city) => scrapeCityTracked(city, scrapeRun.id))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalScraped += result.value.pharmaciesFound;
          saved += result.value.dutiesSaved;
          if (result.value.success) successCities++;
          else failedCities++;
        } else {
          failedCities++;
          console.error(`[scraper] Error:`, result.reason);
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
    await closeBrowser();
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
    await closeBrowser();
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
 * Scrapes both today and tomorrow to capture night-duty pharmacies (e.g., 21:00-08:00)
 */
async function scrapeCityTracked(city: CityConfig, scrapeRunId: string): Promise<CityScrapResult> {
  const cityStart = Date.now();
  const todayDate = getTodayForXo();
  const tomorrowDate = getTomorrowForXo();

  // Scrape both days to get complete coverage of night shifts
  const datesToScrape = [todayDate, tomorrowDate];

  let totalPharmacies = 0;
  let totalDuties = 0;
  let lastHttpStatus = 0;
  let lastUsedProxy = false;
  const urls: string[] = [];

  try {
    for (const date of datesToScrape) {
      const url = getCityUrl(city, date);
      urls.push(url);

      const { html, status: httpStatus, usedProxy } = await fetchPage(url, config.scraper.retries);
      lastHttpStatus = httpStatus;
      lastUsedProxy = usedProxy;

      // Rate limit: wait 3s between requests
      await sleep(3000);


      // Parse with the specific date we're scraping
      const isoDate = xoDateToIso(date);
      const pharmacies = parsePharmacyHtml(html, city.name, city.prefecture, isoDate);
      const enriched = pharmacies.map((p) => ({
        ...p,
        region: p.region || city.prefecture,
      }));

      totalPharmacies += enriched.length;

      for (const data of enriched) {
        totalDuties += await savePharmacy(data);
      }
    }

    await prisma.scrapeCityResult.create({
      data: {
        scrapeRunId,
        city: city.name,
        prefecture: city.prefecture,
        status: totalPharmacies > 0 ? 'success' : 'no_data',
        url: urls.join(' | '),
        pharmaciesFound: totalPharmacies,
        dutiesFound: totalDuties,
        durationMs: Date.now() - cityStart,
        httpStatus: lastHttpStatus,
        usedProxy: lastUsedProxy,
      },
    });

    return { pharmaciesFound: totalPharmacies, dutiesSaved: totalDuties, success: true };
  } catch (err) {
    console.error(`[scraper] Failed to scrape ${city.name}:`, err);

    await prisma.scrapeCityResult.create({
      data: {
        scrapeRunId,
        city: city.name,
        prefecture: city.prefecture,
        status: 'failed',
        url: urls.join(' | ') || getCityUrl(city, todayDate),
        durationMs: Date.now() - cityStart,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });

    return { pharmaciesFound: 0, dutiesSaved: 0, success: false };
  }
}

/**
 * Convert xo.gr date format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
 */
function xoDateToIso(xoDate: string): string {
  const [day, month, year] = xoDate.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Save pharmacy data to database
 */
async function savePharmacy(data: PharmacyData): Promise<number> {
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
