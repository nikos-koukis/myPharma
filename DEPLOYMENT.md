# myPharma — Deployment Guide

## Server: Hetzner Cloud

### 1. Create Server

- **Console**: [console.hetzner.cloud](https://console.hetzner.cloud)
- **Location**: Falkenstein (closest to Greece)
- **Image**: Ubuntu 24.04
- **Type**: CX22 (2 vCPU, 4GB RAM) — ~€4.50/month
- **Networking**: Public IPv4 ✅ | Public IPv6 ✅ | Private networks ❌
- **SSH Key**: Add your public key during creation
- **Name**: `mypharma`

### 2. SSH Access
deploy
```bash
# First time — copy your key to the server
ssh-copy-id -i ~/.ssh/id_ed25519_koukis root@YOUR_SERVER_IP

# Add to ~/.ssh/config for easy access
Host mypharma
    HostName YOUR_SERVER_IP
    User deploy
    IdentityFile ~/.ssh/id_ed25519_koukis

# Then just:
ssh mypharma

user: deploy
password: deploy
```

---

## Server Setup

### 3. Initial Configuration

```bash
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Create deploy user
adduser deploy
usermod -aG sudo deploy

# Copy SSH key to deploy user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Switch to deploy user
su - deploy
```

### 4. Install Dependencies

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Docker & Docker Compose
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker deploy
newgrp docker

# Playwright system deps
sudo npx playwright install-deps chromium

# Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## Database & Cache

### 5. Docker Compose (PostgreSQL + Redis)

```bash
mkdir -p ~/mypharma
cd ~/mypharma
```

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    restart: always
    environment:
      POSTGRES_USER: mypharma
      POSTGRES_PASSWORD: CHANGE_ME_STRONG_PASSWORD
      POSTGRES_DB: mypharma
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

```bash
docker compose up -d
```

> **Note**: Ports bind to `127.0.0.1` only — not exposed to the internet.

---

## Application

### 6. Deploy Code

**From your Mac:**

```bash
rsync -avz --exclude node_modules --exclude .env --exclude dist \
  ~/dev/personal/myPharma/backend/ \
  deploy@YOUR_SERVER_IP:~/mypharma/app/
```

**On the server:**

```bash
cd ~/mypharma/app

# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium
```

### 7. Environment Variables

```bash
cat > ~/mypharma/app/.env << 'EOF'
DATABASE_URL=postgresql://mypharma:CHANGE_ME_STRONG_PASSWORD@localhost:5432/mypharma
REDIS_URL=redis://localhost:6379
PORT=3000
GEOCODER_API_KEY=your_geoapify_key_here
EOF
```

### 8. Initialize Database

```bash
cd ~/mypharma/app

# Push schema to DB
npm run db:push

# Generate Prisma client
npm run db:generate

# Sync regions (first time only)
npm run sync-regions

# Verify in Prisma Studio (optional)
npx prisma studio --schema=src/db/prisma/schema.prisma

ssh -L 5555:localhost:5555 deploy@65.108.220.96
or
ssh -L 5555:localhost:5555 mypharma
```

---

## Process Manager (PM2)

### 9. Setup PM2

```bash
sudo npm install -g pm2

cd ~/mypharma/app

# Build TypeScript
npm run build

# Start application
pm2 start dist/index.js --name mypharma

# Auto-restart on server reboot
pm2 startup
# ↑ Run the command it outputs (sudo env PATH=...)
pm2 save
```

### PM2 Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Show running processes |
| `pm2 logs mypharma` | View application logs |
| `pm2 logs mypharma --lines 100` | View last 100 lines |
| `pm2 restart mypharma` | Restart application |
| `pm2 stop mypharma` | Stop application |
| `pm2 delete mypharma` | Remove from PM2 |
| `pm2 monit` | Real-time monitoring dashboard |

---

## Nginx Reverse Proxy

### 10. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/mypharma
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mypharma /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 11. SSL Certificate (requires domain)

```bash
sudo certbot --nginx -d api.yourdomain.com
# Auto-renewal is configured automatically
```

---

## Deployment Script

### 12. Automated Deploys

Create `deploy.sh` on your Mac:

```bash
#!/bin/bash
set -e

SERVER="deploy@YOUR_SERVER_IP"
REMOTE_DIR="~/mypharma/app"

echo "📦 Syncing files..."
rsync -avz --exclude node_modules --exclude .env --exclude dist \
  ~/dev/personal/myPharma/backend/ $SERVER:$REMOTE_DIR/

echo "🔧 Installing & building..."
ssh $SERVER "cd $REMOTE_DIR && npm install && npm run db:generate && npm run build"

echo "🚀 Restarting..."
ssh $SERVER "pm2 restart mypharma"

echo "✅ Deployed!"
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Useful Commands

### Server

```bash
# SSH into server
ssh mypharma

# Check disk space
df -h

# Check memory
free -h

# Check running containers
docker ps

# Docker logs
docker compose -f ~/mypharma/docker-compose.yml logs -f
```

### Application

```bash
cd ~/mypharma/app

# Sync all regions/cities from vrisko.gr
npm run sync-regions

# Sync only a specific prefecture
npm run sync-regions -- --region ΑΧΑΪΑΣ
npm run sync-regions -- -r ΑΤΤΙΚΗΣ
npm run sync-regions -- -r ΘΕΣΣΑΛΟΝΙΚΗΣ

# Run pharmacy scraper (all cities)
npm run scrape

# Scrape only a specific city (matches name or slug)
npm run scrape -- --city patra
npm run scrape -- --city thessaloniki
npm run scrape -- -c athina

# Scrape only a specific region/prefecture
npm run scrape -- --region ΑΧΑΪΑΣ
npm run scrape -- --region ΑΤΤΙΚΗΣ
npm run scrape -- -r ΘΕΣΣΑΛΟΝΙΚΗΣ

# Example: sync + scrape only Patra
npm run sync-regions -- -r ΑΧΑΪΑΣ && npm run scrape -- --city patra

# Show help
npm run scrape -- --help
npm run sync-regions -- --help
npm run help
```

### Database

```bash
# Connect to PostgreSQL
docker exec -it mypharma-postgres-1 psql -U mypharma

# Useful SQL
SELECT COUNT(*) FROM pharmacies;
SELECT COUNT(*) FROM scraper_cities WHERE active = true;
SELECT COUNT(*) FROM pharmacy_duties;

# Prisma Studio (web UI)
cd ~/mypharma/app
npx prisma studio --schema=src/db/prisma/schema.prisma

# Reset DB (drop all tables + recreate)
npx prisma db push --force-reset --schema=src/db/prisma/schema.prisma
```

### Migrate Local DB to Production

```bash
# 1. Dump local DB
pg_dump -U mypharma -h localhost mypharma > /tmp/mypharma_dump.sql

# 2. Copy to server
scp /tmp/mypharma_dump.sql mypharma:~/

# 3. Restore on server (make sure schema is up to date first)
ssh mypharma "docker exec -i mypharma-postgres-1 psql -U mypharma mypharma < ~/mypharma_dump.sql"

# Or dump only specific tables (data only)
pg_dump -U mypharma -h localhost --data-only -t pharmacies -t scraper_cities -t pharmacy_duties mypharma > /tmp/mypharma_data.sql
scp /tmp/mypharma_data.sql mypharma:~/
ssh mypharma "docker exec -i mypharma-postgres-1 psql -U mypharma mypharma < ~/mypharma_data.sql"
```

### Redis

```bash
# Connect to Redis CLI
docker exec -it mypharma-redis-1 redis-cli

# Useful commands
KEYS *
KEYS pharmacies:*
TTL pharmacies:some-key
FLUSHALL          # Clear all cache
INFO memory       # Memory usage
```

---

## Cron Jobs (automatic)

The application runs two cron jobs automatically via `node-cron`:

| Schedule | Job | Description |
|----------|-----|-------------|
| `0 6 * * *` | Pharmacy scrape | Daily at 6:00 AM — scrapes pharmacies from vrisko.gr |
| `0 5 * * 0` | Region sync | Weekly Sunday at 5:00 AM — refreshes city list |

These run inside the Node.js process managed by PM2. No system crontab needed.

---

## Backup

### Database Backup

```bash
# Manual backup
docker exec mypharma-postgres-1 pg_dump -U mypharma mypharma > ~/backup_$(date +%Y%m%d).sql

# Restore
cat ~/backup_20260131.sql | docker exec -i mypharma-postgres-1 psql -U mypharma mypharma
```

### Automated Daily Backup (optional)

```bash
# Add to crontab
crontab -e

# Add this line (daily at 3 AM)
0 3 * * * docker exec mypharma-postgres-1 pg_dump -U mypharma mypharma | gzip > ~/backups/mypharma_$(date +\%Y\%m\%d).sql.gz
```

```bash
mkdir -p ~/backups
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App not responding | `pm2 logs mypharma` — check for errors |
| Port 3000 in use | `pm2 delete all && pm2 start dist/index.js --name mypharma` |
| DB connection refused | `docker ps` — check if postgres is running |
| Redis empty after restart | Normal — cache rebuilds on next API request |
| Scraper timeout | Check server internet: `curl -I https://www.vrisko.gr` |
| Out of memory | Upgrade to CX32 or add swap: `sudo fallocate -l 2G /swapfile` |
| SSL cert expired | `sudo certbot renew` |
| Nginx 502 Bad Gateway | App crashed — `pm2 restart mypharma` |

---

## Cost Summary

| Item | Cost |
|------|------|
| Hetzner CX22 | ~€4.50/month |
| Public IPv4 | ~€0.72/month |
| Domain (optional) | ~€10/year |
| **Total** | **~€5.22/month** |
