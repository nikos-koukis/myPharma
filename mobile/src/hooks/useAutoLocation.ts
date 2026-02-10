import { useEffect, useState, useRef } from 'react';
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

  // Use a ref to store the last coordinates we detected to avoid unnecessary re-runs
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function detectLocation(force = false) {
      // Don't run if already detecting
      if (detecting && !force) return;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setError('Permission denied');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        const coords = loc.coords;

        // --- Check for significant movement ---
        if (lastCoordsRef.current) {
          const { calculateDistance } = require('../utils/distance');
          const dist = calculateDistance(
            coords.latitude,
            coords.longitude,
            lastCoordsRef.current.lat,
            lastCoordsRef.current.lng
          );
          // If moved less than 1km, skip unless forced
          if (dist < 1000 && !force) {
            return;
          }
        }

        setDetecting(true);
        lastCoordsRef.current = { lat: coords.latitude, lng: coords.longitude };

        // --- 1. TRY GEOCODING FIRST (System Truth) ---
        const geocode = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        if (geocode.length > 0 && isMounted) {
          const addr = geocode[0];
          // Use trim and lower case for robust mapping
          const rawRegion = (addr.region || addr.subregion || '').trim();
          const rawCity = (addr.city || addr.district || '').trim();

          // Comprehensive mapping for common English/Greek names to Backend Names (Prefectures)
          const regionMap: Record<string, string> = {
            // Achaia / Patra
            'achaia': 'Αχαΐας',
            'achaea': 'Αχαΐας',
            'western greece': 'Αχαΐας',
            'dytiki ellada': 'Αχαΐας',
            'patra': 'Αχαΐας',
            'patras': 'Αχαΐας',
            'πατρα': 'Αχαΐας',

            // Attica / Athens
            'attica': 'Αττικής',
            'attiki': 'Αττικής',
            'athens': 'Αττικής',
            'athina': 'Αττικής',
            'kentrikos tomeas athinon': 'Αττικής',

            // Thessaloniki
            'thessaloniki': 'Θεσσαλονίκης',
            'central macedonia': 'Θεσσαλονίκης',
            'kentriki makedonia': 'Θεσσαλονίκης',

            // Chalkidiki
            'chalkidiki': 'Χαλκιδικής',
            'halkidiki': 'Χαλκιδικής',
          };

          const rawRegionLower = rawRegion.toLowerCase();
          const rawCityLower = rawCity.toLowerCase();

          // Try to map from region first, then city
          let finalRegion = regionMap[rawRegionLower] || regionMap[rawCityLower] || rawRegion;

          finalRegion = normalizeGreekLocation(finalRegion);
          const finalCity = normalizeGreekLocation(rawCity);

          console.log(`[autoLocation] Geocode: Region="${rawRegion}", City="${rawCity}" -> Final="${finalRegion}"`);

          // If we mapped to a known good region, update and stop
          if (finalRegion && finalRegion.length > 2) {
            setUserLocation({
              prefecture: finalRegion,
              city: finalCity,
              lat: coords.latitude,
              lng: coords.longitude,
            });
            setDetecting(false);
            return;
          }
        }

        // --- 2. FALLBACK: CLOSEST PHARMACY ---
        const nearby = await getNearbyPharmacies({
          lat: coords.latitude,
          lng: coords.longitude,
          radius: 20000,
          date: new Date().toISOString().split('T')[0],
        });

        // Filter out rogue pharmacies
        const validNearby = nearby.filter(p => {
          const isInPatraCoords = coords.latitude > 38.0 && coords.latitude < 38.4;
          const isLabeledAttica = p.region.includes('Αττικ') || p.address.includes('Αττικής');
          return !(isInPatraCoords && isLabeledAttica);
        });

        if (validNearby.length > 0 && isMounted) {
          const closest = validNearby[0];
          const normalizedRegion = normalizeGreekLocation(closest.region);
          const normalizedCity = extractAreaFromAddress(closest.address) || normalizeGreekLocation(closest.city);

          console.log(`[autoLocation] Fallback Match: ${normalizedRegion} (${normalizedCity})`);

          setUserLocation({
            prefecture: normalizedRegion,
            city: normalizedCity,
            lat: coords.latitude,
            lng: coords.longitude,
          });
        }
      } catch (e) {
        if (isMounted) console.warn('[autoLocation] Error:', e);
      } finally {
        if (isMounted) setDetecting(false);
      }
    }

    // Run once on mount
    detectLocation(true);

    // Check every minute
    const interval = setInterval(() => detectLocation(), 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setUserLocation]);

  return { detecting, error };
}
