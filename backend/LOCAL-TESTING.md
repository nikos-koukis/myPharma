# Local Testing Guide — Monitoring Setup

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ and npm
- The `.env` file in `backend/` with at least:
  ```
  DATABASE_URL=postgresql://mypharma:mypharma@localhost:5432/mypharma
  REDIS_URL=redis://localhost:6379
  PORT=3000
  ```

---

## 1. Start Docker Services

Start PostgreSQL, Redis, and the monitoring stack:

```bash
cd backend
docker compose up -d
```

Verify all 7 containers are running:

```bash
docker compose ps
```

You should see: `postgres`, `redis`, `prometheus`, `grafana`, `node-exporter`, `postgres-exporter`, `redis-exporter`

---

## 2. Install Dependencies & Push Schema

```bash
npm install
npx prisma generate --schema=src/db/prisma/schema.prisma
npm run db:push
```

This creates/updates all tables including the new `scrape_runs` and `scrape_city_results` tables.

---

## 3. Build & Start the API

```bash
npm run build
npm run start
```

Or for development with hot reload:

```bash
npm run dev
```

The API runs on `http://localhost:3000`.

---

## 4. Verify the /metrics Endpoint

```bash
curl http://localhost:3000/metrics
```

You should see Prometheus metrics output including:

- `mypharma_http_requests_total` — HTTP request counter
- `mypharma_http_request_duration_seconds` — request latency histogram
- `mypharma_cache_hits_total` / `mypharma_cache_misses_total` — cache counters
- `mypharma_process_cpu_*` — Node.js CPU metrics
- `mypharma_nodejs_heap_size_*` — heap memory metrics

---

## 5. Verify Prometheus Targets

Open http://localhost:9090/targets in your browser.

All 4 targets should show as **UP**:

| Job | Target | Status |
|-----|--------|--------|
| mypharma-api | host.docker.internal:3000 | UP |
| node-exporter | node-exporter:9100 | UP |
| postgres-exporter | postgres-exporter:9187 | UP |
| redis-exporter | redis-exporter:9121 | UP |

> **macOS note:** `host.docker.internal` works out of the box on Docker Desktop for Mac. If `mypharma-api` shows as DOWN, ensure your API is running on port 3000.

---

## 6. Access Grafana

Open http://localhost:3001 in your browser.

- **Username:** `admin`
- **Password:** `admin`

### Verify Datasources

Go to **Connections > Data sources** — you should see:

1. **Prometheus** (default) — connected to `http://prometheus:9090`
2. **PostgreSQL** — connected to `postgres:5432/mypharma`

Click "Test" on each to verify they work.

### Verify Dashboards

Go to **Dashboards** — you should see 5 provisioned dashboards:

1. **System Overview** — CPU, memory, disk, network (from node-exporter)
2. **PostgreSQL Performance** — connections, cache hit ratio, TPS, table sizes
3. **Redis Performance** — clients, memory, hit rate, commands/sec
4. **API Performance** — request rate, latency percentiles, error rate, cache hits
5. **Scraper Analytics** — scrape history, city results, day-over-day comparisons

---

## 7. Generate Some API Traffic

Hit a few API endpoints to populate the API Performance dashboard:

```bash
# Health check
curl http://localhost:3000/health

# List pharmacies
curl http://localhost:3000/api/pharmacies

# Swagger docs
curl http://localhost:3000/docs
```

After a few requests, check the **API Performance** dashboard in Grafana — you should see request rate and latency data appearing (may take 15-30 seconds for Prometheus to scrape).

---

## 8. Run the Scraper

Run a full scrape to populate the Scraper Analytics dashboard:

```bash
npm run scrape
```

This will:
- Create a `ScrapeRun` record in the database
- Scrape all cities (batches of 3 concurrent)
- Create `ScrapeCityResult` records for each city with URL, HTTP status, pharmacies found, duration, and any errors
- Save pharmacy and duty data

The scrape takes several minutes. Watch the console output for progress.

---

## 9. Check Scraper Analytics Dashboard

After the scrape completes, open the **Scraper Analytics** dashboard in Grafana.

You should see:

- **Latest Run Status** — shows "completed" or "failed" with stats
- **Complete City Results** — table with every city, URL, status, HTTP code, pharmacies found, duration
- **Failed Cities** — any cities that failed with error messages and URLs
- **Pharmacies per Prefecture** — pie chart
- **Duty Coverage** — duties per day chart

### Day-over-Day Comparison

The "Today vs Yesterday" and alert panels (missing cities, significant drops) will only show meaningful data after **2 consecutive scrape runs** on different days. To test this locally, you can run the scraper twice.

---

## 10. Verify PostgreSQL Dashboard

Open the **PostgreSQL Performance** dashboard. After running the scraper, you should see:
- Active connections increase
- Transactions per second spike during scraping
- Table sizes for `pharmacies`, `pharmacy_duties`, `scrape_runs`, `scrape_city_results`

---

## Troubleshooting

### `mypharma-api` target is DOWN in Prometheus

- Ensure your API is running: `curl http://localhost:3000/metrics`
- On macOS, `host.docker.internal` should resolve automatically
- On Linux, check that `extra_hosts` is set in docker-compose.yml for the prometheus service

### Grafana dashboards show "No data"

- Check that the datasources are connected (Connections > Data sources > Test)
- Wait 15-30 seconds after starting services for Prometheus to collect initial data
- For Scraper Analytics: data only appears after running `npm run scrape`

### Prisma schema changes not applied

```bash
npm run db:push
npx prisma generate --schema=src/db/prisma/schema.prisma
```

### Reset everything

```bash
docker compose down -v   # removes all volumes (data loss!)
docker compose up -d
npm run db:push
```

---

## Ports Reference

| Service | Port | URL |
|---------|------|-----|
| API | 3000 | http://localhost:3000 |
| Grafana | 3001 | http://localhost:3001 |
| Prometheus | 9090 | http://localhost:9090 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| node-exporter | 9100 | http://localhost:9100 |
| postgres-exporter | 9187 | http://localhost:9187 |
| redis-exporter | 9121 | http://localhost:9121 |
