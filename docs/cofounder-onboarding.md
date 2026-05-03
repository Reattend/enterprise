# Reattend Enterprise — Cofounder Onboarding

> **Read this end-to-end on day 1.** It's the fastest path to "I know what we're building, what's shipped, what's left, and how to make changes safely." About a 30-minute read. Every claim is followed by the file path that backs it so you can verify and dive in.
>
> When this doc gets stale, fix it in the same PR as the code change. Future-you will thank present-you.

---

## 1. The 5-minute pitch

**What we're building** — Reattend Enterprise is an organizational memory platform. When employees leave, transfer, or retire, their institutional knowledge stays in the org instead of walking out the door. Decisions, exit interviews, handoffs, time-machine point-in-time queries, self-healing contradictions.

**Who buys it** — Two ICPs, one product:

1. **Government / secure orgs** (first client). Paper-heavy. Admin turnover heavy. Air-gapped or on-prem required. Trainer dispatched in person to scan documents. **OCR quality is mission-critical** — get this wrong and you lose the contract.
2. **SaaS / startups up to 200 employees** (second wave). Slack / Notion / MS Teams via Nango.

**The wedge** — Glean does enterprise search ($25/user/mo). We do organizational memory ($19 Pro / $29 Enterprise per seat per month). Different soul. Glean tells you "here are docs that mention X." Reattend tells you "this is what was decided about X, by whom, when, and whether it was ever reversed."

**Where the project came from** — This is a fork of Reattend Personal (`~/Desktop/Final Reattend/reattend/`). The personal product became the engine; we layered org structure, RBAC, decisions, OCR, compliance, sandbox, agents on top.

**Sales narrative** — "Every other knowledge tool says 'we store stuff.' We tell you what's rotting." (See section 7's Weekly Audit feature for the demo line.)

**Strategic docs**:
- `ENTERPRISE.md` — full architecture, pricing, on-prem strategy
- `sprint.md` — roadmap, current sprint state, what's left before launch
- `today.md` — running session journal, what's done, what's half-done, exact next step (read this when you sit down)
- `CLAUDE.md` — steady-state guide for Claude Code (and for anyone using AI in this repo)

---

## 2. Where everything lives

| Thing | Where |
|---|---|
| Local repo | `/Users/partha/Desktop/enterprise` |
| GitHub (app) | https://github.com/Reattend/enterprise |
| Chrome extension repo | `/Users/partha/Desktop/enterprise_extension` |
| Production droplet | DigitalOcean, `167.99.158.143` (root SSH) |
| Production domain | `https://reattend.com` (canonical) — `enterprise.reattend.com` 308-redirects there |
| Public sandbox | `/sandbox` |
| PM2 process name | `enterprise` |
| Production DB | SQLite at `/var/www/enterprise/data/reattend.db` |
| Local DB | `data/reattend.db` (relative to repo root) |
| Self-hosted Nango | `nango.enterprise.reattend.com` (Docker container, port 3003) |
| Nango docker-compose | `/var/www/nango/docker-compose.yml` (on droplet) |
| Backups | Local hourly + DO Spaces + Backblaze B2 — see `docs/backup.md` |

**Local dev**:
```bash
npm install
npm run dev                              # http://localhost:3000
npx tsx src/lib/db/migrate.ts            # apply schema migrations
npm run seed:demo -- you@reattend.com    # seed the demo-mof org for sales
npm run test:rbac                        # 66 RBAC + permission matrix tests
```

---

## 3. The product surface (what users see)

### Public

- `/` — landing page (Stripe-ish design, "warm dawn" aesthetic)
- `/sandbox` — public try-it-now with 5 role personas (Aarti, Hiroshi, Adaeze, Sofia, Daniel — mixed ethnicities, mapped to super_admin/admin/dept_head/member/guest)
- `/pricing` — Free / Professional ($19) / Enterprise ($29, 5-seat min) / Government (sales-led)
- `/compliance` — controls today + cert roadmap (StateRAMP, CJIS, SOC 2)
- `/login`, `/register` — auth flows (NextAuth credentials provider)

### Authenticated `/app/*`

- `/app` — Home: "Start My Day," Meeting Prep, Trending, Memory Resurface
- `/app/ask` — Chat + Oracle (mode toggle in same UI)
- `/app/memories`, `/app/memories/:id` — memory list + detail
- `/app/decisions` — decision log + Blast Radius (what depends on this decision)
- `/app/landscape` — memory graph + Time Machine (point-in-time scrubbing)
- `/app/legend` — feature catalog wiki (every feature documented inside the app)
- `/app/wiki` — org wiki
- `/app/agents` — agent catalog (10 default agents seeded per org)
- `/app/brain-dump` — voice or text dump → AI parses into structured memories
- `/app/compose/{email-reply,broadcast}` — Compose draft generators
- `/app/exit-interview/:id` — answering flow for the offboarded user
- `/app/anonymous-ask` — HR / compliance anonymous channel
- `/app/admin/[orgId]/*` — admin console: members, roles, departments, decisions, policies, agents, audit, OCR, exit-interviews, transfers, taxonomy, SSO, extension policy, analytics, announcements, health, settings
- `/app/settings` — profile, preferences, API keys, data controls (GDPR self-export + erasure)

### Admin (super-admin global, separate from per-org admin)

- `/admin/login` — OTP-only login for `pb@reattend.ai` (and any other super_admins added)
- `/admin/dashboard` — global view: stats, users, billing tier breakdown, feedback, integration requests, manual grant Pro/Enterprise, extend trials

This is **separate** from `/app/admin/[orgId]/*` (per-org admin). Two different RBAC layers.

---

## 4. Tech stack — what we use and why

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | RSC + route handlers in one repo; what the rest of the JS world is converging on |
| DB | SQLite + better-sqlite3 + Drizzle ORM | Single file, no separate DB server, fast for our scale (~10k records per org). Postgres migration is a year-2 problem. |
| Vector search | sqlite-vec (768-dim cosine, BGE-base-en-v1.5) | Same SQLite file as everything else; no Pinecone/Weaviate dependency |
| Full-text | FTS5 (Porter stemmer + unicode61) | Built into SQLite; faster than `LIKE '%x%'` at scale |
| Auth | NextAuth v5 (JWT strategy, 30-day) | Credentials provider for OTP, Google OAuth, plus our custom `sso-ticket` provider |
| AI ingestion | Groq Llama 3.3 70B (SaaS) | Cheap + fast for triage/extraction. On-prem Rabbit v2.1 in year 2. |
| AI answering | Claude Sonnet (SaaS) | Best at long-context reasoning. **Never name vendors in user-facing copy** — say "the AI" / "managed frontier AI" / "the model". |
| Reranker | Claude Haiku | Speed + cost vs Sonnet for rank ordering |
| Embeddings | FastEmbed BGE-base-en-v1.5 (local) | No API roundtrip, predictable latency |
| Voice | Groq Whisper | Same Groq client we already have |
| OCR | Tesseract.js + pdf-parse + AI redaction | Government client requires on-device-capable OCR; PII redaction layer on top |
| Jobs | SQLite-backed `job_queue` table | In-process worker (`src/lib/jobs/worker.ts`); no Redis. Trade-off: single-process. |
| State | Zustand | Smaller + simpler than Redux/MobX for our needs |
| UI | Tailwind + shadcn/ui + Radix + Framer Motion | Standard SaaS stack |
| Email | Resend | Transactional (welcome, OTP, invites, trial reminders). Branded templates in `src/lib/email.ts` via `renderEmail` shell. |
| Billing | Paddle (Node SDK + paddle-js) | EU-friendly merchant of record; overlay checkout; webhooks for subscription lifecycle |
| Integrations | Self-hosted Nango (Docker) | OAuth proxy for Slack/Notion/Gmail/etc. **Never name Nango in user-facing copy** — it's our infra, like Postgres. |

**Things we don't use that you'd expect**:
- No Redis (job queue is SQLite-backed)
- No Postgres (year 2)
- No vector DB other than sqlite-vec
- No Kubernetes (single droplet, pm2)
- No microservices (monolith on purpose; ship speed > architecture purity)

---

## 5. Source tree (what to look at first)

```
src/
  app/
    (auth)/              login, register, OTP
    (app)/app/           every authenticated route — see section 3
      admin/[orgId]/     org-scoped admin console
    sandbox/             public try-it-now landing
    api/
      ask/               Chat + Oracle endpoints (sandbox short-circuits at top)
      enterprise/        org-scoped APIs (122 handlers; see audit script + section 6)
      sandbox/           sandbox launch + cleanup
      tray/              Chrome extension bearer-token endpoints
      cron/              cron-callable endpoints (sandbox cleanup, nango-sync, trial-maintenance)
      paddle/            webhook handlers
  lib/
    db/                  schema.ts (81 tables), migrate.ts (idempotent), index.ts (sqlite + vec + FTS init)
    ai/                  llm clients, prompts, reranker
    auth/                NextAuth config + requireAuth + SSO ticket provider
    enterprise/
      permissions.ts     ★ THE PERMISSION MATRIX. Source of truth for "what can a role do."
      rbac.ts            legacy role helpers (being slowly replaced by permissions.ts)
      rbac-records.ts    ★ 8-rule record visibility (see docs/permissions.md and section 6)
      api.ts             requireOrgAuth, isAuthResponse, auditFromAuth, handleEnterpriseError
      use-permission.ts  ★ React hook + cache for client-side permission checks
      audit.ts           hash-chained WORM audit log
      audit-export.ts    GDPR-style export bundles (sha256-verified)
    enterprise/auto-team.ts, default-agents.ts, brain-dump.ts, etc — per-feature helpers
    integrations/        Nango client + per-provider normalizers (slack, notion, github, linear, gmail, calendar, drive)
    sandbox/             detect.ts (is this a sandbox session?), fixtures.ts (canned AI answers)
    jobs/                worker.ts (in-process setInterval; runs trial maintenance, ingestion, etc)
    admin/auth.ts        super-admin JWT + OTP (separate cookie from user auth)
  components/
    enterprise/          org-shaped UI (Start My Day card, Trending, Sandbox banner, etc)
    ui/                  shadcn primitives
    landing/             marketing page components
docs/
  permissions.md         RBAC matrix, the team-onboarding doc for the role/permission system
  backup.md              3-layer backup architecture
  demo-script.md         12-min sales runbook
  cofounder-onboarding.md  this file
  DEPLOY.md, SMOKE_TEST.md, ROADMAP.md, progress.md
scripts/
  test-rbac.ts           ★ 66 assertions; runs before every prod build. If this fails, ship is blocked.
  test-policies.ts, test-agents.ts, test-transfer.ts, test-audit.ts, test-briefing.ts, test-nango-normalizers.ts
  seed-demo-org.ts       seeds the demo-mof org for sales (run before every demo)
  droplet-setup.sh       one-shot bootstrap for a fresh droplet
```

---

## 6. The architectural decisions that matter (read these before changing anything in their area)

### 6.1 RBAC — the non-negotiable

Two parallel role systems compose:

- **Org-level**: `super_admin`, `admin`, `member`, `guest`
- **Department-level**: `dept_head`, `manager`, `member`, `viewer`

Org `super_admin` / `admin` automatically pass any dept-scoped check inside their org (don't need to be explicitly added to every dept).

**Two distinct permission systems live in `src/lib/enterprise/`**:

1. **Record visibility** — `rbac-records.ts`. 8-rule hierarchy that decides who can READ which records. The LLM never receives memories the user can't see (`filterToAccessibleRecords` is called on every retrieval path). 36 tests pin every rule.
2. **Management actions** — `permissions.ts`. The matrix of "who can do what" — invite members, edit policies, manage decisions, change visibility, verify records, manage agents, etc. Role-default + per-user override (Slack/Notion/Linear shape). 28 tests pin every cell of the matrix; 2 more for override grant/revoke.

**The matrix is the source of truth.** It's documented in `docs/permissions.md` (human-readable, the team onboarding doc) and mirrored in `src/lib/enterprise/permissions.ts` (typed const). If they ever drift, the test suite fails the build.

**Per-user overrides** — admins can grant or revoke individual permissions per user without inventing a new role. Classic case: "Our COO needs to see the audit log but isn't an admin." Grant her `org.audit.read` from `/app/admin/[orgId]/members/[userId]/permissions`. UI + endpoints live there. Backed by `organization_member_permission_overrides` table.

**Client-side** — `use-permission.ts` exposes `usePermission(orgId, perm)` and `usePermissionChecker(orgId)`. UI components hide buttons the user can't action — defense in depth, the API still enforces.

**Server-side** — `requireOrgAuth(req, orgId, perm, scope?)` in `src/lib/enterprise/api.ts`. Every API route uses this. The `scope` arg supports `{ departmentId, recordCreatorUserId }` for own_dept / own_record grants.

### 6.2 Sandbox — the public try-it-now door

URL: `/sandbox`. Visitor clicks → `POST /api/sandbox/launch` → server clones the seeded `demo-mof` org → mints a 60-second SSO ticket → browser trades for a session cookie → redirect to `/app`.

- 5 personas mapped to roles (super_admin, admin, dept_head, member, guest)
- Sandbox marker: user email ends with `@sandbox.reattend.local`; org slug starts with `sandbox-`
- **AI in sandbox = canned fixtures.** Every endpoint detects sandbox sessions and returns scripted responses from `src/lib/sandbox/fixtures.ts`. We never burn LLM tokens on sandbox traffic.
- Auto-cleanup: hourly cron drops sandbox-prefixed orgs older than 1h
- **Authorship preservation**: demo users are cloned as ghost authors with new IDs, so records keep "created by Vikram Singh" etc. The visitor isn't the creator of everything (that would defeat record-visibility Rule 2 = "creator always passes").

### 6.3 Auth flows

Three distinct flows live in `src/lib/auth/index.ts`:

1. **OTP** (CredentialsProvider id `otp`) — primary login. Emails a 6-digit code via Resend. Stored in `otp_codes` table.
2. **Google OAuth** (GoogleProvider) — alternative login. `findOrCreateUser` provisions a user + personal workspace + default project + free subscription on first sign-in.
3. **SSO ticket** (CredentialsProvider id `sso-ticket`) — one-shot 60-second JWT issued by `/api/sso/callback` after IdP id_token verification. Used by SSO and by sandbox launch.

`requireAuth()` (server) and the NextAuth session cookie (client) gate access. `findOrCreateUser` is the single-source-of-truth for new-user provisioning — called from OTP, Google, AND TESTING_MODE bypass.

**TESTING_MODE** — a single env var (`TESTING_MODE=true` in `.env.local`) makes `/login` accept any email with no OTP and auto-provisions invitees on the create-member endpoint. Currently ON in prod for our test week (until ~2026-05-10). Loud 74-char banner prints on every db boot. See `docs/permissions.md` and the memory file `project_testing_mode_phase.md` for the 3-stage exit plan: test → fix → wipe + flip.

### 6.4 The 8 record visibility rules (`rbac-records.ts`)

In strict order — first match wins:

1. Org `super_admin` / `admin` → always
2. Creator → always (their own records)
3. `visibility = 'private'` → only creator
4. `visibility = 'team'` → workspace_members OR dept access
5. `visibility = 'department'` → dept access (with ancestor cascade for dept_head/manager)
6. `visibility = 'org'` → any org member
7. Explicit `record_shares` row matches user / dept / role
8. Non-enterprise (no workspace_org_link) → fall back to workspace_members

**Every retrieval path filters records through `filterToAccessibleRecords`** — there is no other way the LLM sees memory. Test suite (`npm run test:rbac`) ships 36 assertions that pin every rule.

### 6.5 Audit log — hash-chained WORM

`audit_log` table. Every write action calls `auditFromAuth(...)` or `writeAuditAsync(...)`. Each row has a `prev_hash` and a `hash = sha256(prev_hash + payload)`. Tampering breaks the chain. `verifyAuditChain(orgId)` walks the chain and reports the first break.

GDPR-style export bundle: `audit-export.ts` produces a signed bundle the customer can hand to a regulator; signature verification is in the same file (`verifyAuditExport`).

Used by: members admin (every grant/revoke), decisions, policies, transfers, OCR jobs, exit interviews, permission overrides.

### 6.6 Sandbox vs prod data isolation

Sandbox orgs have slug prefix `sandbox-`. Sandbox users have email suffix `@sandbox.reattend.local`. Every cleanup query, every analytics aggregation, every billing lookup excludes sandbox-prefixed orgs. The cleanup cron deletes them every hour after they're 1h old.

If you need to test something against prod-shaped data without wiping it, use the seeded `demo-mof` org instead — that's the persistent demo org, not a sandbox.

### 6.7 Billing (Paddle)

3 tiers backed by `subscriptions.tier`: `free`, `professional`, `enterprise` (5-seat minimum). 45-day no-card trial. 20% annual discount.

Paddle is configured for EU MoR (merchant of record). Webhook handler at `/api/paddle/webhook` updates `subscriptions.status`, `tier`, `seat_count`, `current_period_end`, `paddle_subscription_id`, `paddle_customer_id`. Manual override for super_admin via `/api/admin/grant-pro` and `/api/admin/extend-trial` (used from the admin dashboard).

Trial-end cadence emails: 15-day, 7-day, 1-day, post-downgrade. Worker (`src/lib/jobs/worker.ts`) runs hourly, scans `subscriptions` for trials nearing expiry, sends through Resend with the new `renderEmail` shell.

### 6.8 Job queue

`job_queue` table + `src/lib/jobs/worker.ts`. The worker runs in-process via `setInterval`, picks up pending jobs, processes with retry/backoff, marks done/failed. Single-process trade-off: simple, no Redis, no separate deployment. Will need to revisit when we're at 10k+ concurrent users.

Jobs include: ingestion (raw_item → record), embedding generation, OCR processing, agent runs, trial reminder dispatch, nango-sync.

### 6.9 OCR (the gov-track hero)

`src/app/api/enterprise/ocr/*`. Tesseract.js client + pdf-parse + an AI redaction pass (LLM-driven PII detection: names, emails, IDs, addresses). Batch upload, quality dashboard, per-page confidence scores. Designed for paper-heavy government workflows where a trainer goes on-site and scans documents into the system.

### 6.10 Decisions, Transfers, Exit Interviews

These three are the spine of every demo:

- **Decisions** — `/app/decisions`. Every decision logged with title, context, rationale, decider, dept. Reverse/supersede flows preserve audit trail. **Blast Radius** dialog shows what depends on a decision.
- **Transfers** — `/app/admin/[orgId]/transfers`. When someone leaves or changes roles, knowledge is transferred to a successor or a role (not just a person). Records the transfer event in audit + reassigns ownership.
- **Exit Interviews** — `/app/exit-interview/:id`. Auto-triggered on offboard. AI-driven Q&A flow, captures decisions/relationships/concerns. Becomes searchable institutional memory.

### 6.11 Agents

`src/lib/enterprise/default-agents.ts` seeds 10 default agents per org (Pulse Check, Onboarding Genie, Brain Dump, Action Items Extractor, etc). Each agent is a row in `agents` table with system prompt + scope config + deployment targets. Run via `/api/enterprise/agents/[id]/run` or via API key (minted per-agent for external callers).

Org admins can edit prompts, archive defaults, mint API keys.

### 6.12 Chrome extension

Lives in `/Users/partha/Desktop/enterprise_extension`. Bearer-token API at `/api/tray/*` on the main app. Captures context from any whitelisted work app (configured per-org via `extension_policy`). Includes: ambient corner card, one-click pin, opt-in auto-ingest.

---

## 7. How we built the things you'll be asked about

### 7.1 The permission matrix (Model C: role-default + per-user override)

We surfaced the permission system because the user audit found `requireOrgAuth(req, orgId, 'org.read')` on routes that mutated decisions — meaning any member could create/edit/reverse decisions. The fix wasn't just "tighten that one route" — it was "make the matrix the single source of truth and write tests that pin every cell."

The model (Slack / Notion / Linear shape):
- Roles ship with sensible defaults (the matrix in `docs/permissions.md`)
- Per-user overrides let admins grant/revoke individual perms without inventing new roles
- Server enforces; UI hides via `usePermission` (defense in depth)
- 28 matrix tests + 2 override tests run before every prod build

Read `docs/permissions.md` first if you're touching anything in this area. Memory file: `project_rbac_model_decision.md`.

### 7.2 The deploy sequence (every word matters)

```bash
ssh root@167.99.158.143 "cd /var/www/enterprise && \
  git pull && \
  npx tsx src/lib/db/migrate.ts && \    # only if schema changed
  pm2 stop enterprise && \              # before rm .next — frees ~1.6GB heap
  rm -rf .next && \                     # clear stale chunks (avoids clientModules error)
  NODE_OPTIONS='--max-old-space-size=3072' npm run build && \
  pm2 start enterprise --update-env"    # NOT restart/reload — those keep stale process alive
```

Why every flag: the droplet is small (3.8 GB RAM). Leaving pm2 running while you build OOM-kills the build. Skipping `rm -rf .next` leaves stale page chunks that throw `Cannot read properties of undefined (reading 'clientModules')` on every dynamic page render. `pm2 reload` is graceful and keeps the OLD process alive serving the old build → 502s. The 3 GB heap budget + 4 GB swap (added 2026-05-02) prevents OOM during build. `--update-env` re-reads `.env.local`.

**Critical infra (don't undo)**:
- 4 GB swap at `/swapfile` (in `/etc/fstab`)
- nginx `proxy_buffer_size 16k; proxy_buffers 8 16k; proxy_busy_buffers_size 32k;` in `/etc/nginx/sites-enabled/enterprise` — Next.js response headers exceed nginx's 4k default → silent 502s on `/api/auth/callback/otp`

### 7.3 The login flow (NextAuth officalized)

The login page is a static HTML file at `public/landing-design/signin.html`. It posts to `/api/auth/callback/otp` which goes through NextAuth's official credentials handler. We previously hand-rolled cookies via `next/headers` — Chrome silently dropped them even though they looked identical in DevTools. NextAuth's cookie writer is the only one that survives.

### 7.4 Backups (3 layers)

| Layer | Survives | Where | Retention |
|---|---|---|---|
| Local hourly | bad migration, accidental DELETE | droplet `data/backups/` | 24 hourly + 7 daily |
| DigitalOcean Spaces | droplet death, region outage | bucket `reattend-backups` | last 30 daily |
| Backblaze B2 | DO account compromise / suspension | bucket `reattend-backups` | last 30 daily |

Two providers because if your DO account is compromised, the Spaces bucket goes with it. Backblaze is the out-of-account safety net. Full restore procedure in `docs/backup.md`.

### 7.5 Sandbox (how a stranger gets a working demo in 0.6s)

Pre-seeded `demo-mof` org (run `npm run seed:demo` to refresh). On launch:

1. Server clones the entire org tree (members, depts, records, decisions, policies, agents) to a new `sandbox-<id>` org with new UUIDs
2. Original demo user IDs become "ghost authors" — records keep `createdBy: vikram-singh-id` so the AI can say "Vikram decided this in March"
3. Visitor gets a fresh user account with `@sandbox.reattend.local` email and is added to the cloned org with the requested role
4. SSO ticket issued, browser trades for session cookie, redirects to `/app`
5. AI calls in this session detect sandbox via email suffix → return canned fixtures from `src/lib/sandbox/fixtures.ts` (zero LLM cost)
6. Hourly cron deletes the sandbox org after 1h

This is the magic moment for sales. **Don't break the sandbox.** Run `curl -X POST https://reattend.com/api/sandbox/launch -H 'Content-Type: application/json' -d '{"role":"super_admin"}'` to smoke-test before any demo.

### 7.6 Email (the design system)

`src/lib/email.ts` exports `renderEmail({ heading, bodyHtml, ctaLabel, ctaUrl, signOff })` — every transactional email goes through this shell. Cream + violet, Instrument Serif heading, Inter body, Reattend logo. Branded across welcome, OTP, enterprise invite, trial reminders (15/7/1 days), trial-ended, trial-granted-by-admin.

**Never hand-roll an email template.** Add a helper to `email.ts` that uses `renderEmail`.

### 7.7 The 7 critical secrets (.env.local on droplet)

```
NEXTAUTH_SECRET=...                  # JWT signing
NEXTAUTH_URL=https://reattend.com
GOOGLE_CLIENT_ID=...                 # Google OAuth
GOOGLE_CLIENT_SECRET=...
ANTHROPIC_API_KEY=...                # Claude (answering + reranking)
GROQ_API_KEY=...                     # Llama (ingestion) + Whisper (voice)
RESEND_API_KEY=...                   # all transactional email
PADDLE_API_KEY=...                   # billing
PADDLE_NOTIFICATION_KEY=...          # webhook signature verification
NANGO_SECRET_KEY=...                 # talks to localhost:3003 nango
NANGO_HOST=https://nango.enterprise.reattend.com
TESTING_MODE=true                    # OPT-IN; remove before launch
```

There's also `pm2 ecosystem.config.js` that sets some env vars at the process level. Check there too if a var seems to be missing.

---

## 8. The ground rules (how we work)

- **Senior-product-developer mindset.** Think before building.
- **Read `today.md` first** every session. Read `sprint.md` for roadmap. Read `CLAUDE.md` for the steady-state guide.
- **Break work into small completable chunks.** After completing a feature, update `today.md` with: what's done, what's half-done, the EXACT next step.
- **"Pause and save"** → update `today.md` and stop. **"Resume"** → read `today.md` and continue.
- **Never name AI vendors in user-facing copy.** Always "the AI" / "managed frontier AI" / "the model". Internal code comments are fine.
- **Demo data is mission-critical.** Run `npm run seed:demo -- demo-presenter@reattend.com` before every sales demo.
- **Pre-commit hook is `tsc --noEmit`.** Don't bypass it.
- **Tests must pass before deploy.** `npm run test:rbac` runs on prod before every rebuild — if it fails, the deploy aborts.
- **Three-line commit style** — first line ≤ 72 chars, then a blank line, then body. Co-author trailer with Claude.
- **`docs/` is law.** If you change behavior documented there, fix the doc in the same PR.

---

## 9. What's done vs what's left

### Shipped (live at reattend.com)
- All foundations + RBAC matrix + sandbox + sprints A through O-a
- See `sprint.md` for the per-sprint breakdown (A-O each had specific feature scopes)
- 66 RBAC tests, audit chain verification, GDPR export, hash-chained WORM audit
- 3-tier billing with Paddle, trial cadence emails, admin grant flows
- Per-user permission overrides (CRUD + admin UI)
- Public sandbox with 5 personas
- Chrome extension + bearer-token API
- 10 default agents per org

### Currently in test phase
- TESTING_MODE is ON in prod (week of 2026-05-03 → ~05-10) so internal team + invited testers can poke around without OTP friction
- Bug list is tracked in chat with Claude as the user finds them
- 3-stage exit plan in memory file `project_testing_mode_phase.md`: test → fix → wipe + flip

### Pending pre-launch sprints (from sprint.md)
- **Sprint O proper** — UI/UX polish (interactive with Partha)
- **Sprint P** — Nango integrations (Slack, Notion, MS Teams) for the SaaS ICP
- **Sprint Q** — infra hardening (Postgres migration deferred; rate limiting, monitoring, alerts)
- **Sprint R** — billing UI + pilot signup flow
- Then launch

### Big features in the pipeline (post-launch ideas inspired by Karpathy's wiki note)
- **Hot Cache layer** — per-user / per-org / per-dept 500-token "active state" cache prepended to every Ask. Cuts query tokens by 60-90%, makes answers feel "alive."
- **Weekly Audit + Level Up** — Friday cron generates a Monday-morning report for each org: "12 decisions logged with no rationale; HR's onboarding doc hasn't been opened in 90 days; only 3 of 47 people contributed memories this month." This is the killer sales narrative.
- **`[[Concept]]` backlinks** in the memory editor (Roam/Obsidian-style)
- **AI Coach panel** on every memory (proactive suggestions, not reactive)
- **7-Domain Coverage Map** on the org dashboard (Revenue/Customer/Calendar/Comms/Tasks/Meetings/Knowledge — green/gray tiles based on integration coverage)
- **Scheduled Agents** — agents you already have, but with cron schedules + Slack/email delivery

---

## 10. Day-1 productivity checklist

Before you push anything:

1. Clone the repo, `npm install`, `npm run dev` — verify localhost:3000 loads
2. Run `npx tsx src/lib/db/migrate.ts` to create the local DB
3. `npm run seed:demo -- your.email@reattend.com` to seed demo-mof locally
4. `npm run test:rbac` — 66 assertions should pass
5. Read `today.md` cover-to-cover
6. Read `docs/permissions.md` cover-to-cover
7. Read `CLAUDE.md` (this is the steady-state guide)
8. Skim `sprint.md` for roadmap context
9. SSH into the droplet, run `pm2 logs enterprise --lines 100 --nostream` — see what live traffic looks like
10. Open `/app/admin/<orgId>/audit` in dev — see what the WORM log captures

Then pick up the topmost task in `today.md` and ship something small in your first day. The bar is "your name shows up in the git log within 24h."

---

## 11. Where to ask for help

- **Architectural / why-did-we** → check this file first, then `ENTERPRISE.md`, then ping Partha
- **How to deploy / debug prod** → `docs/DEPLOY.md`, `docs/SMOKE_TEST.md`, then this doc's section 7.2
- **Backups / restore drill** → `docs/backup.md`
- **The 12-min sales demo** → `docs/demo-script.md`
- **What's been changing recently** → `today.md` + `git log`
- **AI quirks / Claude Code workflow** → `CLAUDE.md`

Welcome aboard.
