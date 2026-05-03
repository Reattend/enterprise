# Project: Reattend Enterprise

> **Resuming a fresh session?** Read `today.md` first — it's the running journal of every sprint, what's done, what's next, and what to remember. Then `sprint.md` for the roadmap. CLAUDE.md (this file) is the steady-state guide.

---

## What we're building

**Reattend Enterprise** — an organizational memory platform that solves corporate amnesia. Decisions, exit interviews, handoffs, time-machine point-in-time, self-healing contradictions. When employees leave, transfer, or retire, their institutional knowledge stays.

**Two ICPs, one product:**
1. **Government / secure org** — first client. Paper-heavy, on-prem-required. Trainer dispatched to scan documents. OCR is mission-critical.
2. **SaaS / startups up to 200 employees** — second wave. Slack / Notion / MS Teams via Nango.

**The wedge** — Glean does enterprise search. We do organizational memory. Different soul.

This is a fork of Reattend Personal (`~/Desktop/Final Reattend/reattend/`). `ENTERPRISE.md` has the full architecture / pricing / strategy doc.

---

## Where things live

| Thing | Value |
|---|---|
| Local repo (this) | `/Users/partha/Desktop/enterprise` |
| Chrome extension repo | `/Users/partha/Desktop/enterprise_extension` |
| Personal Reattend (parent) | `/Users/partha/Desktop/Final Reattend/reattend` |
| GitHub (app) | https://github.com/Reattend/enterprise |
| GitHub (extension) | (in `enterprise_extension`, check `git remote -v`) |
| Production droplet | `167.99.158.143` (root SSH) |
| Production domain | https://enterprise.reattend.com |
| Public sandbox | https://enterprise.reattend.com/sandbox |
| PM2 process name | `enterprise` |
| Production DB path | `/var/www/enterprise/data/reattend.db` (SQLite) |
| Local DB path | `data/reattend.db` (relative to repo root) |
| Sandbox cleanup cron | `*/10 * * * *` curls `localhost:3000/api/sandbox/cleanup` |

**Standard deploy** (after `git push`):
```bash
ssh root@167.99.158.143 "cd /var/www/enterprise && git pull && pm2 stop enterprise && rm -rf .next && NODE_OPTIONS='--max-old-space-size=3072' npm run build && pm2 start enterprise --update-env"
```
Always include `npx tsx src/lib/db/migrate.ts` if schema changed (after the
build, before `pm2 start`).

**Why this exact sequence — every word matters. Earned the hard way 2026-05-02:**

- **`pm2 stop` BEFORE `rm -rf .next`** — frees ~1.6 GB RAM held by the running
  Node process. Without this, the build OOM-kills midway on the 3.8 GB
  droplet, leaving `.next/` partially populated → `MODULE_NOT_FOUND` for
  random routes in production → nginx 502s.
- **`rm -rf .next`** — clears stale page chunks. Skipping this can leave
  client-manifest references pointing at hashed files that no longer exist
  → `Cannot read properties of undefined (reading 'clientModules')` on
  every dynamic page render.
- **`NODE_OPTIONS='--max-old-space-size=3072'`** — gives the Next.js build
  a 3 GB heap budget. Combined with the 4 GB swap (added 2026-05-02 — see
  Infra section), the build never OOMs even on the small droplet.
- **`pm2 start` (not `restart` or `reload`)** — `reload` is graceful and
  keeps the old Node process alive, which has cached the pre-rebuild paths
  → 502s. `restart` kills + respawns but during the rebuild window the OLD
  process still serves on port 3000 with `.next/` already wiped. Stopping
  first means brief downtime (the build window) instead of chaos.
- **`--update-env`** — re-reads `.env.local` so any env var change
  (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Paddle keys, etc.) actually takes
  effect on the new process.

**Critical infra (set 2026-05-02, don't undo):**
- **4 GB swap** at `/swapfile` (in `/etc/fstab`) — required for the build.
  Verify with `swapon --show`.
- **nginx `proxy_buffer_size 16k; proxy_buffers 8 16k; proxy_busy_buffers_size 32k;`**
  in `/etc/nginx/sites-enabled/enterprise` — Next.js response headers (with
  the JWT session cookie + Vary + RSC + Strict-Transport) routinely exceed
  nginx's default 4 KB proxy buffer → `upstream sent too big header` →
  silent 502s on `/api/auth/verify-otp` and similar. Verify with
  `grep proxy_buffer /etc/nginx/sites-enabled/enterprise`.
- **Cookies** for auth use NextAuth's official cookie writer (NOT custom
  Route-Handler `cookies().set()`). Hand-rolled cookies via `next/headers`
  in Route Handlers emit a `Set-Cookie` header that Chrome silently drops
  even though it looks identical in DevTools. The OTP login flow goes
  through `/api/auth/callback/otp` (NextAuth credentials provider) for
  exactly this reason — see `public/landing-design/signin.html`.

---

## Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **DB**: SQLite via better-sqlite3 + Drizzle ORM (Postgres migration is a year-2 problem)
- **Auth**: NextAuth.js v5 (JWT strategy) + a custom `sso-ticket` provider for SSO + sandbox launch
- **UI**: Tailwind + shadcn/ui + Radix + Framer Motion
- **State**: Zustand
- **AI ingestion**: Groq Llama 3.3 70B (SaaS) or on-prem Rabbit v2.1 (year 2)
- **AI answering**: Claude Sonnet (SaaS) or Rabbit (year 2). **Never name vendors in user-facing copy** — say "the AI" / "managed frontier AI" / "the model"
- **AI reranker**: Claude Haiku (also avoid in user copy)
- **Embeddings**: FastEmbed BGE-Base-EN-v1.5 (local, always)
- **Search**: FTS5 full-text + sqlite-vec ANN
- **Jobs**: SQLite-backed `job_queue` with retry/backoff
- **Voice**: Groq Whisper

---

## Source tree (what to look for first)

```
src/
  app/
    (auth)/           # Login, register, OTP
    (app)/app/        # All authenticated routes
      page.tsx        # Home (Start My Day, Meeting Prep, Trending, etc.)
      ask/            # Chat + Oracle
      memories/       # Memory list + detail
      decisions/      # Decision log + Blast Radius
      landscape/      # Memory graph + Time Machine
      legend/         # Feature catalog wiki
      admin/[orgId]/  # Org-scoped admin (members, policies, agents, OCR, audit, exit interviews)
      ...
    sandbox/          # Public /sandbox landing
    api/
      ask/            # Chat + Oracle endpoints (sandbox short-circuits at top)
      enterprise/     # Org-scoped APIs (brain-dump, handoff, onboarding-genie, etc.)
      sandbox/        # launch + cleanup
      tray/           # Chrome extension bearer-token endpoints
  lib/
    db/               # Schema, migrations, queries
    ai/               # llm, prompts, reranker
    auth/             # NextAuth config + requireAuth + SSO ticket
    enterprise/       # RBAC (rbac.ts, rbac-records.ts), audit log, org context
    sandbox/          # detect.ts, fixtures.ts (canned AI answers)
    jobs/             # Worker
  components/
    enterprise/       # Org-shaped UI (Start My Day card, Trending, Sandbox banner, etc.)
docs/
  demo-script.md      # 12-min sales runbook
scripts/
  seed-demo-org.ts    # Seeds the demo-mof org (run with `npm run seed:demo`)
```

---

## RBAC model — non-negotiable

The visibility rules are codified in `src/lib/enterprise/rbac-records.ts`. **Every retrieval path filters records through `filterToAccessibleRecords`** — the LLM never receives memories the user can't see. Eight rules, in order:

1. Org `super_admin` / `admin` → always
2. Creator → always (for their own records)
3. `visibility = 'private'` → only creator
4. `visibility = 'team'` → workspace_members OR dept access
5. `visibility = 'department'` → dept access (with ancestor cascade for dept_head/manager)
6. `visibility = 'org'` → any org member
7. Explicit `record_shares` row matches user / dept / role
8. Non-enterprise (no workspace_org_link) → fall back to workspace_members

**Two-tier roles**:
- Org-level: `super_admin`, `admin`, `member`, `guest`
- Dept-level: `dept_head`, `manager`, `member`

Test suite (`npm run test:rbac`) ships with 36 assertions, runs every build.

---

## Sandbox — the public try-it-now door

- URL: https://enterprise.reattend.com/sandbox
- 5 personas, mixed ethnicities, mapped to roles:

  | Role | Persona | Background |
  |------|---------|-----------|
  | super_admin | Aarti Mehta | Indian |
  | admin | Hiroshi Tanaka | Japanese |
  | dept_head | Adaeze Okonkwo | Nigerian |
  | member | Sofia Martinez | Latina |
  | guest | Daniel Schwartz | Jewish/European |

- Visitor clicks → `POST /api/sandbox/launch` → server clones the seeded `demo-mof` org → 60s SSO ticket → browser trades for session cookie → redirect to `/app`
- Sandbox marker: user email ends with `@sandbox.reattend.local`; org slug starts with `sandbox-`
- AI in sandbox: every endpoint detects sandbox session and returns canned fixtures from `src/lib/sandbox/fixtures.ts` — never hits the LLM
- Auto-cleanup: cron drops sandbox-prefixed orgs older than 1h
- Authorship preservation: demo users are cloned as ghost authors with new ids, so records keep "created by Vikram Singh" etc. — sandbox visitor isn't the creator of everything (that would defeat Rule 2)

---

## Sprints — at a glance

**Done**: A, B, C, D1-D3, E, F, G, H, I, J, K, L, M, N, O-a (sandbox + hardening)
**Next**: O proper (UI/UX polish — interactive with user)
**Then**: P (Nango + Slack/Notion/MS Teams), Q (infra hardening), R (billing + pilot signup), then launch.

`sprint.md` has the full roadmap. `today.md` has the running session log.

---

## Ground rules

- You are a senior product developer. Think before building.
- Before starting any session, read `today.md` (current state) and `sprint.md` (roadmap).
- Break work into small, completable chunks.
- After completing a feature, update `today.md` with: what's done, what's half-done, the EXACT next step.
- "Pause and save" → update `today.md` and stop.
- "Resume" → read `today.md` and continue.
- **Never name AI vendors (Claude / Sonnet / Haiku / Anthropic / Groq / Llama) in user-facing copy.** Always "the AI" / "managed frontier AI" / "the model". Internal `//` code comments are fine.
- Demo data is mission-critical. Run `npm run seed:demo -- demo-presenter@reattend.com` before every sales demo.
- Deploy is `git push` → `ssh ... && pull && pm2 stop && rm -rf .next && build && pm2 start --update-env`. **Stop pm2 BEFORE building** so the build doesn't OOM-kill against the running process. Always `start` after a `stop` (not `reload` or `restart`). Full reasoning + the swap/nginx-buffer infra requirements are in the deploy section above.
- Pre-commit hook is `tsc --noEmit`. Don't bypass it.

---

## Key APIs / commands

```bash
# Start dev
npm run dev

# Seed demo org locally
npm run seed:demo -- your-email@reattend.com

# Seed on droplet
ssh root@167.99.158.143 "cd /var/www/enterprise && npx tsx scripts/seed-demo-org.ts demo-presenter@reattend.com"

# Run RBAC tests
npm run test:rbac

# Apply schema migration
npx tsx src/lib/db/migrate.ts

# Tail prod logs
ssh root@167.99.158.143 "pm2 logs enterprise --lines 50 --nostream"

# Quick sandbox smoke test (no auth needed)
curl -X POST https://enterprise.reattend.com/api/sandbox/launch \
  -H "Content-Type: application/json" -d '{"role":"super_admin"}'
```

---

## When something breaks

- **`Cannot find module '*/page.js'`** → stale `.next` cache. Always `rm -rf .next` before rebuild.
- **`SqliteError: FOREIGN KEY constraint failed`** → check insertion order; tables with self-references or current-version pointers need two-phase inserts (insert parent first with null pointer, then child, then patch).
- **`Failed to find Server Action "x"`** → mostly cosmetic; happens after deploy when an old client tab calls a removed action. Self-resolves on tab refresh.
- **Sandbox launch returns 503** → `demo-mof` org isn't seeded. Run `npm run seed:demo`.
- **Voice / OCR returns 503** → `GROQ_API_KEY` or `ANTHROPIC_API_KEY` missing or expired on droplet. Check `pm2 env enterprise`.
- **PM2 reload hangs / SSH disconnects mid-deploy** → use `run_in_background=true` from CLI agents and verify `pm2 describe enterprise | grep status` afterward.

---

## Pages (current — not Personal Reattend's old list)

Public:
- `/` — landing (Get started → /sandbox; Sign up → /register)
- `/sandbox` — public try-it-now with 5 personas
- `/pricing` — Team / Enterprise / Government tiers
- `/compliance` — controls today + certs roadmap
- `/login`, `/register`

Authenticated `/app/*`:
- `/app` — Home (Start My Day, Meeting Prep, Trending, Memory Resurface)
- `/app/ask` — Chat + Oracle (mode toggle)
- `/app/memories`, `/app/memories/:id`
- `/app/decisions`
- `/app/landscape` — graph + Time Machine (mode=temporal)
- `/app/legend` — feature catalog
- `/app/wiki` — org wiki
- `/app/agents` — agent catalog
- `/app/brain-dump`
- `/app/compose/{email-reply,broadcast}`
- `/app/exit-interview/:id` — answer flow
- `/app/anonymous-ask` — HR / compliance
- `/app/admin/:orgId/*` — members, policies, decisions, agents, exit-interviews, handoff, onboarding-genie, ocr, audit, extension, analytics, announcements, health
- `/app/settings` — profile, preferences, API keys, data controls
