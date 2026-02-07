/**
 * City list for xo.gr pharmacy scraper
 *
 * Cities are organized by prefecture in separate files under regions/
 * To add a new prefecture, create a new file in regions/ and import here
 */

// Re-export CityConfig type
export { CityConfig } from './types';
import { CityConfig } from './types';

// Import cities from region files
import { ATTIKIS_CITIES } from './regions/attikis';
import { ACHAIAS_CITIES } from './regions/achaias';
import { THESSALONIKIS_CITIES } from './regions/thessalonikis';
import { CHALKIDIKIS_CITIES } from './regions/chalkidikis';

// Combined city list from all prefectures
export const CITY_LIST: CityConfig[] = [
  ...ATTIKIS_CITIES,
  ...ACHAIAS_CITIES,
  ...THESSALONIKIS_CITIES,
  ...CHALKIDIKIS_CITIES,
];

/**
 * Build full URL for a city with optional date parameter
 * @param city - City configuration
 * @param date - Optional date in format DD/MM/YYYY (xo.gr format)
 */
export function getCityUrl(city: CityConfig, date?: string): string {
  const baseUrl = `https://www.xo.gr/efimerevonta-farmakeia/${city.slug}/`;
  if (date) {
    return `${baseUrl}?date=${date}`;
  }
  return baseUrl;
}

/**
 * Format a Date object to xo.gr date format (DD/MM/YYYY)
 */
export function formatDateForXo(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Get today's date formatted for xo.gr
 */
export function getTodayForXo(): string {
  return formatDateForXo(new Date());
}

/**
 * Get tomorrow's date formatted for xo.gr
 */
export function getTomorrowForXo(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateForXo(tomorrow);
}

/**
 * Filter cities by prefecture
 */
export function filterCitiesByPrefecture(prefecture: string): CityConfig[] {
  const q = prefecture.toLowerCase();
  return CITY_LIST.filter((c) => c.prefecture.toLowerCase().includes(q));
}

/**
 * Filter cities by name
 */
export function filterCitiesByName(name: string): CityConfig[] {
  const q = name.toLowerCase();
  return CITY_LIST.filter(
    (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
  );
}

/**
 * Get all unique prefectures
 */
export function getPrefectures(): string[] {
  return [...new Set(CITY_LIST.map((c) => c.prefecture))].sort((a, b) =>
    a.localeCompare(b, 'el')
  );
}

/**
 * Get filtered city list based on SCRAPE_PREFECTURES env var.
 */
export function getActiveCities(): CityConfig[] {
  const filter = process.env.SCRAPE_PREFECTURES?.trim();

  if (!filter) {
    return CITY_LIST;
  }

  const prefectures = filter.split(',').map(p => p.trim().toUpperCase());

  return CITY_LIST.filter(city =>
    prefectures.some(p => city.prefecture.toUpperCase().includes(p))
  );
}
