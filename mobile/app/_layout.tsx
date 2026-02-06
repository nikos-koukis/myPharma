if (__DEV__) {
  require('../src/utils/reactotron');
}

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { useTranslation } from '../src/i18n/translations';
import { useAppStore } from '../src/store';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      gcTime: 30 * 60_000,
    },
  },
});

function InnerLayout() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, headerBackTitle: t('back') }} />
        <Stack.Screen
          name="pharmacy/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="feedback"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="location-picker"
          options={{
            title: t('select_area'),
            headerBackTitle: t('back'),
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const hydrate = useAppStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <InnerLayout />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
