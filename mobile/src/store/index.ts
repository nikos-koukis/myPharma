import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePreference = 'system' | 'light' | 'dark';

interface AppState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  selectedPrefecture: string | null;
  selectedCity: string | null;
  selectedDate: string;
  setSelectedPrefecture: (p: string | null) => void;
  setSelectedCity: (c: string | null) => void;
  setSelectedDate: (d: string) => void;
  hydrate: () => Promise<void>;
}

const today = () => new Date().toISOString().split('T')[0];

export const useAppStore = create<AppState>((set) => ({
  themePreference: 'system',
  setThemePreference: (pref) => {
    AsyncStorage.setItem('theme', pref);
    set({ themePreference: pref });
  },
  selectedPrefecture: null,
  selectedCity: null,
  selectedDate: today(),
  setSelectedPrefecture: (p) => set({ selectedPrefecture: p, selectedCity: null }),
  setSelectedCity: (c) => set({ selectedCity: c }),
  setSelectedDate: (d) => set({ selectedDate: d }),
  hydrate: async () => {
    const theme = await AsyncStorage.getItem('theme');
    if (theme) set({ themePreference: theme as ThemePreference });
  },
}));
