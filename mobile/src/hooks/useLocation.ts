import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

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
        setLat(last.coords.latitude);
        setLng(last.coords.longitude);
        setLoading(false);
      }

      // Then get a fresh position (may take a few seconds on real devices)
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10_000,
      });
      console.log('[location] fresh position:', loc.coords.latitude, loc.coords.longitude);
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.warn('[location] error:', msg);
      setError(`Could not get your location: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { lat, lng, loading, error, retry: fetchLocation };
}
