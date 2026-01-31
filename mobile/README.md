# myPharma Mobile

Cross-platform iOS/Android app for finding on-duty pharmacies in Greece.

## Tech Stack

- **Expo SDK 54** + Expo Router (file-based routing)
- **React Query v5** (server state, caching, background refetch)
- **Zustand** (local state: theme, selected filters)
- **AsyncStorage** (favorites, search history, theme persistence)
- **react-native-maps** (interactive map for nearby pharmacies)
- **expo-location** (GPS-based nearby search)
- **Axios** (API client with request/response logging)

## Setup

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android).

### API Connection

The app connects to the backend API. In development, update the IP in `src/api/client.ts`:

```ts
const DEV_API = 'http://YOUR_MAC_IP:3000';
```

Find your Mac's IP: `ipconfig getifaddr en0`

## Screens

| Tab | Screen | Description |
|-----|--------|-------------|
| On Duty | `app/(tabs)/index.tsx` | Browse by prefecture/city/date with pull-to-refresh |
| Nearby | `app/(tabs)/nearby.tsx` | Map + list with radius selector (1km, 2km, 5km) |
| Search | `app/(tabs)/search.tsx` | Filter by name/address with search history chips |
| Settings | `app/(tabs)/settings.tsx` | Theme (system/light/dark), clear favorites/history |
| Detail | `app/pharmacy/[id].tsx` | Map, call, directions, share, duty history |

## Project Structure

```
app/
├── _layout.tsx              # Root: providers (QueryClient, Theme, hydration)
├── (tabs)/
│   ├── _layout.tsx          # Bottom tab navigator
│   ├── index.tsx            # On Duty screen
│   ├── nearby.tsx           # Nearby screen
│   ├── search.tsx           # Search screen
│   └── settings.tsx         # Settings screen
└── pharmacy/
    └── [id].tsx             # Pharmacy detail

src/
├── api/
│   ├── client.ts            # Axios instance, interceptors, dev logging
│   └── pharmacies.ts        # API functions (getOnDuty, getNearby, getById, etc.)
├── types/index.ts           # Pharmacy, PharmacyDuty, NearbyPharmacy, RegionCity
├── hooks/
│   ├── usePharmacies.ts     # React Query hooks for all endpoints
│   ├── useLocation.ts       # GPS permission + coordinates
│   ├── useFavorites.ts      # AsyncStorage-backed favorites
│   └── useSearchHistory.ts  # AsyncStorage-backed search history
├── store/index.ts           # Zustand: theme preference, selected filters
├── theme/
│   ├── colors.ts            # Light + dark color palettes
│   └── ThemeProvider.tsx     # Theme context with system detection
├── components/
│   ├── PharmacyCard.tsx      # Pharmacy list item with favorite toggle
│   ├── PharmacyMap.tsx       # MapView with markers
│   ├── RegionPicker.tsx      # Prefecture -> city cascading chips
│   ├── DatePicker.tsx        # Date navigation (prev/today/next)
│   ├── EmptyState.tsx        # No results view
│   ├── LoadingState.tsx      # Loading spinner
│   └── FavoriteButton.tsx    # Heart toggle button
└── utils/
    ├── linking.ts           # Directions (native maps), call, share
    └── format.ts            # Date, distance, shift formatting
```

## Features

- **On-duty list** filtered by prefecture, city, and date
- **Nearby search** using device GPS with interactive map
- **Pharmacy detail** with map snippet, call, directions, share
- **Favorites** persisted locally
- **Search** with recent history
- **Dark mode** (follows system or manual override)
- **Cache headers** logged (`X-Cache: HIT/MISS`) for debugging

## Scripts

```bash
npm start          # Start Expo dev server
npm run ios        # Open in iOS simulator
npm run android    # Open in Android emulator
```

## Debug Tools

- **Console logs:** All API requests/responses logged with `[api]` prefix
- **Reactotron:** Network tab for inspecting requests (install desktop app: `brew install --cask reactotron`)
- **Location logs:** GPS status logged with `[location]` prefix
