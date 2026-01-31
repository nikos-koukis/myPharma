import { api } from './client';
import type { Pharmacy, NearbyPharmacy, RegionCity } from '../types';

export async function getOnDutyPharmacies(params: {
  region?: string;
  city?: string;
  date?: string;
}): Promise<Pharmacy[]> {
  const { data } = await api.get('/api/pharmacies/on-duty', { params });
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
    params: prefecture ? { prefecture } : undefined,
  });
  return data;
}
