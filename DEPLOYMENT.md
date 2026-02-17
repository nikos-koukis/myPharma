# myPharma — Deployment Guide

```bash
# First time — copy your key to the server
ssh-copy-id -i ~/.ssh/id_ed25519_koukis root@YOUR_SERVER_IP

# Add to ~/.ssh/config for easy access
Host mypharma
    HostName YOUR_SERVER_IP
    User root
    IdentityFile ~/.ssh/id_ed25519_koukis

# Then just:
ssh mypharma
```

---

## Server Setup

### 3. Initial Configuration

```bash
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

### 4. Install Dependencies

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Docker & Docker Compose
apt install -y docker.io docker-compose-v2

# Nginx & Certbot
apt install -y nginx certbot python3-certbot-nginx
```

---

## Database & Cache

### 5. Docker Compose (PostgreSQL + Redis)

```bash
cd ~/myPharma/backend
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
  root@YOUR_SERVER_IP:~/myPharma/backend/
```

**On the server:**

```bash
cd ~/myPharma/backend
npm install
```

### 7. Environment Variables

```bash
cat > ~/myPharma/backend/.env << 'EOF'
DATABASE_URL=postgresql://mypharma:CHANGE_ME_STRONG_PASSWORD@localhost:5432/mypharma
REDIS_URL=redis://localhost:6379
PORT=3000
GEOCODER_API_KEY=your_geoapify_key_here
EOF
```

### 8. Initialize Database

```bash
cd ~/myPharma/backend

# Push schema to DB
npm run db:push

# Generate Prisma client
npm run db:generate

# Run initial scrape
npm run scrape
```

---

## Process Manager (PM2)

### 9. Setup PM2

```bash
npm install -g pm2

cd ~/myPharma/backend

# Build TypeScript
npm run build

# Start application
pm2 start dist/index.js --name mypharma

# Auto-restart on server reboot
pm2 startup
# Run the command it outputs
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
nano /etc/nginx/sites-available/mypharma
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
ln -s /etc/nginx/sites-available/mypharma /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 11. SSL Certificate (requires domain)

```bash
certbot --nginx -d api.yourdomain.com
# Auto-renewal is configured automatically
```

---

## Deployment Script

### 12. Automated Deploys

Create `deploy.sh` on your Mac:

```bash
#!/bin/bash
set -e

SERVER="root@YOUR_SERVER_IP"
REMOTE_DIR="~/myPharma/backend"

echo "Syncing files..."
rsync -avz --exclude node_modules --exclude .env --exclude dist \
  ~/dev/personal/myPharma/backend/ $SERVER:$REMOTE_DIR/

echo "Installing & building..."
ssh $SERVER "cd $REMOTE_DIR && npm install && npm run db:generate && npm run build"

echo "Restarting..."
ssh $SERVER "pm2 restart mypharma"

echo "Deployed!"
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Useful Commands

### Server

```bash
ssh mypharma
df -h                # Check disk space
free -h              # Check memory
docker ps            # Check running containers
docker compose -f ~/myPharma/backend/docker-compose.yml logs -f
```

### Application

```bash
cd ~/myPharma/backend

# Run pharmacy scraper (all configured prefectures)
npm run scrape
```

### Scraper Scripts

```bash
cd ~/myPharma/backend

# List all 41 Greek prefectures (discovered dynamically from xo.gr)
npx tsx src/scripts/scrape-region.ts --list

# Scrape a single prefecture (by Greek name or slug)
npx tsx src/scripts/scrape-region.ts achaias
npx tsx src/scripts/scrape-region.ts Αχαΐας
npx tsx src/scripts/scrape-region.ts thessalonikis
npx tsx src/scripts/scrape-region.ts Αττικής

# Scrape using env filter (for production cron)
SCRAPE_PREFECTURES=Αχαΐας npm run scrape
SCRAPE_PREFECTURES=Αχαΐας,Αττικής npm run scrape
```

The scraper dynamically discovers:
1. All prefectures from the main xo.gr page
2. All cities within each prefecture
3. Pharmacy duty hours for today and tomorrow

### Database

```bash
# Connect to PostgreSQL
docker exec -it backend-postgres-1 psql -U mypharma

# Useful SQL
SELECT COUNT(*) FROM pharmacies;
SELECT COUNT(*) FROM pharmacy_duties;

# Prisma Studio (web UI) — access from localhost
# 1. On the server: start Prisma Studio
cd ~/myPharma/backend
npx prisma studio --schema=src/db/prisma/schema.prisma

# 2. On your Mac: create SSH tunnel (in a new terminal)
ssh -L 5555:localhost:5555 mypharma

# 3. Open in browser: http://localhost:5555

# Reset DB (drop all tables + recreate)
npm run db:reset
```

### Migrate Local DB to Production

```bash
# 1. Dump local DB
docker exec -t backend-postgres-1 pg_dump -U mypharma mypharma > mypharma_dump.sql

# 2. Copy to server
scp mypharma_dump.sql mypharma:~/

# 3. Restore on server
ssh mypharma "docker exec -i backend-postgres-1 psql -U mypharma mypharma < ~/mypharma_dump.sql"
```

### Redis

```bash
# Connect to Redis CLI
docker exec -it backend-redis-1 redis-cli

KEYS *                # List all keys
KEYS pharmacies:*     # List pharmacy keys
FLUSHALL              # Clear all cache
INFO memory           # Memory usage
```

---

## Cron Jobs (automatic)

The application runs a cron job automatically via `node-cron`:

| Schedule | Job | Description |
|----------|-----|-------------|
| `0 7 * * *` | Pharmacy scrape | Daily at 7:00 AM — scrapes all configured prefectures from xo.gr |

Runs inside the Node.js process managed by PM2. No system crontab needed.

To limit which prefectures are scraped, set `SCRAPE_PREFECTURES` in `.env`:
```bash
# Scrape only specific prefectures (comma-separated)
SCRAPE_PREFECTURES=Αχαΐας,Αττικής
```

---

## Backup

### Database Backup

```bash
# Manual backup
docker exec backend-postgres-1 pg_dump -U mypharma mypharma > ~/backup_$(date +%Y%m%d).sql

# Restore
cat ~/backup_20260131.sql | docker exec -i backend-postgres-1 psql -U mypharma mypharma
```

### Automated Daily Backup (optional)

```bash
mkdir -p ~/backups

# Add to crontab
crontab -e

# Add this line (daily at 3 AM)
0 3 * * * docker exec backend-postgres-1 pg_dump -U mypharma mypharma | gzip > ~/backups/mypharma_$(date +\%Y\%m\%d).sql.gz
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App not responding | `pm2 logs mypharma` — check for errors |
| Port 3000 in use | `pm2 delete all && pm2 start dist/index.js --name mypharma` |
| DB connection refused | `docker ps` — check if postgres is running |
| Redis empty after restart | Normal — cache rebuilds on next API request |
| Scraper timeout | Check server internet: `curl -I https://www.xo.gr` |
| Out of memory | Upgrade to CX32 or add swap: `fallocate -l 2G /swapfile` |
| SSL cert expired | `certbot renew` |
| Nginx 502 Bad Gateway | App crashed — `pm2 restart mypharma` |

---

## Cost Summary

| Item | Cost |
|------|------|
| Hetzner CX22 | ~€4.50/month |
| Public IPv4 | ~€0.72/month |
| Domain (optional) | ~€10/year |
| **Total** | **~€5.22/month** |
