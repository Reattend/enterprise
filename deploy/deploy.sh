#!/bin/bash
# Quick deploy from local machine to DO droplet
# Usage: bash deploy/deploy.sh
set -euo pipefail

SERVER="root@157.245.110.176"
APP_DIR="/var/www/reattend"

echo "=== Deploying to $SERVER ==="

# 1. Build locally first
echo "→ Building locally..."
npm run build

# 2. Rsync to server (exclude dev files)
echo "→ Syncing files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env.local' \
  --exclude '.env.production' \
  --exclude 'data/' \
  ./ "$SERVER:$APP_DIR/"

# 3. Install deps, run migrations, then restart on server
echo "→ Installing deps..."
ssh "$SERVER" "cd $APP_DIR && npm ci --omit=dev"

echo "→ Running DB migrations..."
ssh "$SERVER" "cd $APP_DIR && node deploy/migrate-prod.js" || echo "  (migration skipped)"

echo "→ Restarting app..."
ssh "$SERVER" "pm2 restart reattend --update-env"

echo "=== Deploy complete ==="
echo "Check: https://reattend.com/api/health"
