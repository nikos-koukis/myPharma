import { useQuery } from '@tanstack/react-query';
import {
  getOnDutyPharmacies,
  getNearbyPharmacies,
  getPharmacyById,
  getPrefectures,
  getRegions,
} from '../api/pharmacies';
import { getCurrentDate } from '../utils/dutySchedule';

// Get milliseconds until next midnight (Greece timezone)
function getMillisUntilMidnight(): number {
  const now = new Date();

  // Greece is UTC+2 (winter) or UTC+3 (summer DST)
  const year = now.getUTCFullYear();
  const marchLast = new Date(Date.UTC(year, 2, 31, 1, 0, 0));
  while (marchLast.getUTCDay() !== 0) marchLast.setUTCDate(marchLast.getUTCDate() - 1);
  const octLast = new Date(Date.UTC(year, 9, 31, 1, 0, 0));
  while (octLast.getUTCDay() !== 0) octLast.setUTCDate(octLast.getUTCDate() - 1);
  const isDST = now.getTime() >= marchLast.getTime() && now.getTime() < octLast.getTime();
  const greeceOffsetMs = (isDST ? 3 : 2) * 60 * 60 * 1000;

  // Calculate Greece midnight
  const greeceNowMs = now.getTime() + greeceOffsetMs + now.getTimezoneOffset() * 60 * 1000;
  const greeceMidnight = new Date(greeceNowMs);
  greeceMidnight.setHours(24, 0, 0, 0); // Next midnight

  return greeceMidnight.getTime() - greeceNowMs;
}

// Cache TTL: until midnight (duty data changes daily)
const DUTY_CACHE_TIME = () => getMillisUntilMidnight();

// Stale time: 30 minutes (show cached data but refetch in background)
const DUTY_STALE_TIME = 30 * 60_000;

// Nearby: shorter cache since location changes
const NEARBY_STALE_TIME = 5 * 60_000;

// Static data (regions, prefectures): long cache
const STATIC_CACHE_TIME = 24 * 60 * 60_000;

export function useOnDutyPharmacies(params: {
  region?: string;
  city?: string;
  date?: string;
}) {
  // Always include today's date in the query key for proper cache invalidation
  const date = params.date ?? getCurrentDate();

  return useQuery({
    queryKey: ['on-duty', { ...params, date }],
    queryFn: () => getOnDutyPharmacies({ ...params, date }),
    staleTime: DUTY_STALE_TIME,
    gcTime: DUTY_CACHE_TIME(), // Garbage collect at midnight
  });
}

export function useNearbyPharmacies(params: {
  lat: number;
  lng: number;
  radius?: number;
  date?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;
  const date = params.date ?? getCurrentDate();

  // Round coordinates for cache key stability
  const roundedParams = {
    ...queryParams,
    date,
    lat: parseFloat(params.lat.toFixed(3)),
    lng: parseFloat(params.lng.toFixed(3)),
  };

  return useQuery({
    queryKey: ['nearby', roundedParams],
    queryFn: () => getNearbyPharmacies({ ...queryParams, date }),
    enabled,
    staleTime: NEARBY_STALE_TIME,
    gcTime: DUTY_CACHE_TIME(),
  });
}

export function usePharmacyDetail(id: string) {
  const date = getCurrentDate();

  return useQuery({
    queryKey: ['pharmacy', id, date],
    queryFn: () => getPharmacyById(id),
    enabled: !!id,
    staleTime: DUTY_STALE_TIME,
    gcTime: DUTY_CACHE_TIME(),
  });
}

export function usePrefectures() {
  return useQuery({
    queryKey: ['prefectures'],
    queryFn: getPrefectures,
    staleTime: STATIC_CACHE_TIME,
    gcTime: STATIC_CACHE_TIME,
  });
}

export function useRegions(prefecture?: string) {
  return useQuery({
    queryKey: ['regions', prefecture],
    queryFn: () => getRegions(prefecture ?? undefined),
    enabled: !!prefecture,
    staleTime: STATIC_CACHE_TIME,
    gcTime: STATIC_CACHE_TIME,
  });
}
