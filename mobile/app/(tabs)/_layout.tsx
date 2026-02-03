import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700' as const,
          letterSpacing: -0.5,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          elevation: 0,
          height: 88,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: colors.iconActive,
        tabBarInactiveTintColor: colors.icon,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500' as const,
          letterSpacing: -0.2,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Εφημερίες',
          tabBarIcon: ({ color }) => (
            <PharmacyIcon size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Κοντινά',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'location' : 'location-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Αναζήτηση',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ρυθμίσεις',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'cog' : 'cog-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
