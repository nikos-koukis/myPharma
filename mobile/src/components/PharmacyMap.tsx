import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Image, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Region, Polyline, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeProvider';
import type { NearbyPharmacy } from '../types';
import { getRoute } from '../services/routing';

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
  const [routeCoordinates, setRouteCoordinates] = React.useState<{ latitude: number; longitude: number }[]>([]);

  // Calculate map delta based on radius (making it tighter initially)
  const delta = (radius / 111_320) * 1.0;

  const initialRegion: Region = {
    latitude: userLat,
    longitude: userLng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };

  // Track if we've done initial auto-select (to avoid re-selecting after dismiss)
  const [isInitializing, setIsInitializing] = React.useState(true);
  const hasAutoSelectedRef = useRef(false);

  // Auto-select closest pharmacy on initial load with a slight delay
  useEffect(() => {
    if (pharmacies.length > 0 && !hasAutoSelectedRef.current) {
      const timer = setTimeout(() => {
        // Pharmacies are already sorted by distance from API
        const closest = pharmacies[0];
        onSelectPharmacy(closest);
        hasAutoSelectedRef.current = true;
        setIsInitializing(false);
      }, 2000); // 2s delay as requested to let map initialize

      return () => clearTimeout(timer);
    } else if (pharmacies.length === 0) {
      setIsInitializing(false);
    }
  }, [pharmacies, onSelectPharmacy]);



  // Fetch real route when pharmacy is selected
  useEffect(() => {
    let isActive = true;

    async function fetchRoute() {
      if (!selectedPharmacy) {
        if (isActive) setRouteCoordinates([]);
        return;
      }

      // SET FALLBACK IMMEDIATELY so preview is visible while loading
      setRouteCoordinates([
        { latitude: userLat, longitude: userLng },
        { latitude: selectedPharmacy.lat, longitude: selectedPharmacy.lng },
      ]);

      console.log('Fetching route for:', selectedPharmacy.name, 'Coordinates:', selectedPharmacy.lat, selectedPharmacy.lng);

      const coords = await getRoute(
        userLat,
        userLng,
        selectedPharmacy.lat,
        selectedPharmacy.lng
      );

      if (!isActive) return;

      if (coords.length > 0) {
        console.log('Route found with points:', coords.length);
        setRouteCoordinates(coords);
      } else {
        console.warn('Route fetch failed or returned empty. Staying with straight line.');
      }
    }

    fetchRoute();

    return () => {
      isActive = false;
    };
  }, [selectedPharmacy, userLat, userLng]);

  // Fit map to show selected pharmacy or all pharmacies
  useEffect(() => {
    // Only fit if we have valid dimensions/ref
    if (!mapRef.current) return;

    if (selectedPharmacy) {
      // Focus on User + Selected + the original closest pharmacy
      const closest = pharmacies[0];
      const fitPoints = [
        { latitude: userLat, longitude: userLng },
        { latitude: selectedPharmacy.lat, longitude: selectedPharmacy.lng },
      ];

      // To ensure the "closest" one (the first in the list) is always visible
      if (closest && closest.id !== selectedPharmacy.id) {
        fitPoints.push({ latitude: closest.lat, longitude: closest.lng });
      }

      mapRef.current.fitToCoordinates(fitPoints, {
        edgePadding: { top: 80, right: 80, bottom: 350, left: 80 },
        animated: true,
      });
    } else if (hasAutoSelectedRef.current) {
      // Only zoom out if we had a selection before (user deselected)
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

  const handleMarkerPress = (pharmacy: NearbyPharmacy) => {
    onSelectPharmacy(pharmacy);
  };

  useEffect(() => {
    console.log('[PharmacyMap] user location:', userLat, userLng);
  }, [userLat, userLng]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation={true}
      userLocationAnnotationTitle=""
      showsMyLocationButton={false}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      mapPadding={{ top: 0, right: 0, bottom: 180, left: 0 }}
      pitchEnabled={true}
    >

      {/* 1. Background Glow Circle (The "Circle" the user mentioned) */}
      <Circle
        center={{ latitude: userLat, longitude: userLng }}
        radius={120}
        fillColor="rgba(191, 223, 210, 0.35)"
        strokeColor="rgba(191, 223, 210, 0.5)"
        strokeWidth={1.5}
        zIndex={1}
      />




      {/* 1. Route line - use a distinctive color to verify walking mode */}
      {selectedPharmacy && routeCoordinates.length > 0 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#0ED991"
          strokeWidth={5}
          zIndex={100}
        />
      )}



      {/* 2. Pharmacy markers */}
      {pharmacies.map((p) => (
        <PharmacyMarker
          key={p.id}
          pharmacy={p}
          isSelected={selectedPharmacy?.id === p.id}
          onPress={handleMarkerPress}
          colors={colors}
        />
      ))}




      {/* 3. User Walking Marker (LAST IN LIST = TOP VISIBILITY) */}
      <Marker
        key="user-location-stable"
        coordinate={{ latitude: userLat, longitude: userLng }}
        anchor={{ x: 0.5, y: 0.5 }}
        zIndex={10000}
        tracksViewChanges={true}
      >
        <View collapsable={false} style={styles.userLocationOuter}>
          <View collapsable={false} style={styles.userLocationInner}>
            <Ionicons name="walk" size={14} color="#1A1D21" />
          </View>
        </View>
      </Marker>

      {
        isInitializing && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.initializingOverlay}>
              <View style={[styles.loaderBox, { backgroundColor: colors.surfaceSecondary }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loaderText, { color: colors.text }]}>Προετοιμασία χάρτη...</Text>
              </View>
            </BlurView>
          </View>
        )
      }
    </MapView >
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
      zIndex={isSelected ? 5000 : 1000}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={true}
    >
      <View
        collapsable={false}
        style={[
          styles.pharmacyMarker,
          {
            shadowColor: colors.primary,
            shadowOpacity: isSelected ? 0.9 : 0.5,
            shadowRadius: isSelected ? 15 : 8,
            transform: isSelected ? [{ scale: 1.4 }] : [{ scale: 1 }],
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
  userMarkerContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  initializingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  loaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
