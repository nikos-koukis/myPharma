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

// ===== UTILITY FUNCTIONS =====

/**
 * Split array into chunks of specified size
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Shuffle array in place using Fisher-Yates algorithm
 * This prevents scraping cities from the same prefecture consecutively (anti-detection)
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get randomized delay with jitter (1x to 1.5x base delay)
 */
function getRandomDelay(baseMs: number): number {
  return baseMs + Math.random() * (baseMs * 0.5);
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// ===== MAIN SCRAPER =====

/**
 * Main scraper entry point
 * 1. Discovers all prefectures from xo.gr (or filters by SCRAPE_PREFECTURES env)
 * 2. Discovers cities from prefecture pages (PARALLEL)
 * 3. Scrapes all discovered cities (PARALLEL with rate limiting)
 */
export async function runScraper(): Promise<void> {
  const overallStart = Date.now();
  console.log('[scraper] Starting optimized scraper...');
  console.log(`[scraper] Config: concurrency=${config.scraper.concurrency}, minDelay=${config.scraper.minDelayMs}ms, smartTomorrow=${config.scraper.smartTomorrowScrape}`);

  // Discover all prefectures from xo.gr
  console.log('[scraper] Discovering prefectures from xo.gr...');
  let allPrefectures: PrefectureConfig[];
  try {
    allPrefectures = await discoverAllPrefectures();
  } catch (err) {
    console.error('[scraper] Failed to discover prefectures:', err);
    return;
  }

  // Filter by SCRAPE_PREFECTURES env var if set
  const filter = getScrapePrefectureFilter();
  let prefecturesToScrape: PrefectureConfig[];
  if (filter) {
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

  // ===== PARALLEL PREFECTURE DISCOVERY =====
  const discoveryStart = Date.now();
  const allCities: CityConfig[] = [];
  const prefectureBatches = chunk(prefecturesToScrape, config.scraper.prefectureConcurrency);

  console.log(`[scraper] Discovering cities in parallel (${config.scraper.prefectureConcurrency} prefectures at a time)...`);

  for (const batch of prefectureBatches) {
    const results = await Promise.allSettled(
      batch.map(async (prefecture) => {
        try {
          const cities = await discoverCities(prefecture);
          console.log(`[scraper] Discovered ${cities.length} cities for ${prefecture.name}`);
          return cities;
        } catch (err) {
          console.error(`[scraper] Failed to discover cities for ${prefecture.name}:`, err);
          return [];
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allCities.push(...result.value);
      }
    }

    // Small delay between prefecture batches
    if (prefectureBatches.indexOf(batch) < prefectureBatches.length - 1) {
      await sleep(config.scraper.paginationDelayMs);
    }
  }

  console.log(`[scraper] Discovery completed in ${formatDuration(Date.now() - discoveryStart)}: ${allCities.length} cities total`);

  if (allCities.length === 0) {
    console.log('[scraper] No cities to scrape');
    return;
  }

  // Create scrape run record
  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      totalCities: allCities.length,
      status: 'running',
    },
  });

  const scrapeStart = Date.now();
  let totalScraped = 0;
  let saved = 0;
  let successCities = 0;
  let failedCities = 0;
  let processedCities = 0;
  const rateLimitedCities: CityConfig[] = [];

  try {
    // ===== PARALLEL CITY SCRAPING WITH PROGRESS =====
    // Shuffle cities to avoid scraping same prefecture consecutively (anti-detection)
    const shuffledCities = shuffle(allCities);
    console.log(`[scraper] Cities shuffled for anti-detection`);

    const cityBatches = chunk(shuffledCities, config.scraper.concurrency);
    const totalBatches = cityBatches.length;

    console.log(`[scraper] Starting city scraping: ${shuffledCities.length} cities in ${totalBatches} batches of ${config.scraper.concurrency}`);

    for (let batchIndex = 0; batchIndex < cityBatches.length; batchIndex++) {
      const batch = cityBatches[batchIndex];

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map((city) => scrapeCityTracked(city, scrapeRun.id))
      );

      // Collect results
      for (const result of results) {
        processedCities++;
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

      // ===== PROGRESS LOGGING =====
      const elapsed = Date.now() - scrapeStart;
      const rate = processedCities / (elapsed / 1000);
      const remaining = (allCities.length - processedCities) / rate;
      const progress = Math.round((processedCities / allCities.length) * 100);

      console.log(
        `[progress] ${progress}% | ${processedCities}/${allCities.length} cities | ` +
        `${rate.toFixed(1)} cities/s | ETA: ${formatDuration(remaining * 1000)} | ` +
        `Found: ${totalScraped} pharmacies`
      );

      // Rate limiting between batches
      if (batchIndex < cityBatches.length - 1) {
        await sleep(getRandomDelay(config.scraper.minDelayMs));
      }
    }

    // Clear cache after all cities scraped
    for (const prefecture of prefecturesToScrape) {
      await invalidatePattern(`pharmacies:on-duty:${prefecture.name}:*`);
    }
    await invalidatePattern(`pharmacies:nearby:*`);
    console.log(`[scraper] Cache cleared for all prefectures`);

    // ===== PARALLEL RETRY OF FAILED CITIES =====
    if (rateLimitedCities.length > 0) {
      console.log(`[scraper] Retrying ${rateLimitedCities.length} rate-limited cities after ${config.scraper.retryDelayMs}ms...`);
      await sleep(config.scraper.retryDelayMs);

      // Retry in smaller batches (half the normal concurrency)
      const retryBatches = chunk(rateLimitedCities, Math.max(1, Math.floor(config.scraper.concurrency / 2)));

      for (const batch of retryBatches) {
        console.log(`[scraper] Retrying batch: ${batch.map(c => c.name).join(', ')}`);

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
          }
        }

        // Longer delay between retry batches
        await sleep(config.scraper.retryDelayMs / 2);
      }
    }

    // Update scrape run record
    const totalDuration = Date.now() - overallStart;
    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        successCities,
        failedCities,
        totalPharmacies: totalScraped,
        totalDuties: saved,
        durationMs: totalDuration,
      },
    });

    console.log(`[scraper] ✓ Completed in ${formatDuration(totalDuration)}`);
    console.log(`[scraper]   Cities: ${successCities} success, ${failedCities} failed`);
    console.log(`[scraper]   Pharmacies: ${totalScraped} found, ${saved} duties saved`);

    // Full cache clear at the end
    await invalidatePattern('pharmacies:*');
    console.log('[scraper] Full cache invalidated');
    await closeBrowser();
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
        durationMs: Date.now() - overallStart,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    await closeBrowser();
    throw err;
  }
}

// ===== CITY SCRAPING =====

interface CityScrapResult {
  pharmaciesFound: number;
  dutiesSaved: number;
  success: boolean;
  rateLimited?: boolean;
  city?: CityConfig;
}

/**
 * Scrape a single city with tracking
 * Uses SMART TOMORROW SCRAPING: only scrapes tomorrow if overnight shifts detected
 */
async function scrapeCityTracked(city: CityConfig, scrapeRunId: string): Promise<CityScrapResult> {
  const cityStart = Date.now();
  const todayDate = getTodayForXo();
  const tomorrowDate = getTomorrowForXo();

  let totalPharmacies = 0;
  let totalDuties = 0;
  let lastHttpStatus = 0;
  let lastUsedProxy = false;
  const urls: string[] = [];
  let hasOvernightShifts = false;

  try {
    // ===== SCRAPE TODAY =====
    const todayUrl = getCityUrl(city, todayDate);
    urls.push(todayUrl);

    const { html: todayHtml, status: todayStatus, usedProxy } = await fetchPage(todayUrl);
    lastHttpStatus = todayStatus;
    lastUsedProxy = usedProxy;

    const todayIso = xoDateToIso(todayDate);
    const todayPharmacies = parsePharmacyHtml(todayHtml, city.name, city.prefecture, todayIso);

    // Check for overnight shifts BEFORE saving
    for (const pharmacy of todayPharmacies) {
      for (const duty of pharmacy.duties) {
        const startHour = parseInt(duty.start.split(':')[0], 10);
        const endHour = parseInt(duty.end.split(':')[0], 10);
        if (endHour < startHour) {
          hasOvernightShifts = true;
          break;
        }
      }
      if (hasOvernightShifts) break;
    }

    // Save today's pharmacies
    const enrichedToday = todayPharmacies.map((p) => ({
      ...p,
      region: p.region || city.prefecture,
    }));
    totalPharmacies += enrichedToday.length;

    for (const data of enrichedToday) {
      totalDuties += await savePharmacy(data);
    }

    // ===== SMART TOMORROW SCRAPING =====
    // Only scrape tomorrow if overnight shifts detected OR smart scraping is disabled
    if (hasOvernightShifts || !config.scraper.smartTomorrowScrape) {
      // Rate limit before tomorrow request
      await sleep(getRandomDelay(config.scraper.minDelayMs));

      const tomorrowUrl = getCityUrl(city, tomorrowDate);
      urls.push(tomorrowUrl);

      const { html: tomorrowHtml, status: tomorrowStatus, usedProxy: tomorrowProxy } = await fetchPage(tomorrowUrl);
      lastHttpStatus = tomorrowStatus;
      lastUsedProxy = tomorrowProxy;

      const tomorrowIso = xoDateToIso(tomorrowDate);
      const tomorrowPharmacies = parsePharmacyHtml(tomorrowHtml, city.name, city.prefecture, tomorrowIso);

      const enrichedTomorrow = tomorrowPharmacies.map((p) => ({
        ...p,
        region: p.region || city.prefecture,
      }));
      totalPharmacies += enrichedTomorrow.length;

      for (const data of enrichedTomorrow) {
        totalDuties += await savePharmacy(data);
      }
    }

    // Record success
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

    // Extract HTTP status code from error message
    const httpStatusMatch = errMsg.match(/HTTP (\d{3})/);
    const httpStatus = httpStatusMatch ? parseInt(httpStatusMatch[1], 10) : 0;

    console.error(`[scraper] Failed to scrape ${city.name}:`, errMsg);

    // Record in scrape_city_results
    await prisma.scrapeCityResult.create({
      data: {
        scrapeRunId,
        city: city.name,
        prefecture: city.prefecture,
        status: isRateLimited ? 'rate_limited' : 'failed',
        url: urls.join(' | ') || getCityUrl(city, todayDate),
        durationMs: Date.now() - cityStart,
        httpStatus: httpStatus || undefined,
        errorMessage: errMsg,
      },
    });

    // Save to failed_urls table for retry (429, 503, 404)
    const retryableStatuses = [429, 503, 404, 403, 500, 502];
    if (retryableStatuses.includes(httpStatus)) {
      const failedUrl = urls[0] || getCityUrl(city, todayDate);
      await saveFailedUrl(failedUrl, city.name, city.prefecture, httpStatus, errMsg);
    }

    return { pharmaciesFound: 0, dutiesSaved: 0, success: false, rateLimited: isRateLimited, city };
  }
}

/**
 * Save a failed URL for later retry
 */
async function saveFailedUrl(
  url: string,
  city: string,
  prefecture: string,
  httpStatus: number,
  errorMessage: string
): Promise<void> {
  try {
    // Calculate next retry time with exponential backoff
    const existing = await prisma.failedUrl.findUnique({
      where: { url_city: { url, city } },
    });

    const retryCount = existing ? existing.retryCount + 1 : 0;
    const backoffMinutes = Math.min(Math.pow(2, retryCount) * 15, 480); // Max 8 hours
    const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);

    await prisma.failedUrl.upsert({
      where: { url_city: { url, city } },
      update: {
        httpStatus,
        errorMessage,
        retryCount,
        lastAttempt: new Date(),
        nextRetry,
        resolved: false,
        resolvedAt: null,
      },
      create: {
        url,
        city,
        prefecture,
        httpStatus,
        errorMessage,
        retryCount: 0,
        nextRetry: new Date(Date.now() + 15 * 60 * 1000), // First retry in 15 min
      },
    });

    console.log(`[scraper] Saved failed URL for retry: ${city} (HTTP ${httpStatus}, retry #${retryCount + 1})`);
  } catch (saveErr) {
    console.error(`[scraper] Failed to save failed URL:`, saveErr);
  }
}

/**
 * Convert xo.gr date format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
 */
function xoDateToIso(xoDate: string): string {
  const [day, month, year] = xoDate.split('/');
  return `${year}-${month}-${day}`;
}

// ===== DATABASE OPERATIONS =====

/**
 * Save pharmacy data to database
 * OPTIMIZED: Skips geocoding for pharmacies that already have coordinates
 */
async function savePharmacy(data: PharmacyData): Promise<number> {
  try {
    // First, try to find an existing pharmacy by phone (catches duplicates)
    let existingPharmacy = null;

    if (data.phone) {
      existingPharmacy = await prisma.pharmacy.findFirst({
        where: {
          phone: data.phone,
          name: data.name,
        },
      });
    }

    let pharmacy;

    if (existingPharmacy) {
      // Update the existing pharmacy
      pharmacy = await prisma.pharmacy.update({
        where: { id: existingPharmacy.id },
        data: {
          phone: data.phone,
          region: data.region,
        },
      });
    } else {
      // Standard upsert by name/address/city
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

    // ===== SMART GEOCODING =====
    // Only geocode if pharmacy doesn't have coordinates OR skipExistingGeocode is disabled
    const needsGeocode = !pharmacy.lat || !pharmacy.lng;

    if (needsGeocode || !config.scraper.skipExistingGeocode) {
      const coords = await geocodeAddress(data.address, data.city);
      if (coords) {
        const hasCoords = pharmacy.lat !== null && pharmacy.lng !== null;
        const coordsChanged = hasCoords && (
          Math.abs(pharmacy.lat! - coords.lat) > 0.0001 ||
          Math.abs(pharmacy.lng! - coords.lng) > 0.0001
        );

        if (!hasCoords || coordsChanged) {
          if (coordsChanged) {
            console.log(`[geo] Coordinates changed for ${pharmacy.name}: (${pharmacy.lat}, ${pharmacy.lng}) → (${coords.lat}, ${coords.lng})`);
          }
          await prisma.pharmacy.update({
            where: { id: pharmacy.id },
            data: { lat: coords.lat, lng: coords.lng },
          });
        }
      }
      await sleep(config.geocoder.rateLimit);
    }

    // Save duty records
    let dutiesCreated = 0;

    for (const duty of data.duties) {
      const startHour = parseInt(duty.start.split(':')[0], 10);
      const endHour = parseInt(duty.end.split(':')[0], 10);
      const isOvernight = endHour < startHour;

      if (isOvernight) {
        // Split into two records for overnight shifts
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
