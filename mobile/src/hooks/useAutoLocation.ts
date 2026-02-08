import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useAppStore } from '../store';
import { getNearbyPharmacies } from '../api/pharmacies';
import { normalizeGreekLocation } from '../utils/greekText';

interface AutoLocationState {
  detecting: boolean;
  error: string | null;
}

export function useAutoLocation(): AutoLocationState {
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationDetected = useAppStore((s) => s.locationDetected);
  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const setLocationDetected = useAppStore((s) => s.setLocationDetected);

  useEffect(() => {
    // Skip if location already detected
    if (locationDetected) return;

    async function detectLocation() {
      setDetecting(true);
      setError(null);

      try {
        // Check location services
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          setError('Location services disabled');
          setDetecting(false);
          return;
        }

        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setDetecting(false);
          return;
        }

        // Get current position
        let coords: { latitude: number; longitude: number } | null = null;

        // Try last known first
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          coords = last.coords;
        }

        // Get fresh position
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = loc.coords;

        if (!coords) {
          setError('Could not get location');
          setDetecting(false);
          return;
        }

        // --- Simulator Override Logic ---
        const { Platform } = require('react-native');
        const isSimulator = Platform.OS === 'ios' &&
          coords.latitude > 37.7 && coords.latitude < 37.9 &&
          coords.longitude > -122.5 && coords.longitude < -122.3;

        if (isSimulator) {
          console.log('[autoLocation] Detected simulator (SF), overriding to Thessaloniki...');
          coords = { latitude: 40.6212, longitude: 22.9691 };
        }
        // --------------------------------

        console.log('[autoLocation] Got coordinates:', coords.latitude, coords.longitude);

        // Find nearest pharmacy to determine the city
        const today = new Date().toISOString().split('T')[0];
        const nearby = await getNearbyPharmacies({
          lat: coords.latitude,
          lng: coords.longitude,
          radius: 50000, // 50km radius to find at least one pharmacy
          date: today,
        });

        if (nearby.length === 0) {
          setError('No pharmacies found in your area');
          setDetecting(false);
          return;
        }

        // Get the closest pharmacy's city and region
        const closest = nearby[0];
        console.log('[autoLocation] Detected location (raw):', closest.region, closest.city);

        // Normalize to Title Case to avoid case sensitivity issues
        const normalizedRegion = normalizeGreekLocation(closest.region);
        const normalizedCity = normalizeGreekLocation(closest.city);
        console.log('[autoLocation] Normalized location:', normalizedRegion, normalizedCity);

        // Save the user's location
        setUserLocation({
          prefecture: normalizedRegion,
          city: normalizedCity,
          lat: coords.latitude,
          lng: coords.longitude,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.warn('[autoLocation] Error:', msg);
        setError(msg);
      } finally {
        setDetecting(false);
      }
    }

    detectLocation();
  }, [locationDetected, setUserLocation, setLocationDetected]);

  return { detecting, error };
}
