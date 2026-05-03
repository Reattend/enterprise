# Backups

Three layers of redundancy. Each survives a different failure mode.

| Layer | What it survives | Location | Retention |
|---|---|---|---|
| **Local hourly** | bad migration, accidental DELETE, file corruption | droplet `/var/www/enterprise/data/backups/` | 24 hourly + 7 daily |
| **DigitalOcean Spaces** | droplet death, region-wide DO outage on the *droplet* side | Spaces bucket `reattend-backups` | last 30 daily |
| **Backblaze B2** | DO-wide outage (object storage AND compute), provider-level account loss | B2 bucket `reattend-backups` | last 30 daily |

Two providers because if your DO account itself is compromised or accidentally
billed-into-suspension, the Spaces bucket goes with it. Backblaze is the
out-of-account safety net.

---

## What's already running

The script `/usr/local/bin/reattend-backup.sh` runs hourly via crontab on the
droplet. It does:

1. SQLite online `.backup` of `/var/www/enterprise/data/reattend.db` to
   `data/backups/hourly/reattend-{TIMESTAMP}.db.gz`. Online means it's safe
   to run while the Node.js process has the DB open.
2. Prunes hourly snapshots to last 24.
3. Once per day at 00:xx UTC, copies the latest hourly into `daily/` and
   prunes daily to last 7.
4. (Once configured) pushes the same snapshot to DO Spaces + Backblaze B2,
   pruning each remote to last 30 daily.

Logs to `/var/log/reattend-backup.log`. Inspect with `tail -f` on the droplet.

Manual run: `/usr/local/bin/reattend-backup.sh`

---

## Setting up DigitalOcean Spaces (5 min)

1. **Create a Space**
   - DigitalOcean dashboard → **Spaces Object Storage** → **Create**
   - Region: pick the same region as the droplet (BLR1 if available, otherwise
     NYC3 — round-trip latency matters for nightly pushes).
   - Bucket name: `reattend-backups` (or whatever; just paste it back here)
   - Set access to **Restricted file listing** (default; bucket is private)
   - Skip CDN (we don't need a CDN for backups)
   - Skip CORS

2. **Generate Spaces access keys**
   - DigitalOcean dashboard → **API** → **Spaces Keys** → **Generate New Key**
   - Name: `reattend-backup-droplet`
   - Returns: an **Access Key** (looks like `DO00...`) and a **Secret Key**
     (long base64 string). **Copy both immediately** — the secret is only
     shown once.

3. **Paste these to me:**
   - Access Key
   - Secret Key
   - Bucket name (e.g. `reattend-backups`)
   - Region (e.g. `blr1` or `nyc3`)

4. I'll do this on the droplet:
   ```bash
   # Add credentials to root's ~/.aws/credentials (Spaces uses S3-compatible API)
   mkdir -p /root/.aws
   cat > /root/.aws/credentials <<EOF
   [do-spaces]
   aws_access_key_id = <key>
   aws_secret_access_key = <secret>
   EOF
   # Then update reattend-backup.sh to push via aws s3 cp with the
   # Spaces endpoint URL.
   ```

---

## Setting up Backblaze B2 (5 min)

1. **Create a B2 bucket**
   - Sign up at https://www.backblaze.com/cloud-storage (free tier: 10 GB
     storage, 1 GB/day download, plenty for our needs)
   - Account → **Buckets** → **Create a Bucket**
   - Name: `reattend-backups` (must be globally unique; B2 may force a
     suffix like `reattend-backups-xyz`)
   - Files in Bucket: **Private**
   - Default Encryption: **Disabled** (we'll rely on transit encryption only;
     enable later if needed)
   - Object Lock: **Disabled**

2. **Generate an Application Key**
   - Account → **Application Keys** → **Add a New Application Key**
   - Name: `reattend-backup-droplet`
   - Allow access to: **just this bucket** (not all buckets — least privilege)
   - Type: Read and Write
   - File-name prefix: leave empty
   - Returns: a **keyID** (looks like `0050...`) and an **applicationKey**
     (long string). Copy both immediately — the application key is only
     shown once.

3. **Paste these to me:**
   - keyID
   - applicationKey
   - Bucket name (the actual name, including any auto-suffix)
   - Endpoint (B2 dashboard shows this — looks like
     `s3.us-west-001.backblazeb2.com`)

4. I'll add it as a second `[backblaze]` profile in
   `/root/.aws/credentials` and extend the backup script to push to both.

---

## Restore procedure

### From local
```bash
ssh root@167.99.158.143 "ls -lt /var/www/enterprise/data/backups/hourly/ | head -5"
# pick the snapshot you want
ssh root@167.99.158.143 "
  cd /var/www/enterprise/data/backups/hourly
  gunzip -k reattend-20260503T120000Z.db.gz   # -k keeps the .gz around
  pm2 stop enterprise
  cp reattend-20260503T120000Z.db /var/www/enterprise/data/reattend.db
  pm2 start enterprise --update-env
"
```

### From DO Spaces (assuming aws-cli configured with [do-spaces] profile)
```bash
aws --profile do-spaces --endpoint-url https://blr1.digitaloceanspaces.com \
    s3 ls s3://reattend-backups/daily/
aws --profile do-spaces --endpoint-url https://blr1.digitaloceanspaces.com \
    s3 cp s3://reattend-backups/daily/reattend-20260501.db.gz ./restore.db.gz
gunzip restore.db.gz
# then stop pm2, copy into place, start pm2
```

### From Backblaze B2
```bash
aws --profile backblaze --endpoint-url https://s3.us-west-001.backblazeb2.com \
    s3 ls s3://reattend-backups/daily/
# copy + restore as above
```

---

## What to verify monthly

1. `tail /var/log/reattend-backup.log` — should show hourly success entries.
2. `ls /var/www/enterprise/data/backups/hourly/` — should have 24 files.
3. `aws --profile do-spaces s3 ls ...` — should have ~30 files in `daily/`.
4. **Restore drill** every quarter: spin up a fresh DO droplet, pull the
   most recent backup, gunzip, start a Next.js process against it, hit
   `/api/health`. If it works, you're real.

---

## Failure modes this DOESN'T cover

- **Live ransomware on the droplet**: the cron has write access to the
  backups dir, so an attacker that owns root can wipe local + remotes.
  Mitigation: enable B2 Object Lock for write-once-read-many backups
  (when we're ready to commit to longer-term retention).
- **Accidental DROP TABLE within the past hour**: max data loss is one
  hour. For RPO < 1 hour, switch to litestream (continuous WAL replication,
  ~1-second lag). Not done today because the migration overhead and the
  litestream binary footprint aren't worth it at our current write volume.
