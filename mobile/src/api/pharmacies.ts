import { api } from './client';
import type { Pharmacy, NearbyPharmacy, RegionCity } from '../types';
import { normalizeGreekLocation, removeGreekAccents } from '../utils/greekText';

export async function getOnDutyPharmacies(params: {
  region?: string;
  city?: string;
  date?: string;
}): Promise<Pharmacy[]> {
  // Normalize region and city.
  // CRITICAL: For regions, we use a prefix (first 3-4 chars) if it's long, 
  // to avoid encoding/tonos issues with special chars like 'ΐ' or 'ή'.
  let searchRegion = params.region;
  if (searchRegion && searchRegion.length > 3) {
    searchRegion = searchRegion.trim().substring(0, 3); // e.g., "Αχα" from "Αχαΐας"
  }

  const normalizedParams = {
    ...params,
    region: searchRegion,
    city: params.city ? normalizeGreekLocation(params.city) : undefined,
  };

  console.log('[API] getOnDutyPharmacies request:', normalizedParams);

  const { data } = await api.get('/api/pharmacies/on-duty', { params: normalizedParams });

  console.log('[API] getOnDutyPharmacies response:', data?.length ?? 0, 'pharmacies');

  return data;
}

export async function getNearbyPharmacies(params: {
  lat: number;
  lng: number;
  radius?: number;
  date?: string;
}): Promise<NearbyPharmacy[]> {
  const { data } = await api.get('/api/pharmacies/nearby', { params });
  return data;
}

export async function getPharmacyById(id: string): Promise<Pharmacy> {
  const { data } = await api.get(`/api/pharmacies/${id}`);
  return data;
}

export async function getPrefectures(): Promise<string[]> {
  const { data } = await api.get('/api/prefectures');
  return data;
}

export async function getRegions(prefecture?: string): Promise<RegionCity[]> {
  const { data } = await api.get('/api/regions', {
    params: prefecture ? { prefecture: removeGreekAccents(prefecture) } : undefined,
  });
  return data;
}
