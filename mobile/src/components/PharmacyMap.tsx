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
  radius: number | null;
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

  // Calculate map delta based on radius (default to 5km if no radius selected)
  const delta = ((radius || 5000) / 111_320) * 1.0;

  const initialRegion: Region = {
    latitude: userLat,
    longitude: userLng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };

  const hasAutoSelectedRef = useRef(false);

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

      const coords = await getRoute(
        userLat,
        userLng,
        selectedPharmacy.lat,
        selectedPharmacy.lng
      );

      if (!isActive) return;

      if (coords.length > 0) {
        setRouteCoordinates(coords);
      }
    }

    fetchRoute();

    return () => {
      isActive = false;
    };
  }, [selectedPharmacy, userLat, userLng]);

  // Auto-select closest pharmacy on initial load
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
    // Only fit if we have valid dimensions/ref
    if (!mapRef.current) return;

    if (selectedPharmacy) {
      // Focus on User + Selected
      const fitPoints = [
        { latitude: userLat, longitude: userLng },
        { latitude: selectedPharmacy.lat, longitude: selectedPharmacy.lng },
      ];

      mapRef.current.fitToCoordinates(fitPoints, {
        edgePadding: { top: 80, right: 80, bottom: 350, left: 80 },
        animated: true,
      });
    } else if (hasAutoSelectedRef.current) {
      if (pharmacies.length > 0) {
        // Zoom to show user and all results
        const coordinates = [
          { latitude: userLat, longitude: userLng },
          ...pharmacies.map(p => ({ latitude: p.lat, longitude: p.lng }))
        ];

        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 60, bottom: 100, left: 60 },
          animated: true,
        });
      } else {
        // No pharmacies: Center on user
        const zoomDelta = Math.max(((radius || 5000) / 111_320) * 2, 0.04);
        mapRef.current.animateToRegion({
          latitude: userLat,
          longitude: userLng,
          latitudeDelta: zoomDelta,
          longitudeDelta: zoomDelta,
        }, 500);
      }
    }
  }, [selectedPharmacy, userLat, userLng, pharmacies, radius]);

  const handleMarkerPress = (pharmacy: NearbyPharmacy) => {
    onSelectPharmacy(pharmacy);
  };

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

      {/* 1. Background Glow Circle */}
      <Circle
        center={{ latitude: userLat, longitude: userLng }}
        radius={120}
        fillColor="rgba(191, 223, 210, 0.35)"
        strokeColor="rgba(191, 223, 210, 0.5)"
        strokeWidth={1.5}
        zIndex={1}
      />

      {/* 1. Route line */}
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
    </MapView >
  );
}

const PharmacyMarker = React.memo(({
  pharmacy,
  isSelected,
  onPress,
  colors
}: {
  pharmacy: NearbyPharmacy;
  isSelected: boolean;
  onPress: (p: NearbyPharmacy) => void;
  colors: any;
}) => {
  const [tracksView, setTracksView] = React.useState(true);

  // Use a unique key that changes when selection state changes.
  // This FORCES the native marker to completely re-mount, which 
  // fixes the disappearing icon bug in react-native-maps.
  const markerKey = `${pharmacy.id}-${isSelected ? 'selected' : 'unselected'}`;

  React.useEffect(() => {
    setTracksView(true);
    const timer = setTimeout(() => {
      setTracksView(false);
    }, 5000); // 5s is very safe for rendering
    return () => clearTimeout(timer);
  }, [isSelected]);

  return (
    <Marker
      key={markerKey}
      coordinate={{ latitude: pharmacy.lat, longitude: pharmacy.lng }}
      onPress={() => onPress(pharmacy)}
      zIndex={isSelected ? 5000 : 1000}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksView}
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
}, (prev, next) => (
  prev.isSelected === next.isSelected &&
  prev.pharmacy.id === next.pharmacy.id &&
  prev.colors.primary === next.colors.primary
));

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
