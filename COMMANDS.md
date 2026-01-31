# myPharma - Commands Reference

## Prerequisites

- Node.js 18+
- Docker & Docker Compose

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium

# Start PostgreSQL + Redis
docker-compose up -d

# Generate Prisma client
npm run db:generate

# Create/sync database tables
npm run db:push
```

## Database

```bash
# Push schema changes to DB (development)
npm run db:push

# Create a migration (production-ready)
npm run db:migrate

# Regenerate Prisma client after schema changes
npm run db:generate

# Open Prisma Studio (visual DB browser at http://localhost:5555)
npx prisma studio --schema=src/db/prisma/schema.prisma

# Drop all tables and recreate from schema
npx prisma db push --force-reset --schema=src/db/prisma/schema.prisma

# Clear all data (keep tables)
npx prisma db execute --stdin --schema=src/db/prisma/schema.prisma <<< "TRUNCATE pharmacies CASCADE;"


npx prisma db push --force-reset --schema=src/db/prisma/schema.prisma
```

## Running

```bash
# Start API server + cron scheduler (development)
npm run dev

# Run a one-shot manual scrape (all cities)
npm run scrape

# Test scrape (first city only, with logs)
npx tsx scripts/test-scrape.ts

# Build for production
npm run build

# Start production server
npm run start
```

## Docker

```bash
# Start services (PostgreSQL + Redis)
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (wipes all data)
docker-compose down -v

# View logs
docker-compose logs -f
```

## TypeScript

```bash
# Type check without emitting
npx tsc --noEmit

# Build to dist/
npm run build
```
