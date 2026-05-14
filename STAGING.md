# Test environment — `test.reattend.com`

A parallel deployment of Reattend Enterprise running on its own droplet
with its own database. Used to validate enterprise features at scale
(100 users, 4 regions, 16 departments) without touching production
data, payments, or auth.

This document is the source of truth for everything about the test
environment. If you're about to do something on `test.reattend.com`
and there isn't a section for it here, add one when you're done.

---

## Quick links

| Surface | URL |
|---|---|
| App | https://test.reattend.com |
| Login (seed users only) | https://test.reattend.com/test-login |
| Org slug | `seed-acme-india` |

---

## Infrastructure

| Resource | Value |
|---|---|
| Droplet IP | `143.198.116.94` |
| Droplet size | $12/mo · 2 GB RAM · 1 vCPU · Singapore (SGP1) |
| OS | Ubuntu 24.04 LTS |
| Domain | `test.reattend.com` (A record → droplet IP) |
| TLS | Let's Encrypt, auto-renews via certbot timer |
| App dir | `/var/www/enterprise-test` |
| Database | `/var/www/enterprise-test/data/reattend.db` (SQLite, separate from prod) |
| pm2 process | `enterprise-test` (NOT `enterprise` — that's prod) |
| Swap | 4 GB at `/swapfile` (required for `npm run build` not to OOM) |
| nginx site | `/etc/nginx/sites-enabled/enterprise-test` |
| Heap budget | `NODE_OPTIONS=--max-old-space-size=1600` (with 4 GB swap headroom) |

---

## Auth — how to log in

The test droplet uses a dedicated NextAuth credentials provider
(`test-password`) that **only** accepts `@seed.reattend.local` emails
and a single shared password. No OTP, no Resend, no real inbox.

**Login URL:** https://test.reattend.com/test-login

**Shared password (all 100 users):** `reattend-test-2026`

(Stored on the droplet at `/var/www/enterprise-test/.env.local` as
`TEST_LOGIN_PASSWORD`. To rotate, edit that file and run
`pm2 restart enterprise-test --update-env`.)

The credentials provider has two safety layers (see
`src/lib/auth/index.ts`):

1. Top-level env gate: `ALLOW_TEST_PASSWORD_LOGIN=true` (only set on
   the test droplet, never on prod)
2. Domain check inside `authorize`: rejects any email not ending in
   `@seed.reattend.local`

If the env var ever accidentally flips on in prod, real users still
can't bypass OTP because their emails don't match the seed domain.

---

## The 100-person seed org

`acme-india-test` (slug `seed-acme-india`), modeled on a 50-employee
Indian enterprise pitch with regional + functional structure:

```
Level 1 — HQ Bengaluru (4):    CEO, CTO, COO, CHRO
Level 2 — Divisional VPs (8):  East/West/South/North × 2 VPs
Level 3 — Dept Heads (16):     region × Sales/IT/Operations/HR
Level 4 — Managers (32):       region × 4 functions × 2 managers
Level 5 — Individual contribs (40): scattered across functions per region
                                                            ─── 100 ───
```

- **Org-level RBAC:** Level 1 = `super_admin`, Level 2 = `admin`,
  the rest = `member`
- **Department-level RBAC:** Level 3 = `dept_head`, Level 4 = `manager`,
  Level 5 = `member`
- **Workspaces:** 4 regional workspaces (East / West / South / North
  Memory) — every memory lives in one. HQ users are members of all
  four; divisional users only their own.
- **Tier:** every user pre-set to `tier='professional'` so paid-feature
  gates open without Paddle.

### Sample logins

| Persona | Email | Use to test |
|---|---|---|
| CEO | `vikrant.iyer@seed.reattend.local` | Org-wide visibility, super_admin |
| East VP | `aritra.sengupta@seed.reattend.local` | Divisional admin (East only) |
| East Sales Head | `ananya.ghosh@seed.reattend.local` | Dept head (East/Sales) |
| West IT Manager | `sameer.gokhale@seed.reattend.local` | Manager scope (West/IT) |
| South Sales IC | `pranav.pai@seed.reattend.local` | Member scope, narrowest |

All names match their regional flavor (Bengali in East, Marathi/Gujarati
in West, Kannada/Tamil/Telugu in South, Hindi/Punjabi in North) so the
admin members table looks authentic.

For the full roster: `ssh root@143.198.116.94 "sqlite3 /var/www/enterprise-test/data/reattend.db 'SELECT email, name FROM users WHERE email LIKE \"%@seed.reattend.local\" ORDER BY email'"`

### Re-seeding

The seed script is idempotent. To rebuild from scratch (e.g. after
schema changes):

```bash
ssh root@143.198.116.94 "cd /var/www/enterprise-test && npx tsx scripts/seed-test-org.ts --reset"
```

`--reset` wipes the existing `seed-acme-india` org + every user with
`@seed.reattend.local`, then rebuilds. Without `--reset` the script
no-ops if the org already exists.

---

## AI providers

The test droplet uses **Groq only** (cheaper, sufficient for testing
logic). Production uses Claude for answering + Groq for ingestion.

`getAskLLM()` in `src/lib/ai/llm.ts` falls back to Groq when
`ANTHROPIC_API_KEY` is missing. The reranker silently no-ops when
Anthropic is missing (returns top-K in FTS order). Result: the whole
Ask + DeepThink pipeline answers cleanly with just `GROQ_API_KEY`.

To set the Groq key on the test droplet:

```bash
ssh root@143.198.116.94 "sed -i 's|^GROQ_API_KEY=.*|GROQ_API_KEY=<your-key>|' /var/www/enterprise-test/.env.local && pm2 restart enterprise-test --update-env"
```

**Cost cap:** set the Groq dashboard's monthly spend limit to $20.
A runaway bot is contained at $20, not $2000.

---

## Things that are intentionally OFF on test

- **Paddle billing** — no webhooks, no subscriptions table activity.
  Every seed user has `tier='professional'` baked in.
- **Resend OTP** — the OTP code path is intact but pointless because
  the seed domain (`@seed.reattend.local`) has no inbox.
- **Anthropic / Claude** — `getAskLLM` falls back to Groq.
- **Sentry / GA** — same code paths fire but no traffic shows up
  unless someone configures the env vars.
- **Search indexing** — `<meta robots="noindex">` not yet added; rely on
  the password gate. (Add a robots.txt block here if it ever leaks.)

---

## Visual marker — TEST ENV banner

Every page on `test.reattend.com` has a sticky red bar at the top
reading "TEST ENVIRONMENT — Data is fake, never paste real secrets".
Driven by `NEXT_PUBLIC_ENV=test` on the test droplet. Prod doesn't set
the var, banner doesn't render. See `src/components/test-env-banner.tsx`.

Use this to visually distinguish prod from test in screenshots, demos,
and bleary-eyed late-night sessions.

---

## Deploy / update workflow

Same shape as prod, just on the test droplet:

```bash
ssh root@143.198.116.94 "cd /var/www/enterprise-test && \
  git pull && pm2 stop enterprise-test && rm -rf .next && \
  NODE_OPTIONS='--max-old-space-size=1600' npm run build && \
  pm2 start enterprise-test --update-env"
```

If a build OOM-kills (heap limit + 4 GB swap should prevent this), bump
the `--max-old-space-size` value — Singapore droplet has the headroom.

### Auto-deploy (when ready)

A GitHub Action will eventually push every `main` commit to test
automatically. Until then, deploy is manual via the command above.

---

## Common tasks

### See pm2 status

```bash
ssh root@143.198.116.94 "pm2 describe enterprise-test | head -20"
```

### Tail live logs

```bash
ssh root@143.198.116.94 "pm2 logs enterprise-test --lines 50 --nostream"
```

### SQL ad-hoc

```bash
ssh root@143.198.116.94 "sqlite3 /var/www/enterprise-test/data/reattend.db '<query>'"
```

### Wipe everything and start over

```bash
ssh root@143.198.116.94 "set -e && \
  cd /var/www/enterprise-test && \
  pm2 stop enterprise-test && \
  rm -f data/reattend.db data/reattend.db-shm data/reattend.db-wal && \
  DATABASE_PATH=/var/www/enterprise-test/data/reattend.db npx drizzle-kit migrate && \
  npx tsx src/lib/db/migrate.ts && \
  npx tsx scripts/seed-test-org.ts && \
  pm2 start enterprise-test --update-env"
```

---

## What was changed in the codebase to support this

These all live in production code but are no-ops there because they're
env-gated:

| File | Purpose |
|---|---|
| `src/lib/auth/index.ts` | Adds `test-password` credentials provider, gated on `ALLOW_TEST_PASSWORD_LOGIN=true` AND `@seed.reattend.local` email |
| `src/lib/ai/llm.ts` | `getAskLLM` falls back to Groq when no Anthropic key |
| `src/app/test-login/page.tsx` | Login form for seed users; 404s on prod via env gate |
| `src/components/test-env-banner.tsx` | Red sticky banner; renders only when `NEXT_PUBLIC_ENV=test` |
| `scripts/seed-test-org.ts` | The 100-user seeder, idempotent with `--reset` |

If any of these breaks on prod, check: did someone accidentally set
`ALLOW_TEST_PASSWORD_LOGIN=true` or `NEXT_PUBLIC_ENV=test` in
`/var/www/enterprise/.env.local`? Both should be absent on prod.

---

## Future cleanups

- Stand up a GitHub Action so every `main` push deploys to test before
  prod sees it. ETA: when test feels stable enough that auto-deploy
  doesn't risk losing dev time to a bad build.
- Add `robots.txt` disallow + `<meta noindex>` so search engines don't
  index the test pages.
- Switch the bcrypt comparison if/when the shared-password model
  graduates to per-user passwords (it shouldn't need to).
