import { fetchPage, closeBrowser } from './hybrid-fetcher';
import { parsePharmacyHtml, PharmacyData } from './html-parser';
import { CityConfig, getCityUrl, getTodayForXo, getTomorrowForXo, getScrapePrefectureFilter } from './city-list';
import { discoverCities, discoverAllPrefectures } from './prefecture-discoverer';
import { PrefectureConfig } from './types';
import { geocodeAddress, sleep } from './geocoder';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { invalidatePattern } from '../cache/redis';
import { config } from '../config';

/**
 * Main scraper entry point
 * 1. Discovers all prefectures from xo.gr (or filters by SCRAPE_PREFECTURES env)
 * 2. Discovers cities from prefecture pages
 * 3. Scrapes all discovered cities
 */
export async function runScraper(): Promise<void> {
  console.log('[scraper] Starting...');

  // Discover all prefectures from xo.gr
  console.log('[scraper] Discovering prefectures from xo.gr...');
  let allPrefectures: PrefectureConfig[];
  try {
    allPrefectures = await discoverAllPrefectures();
  } catch (err) {
    console.error('[scraper] Failed to discover prefectures:', err);
    return;
  }

  // Filter by SCRAPE_PREFECTURES env var if set (preserves env var order)
  const filter = getScrapePrefectureFilter();
  let prefecturesToScrape: PrefectureConfig[];
  if (filter) {
    // Build list in the order specified in SCRAPE_PREFECTURES
    prefecturesToScrape = [];
    for (const f of filter) {
      const match = allPrefectures.find(p =>
        p.name.toUpperCase().includes(f) || p.slug.toUpperCase().includes(f)
      );
      if (match && !prefecturesToScrape.includes(match)) {
        prefecturesToScrape.push(match);
      }
    }
  } else {
    prefecturesToScrape = allPrefectures;
  }

  if (prefecturesToScrape.length === 0) {
    console.log('[scraper] No prefectures to scrape (check SCRAPE_PREFECTURES filter)');
    return;
  }

  console.log(`[scraper] Will scrape ${prefecturesToScrape.length} prefecture(s)${filter ? ' (filtered)' : ' (all Greece)'}...`);

  // Count total cities first for the scrape run record
  const allCities: CityConfig[] = [];
  for (const prefecture of prefecturesToScrape) {
    try {
      const prefectureCities = await discoverCities(prefecture);
      allCities.push(...prefectureCities);
      console.log(`[scraper] Discovered ${prefectureCities.length} cities for ${prefecture.name}`);
      if (prefecturesToScrape.indexOf(prefecture) < prefecturesToScrape.length - 1) {
        await sleep(5000);
      }
    } catch (err) {
      console.error(`[scraper] Failed to discover cities for ${prefecture.name}:`, err);
    }
  }

  if (allCities.length === 0) {
    console.log('[scraper] No cities to scrape');
    return;
  }

  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      totalCities: allCities.length,
      status: 'running',
    },
  });

  const startTime = Date.now();
  let totalScraped = 0;
  let saved = 0;
  let successCities = 0;
  let failedCities = 0;
  const rateLimitedCities: CityConfig[] = [];

  try {
    // Process each prefecture: scrape cities, then clear cache for that region
    for (const prefecture of prefecturesToScrape) {
      const prefectureCities = allCities.filter(c => c.prefecture === prefecture.name);
      if (prefectureCities.length === 0) continue;

      console.log(`[scraper] Scraping ${prefectureCities.length} cities for ${prefecture.name}...`);

      // Scrape cities in batches
      for (let i = 0; i < prefectureCities.length; i += config.scraper.concurrency) {
        const batch = prefectureCities.slice(i, i + config.scraper.concurrency);
        const batchEnd = Math.min(i + config.scraper.concurrency, prefectureCities.length);
        console.log(`[scraper] [${prefecture.name}] [${i + 1}-${batchEnd}/${prefectureCities.length}]`);

        const results = await Promise.allSettled(
          batch.map((city) => scrapeCityTracked(city, scrapeRun.id))
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            totalScraped += result.value.pharmaciesFound;
            saved += result.value.dutiesSaved;
            if (result.value.success) {
              successCities++;
            } else if (result.value.rateLimited && result.value.city) {
              rateLimitedCities.push(result.value.city);
            } else {
              failedCities++;
            }
          } else {
            failedCities++;
            console.error(`[scraper] Error:`, result.reason);
          }
        }
      }

      // Clear cache for this prefecture immediately after scraping
      await invalidatePattern(`pharmacies:on-duty:${prefecture.name}:*`);
      await invalidatePattern(`pharmacies:nearby:*`); // Nearby queries may include this region
      console.log(`[scraper] Cache cleared for ${prefecture.name}`);
    }

    // Retry rate-limited cities (429/403) with longer delays
    if (rateLimitedCities.length > 0) {
      console.log(`[scraper] Retrying ${rateLimitedCities.length} rate-limited cities...`);
      await sleep(30000); // Wait 30s before retrying

      for (const city of rateLimitedCities) {
        console.log(`[scraper] Retry: ${city.name}`);
        const result = await scrapeCityTracked(city, scrapeRun.id);
        totalScraped += result.pharmaciesFound;
        saved += result.dutiesSaved;
        if (result.success) successCities++;
        else failedCities++;

        await sleep(10000); // 10s between retries
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
    // Full cache clear at the end to catch any edge cases
    await invalidatePattern('pharmacies:*');
    console.log('[scraper] Full cache invalidated');
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
  rateLimited?: boolean;
  city?: CityConfig;
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

      // Rate limit: randomized 5-8s between requests to avoid detection
      await sleep(5000 + Math.random() * 3000);


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
    const errMsg = err instanceof Error ? err.message : String(err);
    const isRateLimited = errMsg.includes('429') || errMsg.includes('403');

    console.error(`[scraper] Failed to scrape ${city.name}:`, errMsg);

    await prisma.scrapeCityResult.create({
      data: {
        scrapeRunId,
        city: city.name,
        prefecture: city.prefecture,
        status: isRateLimited ? 'rate_limited' : 'failed',
        url: urls.join(' | ') || getCityUrl(city, todayDate),
        durationMs: Date.now() - cityStart,
        errorMessage: errMsg,
      },
    });

    return { pharmaciesFound: 0, dutiesSaved: 0, success: false, rateLimited: isRateLimited, city };
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
 * First tries to find existing pharmacy by phone or coordinates to avoid duplicates
 * when the same pharmacy appears with different city names
 */
async function savePharmacy(data: PharmacyData): Promise<number> {
  try {
    // First, try to find an existing pharmacy by phone (if available)
    // This catches duplicates where city name differs (e.g., "Πάτρα" vs "Παραλία Πατρών Αχαΐας")
    let existingPharmacy = null;

    if (data.phone) {
      existingPharmacy = await prisma.pharmacy.findFirst({
        where: {
          phone: data.phone,
          name: data.name, // Same name + same phone = same pharmacy
        },
      });
    }

    let pharmacy;

    if (existingPharmacy) {
      // Update the existing pharmacy (keeps original city, updates other fields)
      pharmacy = await prisma.pharmacy.update({
        where: { id: existingPharmacy.id },
        data: {
          phone: data.phone,
          region: data.region,
          // Don't update city/address to preserve the original record
        },
      });
    } else {
      // No duplicate found, do the standard upsert by name/address/city
      pharmacy = await prisma.pharmacy.upsert({
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
    }

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

    // Check if this is an overnight shift (end hour < start hour)
    // If so, create TWO duty records: one for today, one for tomorrow
    let dutiesCreated = 0;

    for (const duty of data.duties) {
      const startHour = parseInt(duty.start.split(':')[0], 10);
      const endHour = parseInt(duty.end.split(':')[0], 10);
      const isOvernight = endHour < startHour;

      if (isOvernight) {
        // Split into two records:
        // Day 1: start time to 23:59
        // Day 2: 00:00 to end time
        const day1Date = new Date(data.dutyDate);
        const day2Date = new Date(data.dutyDate);
        day2Date.setDate(day2Date.getDate() + 1);

        // Day 1 duty (e.g., 21:00 - 23:59)
        await prisma.pharmacyDuty.upsert({
          where: {
            pharmacyId_dutyDate: {
              pharmacyId: pharmacy.id,
              dutyDate: day1Date,
            },
          },
          update: {
            scrapedAt: new Date(),
            duties: [{ start: duty.start, end: '23:59', type: duty.type }] as unknown as Prisma.InputJsonValue,
          },
          create: {
            pharmacyId: pharmacy.id,
            dutyDate: day1Date,
            duties: [{ start: duty.start, end: '23:59', type: duty.type }] as unknown as Prisma.InputJsonValue,
          },
        });
        dutiesCreated++;

        // Day 2 duty (e.g., 00:00 - 08:00)
        await prisma.pharmacyDuty.upsert({
          where: {
            pharmacyId_dutyDate: {
              pharmacyId: pharmacy.id,
              dutyDate: day2Date,
            },
          },
          update: {
            scrapedAt: new Date(),
            duties: [{ start: '00:00', end: duty.end, type: duty.type }] as unknown as Prisma.InputJsonValue,
          },
          create: {
            pharmacyId: pharmacy.id,
            dutyDate: day2Date,
            duties: [{ start: '00:00', end: duty.end, type: duty.type }] as unknown as Prisma.InputJsonValue,
          },
        });
        dutiesCreated++;
      } else {
        // Regular shift - single record
        await prisma.pharmacyDuty.upsert({
          where: {
            pharmacyId_dutyDate: {
              pharmacyId: pharmacy.id,
              dutyDate: new Date(data.dutyDate),
            },
          },
          update: {
            scrapedAt: new Date(),
            duties: [duty] as unknown as Prisma.InputJsonValue,
          },
          create: {
            pharmacyId: pharmacy.id,
            dutyDate: new Date(data.dutyDate),
            duties: [duty] as unknown as Prisma.InputJsonValue,
          },
        });
        dutiesCreated++;
      }
    }

    return dutiesCreated > 0 ? 1 : 0;
  } catch (err) {
    console.error(`[scraper] Failed to save pharmacy ${data.name}:`, err);
    return 0;
  }
}
