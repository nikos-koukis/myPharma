import { Page } from 'puppeteer';

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

export async function parsePharmacyPage(page: Page, city: string): Promise<PharmacyData[]> {
  // Accept cookies/consent if present
  try {
    const acceptBtn = await page.$('#accept-btn');
    if (acceptBtn) {
      const isVisible = await page.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, acceptBtn);
      if (isVisible) {
        await acceptBtn.click();
        console.log(`[parser] Accepted cookie consent for ${city}`);
      }
    }
  } catch {
    // Ignore cookie consent errors
  }

  // Wait for pharmacy cards to load
  try {
    await page.waitForSelector('.DutiesResult', { timeout: 15000 });
  } catch {
    // No results found, will return empty array
  }

  const rawData = await page.evaluate((cityName: string) => {
    const results: Array<{
      name: string;
      address: string;
      phone: string | null;
      city: string;
      dutyDate: string;
      duties: Array<{ start: string; end: string; type: 'regular' | 'extended' | 'on_duty' }>;
    }> = [];

    const today = new Date().toISOString().split('T')[0];
    const cards = document.querySelectorAll('.DutiesResult');

    // Map to group by pharmacy (name + address)
    const pharmacyMap = new Map<string, {
      name: string;
      address: string;
      phone: string | null;
      duties: Array<{ start: string; end: string; type: 'regular' | 'extended' | 'on_duty' }>;
    }>();

    cards.forEach((card) => {
      const nameEl = card.querySelector('.pharmacy-title h2, .pharmacy-title');
      const addressEl = card.querySelector('.pharmacies-card-address');
      const phoneEl = card.querySelector('.pharmacies-phone-button');
      const dutyHoursEl = card.querySelector('.DutyTimes');

      const name = nameEl?.textContent?.trim() ?? '';
      const address = addressEl?.textContent?.trim() ?? '';
      const phoneText = phoneEl?.textContent?.trim() ?? '';
      const phone = phoneText.replace(/\D/g, '').length > 5 ? phoneText.trim() : null;

      if (!name || !address) return;

      const key = `${name}|${address}`;
      if (!pharmacyMap.has(key)) {
        pharmacyMap.set(key, { name, address, phone, duties: [] });
      }

      // Extract duty hours text
      const hoursText = dutyHoursEl?.textContent?.trim() ?? '';

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

    // Convert map to results array
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
        city: cityName,
        dutyDate: today,
        duties: data.duties.length > 0 ? data.duties : [{ start: '00:00', end: '23:59', type: 'on_duty' }],
      });
    }

    return results;
  }, city);

  // Extract region from page header or breadcrumb
  let region = '';
  try {
    // Try header first
    const regionEl = await page.$('.pharmacies-regions-header h1');
    if (regionEl) {
      const regionText = await page.evaluate((el) => el.textContent ?? '', regionEl);
      console.log(`[parser] Raw header text: "${regionText}"`);

      // Clean and split the header text into lines
      const lines = regionText
        .replace(/Pharmacies on Duty & Open Pharmacies/i, '')
        .replace(/Εφημερεύοντα & Ανοιχτά Φαρμακεία/i, '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Last line is typically the prefecture (ΘΕΣΣΑΛΟΝΙΚΗΣ)
      // First line after title is typically the city
      if (lines.length >= 2) {
        region = lines[lines.length - 1]; // Prefecture is last
      } else if (lines.length === 1) {
        region = lines[0];
      }
    }

    // If region is empty or same as city, try to extract from breadcrumb or page URL
    if (!region || region.toLowerCase() === city.toLowerCase()) {
      // Try breadcrumb - usually contains prefecture info
      const breadcrumb = await page.$('.breadcrumb, nav[aria-label="breadcrumb"], .breadcrumbs');
      if (breadcrumb) {
        const breadcrumbText = await page.evaluate((el) => el.textContent ?? '', breadcrumb);
        console.log(`[parser] Breadcrumb text: "${breadcrumbText}"`);
      }

      // Try to get prefecture from page structure
      const prefectureEl = await page.$('[class*="prefecture"], [class*="nomos"], .region-name');
      if (prefectureEl) {
        const prefText = await page.evaluate((el) => el.textContent ?? '', prefectureEl);
        if (prefText) {
          region = prefText.trim();
          console.log(`[parser] Found prefecture from element: "${region}"`);
        }
      }
    }
  } catch (err) {
    console.log(`[parser] Region extraction error:`, err);
  }

  console.log(`[parser] Extracted location: region="${region}", city="${city}"`);

  return rawData.map((p) => ({ ...p, region }));
}
