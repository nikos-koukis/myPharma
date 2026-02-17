export interface DutySlot {
  start: string;
  end: string;
  type: 'regular' | 'extended' | 'on_duty';
  isOvernight?: boolean;
}

export interface PharmacyDuty {
  dutyDate: string;
  duties: DutySlot[];
}

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
  duties: DutySlot[];
}

export interface RegionCity {
  region: string;
  city: string;
}
