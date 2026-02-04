import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'myPharma',
  slug: 'mypharma',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/appiconph.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'mypharma',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'We need your location to find nearby on-duty pharmacies.',
      LSApplicationQueriesSchemes: ['maps', 'comgooglemaps', 'geo'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/appiconph.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  },
  plugins: ['expo-router', 'expo-location'],
  extra: {
    apiEnv: process.env.API_ENV ?? 'PRODUCTION',
  },
});
