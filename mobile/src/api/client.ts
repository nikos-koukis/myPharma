import axios from 'axios';
import Constants from 'expo-constants';

const API_URLS = {
  LOCAL: 'http://192.168.1.194:3000',
  PRODUCTION: 'https://api.k-tech.net.gr',
} as const;

type ApiEnv = keyof typeof API_URLS;

const API_ENV: ApiEnv = (Constants.expoConfig?.extra?.apiEnv as ApiEnv) ?? 'PRODUCTION';
const baseURL = API_URLS[API_ENV];

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
