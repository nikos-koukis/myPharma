import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PharmaGo',
  slug: 'pharmago',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/appiconph.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'pharmago',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    bundleIdentifier: 'gr.k-tech.mypharma',
    buildNumber: '1.0.0',
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'We need your location to find nearby on-duty pharmacies.',
      LSApplicationQueriesSchemes: ['maps', 'comgooglemaps', 'geo'],
    },
  },
  android: {
    package: 'gr.ktech.mypharma',
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
