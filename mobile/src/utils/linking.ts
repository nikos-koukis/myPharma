import { Linking, Platform, Share } from 'react-native';
import type { Pharmacy, NearbyPharmacy } from '../types';

export function openDirections(lat: number, lng: number, label?: string) {
  const encoded = encodeURIComponent(label ?? '');
  const url = Platform.select({
    ios: `maps:0,0?q=${encoded}&ll=${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encoded})`,
  });
  if (url) Linking.openURL(url);
}

export function callPhone(phone: string) {
  Linking.openURL(`tel:${phone}`);
}

export async function sharePharmacy(pharmacy: Pharmacy | NearbyPharmacy) {
  const lines = [pharmacy.name, pharmacy.address];
  if (pharmacy.phone) lines.push(pharmacy.phone);
  if (pharmacy.lat && pharmacy.lng) {
    lines.push(`https://maps.google.com/?q=${pharmacy.lat},${pharmacy.lng}`);
  }
  await Share.share({ message: lines.join('\n') });
}
