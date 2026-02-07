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
  isRefetching?: boolean;
}

export function PharmacyMap({
  pharmacies,
  userLat,
  userLng,
  radius,
  selectedPharmacy,
  onSelectPharmacy,
  isRefetching,
}: Props) {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [routeCoordinates, setRouteCoordinates] = React.useState<{ latitude: number; longitude: number }[]>([]);

  // Calculate map delta based on radius
  const getDelta = (r: number | null) => ((r || 5000) / 111_320) * 3.5;

  const initialRegion: Region = {
    latitude: userLat,
    longitude: userLng,
    latitudeDelta: getDelta(radius),
    longitudeDelta: getDelta(radius),
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
      setRouteCoordinates([
        { latitude: userLat, longitude: userLng },
        { latitude: selectedPharmacy.lat, longitude: selectedPharmacy.lng },
      ]);
      const coords = await getRoute(userLat, userLng, selectedPharmacy.lat, selectedPharmacy.lng);
      if (!isActive) return;
      if (coords.length > 0) setRouteCoordinates(coords);
    }
    fetchRoute();
    return () => { isActive = false; };
  }, [selectedPharmacy, userLat, userLng]);

  // Auto-select ONLY if in "closest" mode (initial state)
  useEffect(() => {
    if (radius === null && pharmacies.length > 0 && !hasAutoSelectedRef.current) {
      const closest = pharmacies[0];
      onSelectPharmacy(closest);
      hasAutoSelectedRef.current = true;
    }
  }, [pharmacies.length, radius]);

  // React to Radius changes specifically for immediate feedback
  useEffect(() => {
    if (mapRef.current && !selectedPharmacy) {
      const d = getDelta(radius);
      mapRef.current.animateToRegion({
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: d,
        longitudeDelta: d,
      }, 700);
    }
  }, [radius]);

  // Fitting logic - Ensures all markers are visible
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapRef.current || isRefetching) return;

      if (selectedPharmacy) {
        const points = [
          { latitude: userLat, longitude: userLng },
          { latitude: selectedPharmacy.lat, longitude: selectedPharmacy.lng },
        ];
        mapRef.current.fitToCoordinates(points, {
          edgePadding: { top: 100, right: 80, bottom: 350, left: 80 },
          animated: true,
        });
      } else if (pharmacies.length > 0) {
        // Fit ALL results found
        const points = [
          { latitude: userLat, longitude: userLng },
          ...pharmacies.map(p => ({ latitude: p.lat, longitude: p.lng }))
        ];
        mapRef.current.fitToCoordinates(points, {
          edgePadding: { top: 150, right: 100, bottom: 250, left: 100 },
          animated: true,
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [selectedPharmacy, pharmacies, radius, isRefetching]);

  const handleMarkerPress = (pharmacy: NearbyPharmacy) => {
    onSelectPharmacy(pharmacy);
  };

  return (
    <View style={styles.map}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={true}
        userLocationAnnotationTitle=""
        showsMyLocationButton={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        mapPadding={{ top: 0, right: 0, bottom: 180, left: 0 }}
        paddingAdjustmentBehavior="always"
        pitchEnabled={true}
      >
        <Circle
          center={{ latitude: userLat, longitude: userLng }}
          radius={120}
          fillColor="rgba(191, 223, 210, 0.35)"
          strokeColor="rgba(191, 223, 210, 0.5)"
          strokeWidth={1.5}
          zIndex={1}
        />

        {selectedPharmacy && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#0ED991"
            strokeWidth={5}
            zIndex={100}
          />
        )}

        {/* 2. Pharmacy markers with Spiderfy (spread out if same coords) */}
        {pharmacies.map((p, index) => {
          // Detect if this marker overlaps with previous markers
          const offset = 0.0003; // Increased offset for better spread
          const overlaps = pharmacies.slice(0, index).filter(
            other => Math.abs(other.lat - p.lat) < 0.0001 && Math.abs(other.lng - p.lng) < 0.0001
          ).length;

          const displayLat = p.lat + (overlaps > 0 ? (Math.sin(overlaps * 1.25) * offset) : 0);
          const displayLng = p.lng + (overlaps > 0 ? (Math.cos(overlaps * 1.25) * offset) : 0);

          return (
            <PharmacyMarker
              key={`${p.id}-${overlaps}`}
              pharmacy={{ ...p, lat: displayLat, lng: displayLng }}
              isSelected={selectedPharmacy?.id === p.id}
              onPress={onSelectPharmacy}
              colors={colors}
            />
          );
        })}

        <Marker
          key="user-location-stable"
          coordinate={{ latitude: userLat, longitude: userLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={10000}
        >
          <View collapsable={false} style={styles.userLocationOuter}>
            <View collapsable={false} style={styles.userLocationInner}>
              <Ionicons name="walk" size={14} color="#1A1D21" />
            </View>
          </View>
        </Marker>
      </MapView>

      {/* Results HUD for confirmation */}
      <View style={styles.hudContainer}>
        <BlurView intensity={70} style={styles.hudInner}>
          <Text style={[styles.hudText, { color: colors.text }]}>
            {pharmacies.length} φαρμακεία
          </Text>
        </BlurView>
      </View>

      {isRefetching && (
        <View style={styles.loadingOverlay}>
          <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.loaderBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loaderText, { color: colors.text }]}>Ενημέρωση...</Text>
          </BlurView>
        </View>
      )}
    </View>
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
  const markerKey = `${pharmacy.id}-${isSelected ? 'selected' : 'unselected'}`;

  return (
    <Marker
      key={markerKey}
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
});

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
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
  pharmacyMarker: {
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pharmacyImage: {
    width: 44,
    height: 44,
  },
  hudContainer: {
    position: 'absolute',
    top: 140, // Below radius buttons
    left: '50%',
    transform: [{ translateX: -60 }],
    zIndex: 100,
  },
  hudInner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  hudText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 1000,
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
    overflow: 'hidden',
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
