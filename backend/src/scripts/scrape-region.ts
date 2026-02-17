/**
 * Scrape a single region/prefecture.
 *
 * Usage:
 *   npx tsx src/scripts/scrape-region.ts achaias
 *   npx tsx src/scripts/scrape-region.ts Αχαΐας
 *   npx tsx src/scripts/scrape-region.ts --list
 */

import { discoverAllPrefectures, discoverCities } from '../scraper/prefecture-discoverer';
import { closeBrowser } from '../scraper/hybrid-fetcher';
import { parsePharmacyHtml } from '../scraper/html-parser';
import { fetchPage } from '../scraper/hybrid-fetcher';
import { getCityUrl, getTodayForXo, getTomorrowForXo } from '../scraper/city-list';
import { geocodeAddress, sleep } from '../scraper/geocoder';
import { prisma } from '../db/client';
import { invalidatePattern } from '../cache/redis';
import { config } from '../config';
import { Prisma } from '@prisma/client';
import { PharmacyData } from '../scraper/html-parser';

async function main() {
  const arg = process.argv[2];

  // Discover all prefectures from xo.gr
  console.log('Discovering prefectures from xo.gr...\n');
  const allPrefectures = await discoverAllPrefectures();

  if (!arg || arg === '--list') {
    console.log('Available prefectures:\n');
    for (const p of allPrefectures) {
      console.log(`  ${p.name} (${p.slug})`);
    }
    console.log(`\nTotal: ${allPrefectures.length} prefectures`);
    console.log('\nUsage: npx tsx src/scripts/scrape-region.ts <region>');
    await closeBrowser();
    return;
  }

  // Find matching prefecture
  const prefecture = allPrefectures.find(
    p => p.name.toLowerCase().includes(arg.toLowerCase()) ||
         p.slug.toLowerCase().includes(arg.toLowerCase())
  );

  if (!prefecture) {
    console.log(`No prefecture found matching: ${arg}`);
    console.log('Run with --list to see available prefectures');
    await closeBrowser();
    process.exit(1);
  }

  console.log(`\nScraping ${prefecture.name} (${prefecture.slug})...\n`);

  // Discover cities for this prefecture
  const cities = await discoverCities(prefecture);
  console.log(`\nFound ${cities.length} cities to scrape\n`);

  if (cities.length === 0) {
    console.log('No cities found');
    await closeBrowser();
    return;
  }

  // Create scrape run
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

  // Scrape each city
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    console.log(`[${i + 1}/${cities.length}] ${city.name}`);

    try {
      const todayDate = getTodayForXo();
      const tomorrowDate = getTomorrowForXo();

      for (const date of [todayDate, tomorrowDate]) {
        const url = getCityUrl(city, date);
        const { html } = await fetchPage(url);

        const isoDate = xoDateToIso(date);
        const pharmacies = parsePharmacyHtml(html, city.name, city.prefecture, isoDate);

        totalScraped += pharmacies.length;

        for (const data of pharmacies) {
          saved += await savePharmacy({ ...data, region: data.region || city.prefecture });
        }

        await sleep(4000); // Rate limit
      }

      successCities++;
    } catch (err) {
      failedCities++;
      console.error(`  Failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Update scrape run
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

  console.log(`\nDone! Scraped ${totalScraped} pharmacies, saved ${saved} duties`);
  console.log(`Success: ${successCities}, Failed: ${failedCities}`);

  await invalidatePattern('pharmacies:*');
  await closeBrowser();
}

function xoDateToIso(xoDate: string): string {
  const [day, month, year] = xoDate.split('/');
  return `${year}-${month}-${day}`;
}

async function savePharmacy(data: PharmacyData): Promise<number> {
  try {
    let existingPharmacy = null;

    if (data.phone) {
      existingPharmacy = await prisma.pharmacy.findFirst({
        where: { phone: data.phone, name: data.name },
      });
    }

    let pharmacy;

    if (existingPharmacy) {
      pharmacy = await prisma.pharmacy.update({
        where: { id: existingPharmacy.id },
        data: { phone: data.phone, region: data.region },
      });
    } else {
      pharmacy = await prisma.pharmacy.upsert({
        where: {
          name_address_city: {
            name: data.name,
            address: data.address,
            city: data.city,
          },
        },
        update: { phone: data.phone, region: data.region },
        create: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          city: data.city,
          region: data.region,
        },
      });
    }

    // Geocode if missing
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

    let dutiesCreated = 0;

    for (const duty of data.duties) {
      const startHour = parseInt(duty.start.split(':')[0], 10);
      const endHour = parseInt(duty.end.split(':')[0], 10);
      const isOvernight = endHour < startHour;

      if (isOvernight) {
        const day1Date = new Date(data.dutyDate);
        const day2Date = new Date(data.dutyDate);
        day2Date.setDate(day2Date.getDate() + 1);

        await prisma.pharmacyDuty.upsert({
          where: { pharmacyId_dutyDate: { pharmacyId: pharmacy.id, dutyDate: day1Date } },
          update: { scrapedAt: new Date(), duties: [{ start: duty.start, end: '23:59', type: duty.type }] as unknown as Prisma.InputJsonValue },
          create: { pharmacyId: pharmacy.id, dutyDate: day1Date, duties: [{ start: duty.start, end: '23:59', type: duty.type }] as unknown as Prisma.InputJsonValue },
        });
        dutiesCreated++;

        await prisma.pharmacyDuty.upsert({
          where: { pharmacyId_dutyDate: { pharmacyId: pharmacy.id, dutyDate: day2Date } },
          update: { scrapedAt: new Date(), duties: [{ start: '00:00', end: duty.end, type: duty.type }] as unknown as Prisma.InputJsonValue },
          create: { pharmacyId: pharmacy.id, dutyDate: day2Date, duties: [{ start: '00:00', end: duty.end, type: duty.type }] as unknown as Prisma.InputJsonValue },
        });
        dutiesCreated++;
      } else {
        await prisma.pharmacyDuty.upsert({
          where: { pharmacyId_dutyDate: { pharmacyId: pharmacy.id, dutyDate: new Date(data.dutyDate) } },
          update: { scrapedAt: new Date(), duties: [duty] as unknown as Prisma.InputJsonValue },
          create: { pharmacyId: pharmacy.id, dutyDate: new Date(data.dutyDate), duties: [duty] as unknown as Prisma.InputJsonValue },
        });
        dutiesCreated++;
      }
    }

    return dutiesCreated > 0 ? 1 : 0;
  } catch (err) {
    console.error(`  Failed to save ${data.name}:`, err);
    return 0;
  }
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
