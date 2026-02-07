# VPS Deployment Guide — Monitoring at monitor.pharmagoapp.gr

**VPS IP:** `167.86.116.85`
**Domain:** `monitor.pharmagoapp.gr`

---

## 1. DNS Configuration

At your domain registrar, add an **A record**:

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| A | monitor | 167.86.116.85 | 300 |

Wait for DNS propagation (can take 5 minutes to a few hours).

Verify:

```bash
dig monitor.pharmagoapp.gr +short
# Should return: 167.86.116.85
```

Or:

```bash
nslookup monitor.pharmagoapp.gr
```

---

## 2. Upload Code to VPS

From your local machine, rsync the backend folder:

```bash
rsync -avz --exclude node_modules --exclude dist --exclude .env \
  backend/ root@167.86.116.85:/path/to/mypharma/backend/
```

> Replace `/path/to/mypharma/backend/` with the actual path on your VPS.

---

## 3. Install Dependencies on VPS

SSH into the VPS:

```bash
ssh root@167.86.116.85
cd /path/to/mypharma/backend
```

Install and build:

```bash
npm install
npx prisma generate --schema=src/db/prisma/schema.prisma
npm run build
```

---

## 4. Apply Database Schema Changes

Push the new tables (`scrape_runs`, `scrape_city_results`) to the database:

```bash
npm run db:push
```

Verify the tables exist:

```bash
docker exec -it $(docker ps -qf "name=postgres") psql -U mypharma -d mypharma -c "\dt"
```

You should see `scrape_runs` and `scrape_city_results` in the table list.

---

## 5. Start the Monitoring Stack

Start all Docker services (existing + new monitoring containers):

```bash
docker compose up -d
```

Verify all 7 containers are running:

```bash
docker compose ps
```

Expected containers:
- `postgres` (5432)
- `redis` (6379)
- `prometheus` (9090)
- `grafana` (3001)
- `node-exporter` (9100)
- `postgres-exporter` (9187)
- `redis-exporter` (9121)

All ports are bound to `127.0.0.1` — not accessible from the internet directly.

---

## 6. Restart the Application

Restart the Node.js app so it picks up the new metrics code:

```bash
pm2 restart mypharma
```

Or if starting fresh:

```bash
pm2 start dist/index.js --name mypharma
```

Verify the `/metrics` endpoint works:

```bash
curl http://localhost:3000/metrics
```

---

## 7. Verify Prometheus Targets

Check that Prometheus can reach all exporters:

```bash
curl http://localhost:9090/api/v1/targets | python3 -m json.tool | grep -A2 '"health"'
```

All 4 targets should be `"up"`:
- `mypharma-api` (host.docker.internal:3000)
- `node-exporter` (node-exporter:9100)
- `postgres-exporter` (postgres-exporter:9187)
- `redis-exporter` (redis-exporter:9121)

---

## 8. Nginx Configuration

Create the Nginx server block for Grafana:

```bash
sudo nano /etc/nginx/sites-available/monitor.pharmagoapp.gr
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name monitor.pharmagoapp.gr;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support (required for Grafana Live)
    location /api/live/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and test:

```bash
sudo ln -s /etc/nginx/sites-available/monitor.pharmagoapp.gr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Verify HTTP access works (before SSL):

```bash
curl -I http://monitor.pharmagoapp.gr
# Should return HTTP 200 with Grafana login page
```

---

## 9. SSL Certificate with Certbot

Install Certbot if not already installed:

```bash
sudo apt install certbot python3-certbot-nginx -y
```

Obtain and auto-configure SSL:

```bash
sudo certbot --nginx -d monitor.pharmagoapp.gr
```

Follow the prompts:
- Enter email address for renewal notices
- Agree to terms of service
- Choose to redirect HTTP to HTTPS (recommended)

Verify SSL:

```bash
curl -I https://monitor.pharmagoapp.gr
```

Certbot auto-renewal is set up via systemd timer. Verify:

```bash
sudo systemctl status certbot.timer
```

---

## 10. Access Grafana

Open **https://monitor.pharmagoapp.gr** in your browser.

- **Username:** `admin`
- **Password:** `admin`

> Change the admin password on first login for security.

### Verify Datasources

Go to **Connections > Data sources**:
1. **Prometheus** — click "Test", should show "Data source is working"
2. **PostgreSQL** — click "Test", should show "Database Connection OK"

### Verify Dashboards

Go to **Dashboards** — all 5 should be loaded:
1. System Overview
2. PostgreSQL Performance
3. Redis Performance
4. API Performance
5. Scraper Analytics

---

## 11. Run the Scraper

Trigger a scrape to populate the analytics dashboard:

```bash
cd /path/to/mypharma/backend
npm run scrape
```

Or wait for the daily cron (12:45 UTC, configured in the app).

After the scrape completes, check the **Scraper Analytics** dashboard — you should see:
- Latest run status and stats
- Complete city results table with URLs, HTTP codes, pharmacies found
- Failed cities with error messages
- Pharmacies per prefecture

---

## Security Checklist

- [ ] All monitoring ports (9090, 9100, 9187, 9121, 3001) are bound to `127.0.0.1` — not accessible from internet
- [ ] Grafana is only accessible through Nginx reverse proxy with SSL
- [ ] Changed Grafana admin password from default `admin`
- [ ] SSL certificate is valid and auto-renewal is configured
- [ ] PostgreSQL and Redis ports are bound to `127.0.0.1`

---

## Maintenance

### View logs

```bash
# All monitoring containers
docker compose logs -f prometheus grafana

# Specific container
docker compose logs -f grafana
```

### Restart monitoring stack

```bash
docker compose restart prometheus grafana node-exporter postgres-exporter redis-exporter
```

### Update Grafana dashboards

After editing dashboard JSON files locally:

```bash
rsync -avz monitoring/ root@167.86.116.85:/path/to/mypharma/backend/monitoring/
docker compose restart grafana
```

### Check disk usage (Prometheus data)

```bash
docker exec $(docker ps -qf "name=prometheus") du -sh /prometheus
```

Prometheus is configured with 90-day retention. Adjust in `docker-compose.yml`:

```yaml
command:
  - '--storage.tsdb.retention.time=90d'  # change this
```

### Renew SSL certificate manually

```bash
sudo certbot renew
```

---

## Ports Reference (all bound to 127.0.0.1)

| Service | Internal Port | Purpose |
|---------|--------------|---------|
| API (PM2) | 3000 | Node.js application |
| Grafana | 3001 | Dashboards (proxied via Nginx) |
| Prometheus | 9090 | Metrics collection |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| node-exporter | 9100 | System metrics |
| postgres-exporter | 9187 | Database metrics |
| redis-exporter | 9121 | Cache metrics |

**Public access:** Only ports 80 (HTTP) and 443 (HTTPS) via Nginx.
