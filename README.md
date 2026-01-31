# myPharma

Backend service for Greek pharmacies on duty. Scrapes pharmacy duty schedules from [vrisko.gr](https://www.vrisko.gr/efimeries-farmakeion) and serves them via a REST API with Redis caching and PostgreSQL storage.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **API:** Fastify + Swagger UI
- **Scraper:** Playwright (with stealth plugin)
- **Database:** PostgreSQL + PostGIS
- **Cache:** Redis
- **ORM:** Prisma
- **Scheduler:** node-cron

## Prerequisites

- Node.js 18+
- Docker & Docker Compose

## Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL + Redis
docker compose up -d

# Push database schema
npm run db:push

# Generate Prisma client
npm run db:generate
```

## Environment Variables

Copy `.env.example` or create `.env`:

```
DATABASE_URL=postgresql://mypharma:mypharma@localhost:5432/mypharma
REDIS_URL=redis://localhost:6379
GEOCODER_API_KEY=        # Geoapify key (optional, Nominatim used as free fallback)
PORT=3000
```

## Running

```bash
# Start API server + cron scheduler
npm run dev

# Run scraper manually
npm run scrape

# Build for production
npm run build
npm run start
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info |
| GET | `/api/health` | Health check (DB + Redis) |
| GET | `/api/pharmacies/on-duty` | On-duty pharmacies by date, region, city |
| GET | `/api/pharmacies/nearby` | Nearby on-duty pharmacies by lat/lng/radius |
| GET | `/api/pharmacies/:id` | Single pharmacy with recent duties |
| GET | `/api/prefectures` | List all prefectures |
| GET | `/api/regions` | List regions/cities, optionally filtered by prefecture |

Swagger docs available at [http://localhost:3000/docs](http://localhost:3000/docs).

## Database

```bash
# Push schema changes
npm run db:push

# Open Prisma Studio (visual DB browser)
npx prisma studio --schema=src/db/prisma/schema.prisma

# Reset database
npx prisma db push --force-reset --schema=src/db/prisma/schema.prisma
```

## Project Structure

```
src/
├── api/
│   ├── server.ts              # Fastify server setup + Swagger
│   └── routes/
│       ├── health.ts           # Health check endpoint
│       └── pharmacies.ts       # Pharmacy + region endpoints
├── scraper/
│   ├── index.ts               # Scraper orchestrator
│   ├── cities.ts              # Dynamic city discovery from vrisko.gr
│   ├── parser.ts              # HTML parsing logic
│   └── geocoder.ts            # Geocoding (Nominatim → Geoapify fallback)
├── db/
│   ├── client.ts              # Prisma client singleton
│   └── prisma/
│       └── schema.prisma      # Database schema
├── cache/
│   └── redis.ts               # Redis client + cache helpers
├── config/
│   └── index.ts               # Centralized configuration
└── index.ts                   # Entry point (API + cron)
```
