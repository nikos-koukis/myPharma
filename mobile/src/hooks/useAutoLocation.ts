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

  const userLocation = useAppStore((s) => s.userLocation);
  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const setLocationDetected = useAppStore((s) => s.setLocationDetected);

  useEffect(() => {
    // We run detection if:
    // 1. Location hasn't been detected yet
    // 2. OR we want to verify the current area (pro-active)
    // We'll run it once on mount and then stop.
    let isMounted = true;

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
        console.log('[autoLocation] Detected location (raw):', closest.region, closest.city, closest.address);

        // Extract specific area from address (e.g., "Triandria" from "Street 1, 12345 Triandria Thessaloniki")
        const specificArea = extractAreaFromAddress(closest.address);

        // Normalize to Title Case to avoid case sensitivity issues
        const normalizedRegion = normalizeGreekLocation(closest.region);
        const normalizedCity = specificArea || normalizeGreekLocation(closest.city); // Use specific area if available
        console.log('[autoLocation] Normalized location:', normalizedRegion, normalizedCity, specificArea ? '(specific area)' : '(general city)');

        // Only update store if the region changed or we don't have a location
        if (isMounted && (!userLocation || userLocation.prefecture !== normalizedRegion)) {
          console.log(`[autoLocation] Updating store: ${userLocation?.prefecture || 'NONE'} -> ${normalizedRegion}`);
          setUserLocation({
            prefecture: normalizedRegion,
            city: normalizedCity,
            lat: coords.latitude,
            lng: coords.longitude,
          });
        } else {
          console.log('[autoLocation] Location already correct, skipping store update');
        }
      } catch (e) {
        if (isMounted) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          console.warn('[autoLocation] Error:', msg);
          setError(msg);
        }
      } finally {
        if (isMounted) setDetecting(false);
      }
    }

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, [setUserLocation, setLocationDetected, userLocation]);

  return { detecting, error };
}
