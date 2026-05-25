import React, { useState } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator, NativeModules, Text } from 'react-native';
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

// Official Google AdMob test Unit IDs for Banners
const AD_UNIT_ID = Platform.select({
  ios: __DEV__ ? (TestIds?.BANNER ?? 'ca-app-pub-3940256099942544/2934735716') : 'ca-app-pub-3940256099942544/2934735716',
  android: __DEV__ ? (TestIds?.BANNER ?? 'ca-app-pub-3940256099942544/6300978111') : 'ca-app-pub-3940256099942544/6300978111',
  default: 'ca-app-pub-3940256099942544/2934735716',
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

  // If running in Expo Go (missing native module), render a fallback placeholder
  if (!hasNativeModule || !BannerAd) {
    return (
      <View
        style={[
          styles.container,
          styles.placeholderContainer,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(220, 252, 231, 0.3)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            minHeight: getMinHeight(),
          },
        ]}
      >
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
          [AdMob Banner Placeholder ({size})]
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(240, 253, 244, 0.5)',
          borderColor: colors.glassBorder,
          minHeight: getMinHeight(),
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
      {!loaded && (
        <View style={StyleSheet.absoluteFillObject}>
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  placeholderContainer: {
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
