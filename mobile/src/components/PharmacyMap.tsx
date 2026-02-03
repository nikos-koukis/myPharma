import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Region, Callout } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const { colors, isDark } = useTheme();

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
      showsMyLocationButton={false}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      mapPadding={{ top: 0, right: 0, bottom: 180, left: 0 }}
    >
      {pharmacies.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.lat, longitude: p.lng }}
          onPress={() => router.push(`/pharmacy/${p.id}`)}
        >
          <View style={[styles.markerContainer, { backgroundColor: colors.marker, borderColor: colors.markerBorder }]}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
