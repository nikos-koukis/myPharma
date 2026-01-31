import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, type Colors } from './colors';
import { useAppStore } from '../store';

interface ThemeContextValue {
  colors: Colors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useAppStore((s) => s.themePreference);

  const isDark = useMemo(() => {
    if (themePreference === 'system') return systemScheme === 'dark';
    return themePreference === 'dark';
  }, [themePreference, systemScheme]);

  const value = useMemo(
    () => ({ colors: isDark ? darkColors : lightColors, isDark }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
