import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useAppStore } from '../store';
import { getNearbyPharmacies } from '../api/pharmacies';
import { normalizeGreekLocation, extractAreaFromAddress } from '../utils/greekText';

interface AutoLocationState {
  detecting: boolean;
  error: string | null;
}

export function useAutoLocation(): AutoLocationState {
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const userLocation = useAppStore((s) => s.userLocation);

  useEffect(() => {
    let isMounted = true;

    async function detectLocation() {
      // Avoid re-detecting if we're already busy
      setDetecting(true);
      setError(null);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setError('Location permission denied');
          setDetecting(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = loc.coords;

        console.log('[autoLocation] Current coords:', coords.latitude, coords.longitude);

        // Calculate distance from previous location to avoid minor jitter updates
        if (userLocation) {
          const { calculateDistance } = require('../utils/distance');
          const dist = calculateDistance(coords.latitude, coords.longitude, userLocation.lat, userLocation.lng);
          // If we haven't moved more than 2km, don't trigger a full re-normalization
          if (dist < 2000) {
            console.log('[autoLocation] Minimal movement detected, keeping current area');
            if (isMounted) setDetecting(false);
            return;
          }
        }

        // Find nearest pharmacy to determine the city/prefecture
        const today = new Date().toISOString().split('T')[0];
        const nearby = await getNearbyPharmacies({
          lat: coords.latitude,
          lng: coords.longitude,
          radius: 50000,
          date: today,
        });

        if (nearby.length > 0 && isMounted) {
          const closest = nearby[0];
          const specificArea = extractAreaFromAddress(closest.address);
          const normalizedRegion = normalizeGreekLocation(closest.region);
          const normalizedCity = specificArea || normalizeGreekLocation(closest.city);

          console.log(`[autoLocation] Detected new area: ${normalizedRegion}, ${normalizedCity}`);

          setUserLocation({
            prefecture: normalizedRegion,
            city: normalizedCity,
            lat: coords.latitude,
            lng: coords.longitude,
          });
        }
      } catch (e) {
        if (isMounted) {
          console.warn('[autoLocation] Error:', e);
          setError('Could not sync location');
        }
      } finally {
        if (isMounted) setDetecting(false);
      }
    }

    // Run on mount
    detectLocation();

    return () => { isMounted = false; };
  }, [setUserLocation, userLocation]);

  return { detecting, error };
}
