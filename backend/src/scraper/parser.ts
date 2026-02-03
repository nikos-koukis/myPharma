import { Page } from 'playwright';

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
  const acceptBtn = page.locator('#accept-btn');
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.click();
    console.log(`[parser] Accepted cookie consent for ${city}`);
  }

  // Wait for pharmacy cards to load
  await page.waitForSelector('.DutiesResult', { timeout: 15000 }).catch(() => null);

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

  // Extract region from page header
  const regionText = await page.locator('.pharmacies-regions-header h1').first().textContent().catch(() => '') ?? '';
  const region = regionText
    .replace(/Pharmacies on Duty & Open Pharmacies/i, '')
    .replace(/Εφημερεύοντα & Ανοιχτά Φαρμακεία/i, '')
    .trim()
    .replace(/\s+/g, ' ');

  console.log(`[parser] Extracted location: region="${region}", city="${city}"`);

  return rawData.map((p) => ({ ...p, region }));
}
