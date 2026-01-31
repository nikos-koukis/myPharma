import axios from 'axios';
import Constants from 'expo-constants';

// Use your Mac's LAN IP so physical devices can connect
// Change this if your IP changes
const DEV_API = 'http://192.168.1.194:3000';
const defaultURL = __DEV__ ? DEV_API : 'https://api.mypharma.gr';

const baseURL = Constants.expoConfig?.extra?.apiUrl ?? defaultURL;

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (__DEV__) {
    console.log(`[api] → ${config.method?.toUpperCase()} ${config.url}`, config.params ?? '');
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (__DEV__) {
      console.log(
        `[api] ← ${res.status} ${res.config.url}`,
        `cache:${res.headers?.['x-cache'] ?? '-'}`,
        `${Array.isArray(res.data) ? res.data.length + ' items' : 'ok'}`,
      );
    }
    return res;
  },
  (error) => {
    console.warn('[api]', error.message, error.config?.url);
    return Promise.reject(error);
  },
);
