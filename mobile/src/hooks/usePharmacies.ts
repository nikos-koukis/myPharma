import { useQuery } from '@tanstack/react-query';
import {
  getOnDutyPharmacies,
  getNearbyPharmacies,
  getPharmacyById,
  getPrefectures,
  getRegions,
} from '../api/pharmacies';

export function useOnDutyPharmacies(params: {
  region?: string;
  city?: string;
  date?: string;
}) {
  return useQuery({
    queryKey: ['on-duty', params],
    queryFn: () => getOnDutyPharmacies(params),
    staleTime: 5 * 60_000,
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
  return useQuery({
    queryKey: ['nearby', queryParams],
    queryFn: () => getNearbyPharmacies(queryParams),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function usePharmacyDetail(id: string) {
  return useQuery({
    queryKey: ['pharmacy', id],
    queryFn: () => getPharmacyById(id),
    enabled: !!id,
  });
}

export function usePrefectures() {
  return useQuery({
    queryKey: ['prefectures'],
    queryFn: getPrefectures,
    staleTime: 24 * 60 * 60_000,
  });
}

export function useRegions(prefecture?: string) {
  return useQuery({
    queryKey: ['regions', prefecture],
    queryFn: () => getRegions(prefecture ?? undefined),
    enabled: !!prefecture,
    staleTime: 24 * 60 * 60_000,
  });
}
