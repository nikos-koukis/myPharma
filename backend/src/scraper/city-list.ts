/**
 * City list for xo.gr pharmacy scraper
 *
 * Uses dynamic discovery - cities are discovered from prefecture pages at runtime
 */

// Re-export types
export { CityConfig, PrefectureConfig } from './types';
import { CityConfig, PrefectureConfig } from './types';

// Import prefectures for dynamic discovery
import { ACHAIAS_PREFECTURE } from './regions/achaias';

// Prefectures to scrape (cities discovered at runtime)
export const DISCOVERY_PREFECTURES: PrefectureConfig[] = [
  ACHAIAS_PREFECTURE,
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
export function filterCitiesByPrefecture(cities: CityConfig[], prefecture: string): CityConfig[] {
  const q = prefecture.toLowerCase();
  return cities.filter((c) => c.prefecture.toLowerCase().includes(q));
}

/**
 * Filter cities by name
 */
export function filterCitiesByName(cities: CityConfig[], name: string): CityConfig[] {
  const q = name.toLowerCase();
  return cities.filter(
    (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
  );
}

/**
 * Get all unique prefectures from a city list
 */
export function getPrefectures(cities: CityConfig[]): string[] {
  return [...new Set(cities.map((c) => c.prefecture))].sort((a, b) =>
    a.localeCompare(b, 'el')
  );
}

/**
 * Get prefectures to scrape based on SCRAPE_PREFECTURES env var
 */
export function getScrapePrefectureFilter(): string[] | null {
  const filter = process.env.SCRAPE_PREFECTURES?.trim();
  if (!filter) {
    return null; // No filter = scrape all
  }
  return filter.split(',').map(p => p.trim().toUpperCase());
}

/**
 * Get discovery prefectures filtered by SCRAPE_PREFECTURES env var
 */
export function getActiveDiscoveryPrefectures(): PrefectureConfig[] {
  const filter = getScrapePrefectureFilter();
  if (!filter) {
    return DISCOVERY_PREFECTURES;
  }
  return DISCOVERY_PREFECTURES.filter(p =>
    filter.some(f => p.name.toUpperCase().includes(f))
  );
}
