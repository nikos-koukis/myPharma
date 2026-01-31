import { Page } from 'playwright';

export interface PharmacyData {
  name: string;
  address: string;
  phone: string | null;
  city: string;
  region: string;
  dutyDate: string;
  shift: string;
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

  const pharmacies = await page.evaluate((citySlug: string) => {
    const results: Array<{
      name: string;
      address: string;
      phone: string | null;
      city: string;
      region: string;
      dutyDate: string;
      shift: string;
    }> = [];

    const today = new Date().toISOString().split('T')[0];

    const cards = document.querySelectorAll('.DutiesResult');

    cards.forEach((card) => {
      const nameEl = card.querySelector('.pharmacy-title h2, .pharmacy-title');
      const addressEl = card.querySelector('.pharmacies-card-address');
      const phoneEl = card.querySelector('.pharmacies-phone-button');
      const dutyHoursEl = card.querySelector('.DutyTimes');

      const name = nameEl?.textContent?.trim() ?? '';
      const address = addressEl?.textContent?.trim() ?? '';
      // Phone is text content, not a link href
      const phoneText = phoneEl?.textContent?.trim() ?? '';
      const phone = phoneText.replace(/\D/g, '').length > 5 ? phoneText.trim() : null;

      // Determine shift from duty hours text
      const hoursText = dutyHoursEl?.textContent?.trim()?.toLowerCase() ?? '';
      let shift = 'all_day';
      if (hoursText.includes('morning') || hoursText.includes('πρωι')) {
        shift = 'morning';
      } else if (hoursText.includes('night') || hoursText.includes('νυχτ')) {
        shift = 'night';
      }

      if (name && address) {
        results.push({
          name,
          address,
          phone,
          city: citySlug,
          region: '',
          dutyDate: today,
          shift,
        });
      }
    });

    return results;
  }, city);

  // Extract region from page header (only h1, not the "Map View" link)
  const regionText = await page.locator('.pharmacies-regions-header h1').first().textContent().catch(() => '') ?? '';
  const region = regionText
    .replace(/Pharmacies on Duty & Open Pharmacies/i, '')
    .replace(/Εφημερεύοντα & Ανοιχτά Φαρμακεία/i, '')
    .trim()
    .replace(/\s+/g, ' ');

  return pharmacies.map((p) => ({ ...p, region }));
}
