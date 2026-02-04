/**
 * HTML parser using cheerio for curl-based scraping.
 * Extracts the same data as the Puppeteer parser.
 */

import * as cheerio from 'cheerio';

export interface DutySlot {
  start: string;
  end: string;
  type: 'regular' | 'extended' | 'on_duty';
}

export interface PharmacyData {
  name: string;
  address: string;
  phone: string | null;
  city: string;
  region: string;
  dutyDate: string;
  duties: DutySlot[];
}

/**
 * Parse pharmacy data from HTML using cheerio
 */
export function parsePharmacyHtml(html: string, city: string, prefecture: string): PharmacyData[] {
  const $ = cheerio.load(html);
  const today = new Date().toISOString().split('T')[0];

  // Map to group by pharmacy (name + address)
  const pharmacyMap = new Map<string, {
    name: string;
    address: string;
    phone: string | null;
    duties: DutySlot[];
  }>();

  // Find all pharmacy cards
  $('.DutiesResult').each((_, card) => {
    const $card = $(card);

    const nameEl = $card.find('.pharmacy-title h2, .pharmacy-title').first();
    const addressEl = $card.find('.pharmacies-card-address').first();
    const phoneEl = $card.find('.pharmacies-phone-button').first();
    const dutyHoursEl = $card.find('.DutyTimes').first();

    const name = nameEl.text().trim();
    const address = addressEl.text().trim();
    const phoneText = phoneEl.text().trim();
    const phone = phoneText.replace(/\D/g, '').length > 5 ? phoneText.trim() : null;

    if (!name || !address) return;

    const key = `${name}|${address}`;
    if (!pharmacyMap.has(key)) {
      pharmacyMap.set(key, { name, address, phone, duties: [] });
    }

    // Extract duty hours text
    const hoursText = dutyHoursEl.text().trim();

    // Parse ALL time ranges - format: "14:30-17:30" or "21:00-02:00 (Επόμενης)"
    const timePattern = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})(?:\s*\(?(Επόμενης|επόμενης)?\)?)?/g;
    const timeMatches = [...hoursText.matchAll(timePattern)];

    for (const match of timeMatches) {
      const start = match[1];
      const end = match[2];
      const startHour = parseInt(start.split(':')[0], 10);
      const endHour = parseInt(end.split(':')[0], 10);
      const extendsToNextDay = !!match[3] || endHour < startHour;

      // Determine duty type based on hours
      let type: 'regular' | 'extended' | 'on_duty' = 'on_duty';
      if (startHour >= 8 && startHour < 14 && !extendsToNextDay) {
        type = 'regular';  // Morning regular hours
      } else if (startHour >= 17 && startHour < 21 && !extendsToNextDay) {
        type = 'extended'; // Extended evening hours
      }
      // Night shifts (21:00+) or extending to next day = on_duty

      pharmacyMap.get(key)!.duties.push({ start, end, type });
    }
  });

  // Extract region from page header
  let region = prefecture; // Default to prefecture from city config
  const regionEl = $('.pharmacies-regions-header h1');
  if (regionEl.length) {
    const regionText = regionEl.text();
    // Clean and split the header text into lines
    const lines = regionText
      .replace(/Pharmacies on Duty & Open Pharmacies/i, '')
      .replace(/Εφημερεύοντα & Ανοιχτά Φαρμακεία/i, '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Last line is typically the prefecture (ΘΕΣΣΑΛΟΝΙΚΗΣ)
    if (lines.length >= 2) {
      region = lines[lines.length - 1];
    } else if (lines.length === 1) {
      region = lines[0];
    }
  }

  // Convert map to results array
  const results: PharmacyData[] = [];
  for (const [, data] of pharmacyMap) {
    // Sort duties by start time
    data.duties.sort((a, b) => {
      const aHour = parseInt(a.start.split(':')[0], 10);
      const bHour = parseInt(b.start.split(':')[0], 10);
      return aHour - bHour;
    });

    results.push({
      name: data.name,
      address: data.address,
      phone: data.phone,
      city,
      region,
      dutyDate: today,
      duties: data.duties.length > 0 ? data.duties : [{ start: '00:00', end: '23:59', type: 'on_duty' }],
    });
  }

  console.log(`[html-parser] Extracted location: region="${region}", city="${city}"`);
  console.log(`[html-parser] Found ${results.length} pharmacies in ${city}`);

  return results;
}

/**
 * Check if HTML contains pharmacy data
 */
export function hasPharmacyData(html: string): boolean {
  const $ = cheerio.load(html);
  return $('.DutiesResult').length > 0;
}

/**
 * Extract page title for debugging
 */
export function extractPageTitle(html: string): string {
  const $ = cheerio.load(html);
  return $('title').text().trim();
}
