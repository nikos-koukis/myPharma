import React from 'react';
import { StyleSheet, View, Platform, Image } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 80, // Reverted to original
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          marginHorizontal: 16,
          marginBottom: 16, // Reverted
          borderRadius: 40, // Reverted
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 40, // Match tabBarStyle
                  overflow: 'hidden',
                  backgroundColor: isDark ? 'rgba(10,15,20,0.5)' : 'rgba(255,255,255,0.5)',
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                },
              ]}
            />
          </View>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
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
          title: 'Χάρτης',
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../../assets/map.png')}
                style={{ width: 36, height: 36, opacity: focused ? 1 : 0.5 }}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="pharmacies"
        options={{
          title: 'Εφημερίες',
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../../assets/list.png')}
                style={{ width: 36, height: 36, opacity: focused ? 1 : 0.5 }}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ρυθμίσεις',
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../../assets/set.png')}
                style={{ width: 36, height: 36, opacity: focused ? 1 : 0.5 }}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
