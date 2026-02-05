import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePreference = 'system' | 'light' | 'dark';

interface UserLocation {
  prefecture: string;
  city: string;
  lat: number;
  lng: number;
}

interface AppState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;

  // User's home location (auto-detected or manually set)
  userLocation: UserLocation | null;
  setUserLocation: (loc: UserLocation) => void;
  locationDetected: boolean;
  setLocationDetected: (detected: boolean) => void;

  // Current filters (default to user's location)
  selectedPrefecture: string | null;
  selectedCity: string | null;
  selectedDate: string;
  setSelectedPrefecture: (p: string | null) => void;
  setSelectedCity: (c: string | null) => void;
  setSelectedDate: (d: string) => void;

  hydrate: () => Promise<void>;
}

import { getCurrentDate } from '../utils/dutySchedule';

const today = () => getCurrentDate();

export const useAppStore = create<AppState>((set, get) => ({
  themePreference: 'system',
  setThemePreference: (pref) => {
    AsyncStorage.setItem('theme', pref);
    set({ themePreference: pref });
  },

  userLocation: null,
  locationDetected: false,
  setUserLocation: (loc) => {
    AsyncStorage.setItem('userLocation', JSON.stringify(loc));
    set({
      userLocation: loc,
      selectedPrefecture: loc.prefecture,
      selectedCity: null, // Always default to the larger area (Prefecture) for a full list
      locationDetected: true,
    });
  },
  setLocationDetected: (detected) => set({ locationDetected: detected }),

  selectedPrefecture: null,
  selectedCity: null,
  selectedDate: today(),
  setSelectedPrefecture: (p) => set({ selectedPrefecture: p, selectedCity: null }),
  setSelectedCity: (c) => set({ selectedCity: c }),
  setSelectedDate: (d) => set({ selectedDate: d }),

  hydrate: async () => {
    const [theme, locationStr] = await Promise.all([
      AsyncStorage.getItem('theme'),
      AsyncStorage.getItem('userLocation'),
    ]);

    if (theme) {
      set({ themePreference: theme as ThemePreference });
    }

    if (locationStr) {
      try {
        const loc = JSON.parse(locationStr) as UserLocation;
        set({
          userLocation: loc,
          selectedPrefecture: loc.prefecture,
          selectedCity: null, // Always default to the larger area for a full list
          locationDetected: true,
        });
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  },
}));
