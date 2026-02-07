import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PharmaGO',
  slug: 'pharmago',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/appiconph.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: false,
  scheme: 'pharmago',
  splash: {
    image: './assets/splash-pharmago.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
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
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/appiconph.png',
      backgroundColor: '#000000',
    },
    edgeToEdgeEnabled: true,
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    config: {
      googleMaps: {
        apiKey: 'AIzaSyB-ezR-pDdVPNDBziY-wu12eyVyyOO2mS4', // ADD YOUR GOOGLE MAPS API KEY HERE
      },
    },
  },
  plugins: ['expo-router', 'expo-location', 'expo-font'],
  extra: {
    eas: {
      projectId: 'ddef163b-37b7-4f05-8d62-2e6f32a08d69',
    },
    apiEnv: process.env.API_ENV ?? 'PRODUCTION',
  },
});
