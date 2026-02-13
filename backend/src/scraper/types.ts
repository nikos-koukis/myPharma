/**
 * Shared types for the scraper
 */

export interface CityConfig {
  name: string;
  slug: string;
  prefecture: string;
}

export interface PrefectureConfig {
  name: string;        // Display name in Greek (e.g., "Αχαΐας")
  slug: string;        // URL slug (e.g., "nomos-achaias")
}
