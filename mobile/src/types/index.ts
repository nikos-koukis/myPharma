export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  city: string;
  region: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
  duties?: PharmacyDuty[];
}

export interface PharmacyDuty {
  id: string;
  pharmacyId: string;
  dutyDate: string;
  shift: 'morning' | 'night' | 'all_day';
  scrapedAt: string;
}

export interface NearbyPharmacy {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  city: string;
  region: string;
  lat: number;
  lng: number;
  distance_meters: number;
  duty_date: string;
  shift: string;
}

export interface RegionCity {
  region: string;
  city: string;
}
