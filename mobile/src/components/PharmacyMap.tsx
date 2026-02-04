import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import MapView, { Marker, Region, Polyline, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { NearbyPharmacy } from '../types';

const pharmacyImage = require('../../assets/pin.png');

interface Props {
  pharmacies: NearbyPharmacy[];
  userLat: number;
  userLng: number;
  radius: number;
  selectedPharmacy: NearbyPharmacy | null;
  onSelectPharmacy: (pharmacy: NearbyPharmacy | null) => void;
}

export function PharmacyMap({
  pharmacies,
  userLat,
  userLng,
  radius,
  selectedPharmacy,
  onSelectPharmacy,
}: Props) {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);

  // Calculate map delta based on radius
  const delta = (radius / 111_320) * 2.5;

  const initialRegion: Region = {
    latitude: userLat,
    longitude: userLng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };

  // Track if we've done initial auto-select (to avoid re-selecting after dismiss)
  const hasAutoSelectedRef = useRef(false);

  // Auto-select closest pharmacy on initial load ONLY
  useEffect(() => {
    if (pharmacies.length > 0 && !hasAutoSelectedRef.current) {
      // Pharmacies are already sorted by distance from API
      const closest = pharmacies[0];
      onSelectPharmacy(closest);
      hasAutoSelectedRef.current = true;
    }
  }, [pharmacies, onSelectPharmacy]);

  // Fit map to show selected pharmacy or all pharmacies
  useEffect(() => {
    if (selectedPharmacy && mapRef.current) {
      // Animate to a zoomed, 3D view focused on the pharmacy
      // Fit both user and pharmacy on screen with padding for the bottom card
      mapRef.current.fitToCoordinates([
        { latitude: userLat, longitude: userLng },
        { latitude: selectedPharmacy.lat, longitude: selectedPharmacy.lng },
      ], {
        edgePadding: { top: 120, right: 50, bottom: 350, left: 50 },
        animated: true,
      });
    } else if (!selectedPharmacy && mapRef.current && hasAutoSelectedRef.current) {
      // Zoom out to show all pharmacies ONLY when selection is manually cleared
      const coordinates = [
        { latitude: userLat, longitude: userLng },
        ...pharmacies.map(p => ({ latitude: p.lat, longitude: p.lng }))
      ];

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 60, bottom: 100, left: 60 },
        animated: true,
      });
    }
  }, [selectedPharmacy, userLat, userLng, pharmacies]);

  // Route polyline coordinates
  const routeCoordinates = useMemo(() => {
    if (!selectedPharmacy) return [];
    return [
      { latitude: userLat, longitude: userLng },
      { latitude: selectedPharmacy.lat, longitude: selectedPharmacy.lng },
    ];
  }, [selectedPharmacy, userLat, userLng]);

  const handleMarkerPress = (pharmacy: NearbyPharmacy) => {
    onSelectPharmacy(pharmacy);
  };

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation={false}
      showsMyLocationButton={false}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      mapPadding={{ top: 0, right: 0, bottom: 180, left: 0 }}
      pitchEnabled={true}
      camera={{
        center: { latitude: userLat, longitude: userLng },
        pitch: 45,
        heading: 0,
        zoom: 15,
      }}
    >
      {/* Custom user location with glowing effect */}
      <Circle
        center={{ latitude: userLat, longitude: userLng }}
        radius={80}
        fillColor="rgba(191, 223, 210, 0.2)"
        strokeColor="rgba(191, 223, 210, 0.4)"
        strokeWidth={1}
        zIndex={100}
      />
      <Circle
        center={{ latitude: userLat, longitude: userLng }}
        radius={40}
        fillColor="rgba(191, 223, 210, 0.35)"
        strokeColor="rgba(191, 223, 210, 0.6)"
        strokeWidth={2}
        zIndex={101}
      />
      <Marker
        coordinate={{ latitude: userLat, longitude: userLng }}
        anchor={{ x: 0.5, y: 0.5 }}
        zIndex={102}
        tracksViewChanges={false} // User location doesn't change visually
      >
        <View style={styles.userLocationOuter}>
          <View style={styles.userLocationInner}>
            <Ionicons name="walk" size={12} color="#1A1D21" />
          </View>
        </View>
      </Marker>

      {/* Route line from user to selected pharmacy */}
      {selectedPharmacy && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={colors.primary}
          strokeWidth={4}
        />
      )}

      {/* Pharmacy markers - 3D building */}
      {pharmacies.map((p) => (
        <PharmacyMarker
          key={p.id}
          pharmacy={p}
          isSelected={selectedPharmacy?.id === p.id}
          onPress={handleMarkerPress}
          colors={colors}
        />
      ))}
    </MapView>
  );
}

function PharmacyMarker({
  pharmacy,
  isSelected,
  onPress,
  colors
}: {
  pharmacy: NearbyPharmacy;
  isSelected: boolean;
  onPress: (p: NearbyPharmacy) => void;
  colors: any;
}) {
  return (
    <Marker
      coordinate={{ latitude: pharmacy.lat, longitude: pharmacy.lng }}
      onPress={() => onPress(pharmacy)}
      zIndex={isSelected ? 1000 : 1}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={true} // Ensure always rendered
    >
      <View
        collapsable={false} // Crucial for iOS marker visibility
        style={[
          styles.pharmacyMarker,
          {
            shadowColor: colors.primary,
            shadowOpacity: isSelected ? 0.9 : 0.5,
            shadowRadius: isSelected ? 15 : 8,
            transform: isSelected ? [{ scale: 1.5 }] : [{ scale: 1 }],
          },
        ]}
      >
        <Image
          source={pharmacyImage}
          style={styles.pharmacyImage}
          resizeMode="contain"
        />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  markerGlow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  userLocationOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(191, 223, 210, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFDFD2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  userLocationInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#BFDFD2',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFDFD2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  userLocationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  pharmacyMarker: {
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pharmacyImage: {
    width: 44,
    height: 44,
  },
});
