/**
 * HTML parser for xo.gr pharmacy data.
 * Extracts pharmacy data from the embedded __NUXT_DATA__ JSON.
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
 * Parse pharmacy data from xo.gr HTML by extracting __NUXT_DATA__ JSON
 * @param html - The HTML content to parse
 * @param city - The city name
 * @param prefecture - The prefecture name
 * @param dateOverride - Optional ISO date (YYYY-MM-DD) to use instead of parsing from HTML
 */
export function parsePharmacyHtml(
  html: string,
  city: string,
  prefecture: string,
  dateOverride?: string
): PharmacyData[] {
  const $ = cheerio.load(html);
  const defaultDate = dateOverride || new Date().toISOString().split('T')[0];

  // Extract JSON from __NUXT_DATA__ script
  const nuxtScript = $('#__NUXT_DATA__').html();
  if (!nuxtScript) {
    console.warn('[html-parser] No __NUXT_DATA__ found in page');
    return [];
  }

  try {
    // Parse the Nuxt 3 payload (it's a JSON array with references)
    const nuxtData = JSON.parse(nuxtScript);
    const listings = extractListings(nuxtData);

    const results: PharmacyData[] = [];
    const seen = new Set<string>();

    for (const listing of listings) {
      const name = listing.fullName || listing.name || '';
      const rawAddress = listing.listingAddress || listing.address || '';

      // Safety: ensure we have strings
      if (typeof name !== 'string' || typeof rawAddress !== 'string') {
        console.warn('[html-parser] Skipping listing with non-string name/address');
        continue;
      }

      const address = cleanAddress(rawAddress);
      if (!name || !address) continue;

      // Extract phone from phones object
      let phone: string | null = null;
      if (listing.phones) {
        // mainPhone format: "tel:+302102626067"
        if (listing.phones.mainPhone) {
          phone = formatPhone(listing.phones.mainPhone);
        }
        // Fallback to phoneItems
        const phoneItems = listing.phones.phoneItems;
        if (!phone && phoneItems && phoneItems.length > 0) {
          const item = phoneItems[0];
          phone = item.description || formatPhone(item.phone || '');
        }
      }

      // Extract duty info from pharmacyInfo or openNote (fallback)
      // pharmacyInfo: "14:30 - 17:30 και 21:00 - 22:30"
      // openNote: "Εφημερεύει 09:00 - 21:00"
      const pharmacyInfo = typeof listing.pharmacyInfo === 'string' ? listing.pharmacyInfo : '';
      const openNote = typeof listing.openNote === 'string' ? listing.openNote : '';

      let duties = parseDutyHours(pharmacyInfo);

      // Fallback to openNote if pharmacyInfo didn't have duty hours
      if (duties.length === 0 && openNote) {
        duties = parseDutyHours(openNote);
      }

      // Debug: log when duties couldn't be parsed from either source
      if (duties.length === 0 && (pharmacyInfo || openNote)) {
        console.log(`[parser] No duties parsed for ${name}. pharmacyInfo: "${pharmacyInfo}", openNote: "${openNote}"`);
      }

      // Keep the duty date as the START date (when the shift begins)
      // For overnight shifts (21:00-08:00), the duty date is when it STARTS
      // The API query logic will handle "currently open" calculations

      // Dedupe by name + address
      const key = `${name}|${address}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        name,
        address,
        phone,
        city,
        region: prefecture,
        dutyDate: defaultDate,
        duties: duties.length > 0 ? duties : [{ start: '00:00', end: '23:59', type: 'on_duty' }],
      });
    }

    if (results.length > 0) {
      console.log(`[parser] ${city}: ${results.length} pharmacies`);
    }
    return results;
  } catch (err) {
    console.error('[html-parser] Failed to parse __NUXT_DATA__:', err);
    return [];
  }
}

// Types for parsed listings
interface PhoneData {
  hasPhone?: boolean;
  mainPhone?: string;
  phoneItems?: Array<{ phone?: string; description?: string }>;
}

interface ListingData {
  fullName?: string;
  name?: string;
  listingAddress?: string;
  address?: string;
  phones?: PhoneData;
  pharmacyInfo?: string;
  openNote?: string;  // Contains duty hours like "Εφημερεύει 09:00 - 21:00"
}

/**
 * Extract listing objects from Nuxt 3 payload array.
 * Nuxt 3 uses a serialization format where objects reference array positions.
 */
function extractListings(data: unknown[]): ListingData[] {
  const listings: ListingData[] = [];

  // Helper to resolve a value - if it's a number, look up that index
  function resolve(val: unknown): unknown {
    if (typeof val === 'number' && val >= 0 && val < data.length) {
      return data[val];
    }
    return val;
  }

  // Resolve a string field (may be a reference or direct string)
  function resolveString(val: unknown): string | undefined {
    const resolved = resolve(val);
    if (typeof resolved === 'string') {
      return resolved;
    }
    return undefined;
  }

  // Resolve phones object
  function resolvePhones(val: unknown): PhoneData | undefined {
    const resolved = resolve(val);
    if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) {
      return undefined;
    }

    const phonesObj = resolved as Record<string, unknown>;

    // Resolve nested fields in phones
    const mainPhone = resolveString(phonesObj.mainPhone);
    const hasPhone = typeof phonesObj.hasPhone === 'boolean' ? phonesObj.hasPhone : undefined;

    // Resolve phoneItems array
    let phoneItems: Array<{ phone?: string; description?: string }> | undefined;
    const itemsRef = resolve(phonesObj.phoneItems);
    if (Array.isArray(itemsRef)) {
      phoneItems = [];
      for (const itemRef of itemsRef) {
        const item = resolve(itemRef);
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const itemObj = item as Record<string, unknown>;
          phoneItems.push({
            phone: resolveString(itemObj.phone),
            description: resolveString(itemObj.description),
          });
        }
      }
    }

    return { hasPhone, mainPhone, phoneItems };
  }

  // Build a listing from an object, resolving all references
  function buildListing(obj: Record<string, unknown>): ListingData | null {
    const fullName = resolveString(obj.fullName);
    const name = resolveString(obj.name);
    const listingAddress = resolveString(obj.listingAddress);
    const address = resolveString(obj.address);
    const pharmacyInfo = resolveString(obj.pharmacyInfo);
    const openNote = resolveString(obj.openNote);  // "Εφημερεύει 09:00 - 21:00"
    const phones = resolvePhones(obj.phones);

    // Must have name and address
    if (!(fullName || name) || !(listingAddress || address)) {
      return null;
    }

    return { fullName, name, listingAddress, address, phones, pharmacyInfo, openNote };
  }

  // Find listing objects by scanning for objects with pharmacy-like properties
  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    // Check if this looks like a listing object
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;

      // A listing has fullName or name + listingAddress or address
      // Check if the values (possibly references) resolve to strings
      const hasName = resolveString(obj.fullName) || resolveString(obj.name);
      const hasAddr = resolveString(obj.listingAddress) || resolveString(obj.address);

      if (hasName && hasAddr) {
        const listing = buildListing(obj);
        if (listing) {
          listings.push(listing);
        }
      }
    }
  }

  // Also search for listings array pattern
  // The Nuxt format often has a "listings" or "data" key that points to an array
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;

      // Check for listings/data array reference
      for (const key of ['listings', 'data', 'results', 'items']) {
        const ref = resolve(obj[key]);
        if (Array.isArray(ref)) {
          // Resolve each item in the array
          for (const idx of ref) {
            const listingObj = resolve(idx);
            if (
              listingObj &&
              typeof listingObj === 'object' &&
              !Array.isArray(listingObj)
            ) {
              const lo = listingObj as Record<string, unknown>;
              const listing = buildListing(lo);
              if (listing) {
                // Avoid duplicates
                const exists = listings.some(
                  l => l.fullName === listing.fullName && l.listingAddress === listing.listingAddress
                );
                if (!exists) {
                  listings.push(listing);
                }
              }
            }
          }
        }
      }
    }
  }

  return listings;
}

/**
 * Format phone from tel: URL format
 * Input: "tel:+302102626067"
 * Output: "210 262 6067"
 */
function formatPhone(phone: string): string | null {
  if (!phone) return null;

  // Remove tel: prefix
  let cleaned = phone.replace(/^tel:\+?/, '');

  // Remove country code (30 for Greece)
  if (cleaned.startsWith('30')) {
    cleaned = cleaned.substring(2);
  }

  // Format as XXX XXX XXXX
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  // Return as-is if already formatted or non-standard
  if (cleaned.includes(' ') || cleaned.length < 7) {
    return cleaned || null;
  }

  return cleaned;
}

/**
 * Parse duty hours from pharmacyInfo text
 * Format: "09:00 - 14:00" or "Εφημερεύει 21:00 - 08:00"
 *
 * All pharmacies from xo.gr "Εφημερεύοντα Φαρμακεία" are on-duty by definition
 */
function parseDutyHours(text: string): DutySlot[] {
  if (!text) return [];

  const duties: DutySlot[] = [];

  // Extract time ranges: "HH:MM - HH:MM"
  const timePattern = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/g;
  const matches = [...text.matchAll(timePattern)];

  for (const match of matches) {
    // All pharmacies from "Εφημερεύοντα" page are on_duty
    duties.push({ start: match[1], end: match[2], type: 'on_duty' });
  }

  return duties;
}

/**
 * Clean address by removing route/directions text
 */
function cleanAddress(address: string): string {
  return address
    .replace(/\s*\(Δρομολόγηση\)\s*/gi, '')
    .replace(/\s*\(Directions\)\s*/gi, '')
    .trim();
}

/**
 * Check if HTML contains pharmacy data
 */
export function hasPharmacyData(html: string): boolean {
  const $ = cheerio.load(html);
  const nuxtScript = $('#__NUXT_DATA__').html();
  if (!nuxtScript) return false;

  try {
    const data = JSON.parse(nuxtScript);
    const listings = extractListings(data);
    return listings.length > 0;
  } catch {
    return false;
  }
}

/**
 * Extract page title for debugging
 */
export function extractPageTitle(html: string): string {
  const $ = cheerio.load(html);
  return $('title').text().trim();
}
