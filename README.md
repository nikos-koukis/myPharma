# myPharma

Find on-duty pharmacies across Greece. A full-stack monorepo with a scraping backend and a cross-platform mobile app.

## Architecture

```
myPharma/
├── backend/    # Node.js API + scraper
└── mobile/     # React Native (Expo) iOS/Android app
```

### Backend

Scrapes pharmacy duty schedules from [vrisko.gr](https://www.vrisko.gr/efimeries-farmakeion), geocodes addresses, and serves the data through a REST API.

- **Runtime:** Node.js + TypeScript
- **API:** Fastify + Swagger UI (`/docs`)
- **Scraper:** Playwright with stealth plugin
- **Database:** PostgreSQL + PostGIS (geographic queries)
- **Cache:** Redis (1h TTL, pattern-based invalidation)
- **ORM:** Prisma
- **Scheduler:** node-cron (daily at 6 AM)

### Mobile

Cross-platform iOS/Android app built with Expo and React Native.

- **Framework:** Expo SDK 54 + Expo Router (file-based routing)
- **State:** React Query (server), Zustand (local)
- **Storage:** AsyncStorage (favorites, search history, theme)
- **Map:** react-native-maps (nearby pharmacies)
- **Location:** expo-location (GPS-based nearby search)

#### Screens

| Tab | Description |
|-----|-------------|
| **On Duty** | Browse pharmacies by prefecture, city, and date |
| **Nearby** | Map + list of on-duty pharmacies near your location |
| **Search** | Search by name/address with history |
| **Settings** | Dark mode, clear data, about |

Tapping a pharmacy opens a detail screen with map, call, directions, share, and duty history.

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Expo Go app (iOS/Android) for mobile development

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npx playwright install chromium
docker compose up -d            # PostgreSQL + Redis
npm run db:generate             # Generate Prisma client
npm run db:push                 # Create tables
npm run dev                     # Start API on :3000
```

### 2. Scrape Data

```bash
cd backend
npm run scrape                  # One-time scrape of all cities
```

### 3. Mobile App

```bash
cd mobile
npm install
npx expo start                  # Scan QR with Expo Go
```

> **Note:** On a physical device, update `DEV_API` in `mobile/src/api/client.ts` to your Mac's local IP (e.g. `http://192.168.x.x:3000`).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pharmacies/on-duty` | On-duty pharmacies by date, region, city |
| GET | `/api/pharmacies/nearby` | Nearby on-duty pharmacies by lat/lng/radius |
| GET | `/api/pharmacies/:id` | Single pharmacy with recent duties |
| GET | `/api/prefectures` | List all prefectures |
| GET | `/api/regions` | List regions/cities |
| GET | `/api/health` | Health check (DB + Redis) |

Swagger docs: [http://localhost:3000/docs](http://localhost:3000/docs)

## Environment Variables

Create `backend/.env`:

```
DATABASE_URL=postgresql://mypharma:mypharma@localhost:5432/mypharma
REDIS_URL=redis://localhost:6380
GEOCODER_API_KEY=           # Geoapify (optional, Nominatim is the free default)
PORT=3000
HOST=0.0.0.0
```

## Database

```bash
cd backend
npm run db:push                                              # Sync schema
npm run db:generate                                          # Regenerate client
npx prisma studio --schema=src/db/prisma/schema.prisma       # Visual browser
```

## Project Structure

```
backend/
├── src/
│   ├── api/routes/pharmacies.ts   # All API endpoints
│   ├── scraper/                   # Playwright scraper + geocoding
│   ├── cache/redis.ts             # Redis client
│   ├── db/prisma/schema.prisma    # Pharmacy + PharmacyDuty models
│   └── index.ts                   # Entry point (API + cron)
├── docker-compose.yml             # PostgreSQL + Redis
└── package.json

mobile/
├── app/
│   ├── (tabs)/                    # Tab screens (home, nearby, search, settings)
│   └── pharmacy/[id].tsx          # Detail screen
├── src/
│   ├── api/                       # Axios client + API functions
│   ├── hooks/                     # React Query hooks, location, favorites
│   ├── components/                # PharmacyCard, Map, Pickers, etc.
│   ├── store/                     # Zustand store
│   └── theme/                     # Light/dark color system
└── package.json
```

## License

MIT
