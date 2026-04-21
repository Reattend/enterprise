# Deploying Reattend Enterprise + Self-Hosted Nango

**Target:** a single $24 DigitalOcean droplet (4GB RAM / 2 vCPU / 80GB SSD, Ubuntu 24.04) running everything. Estimated total RAM footprint ~3.5GB under load — fits with headroom.

This guide is specifically for the **first production deployment**. Later, split the app tier from the Nango tier.

---

## 1. Provision the droplet

1. DigitalOcean → Create → Droplets → Ubuntu 24.04 LTS → Basic shared / 4GB.
2. Add your SSH key during creation.
3. Note the public IPv4 address; call it `$DROPLET_IP` below.

Point both DNS records at `$DROPLET_IP`:
- `enterprise.reattend.com` → A record → `$DROPLET_IP`
- `nango.reattend.com` → A record → `$DROPLET_IP`

---

## 2. Baseline setup

SSH in as root:

```bash
ssh root@$DROPLET_IP
```

Run this once:

```bash
apt update && apt upgrade -y
apt install -y ufw fail2ban nginx certbot python3-certbot-nginx git

# firewall: only 22, 80, 443 open
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Docker Engine (for Nango)
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Node.js 20 (for the Next.js app)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Create a non-root user for the app
adduser --disabled-password --gecos '' reattend
usermod -aG docker reattend
```

---

## 3. Clone + build Reattend

As the `reattend` user:

```bash
su - reattend
git clone https://github.com/YOUR-ORG/reattend-enterprise.git
cd reattend-enterprise
npm ci
npm run build
```

Create `/home/reattend/reattend-enterprise/.env.local` with at minimum:

```
NEXTAUTH_SECRET=<openssl rand -hex 32>
NEXTAUTH_URL=https://enterprise.reattend.com

# SQLite path — keep the DB file outside the repo directory so `git pull`
# won't compete with it
DATABASE_PATH=/home/reattend/data/reattend.db

# Nango (filled in after step 4)
NANGO_HOST=https://nango.reattend.com
NANGO_SECRET_KEY=<from Nango dashboard>
NANGO_WEBHOOK_SECRET=<random string you also paste in Nango>

# LLM providers
ANTHROPIC_API_KEY=sk-ant-...
# or GROQ_API_KEY / whatever is live
```

Create the data directory + run migrations:

```bash
mkdir -p /home/reattend/data
npx drizzle-kit migrate
```

---

## 4. Bring up Nango

Still as `reattend`:

```bash
cd /home/reattend/reattend-enterprise

# Generate an encryption key — DO NOT LOSE THIS. Losing it means every OAuth
# token in Nango's DB becomes undecryptable and every user has to reconnect.
export NANGO_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "NANGO_ENCRYPTION_KEY=$NANGO_ENCRYPTION_KEY" >> .env
echo "NANGO_SERVER_URL=https://nango.reattend.com" >> .env
echo "NANGO_DB_PASSWORD=$(openssl rand -hex 16)" >> .env

docker compose -f docker-compose.nango.yml up -d

# Wait ~30s for first boot, then:
curl http://localhost:3003/api/v1/health
```

Open `http://$DROPLET_IP:3003` in your browser → configure Nango:
1. Create an environment (default is fine)
2. Grab the **Secret Key** — paste into `.env.local` as `NANGO_SECRET_KEY`
3. Register provider configs (one per integration): `google-mail`, `google-drive`, `slack`, `notion`, `confluence`. For each, paste in the OAuth Client ID/Secret you created in Google Cloud / Slack / etc.
4. **Set the webhook URL to `https://enterprise.reattend.com/api/nango/webhook`** and paste your `NANGO_WEBHOOK_SECRET` in both Nango and our `.env.local`.

---

## 5. Nginx + SSL

As root:

```bash
cat > /etc/nginx/sites-available/reattend <<'EOF'
server {
  server_name enterprise.reattend.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300;
  }
}

server {
  server_name nango.reattend.com;
  location / {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300;
  }
}
EOF

ln -s /etc/nginx/sites-available/reattend /etc/nginx/sites-enabled/reattend
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# LetsEncrypt for both domains
certbot --nginx -d enterprise.reattend.com -d nango.reattend.com --non-interactive --agree-tos -m ops@reattend.com
```

---

## 6. Run the app under systemd

As root:

```bash
cat > /etc/systemd/system/reattend.service <<'EOF'
[Unit]
Description=Reattend Enterprise
After=network.target

[Service]
Type=simple
User=reattend
WorkingDirectory=/home/reattend/reattend-enterprise
EnvironmentFile=/home/reattend/reattend-enterprise/.env.local
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable reattend
systemctl start reattend
systemctl status reattend
```

---

## 7. Verify

- `https://enterprise.reattend.com` → Reattend login page loads over HTTPS
- `https://nango.reattend.com` → Nango dashboard (keep this behind IP allowlist later)
- Log in → Integrations page → Connect Gmail → OAuth consent screen shows **nango.reattend.com** as the redirect URI. Zero third-party hostnames visible to the customer.

---

## 8. Backups (do this before your first customer)

Hourly SQLite snapshot + daily offsite:

```bash
# On the droplet
cat > /etc/cron.hourly/reattend-backup <<'EOF'
#!/bin/bash
TS=$(date +%Y%m%d-%H)
sqlite3 /home/reattend/data/reattend.db ".backup /home/reattend/data/backups/reattend-$TS.db"
find /home/reattend/data/backups -type f -mtime +7 -delete
EOF
chmod +x /etc/cron.hourly/reattend-backup
mkdir -p /home/reattend/data/backups
chown reattend:reattend /home/reattend/data/backups
```

Plus a nightly rsync to a cheap S3-compatible bucket (DO Spaces, $5/mo). Left as exercise — the Reattend code is 80% of the value; the DB snapshot is the other 20%.

---

## Upgrading

```bash
# App
su - reattend
cd reattend-enterprise
git pull
npm ci
npm run build
npx drizzle-kit migrate   # only if new migrations exist
sudo systemctl restart reattend

# Nango (deliberate — run the smoke test first on staging)
docker compose -f docker-compose.nango.yml pull
docker compose -f docker-compose.nango.yml up -d
```

## Splitting tiers later

When one droplet can't hold both: move Nango to a second droplet, update `NANGO_HOST` on the app, re-register the provider callback URLs in Google/Slack/etc. to the new Nango hostname. All OAuth tokens stay on the Nango side — no re-auth needed if the hostname stays the same.
