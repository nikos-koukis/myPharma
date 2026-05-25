import React, { useState } from 'react';
import { StyleSheet, View, Platform, NativeModules, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// 1. Check if the native AdMob module is present in the current binary
const hasNativeModule = 
  !!NativeModules.RNGoogleMobileAdsModule || 
  !!NativeModules.RNGoogleMobileAdsTurboModule ||
  !!NativeModules.RNGoogleMobileAdsModuleTurboModule;

let BannerAd: any = null;
let TestIds: any = null;

if (hasNativeModule) {
  try {
    // Dynamically require to avoid crash at import time in Expo Go
    const googleAds = require('react-native-google-mobile-ads');
    BannerAd = googleAds.BannerAd;
    TestIds = googleAds.TestIds;
  } catch (e) {
    console.warn('[AdBanner] Failed to load react-native-google-mobile-ads:', e);
  }
}

// User-provided production Ad Unit ID: ca-app-pub-7198509049220853/6307133482
// Using TestIds in dev mode preserves safety, but resolves to production ID in build.
const AD_UNIT_ID = Platform.select({
  ios: __DEV__ ? (TestIds?.BANNER ?? 'ca-app-pub-7198509049220853/6307133482') : 'ca-app-pub-7198509049220853/6307133482',
  android: __DEV__ ? (TestIds?.BANNER ?? 'ca-app-pub-7198509049220853/6307133482') : 'ca-app-pub-7198509049220853/6307133482',
  default: 'ca-app-pub-7198509049220853/6307133482',
});

interface AdBannerProps {
  size?: string;
}

export function AdBanner({ size = 'BANNER' }: AdBannerProps) {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState(false);

  if (!visible) return null;

  // Set the container height based on the BannerAdSize string
  const getMinHeight = () => {
    switch (size) {
      case 'LARGE_BANNER':
        return 100;
      case 'MEDIUM_RECTANGLE':
        return 250;
      case 'BANNER':
      default:
        return 50;
    }
  };

  // If running in Expo Go (missing native module), render a fallback placeholder ONLY in __DEV__
  // In production, this returns null to hide everything
  if (!hasNativeModule || !BannerAd) {
    if (__DEV__) {
      return (
        <View
          style={[
            styles.container,
            styles.placeholderContainer,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(220, 252, 231, 0.3)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              minHeight: getMinHeight(),
              marginVertical: 14,
            },
          ]}
        >
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            [AdMob Banner Placeholder ({size})]
          </Text>
        </View>
      );
    }
    return null;
  }

  // When loading or failed, keep container completely collapsed (no border, no height, no margin)
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: loaded 
            ? (isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(240, 253, 244, 0.5)') 
            : 'transparent',
          borderColor: loaded ? colors.glassBorder : 'transparent',
          borderWidth: loaded ? 1 : 0,
          height: loaded ? undefined : 0,
          marginVertical: loaded ? 14 : 0,
        },
      ]}
    >
      <BannerAd
        unitId={AD_UNIT_ID}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          setLoaded(true);
        }}
        onAdFailedToLoad={(error: any) => {
          console.warn('[AdBanner] Failed to load ad:', error);
          setVisible(false); // Collapse component if ad fails to load
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  placeholderContainer: {
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
