import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

// Default location for simulator/development: Triandria, Thessaloniki
const SIMULATOR_DEFAULT_LOCATION = {
  lat: 40.6212,
  lng: 22.9691,
};

// Detect if running in iOS simulator (San Francisco area)
function isSimulatorLocation(lat: number, lng: number): boolean {
  // iOS Simulator default location is around San Francisco (37.78, -122.40)
  return (
    Platform.OS === 'ios' &&
    lat > 37.7 && lat < 37.9 &&
    lng > -122.5 && lng < -122.3
  );
}

interface LocationState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useLocation(): LocationState {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setLocationWithSimulatorCheck = useCallback((latitude: number, longitude: number) => {
    // If we detect the simulator's fake SF location, use Athens instead
    if (isSimulatorLocation(latitude, longitude)) {
      console.log('[location] Detected simulator location (SF), using Athens, Greece instead');
      setLat(SIMULATOR_DEFAULT_LOCATION.lat);
      setLng(SIMULATOR_DEFAULT_LOCATION.lng);
    } else {
      setLat(latitude);
      setLng(longitude);
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if location services are enabled on the device
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setError('Location services are disabled. Please enable GPS in your device settings.');
        setLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[location] permission status:', status);
      if (status !== 'granted') {
        setError('Location permission denied. Enable it in Settings.');
        setLoading(false);
        return;
      }

      // Try last known position first (instant)
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        console.log('[location] using last known:', last.coords.latitude, last.coords.longitude);
        setLocationWithSimulatorCheck(last.coords.latitude, last.coords.longitude);
        setLoading(false);
      }

      // Then get a fresh position (may take a few seconds on real devices)
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10_000,
      });
      console.log('[location] fresh position:', loc.coords.latitude, loc.coords.longitude);
      setLocationWithSimulatorCheck(loc.coords.latitude, loc.coords.longitude);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.warn('[location] error:', msg);
      setError(`Could not get your location: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [setLocationWithSimulatorCheck]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { lat, lng, loading, error, retry: fetchLocation };
}
