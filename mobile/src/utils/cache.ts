import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentDate } from './dutySchedule';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const CACHE_PREFIX = 'pharmacy_cache_';

/**
 * Get Greece timezone offset in minutes (handles DST)
 */
function getGreeceOffsetMs(): number {
  const now = new Date();
  const year = now.getUTCFullYear();

  // Find last Sunday of March (DST starts)
  const marchLast = new Date(Date.UTC(year, 2, 31, 1, 0, 0));
  while (marchLast.getUTCDay() !== 0) marchLast.setUTCDate(marchLast.getUTCDate() - 1);

  // Find last Sunday of October (DST ends)
  const octLast = new Date(Date.UTC(year, 9, 31, 1, 0, 0));
  while (octLast.getUTCDay() !== 0) octLast.setUTCDate(octLast.getUTCDate() - 1);

  const isDST = now.getTime() >= marchLast.getTime() && now.getTime() < octLast.getTime();
  return (isDST ? 3 : 2) * 60 * 60 * 1000;
}

/**
 * Get milliseconds until next midnight in Greece timezone
 */
function getMillisUntilMidnight(): number {
  const now = new Date();
  const greeceOffsetMs = getGreeceOffsetMs();
  const greeceNowMs = now.getTime() + greeceOffsetMs + now.getTimezoneOffset() * 60 * 1000;

  const greeceMidnight = new Date(greeceNowMs);
  greeceMidnight.setHours(24, 0, 0, 0);

  return greeceMidnight.getTime() - greeceNowMs;
}

/**
 * Get today's date string in Greece timezone (for cache key)
 */
function getGreeceDateKey(): string {
  return getCurrentDate();
}

/**
 * Cache configuration
 */
export const CacheConfig = {
  // Default TTL: 24 hours
  DEFAULT_TTL_MS: 24 * 60 * 60 * 1000,

  // TTL until midnight (for daily data)
  UNTIL_MIDNIGHT: () => getMillisUntilMidnight(),

  // Short TTL for location-based queries
  NEARBY_TTL_MS: 5 * 60 * 1000, // 5 minutes

  // Stale threshold: show cached data but refresh if older than this
  STALE_THRESHOLD_MS: 6 * 60 * 60 * 1000, // 6 hours
};

/**
 * Set data in cache with TTL
 *
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlMs - Time to live in milliseconds (default: until midnight)
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttlMs: number = CacheConfig.UNTIL_MIDNIGHT()
): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };

  try {
    await AsyncStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify(entry)
    );
  } catch (error) {
    console.warn('[Cache] Failed to set cache:', error);
  }
}

/**
 * Get data from cache
 *
 * @param key - Cache key
 * @returns Cached data with metadata, or null if not found/expired
 */
export async function getCache<T>(key: string): Promise<{
  data: T;
  isStale: boolean;
  isExpired: boolean;
  age: number;
} | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const now = Date.now();
    const age = now - entry.timestamp;
    const isExpired = now >= entry.expiresAt;
    const isStale = age > CacheConfig.STALE_THRESHOLD_MS;

    return {
      data: entry.data,
      isStale,
      isExpired,
      age,
    };
  } catch (error) {
    console.warn('[Cache] Failed to get cache:', error);
    return null;
  }
}

/**
 * Get cached data with stale-while-revalidate pattern
 *
 * Returns cached data immediately if available (even if stale),
 * and indicates whether a refresh is needed.
 *
 * @param key - Cache key
 * @returns Object with data and refresh status
 */
export async function getCacheWithSWR<T>(key: string): Promise<{
  data: T | null;
  shouldRefresh: boolean;
  isStale: boolean;
}> {
  const cached = await getCache<T>(key);

  if (!cached) {
    return { data: null, shouldRefresh: true, isStale: false };
  }

  return {
    data: cached.data,
    shouldRefresh: cached.isExpired || cached.isStale,
    isStale: cached.isStale,
  };
}

/**
 * Remove specific cache entry
 */
export async function removeCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch (error) {
    console.warn('[Cache] Failed to remove cache:', error);
  }
}

/**
 * Clear all pharmacy cache entries
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.warn('[Cache] Failed to clear cache:', error);
  }
}

/**
 * Clear expired cache entries (housekeeping)
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));

    let clearedCount = 0;
    const now = Date.now();

    for (const key of cacheKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        try {
          const entry: CacheEntry<unknown> = JSON.parse(raw);
          if (now >= entry.expiresAt) {
            await AsyncStorage.removeItem(key);
            clearedCount++;
          }
        } catch {
          // Invalid entry, remove it
          await AsyncStorage.removeItem(key);
          clearedCount++;
        }
      }
    }

    return clearedCount;
  } catch (error) {
    console.warn('[Cache] Failed to clear expired cache:', error);
    return 0;
  }
}

/**
 * Build cache key for nearby pharmacies
 */
export function buildNearbyCacheKey(lat: number, lng: number, radius: number): string {
  // Round to 3 decimal places (~111m precision)
  const roundedLat = lat.toFixed(3);
  const roundedLng = lng.toFixed(3);
  const date = getGreeceDateKey();
  return `nearby_${date}_${roundedLat}_${roundedLng}_${radius}`;
}

/**
 * Build cache key for on-duty pharmacies by city
 */
export function buildOnDutyCacheKey(city: string): string {
  const date = getGreeceDateKey();
  return `onduty_${date}_${city.toLowerCase()}`;
}
