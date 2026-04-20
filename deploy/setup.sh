#!/bin/bash
# Reattend — DigitalOcean server setup script
# Run on the DO droplet: bash deploy/setup.sh
set -euo pipefail

APP_DIR="/var/www/reattend"
DATA_DIR="/var/www/reattend/data"

echo "=== Reattend Server Setup ==="

# 1. System packages
echo "→ Installing system packages..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx curl git build-essential

# 2. Node.js 20 (via NodeSource)
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  echo "→ Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

# 3. PM2
if ! command -v pm2 &>/dev/null; then
  echo "→ Installing PM2..."
  npm install -g pm2
  pm2 startup systemd -u root --hp /root
fi

# 4. App directory
echo "→ Setting up app directory..."
mkdir -p "$APP_DIR" "$DATA_DIR"

# 5. Clone or pull
if [ -d "$APP_DIR/.git" ]; then
  echo "→ Pulling latest code..."
  cd "$APP_DIR" && git pull
else
  echo "→ Clone your repo into $APP_DIR or rsync the built files."
  echo "   Example: rsync -avz --exclude node_modules --exclude .git ./ root@157.245.110.176:$APP_DIR/"
fi

# 6. Install deps + build
cd "$APP_DIR"
if [ -f package.json ]; then
  echo "→ Installing dependencies..."
  npm ci --production=false
  echo "→ Building Next.js..."
  npm run build
fi

# 7. Env check
if [ ! -f "$APP_DIR/.env.production" ] && [ ! -f "$APP_DIR/.env.local" ]; then
  echo ""
  echo "⚠  No .env.production found! Copy .env.production.example and fill in values:"
  echo "   cp $APP_DIR/.env.production.example $APP_DIR/.env.production"
  echo "   Then re-run this script."
  echo ""
fi

# 8. SQLite data dir — WAL mode
echo "→ Ensuring SQLite WAL mode..."
if [ -f "$DATA_DIR/reattend.db" ]; then
  sqlite3 "$DATA_DIR/reattend.db" "PRAGMA journal_mode=WAL;" 2>/dev/null || true
fi

# 9. Nginx config
echo "→ Configuring Nginx..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/reattend
ln -sf /etc/nginx/sites-available/reattend /etc/nginx/sites-enabled/reattend
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 10. SSL (skip if certs already exist)
if [ ! -d "/etc/letsencrypt/live/reattend.com" ]; then
  echo "→ Obtaining SSL certificate..."
  certbot --nginx -d reattend.com -d www.reattend.com --non-interactive --agree-tos --email partha@reattend.com
fi

# 11. Start/restart PM2
echo "→ Starting application with PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js --env production || pm2 restart reattend
pm2 save

# 12. Daily backup cron
CRON_JOB="0 3 * * * cp $DATA_DIR/reattend.db $DATA_DIR/reattend-backup-\$(date +\\%Y\\%m\\%d).db && find $DATA_DIR -name 'reattend-backup-*.db' -mtime +7 -delete"
(crontab -l 2>/dev/null | grep -v "reattend-backup" ; echo "$CRON_JOB") | crontab -

echo ""
echo "=== Setup complete ==="
echo "App running at https://reattend.com"
echo "PM2 status: pm2 status"
echo "Logs: pm2 logs reattend"
