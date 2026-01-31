import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import type { NearbyPharmacy } from '../types';

interface Props {
  pharmacies: NearbyPharmacy[];
  userLat: number;
  userLng: number;
  radius: number;
}

export function PharmacyMap({ pharmacies, userLat, userLng, radius }: Props) {
  const router = useRouter();
  const { isDark } = useTheme();

  const delta = (radius / 111_320) * 2.5;
  const region: Region = {
    latitude: userLat,
    longitude: userLng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };

  return (
    <MapView
      style={styles.map}
      initialRegion={region}
      showsUserLocation
      showsMyLocationButton
      userInterfaceStyle={isDark ? 'dark' : 'light'}
    >
      {pharmacies.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.lat, longitude: p.lng }}
          title={p.name}
          description={p.address}
          onCalloutPress={() => router.push(`/pharmacy/${p.id}`)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%' },
});
