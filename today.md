# Reattend Enterprise — Session Handoff

**Last updated:** 2026-08-21 (see §0 for the 2026-04-28 → 2026-06-06 catch-up — this doc went stale for 5 weeks while a LOT shipped)
**Branch:** `main` — pushed
**Live at:** https://reattend.com · public sandbox at https://reattend.com/sandbox — **domain changed, see §0**
**Sprints shipped:** A, B, C, D1-D3, E, F, G, H, I, J, K, L, M, N, O-a, O-b, O proper (via design relaunch), P (Nango, proxy-fetcher pattern, 7 connectors), Q (partial — WAL + backup plan done, Sentry/status-page/HA still open), R (billing — Paddle, live)
**Sprints remaining before launch:** see §0.6 — mostly infra hardening + Nango OAuth app registration verification

---

## 0. Catch-up: 2026-04-28 → 2026-06-06 (this doc wasn't updated for 5 weeks)

`today.md` stopped being updated after the Sprint P entry below (§11), but 139 commits landed
in that window. Reconstructed from `git log` — read the commits directly for line-level detail,
this is the shape of it.

### 0.1 The big one: rebrand + Personal/Org unification (~May 2-8)

- **Domain: `enterprise.reattend.com` → `reattend.com`** (commit `f1f3692`, 2026-05-02). The
  canonical URL is now bare `reattend.com`. `package.json` name is now `"reattend"` and
  `ecosystem.config.js` declares process name `reattend` — but **this was never applied to the
  live droplet**, confirmed by direct SSH audit on 2026-08-23 (§0.9): prod is still PM2 process
  `enterprise` at `/var/www/enterprise`. CLAUDE.md's deploy section was right all along — trust
  it over the repo's `ecosystem.config.js` naming until someone actually does the prod rename.
- **"Enterprise" branding dropped from marketing** (`cddeea8`, 2026-05-05), along with all
  Rabbit-LLM claims in user-facing copy. This product is no longer positioned as a separate
  "Reattend Enterprise" brand — it's unified under plain "Reattend."
- **Personal and Org modes merged into one product.** This is almost certainly why the old
  `Final Reattend/reattend` (Personal Reattend) folder is gone now — it's not a separate parent
  project anymore, it's this repo. Landed as a sequence:
  - `/personal` marketing surface for solo users; Free tier reframed as "Solo" (`89ce757`, `2476c17`)
  - `/app` renders `PersonalHomePage` for zero-org users (`987c95d`)
  - Visible **Personal/Org context switcher** in the topbar, server-persisted (`ac38fe8`, `be9df37`)
  - Strict scoping between org and personal data across records/graph/timeline endpoints (`3391240`)
  - Account-linking: backend (Wave 3a, `3eee0d9`) + topbar/Settings UI (Wave 3b, `b39aab7`) —
    link multiple accounts under one identity, switch between them
  - Landscape, Rewind (Time Machine), Agents all patched to work for no-org (solo) users
  - Chrome extension gated to Professional+ subscribers only (`5a97363`)

### 0.2 Billing shipped — Sprint R is essentially done (2026-05-02)

- **Paddle** backend: schema, tier model, webhook, checkout, portal (`0b562bb`)
- Pricing page, billing UI, trial banner, AI quota gate, downgrade cron (`873b270`)
- Admin dashboard: tier-aware comp + grant flows (`f9a4149`)
- Email reskin (Instrument Serif + cream) + trial-end cadence emails (`926713a`)
- Not yet verified: whether Paddle is in live/production mode or still sandbox keys — check
  before treating billing as launch-ready.

### 0.3 RBAC finalized — Model C (2026-05-03)

- Matrix-based RBAC replacing ad hoc rules, **`docs/permissions.md`** is now the single source
  of truth (per-role defaults + per-user overrides) — confirmed live in the repo.
- Closed 5 read-perm-on-write leaks, fixed a graph-endpoint leak, added `usePermission` hook,
  matrix has its own test coverage (`b27f0ba`, `6984c6b`, `756f3a5`, `d1c38c0`)
- This matches the RBAC section in CLAUDE.md (8-rule `filterToAccessibleRecords`) — that part
  is still accurate, the matrix sits on top of it for role/permission grants, not record visibility.

### 0.4 Full design relaunch — Sprint O proper, effectively done (2026-04-28 → 05-03)

Every public page and most of `/app` went through a `claude.ai/design` handoff pass:
Landing (went through several iterations — Stripe-style, black-and-white, then a Stripe-inspired
cream-violet v3), Product, Pricing, Compliance, Sign-in (Stripe split-screen, OTP-only),
Dashboard chrome, Home, Capture v3, Memories v3, Landscape v3, Wiki v3, Sandbox/Support/
Integrations. Plus: mobile UX pass (real hamburger + drawer + hydration fixes), sidebar/topbar
polish, warm-cream + indigo-violet theme propagated app-wide.

Not verified: Lighthouse scores, full accessibility pass (keyboard nav / screen reader / AA
contrast) — the design work shipped but a dedicated audit pass per the original Sprint O
checklist doesn't show up in commit history. Treat that checklist as still open until checked.

Also in this window: a compliance honesty pass — dropped fabricated claims (Merkle tree, SIEM,
WebAuthn, BYOK, subprocessors list) that had crept into `/compliance` copy ahead of anything
actually being built (`24cb211`, `0f8f415`, `3599015`). SEO/AEO pass locking in "organizational
memory" as the wedge phrase, JSON-LD + GA4 (`795b43b`, `849ec4b`, `68df4e7`).

### 0.5 Nango integrations — proxy-fetcher pattern, 7 connectors (2026-04-28 → 04-29)

Nango's default sync scripts turned out to be unreliable, so the integration layer pivoted to
calling `nango.proxy()` directly per-provider instead of relying on Nango-hosted syncs:

- Proxy fetchers shipped for: **Slack** (channels + last 30d, ~2k msg ceiling), **Notion**
  (search → blocks → markdown), **GitHub** (PRs + issues), **Linear** (GraphQL, recent issues),
  **Google Drive** (mime-aware extraction), **Confluence + Jira** (shared Atlassian OAuth), plus
  **Google Calendar** (Meeting Prep ingest source)
- New admin page: **Triage Review** (`/app/integrations` slide-out) — see what the AI decided on
  each incoming item before it becomes a memory
- `/api/cron/nango-sync` — iterates every connected integration on a schedule
- Auth flow switched from `openConnectUI` to a plain `auth()` popup; connection IDs are now
  Nango-generated (we stopped building our own)
- **Still open per the original Sprint P checklist**: OAuth provider apps (Google/Slack/Notion/
  Confluence) registration in the Nango admin — this was the one blocking TODO as of the last
  §11 entry below and I did not find a commit confirming it was completed. Verify in Nango admin
  before assuming connectors work end-to-end for a real customer.

### 0.6 Test/staging environment stood up (2026-05-14)

A second droplet, fully separate from prod:

| | |
|---|---|
| Domain | `test.reattend.com` |
| Purpose | validate enterprise features at scale without touching prod data/payments/auth |
| Seed | synthetic 163-user, 41-department Indian SaaS org (`seed-acme-india`), up to 3 levels deep |
| Auth | env-gated password mode (`/test-login`), shared password, bypasses OTP |
| Full details | **`STAGING.md`** at repo root — read that before touching the test droplet |

### 0.7 Infra hardening (Sprint Q) — partial

- ✅ WAL mode already on (`journal_mode = WAL` in `src/lib/db/index.ts` + `migrate.ts`)
- ✅ `docs/backup.md` — 3-layer plan (local + DO Spaces + Backblaze B2), written 2026-05-03
- ❌ Sentry — not wired (`@sentry` not in `package.json`)
- ❌ Status page — no route found under `src/app`
- ❌ HA / second-droplet failover plan — `test.reattend.com` exists but is explicitly a staging
  environment, not an HA target
- Cron jobs (sandbox cleanup, Nango sync) — wired but not re-verified running since this window

### 0.8 Most recent: Landscape Space mode (2026-06-06, commit `23d7e08`)

Big gap between 05-14 and 06-06 — this was the only thing that shipped after the staging push.
`/app/landscape` got a new default view: a 3D memory constellation via three.js +
react-force-graph-3d. Glowing nodes color-coded by record type, size scales with graph degree,
bloom/halo shader, 1,200-point decorative starfield, slow auto-orbit, PNG capture button, edge
color encodes link kind (contradicts/supersedes/caused_by/mentions). Three modes now live at
`/app/landscape`: **Space** (new default) → **Rewind** (old Time Machine) → **Board** (old React
Flow editor). Legacy `?mode=temporal` / `?mode=causal` query params still resolve correctly.
Bundle is dynamically imported client-side, code-split per route.

No open thread noted for this — it reads as a complete, shipped feature.

---

## 1. Where it runs

**Verified directly on the droplet 2026-08-23 — the repo-level rename (`package.json`,
`ecosystem.config.js` → `reattend`) never actually got applied to prod. Live reality below is
what to trust, not the config file's declared name.**

| Thing | Value |
|---|---|
| Local repo | `/Users/partha/Desktop/enterprise` |
| Extension repo | `/Users/partha/Desktop/enterprise_extension` |
| GitHub (app) | `github.com/Reattend/enterprise` |
| Droplet | `167.99.158.143` |
| PM2 process | **still `enterprise`** (confirmed via `pm2 list` — `ecosystem.config.js` says `reattend` but that was never applied live; don't trust the config file here) |
| Deploy path on droplet | **still `/var/www/enterprise`** (confirmed via `ls /var/www/` — no `/var/www/reattend` exists) |
| nginx config file | also still named `enterprise` (`/etc/nginx/sites-enabled/enterprise`) |
| Domain | `https://reattend.com` (canonical since 2026-05-02, §0.1). `enterprise.reattend.com` still resolves and correctly 308s to it — fine, working as intended. |
| DB | SQLite via better-sqlite3 + Drizzle |
| Migrations | `npx tsx src/lib/db/migrate.ts` (custom, additive) |
| LLMs | Claude Sonnet for all 8 ask endpoints (Haiku-tiering was tried 2026-05-05 for cost, reverted same day) · Groq Whisper |
| Nango | proxy-fetcher pattern now, not Nango-hosted syncs — see §0.5. Confirmed live: `nango.enterprise.reattend.com` → 200, `nango-server` + `nango-db` docker containers both up on the **same prod droplet** (not a separate box). Cron `*/30 * * * *` hits `/api/cron/nango-sync`. |
| Backups | **Confirmed live**, not just documented — `/usr/local/bin/reattend-backup.sh` runs hourly via cron → `/var/log/reattend-backup.log`. Sprint Q's backup item (§0.7) is more done than previously noted. |
| Test/staging | `test.reattend.com` — **droplet destroyed 2026-08-23** (was costing $12/mo, found dead/unused on audit — see §0.9). DNS A record may still be dangling, see §0.9. |
| Rabbit | not deployed (Year 2). Active dev repo is `/Users/partha/Desktop/rabbit`. |

Deploy: `git push` → `ssh root@167.99.158.143 "cd /var/www/enterprise && git pull --ff-only && pm2 stop enterprise && rm -rf .next && NODE_OPTIONS='--max-old-space-size=3072' npm run build && pm2 start enterprise --update-env"`.
Always include `npx tsx src/lib/db/migrate.ts` if schema changed. Full reasoning for the
stop-before-build sequencing is in CLAUDE.md's deploy section — that part is accurate, CLAUDE.md's
paths/names turned out to be right all along (it was my §0.1 correction that was wrong — verified
and fixed here).

### 0.9 Infra audit, 2026-08-23 — dead/dangling things found

- **Test droplet destroyed** (`Test-Reattend`, id `570899941`, `143.198.116.94`) — it was found
  completely dead before deletion: `pm2 list` empty, `curl` → 502, no systemd pm2 startup unit
  so it never came back after an Aug 15 reboot. Only traffic was a bot scanning for exposed
  secrets. $12/mo saved.
- **`test.reattend.com` DNS A record likely still points at `143.198.116.94`** — that IP is
  now free for DigitalOcean to reassign to a different customer. Dangling subdomain-takeover
  risk until the record is deleted. **Open action** — remove it at the DNS registrar/DO panel.
- **`reattend.ai` — fixed 2026-08-23.** Was dangling (no nginx vhost/cert, fell through to the
  `enterprise` vhost with a mismatched cert → browser security warning). Now has its own nginx
  config (`/etc/nginx/sites-enabled/reattend-ai`) + a real Let's Encrypt cert (expires
  2026-11-21, auto-renews via certbot's systemd timer), 301-redirecting everything to
  `https://reattend.com`. The `rabbit-web` marketing-site repo this domain was originally meant
  for was never deployed here and still isn't — this was a redirect, not a revival of that site.
- **`test.reattend.com` — still dangling, needs manual cleanup.** DNS is on Namecheap (NS:
  `dns1/dns2.registrar-servers.com`), which I don't have credentials for. The A record still
  points at `143.198.116.94` (the destroyed droplet's now-unowned IP) — remove it from the
  Namecheap DNS panel: reattend.com zone → delete the `test` A record. Low urgency (DO would
  have to reassign that exact IP to someone else for it to matter) but worth doing.
- Checked `rabbit.reattend.com` — doesn't exist, nothing to clean up there.
- Prod disk: 14G/77G (18%) — healthy, not a concern.

---

## 2. Sprints H-N (this session) recap

### Sprint H · `d1eeb00` — Meeting Prep + Action Agents
- Meeting Prep card on Home (next 8h, Claude-written brief)
- Draft Email Reply + Draft Team Broadcast action agents
- Six "coming soon" action-agent tiles
- `calendar_events` table, manual event seeding

### Sprint I · `e0897cc` + `4d49ddf` — Glean + Guru polish pack
- Trust badges (Verified / Unverified / Stale / Contradicted)
- Verification cadence (30/60/90 days) on memory detail
- Announcements banner + admin page
- Trending card on Home + view tracking
- Admin analytics dashboard (totals, most-viewed, reach by dept, stale count)
- Prompt library drawer in /app/ask
- Passage highlighting in Oracle citations
- 4 new tables: `announcements`, `announcement_dismissals`, `record_views`, `prompt_library`

### Sprint J · `79b0b4d` — Notifications + Agent runtime
- `suggestion` notifications fire on new contradictions (delta-gated)
- Anonymous Ask page + endpoint (RBAC preserved, asker stripped from audit)
- Agent run-now: admin POSTs `/api/enterprise/agents/[agentId]/run`, output saved as memory

### Sprint K · `e2ec916` — Enterprise-grade OCR (gov hero)
- `/admin/:orgId/ocr` — drag-drop batch upload, multi-language, polling job list, quality dashboard
- `tesseract.js` for images, `pdf-parse` for text PDFs
- PII redaction module (Luhn-verified credit cards, ABA-verified routing, SSN, phone, email, address, DOB, IP)
- `ocr_jobs` table; `records.legal_hold` + `retention_until` + `ocr_confidence` columns
- v1 limitation: scanned multi-page PDFs need per-page image re-upload (rasterization is post-launch)

### Sprint L · `a4e25a6` + `cd32751` — Compliance pack
- Audit log WORM: every row sha256-chained to prior; `verifyAuditChain()` walks + reports tamper
- `/api/enterprise/compliance/{verify-audit, export, erase}` endpoints
- Settings → Data controls card: GDPR self-export + right-to-erasure (typed-confirmation)
- Public `/compliance` page: certs roadmap, controls today, data residency, security disclosures
- `docs/compliance/stateramp-moderate.md` + `cjis-addendum.md` — honest control mappings
- Audit page got "Verify chain" button

### Sprint M · `f97c276` — Chrome extension policy + ambient
- `/api/tray/related` — bearer-authed memory search by URL/title for ambient surfacing
- `/api/tray/extension-policy` — pulls org admin's required + recommended domains
- `/api/enterprise/organizations/:orgId/extension-policy` — admin GET/PUT
- `/admin/:orgId/extension` admin page — required/recommended domain editor
- `/api/tray/voice` — bearer-authed audio capture (Whisper)
- Settings API keys tab exposed (was stranded — `b7b29c5` fix)
- Extension repo (`enterprise_extension`): ambient corner card, policy sync via `chrome.alarms`, `loadPolicy/savePolicy/onPolicyChanged`
- 5 sprint-M extension files modified, build verified

### Sprint O-a hardening · `4f6f93a` + `90bdc2b` — RBAC + isolation + diversity + AI vendor cleanup

After the initial sandbox shipped, four issues surfaced that needed fixes:

1. **RBAC was being bypassed** in two places. The launch endpoint had been
   adding the sandbox visitor as `workspace_members.role='owner'` on every
   cloned workspace (defeating Rule 4 team-visibility), and re-attributing
   every record's `createdBy` to the sandbox user (triggering Rule 2
   "creator always sees their own"). Fix: clone the demo's users as ghost
   authors with new ids, build a `userIdMap`, rewrite `createdBy` /
   `decidedByUserId` / `publishedByUserId` / `verifiedByUserId` /
   `ownerUserId` etc. to point at ghosts. Sandbox visitor is just a member,
   not the author of everything. Workspace memberships are now scoped per
   role: super_admin/admin skip workspace_members entirely (Rule 1
   short-circuits), dept_head/member only get workspaces in their
   accessible dept tree, guest gets zero. **Empirically verified on the
   live DB**: Adaeze (dept_head) sees only Tax Treaty Team + Transfer
   Pricing Team (the 2 leaf workspaces under International Taxation
   Division), Daniel (guest) has 0 workspace + 0 dept memberships.

2. **Scoped-dept hint pointed at the root.** Initial regex
   `/taxation|finance/i` matched "Ministry of Finance" first → all depts
   were descendants → all workspaces accessible. Now we use priority
   regexes anchored on `/^international taxation/`, `/^direct taxes/`,
   `/^department of revenue/` and reject parent_id=null roots.

3. **Personal workspace required.** `requireAuth()` throws if the user has
   no `workspace_members` row. Guests (with no enterprise workspace_members
   under the new RBAC scoping) would fail at the door. Fix: each sandbox
   visitor also gets a personal-type workspace (not linked to any org), so
   requireAuth has something to find.

4. **Cross-org isolation belt-and-suspenders.** API layer already enforces
   via `getOrgContext` / `requireOrgAuth`. Added middleware check: sandbox
   sessions hitting `/app/admin/<seg>/*` where `seg` isn't a UUID get
   redirected to `/app`, and `/app/admin/onboarding` (no-op for sandbox)
   redirects too.

5. **Persona diversity.** Replaced 5 Indian-only personas with a 5-ethnicity
   mix:

   | Role         | Persona             | Background          |
   |--------------|---------------------|---------------------|
   | super_admin  | Aarti Mehta         | Indian              |
   | admin        | Hiroshi Tanaka      | Japanese            |
   | dept_head    | Adaeze Okonkwo      | Nigerian            |
   | member       | Sofia Martinez      | Latina              |
   | guest        | Daniel Schwartz     | Jewish/European     |

   Dept_head card tagline rewritten to be role-generic (was Rajiv-specific
   "BEPS treaty thread, EU delegation, 47 decisions authored").

6. **AI vendor cleanup.** Stripped Claude / Sonnet / Haiku / Anthropic /
   Groq / Llama from every user-facing string — sandbox copy, fixtures,
   pricing, compliance, all agent / capture / oracle / handoff / brain-dump
   / onboarding-genie / start-my-day / topbar surfaces. Replaced with "the
   AI" / "AI-synthesized" / "managed frontier AI" / "fast reranker". 22
   files touched. Internal `//` developer comments left intact.

### Sprint O-b · `ae8023c` + `4621449` + `9fb3422` — Legal pages, extension submission, sidebar/topbar refresh

**Legal pages (ae8023c)**
- `/privacy` rewritten for Enterprise: 13 sections calibrated against the
  Chrome Web Store data declarations (data categories, sub-processors,
  retention, GDPR/CCPA/DPDP rights with self-serve paths, no-AI-training
  pledge, single-cookie disclosure)
- `/terms` rewritten: 21 sections covering acceptance, three plan tiers,
  customer-content ownership, acceptable use, RBAC admin powers, AI-output
  disclaimers, IP, confidentiality, SLA targets, warranties + 12-month-fee
  liability cap, indemnification, termination + 30-day export window,
  governing law (India / Bengaluru courts)
- New `LegalFooter` component on home, pricing, sandbox, compliance,
  privacy, terms (and now support) — copyright + Privacy/Terms/Compliance
  links
- Both pages self-contained (no Personal Reattend Navbar/Footer
  dependency); canonicals updated `reattend.com → enterprise.reattend.com`

**Chrome extension submitted to Web Store**
- Voice removed entirely from the extension surface (popup tab + offscreen
  doc + permission tab + captureVoice helper). Three escalating attempts
  at MV3 mic capture (popup-direct → offscreen doc → dedicated permission
  tab) all failed because Chrome auto-dismisses the prompt when the popup
  closes. Per user call, dropped the feature for v0.1.0; server-side
  /api/tray/voice endpoint stays for future clients
- Lucide icons + new toolbar icons baked into dist/public/
- Submitted as Reattend Enterprise v0.1.0 with `/support` (new) as the
  Support URL. Listing copy + permission justifications + data
  declarations all line up with the privacy policy

**Sprint O-b sidebar + topbar refresh (9fb3422)**
- Sidebar: replaced the multi-element org Cockpit block with a single
  fuchsia→pink **Control Room** gradient button (admins → /app/admin/<org>;
  others → /app)
- Renamed the "Ask" sidebar button to **Chat** (same /app/ask route, dark
  navy-violet styling, MessageSquare icon)
- Reshuffled nav: Home → Capture (ListFilterPlus) → Memories (Database) →
  Landscape (Proportions) → Wiki (BookOpen) → Policies (Columns4) → Tasks
  (BookmarkCheck). Removed "Ask" from the menu (covered by the Chat button)
- Moved Legend + Integrations out of the sidebar into the topbar
- Added a distinct **Agents** link (HatGlasses) just above Settings
- New `UserRolePill` next to the user's name in the profile button:
  emerald=Super, violet=Admin, blue=Guest, slate=Member
- Logo swap from `black_logo.svg` / `white_logo.svg` → `/icon-128.png`
  (single rounded image). Same swap in mobile drawer; favicon updated via
  `src/app/icon.png` + layout.tsx metadata
- Topbar: org pill + chevron switcher merged into one DropdownMenu
  trigger (avatar + name + role + ChevronsUpDown). Multi-org users get
  every entry in the dropdown plus a "Open Memory Cockpit" link
- Topbar: added **Plug** (Integrations) + **MapIcon** (Legend) icon
  buttons after the plan badge
- All topbar action icons monochrome `text-muted-foreground` (Bell,
  MessageCircle, BookOpen, Sun, Moon were colored before; color is now
  reserved for status — notification dot, plan pill, role pill)
- Lucide bumped 0.441 → 1.0.0 to get HatGlasses, ListFilterPlus,
  Proportions, Columns4, BookmarkCheck. 1.0.0 is the only version with
  both the new icons AND the brand icons we use elsewhere (Chrome, Slack)

### Sprint O-a · `557520c` + `6effd82` — Public sandbox with scripted AI

- `/sandbox` public landing page — 5 role cards (Aarti Mehta · Super Admin, Vikram Rao · Admin, Rajiv Sharma · Director, Priya Iyer · Member, Sanjay Verma · Guest)
- `POST /api/sandbox/launch` — clones the seeded `demo-mof` org per visitor (new id, slug `sandbox-{8char}`), creates a synthetic user `sb-{suffix}@sandbox.reattend.local`, issues a 60s SSO ticket the browser trades for a session cookie via the existing `sso-ticket` CredentialsProvider
- `cloneOrgData()` helper: shallow id-remapped copy of departments (two-pass for parent_id), workspaces + workspace_org_links, department_members (sandbox user added per role), records, decisions, policies + policy_versions (policy first, then versions, then patch currentVersionId — fixed FK violation), agents, announcements, prompt_library, calendar_events, exit_interviews, ocr_jobs
- `GET /api/sandbox/cleanup` — drops sandbox-prefixed orgs older than 1 hour and their workspaces, records, and synthetic users. Wired to a `*/10 * * * *` cron on the droplet via `crontab` curling localhost
- `src/lib/sandbox/{detect,fixtures}.ts` — sandbox detection by `@sandbox.reattend.local` email suffix; fixtures library with 9 chat answers (BEPS, Rajiv-leaves, Vendor-X, stale, reversed, contradictions, ramp, exit-questions, tomorrow, trending), 4 oracle dossiers (BEPS, Rajiv, Vendor-X, generic fallback), brain-dump preview, onboarding-genie packet, handoff markdown, compose email, morning brief
- AI endpoints short-circuit to fixtures when sandbox session: `/api/ask`, `/api/ask/oracle`, `/api/enterprise/{brain-dump, onboarding-genie, handoff, compose, start-my-day, exit-interviews}`. Streaming chat protocol matches the live endpoint (X-Sources header included)
- `SandboxBanner` component at top of app shell — surfaces "you're in sandbox, nothing persists, AI is scripted" + pricing CTA when email matches
- Ask `chat-view.tsx` renders 6 violet guided-demo question chips for sandbox users with the label "Guided demo — click any question to see a scripted answer"
- Home hero swapped: primary CTA is now "Try the sandbox", secondary "Sign up". Header has a "Try sandbox" link

### Sprint N — Demo org + runbook + landing
- Seeder extended: 1 completed exit interview with handoff doc, 6 OCR jobs (mixed statuses), 1 announcement, ~80 record views (trending), 6 prompts, 3 calendar events, 15 records with verification cadence
- `docs/demo-script.md` — 12-min runbook with 5 money moments + 7 backup beats + objection handling
- `home-content.tsx`: replaced DeepThink card with Exit Interview Agent
- `pricing-content.tsx`: full rewrite — Team / Enterprise / Government tiers with feature matrix + FAQ-lite
- `pricing/layout.tsx` metadata refreshed

---

## 3. Demo flow (5 money moments — see `docs/demo-script.md` for full script)

1. **Morning brief** — `/app` Home: Start My Day + Meeting Prep + Trending + Memory Resurface
2. **Oracle dossier** — `/app/ask?mode=oracle` with passage highlighting
3. **Blast Radius** — admin/decisions → flag a load-bearing decision → "what breaks if we reverse?"
4. **Time Machine** — `/app/landscape?mode=temporal` + Play
5. **Exit Interview Agent** — `/admin/:orgId/exit-interviews` → completed interview with handoff doc → "this is the demo we built Reattend for"

Backup beats: Onboarding Genie, OCR pipeline, Self-healing, Chrome extension (pin + ambient + sidebar), Compliance + audit WORM verification.

---

## 4. Two client profiles (still the strategy)

| | SMB / startup | Government |
|---|---|---|
| Year | 1 | 2 |
| Stack | Cloud-native, Slack/Notion/Google | Paper, scanned PDFs, SharePoint, Teams |
| Ingest | Nango (Sprint P) | Trainer dispatched, OCR Sprint K |
| Pricing | Per-seat $25/mo | Quote, on-prem default |
| Compliance | SOC 2 Type II | StateRAMP + CJIS + maybe FedRAMP |
| Sales cycle | 2-8 weeks | 12-18 months |
| LLM | Claude/Groq SaaS | On-prem Rabbit (Year 2) |

---

## 5. Outstanding before launch

**Superseded by §0 — see there for what actually shipped in each of these.** Condensed status:

### Sprint O — UI/UX polish — shipped via full design relaunch (§0.4)
Every public + most app pages redone. Still genuinely open: a real accessibility pass
(keyboard nav, screen reader, AA contrast) and Lighthouse numbers — no commit confirms either
was done, don't assume.

### Sprint P — Nango connectors — shipped, proxy-fetcher pattern (§0.5)
7 connectors live (Slack, Notion, GitHub, Linear, Drive, Confluence+Jira, Google Calendar) —
more than the original Slack/Notion/Teams scope, MS Teams itself still not done. **Open:**
verify OAuth provider apps are actually registered in the Nango admin (this was the single
blocking TODO in the old §11 and no commit confirms closure). Real-time sync status card on
Home also still not done.

### Sprint Q — Infrastructure hardening — partial (§0.7)
Done: WAL mode, 3-layer backup plan (`docs/backup.md`). Still open: Sentry, status page, HA/
second-droplet failover, secret management, re-verify crons are actually running.

### Sprint R — Billing — shipped (§0.2)
Paddle backend + checkout + portal + trial banner + AI quota gate + downgrade cron all landed
2026-05-02. Open: confirm Paddle is on live (not sandbox) keys before treating this as
launch-ready; gov "Quote" path status unconfirmed.

**What's left before launch, realistically:** the Sentry/status-page/HA half of Sprint Q, the
accessibility audit from Sprint O, and confirming the two "unverified" items above (Nango OAuth
apps, Paddle live mode). Everything else in the original 4-sprint plan has commits behind it.

---

## 6. Demo data: how to refresh

```bash
# Local
npm run seed:demo -- your-email@reattend.com

# Droplet
ssh root@167.99.158.143 "cd /var/www/enterprise && \
  npx tsx scripts/seed-demo-org.ts demo-presenter@reattend.com"
```

Seeder is idempotent. Wipes the previous demo org (`slug=demo-mof`) and rebuilds with realistic data. Sample output:

> 22 members across 18 departments · 12 decisions · 5 policies · 1 exit interview + handoff · 6 OCR jobs · 1 announcement · 79 record views · 6 prompts · 3 calendar events · 15 verification cadences

---

## 7. Chrome extension (`~/Desktop/enterprise_extension`)

Working in dev mode. Built artifact lives in `dist/`. Surfaces:
- Toolbar popup: text / link / voice capture + open sidebar
- Options page: paste token, validate, configure whitelist, see org policy
- Floating R-pin on whitelisted pages (right-click also gives 3 menu options)
- Side panel sidebar: streaming Ask Chat with citations
- Ambient corner card on whitelisted pages with related memories
- 50+ pre-seeded apps; admin can add required/recommended domains via `/admin/:orgId/extension`

Install: `npm install && npm run build` in the extension folder, then load `dist/` in `chrome://extensions` → Developer mode → Load unpacked.

Token flow: `/app/settings` → API keys tab → Generate → paste into extension.

---

## 8. Resume checklist

```bash
cd /Users/partha/Desktop/enterprise
git status                     # clean on main
git log --oneline -5           # confirm latest is still 23d7e08 or newer
npm run test:rbac              # RBAC test suite
pm2 list                       # on the droplet — confirm process name before deploying (§1)
```

Tell next session: "Read today.md — pick up from §0.6/0.7: the Sentry/status-page/HA gap in
Sprint Q, or verify the Nango OAuth apps + Paddle live-mode open items." It will know.

---

## Sandbox quick reference

- Public URL: https://enterprise.reattend.com/sandbox
- 5 named personas, mixed ethnicities: Aarti Mehta (super_admin), Hiroshi Tanaka (admin), Adaeze Okonkwo (dept_head), Sofia Martinez (member), Daniel Schwartz (guest)
- API: `POST /api/sandbox/launch` body `{ role }` returns `{ ticket, sandboxOrgId, personaName, personaTitle, role }`
- Auto-cleanup: `*/10 * * * *` cron curls `localhost:3000/api/sandbox/cleanup`, drops sandbox-prefixed orgs older than 1h
- Sandbox marker: user email ends in `@sandbox.reattend.local`; org slug starts with `sandbox-`
- AI in sandbox: every endpoint detects the email and serves fixtures from `src/lib/sandbox/fixtures.ts` — never hits the LLM
- Suggested guided-demo questions live in `SANDBOX_SUGGESTIONS` and surface as violet chips in `/app/ask`
- RBAC verified end-to-end: super_admin/admin see everything via Rule 1, dept_head sees only the International Taxation Division leaf workspaces (Tax Treaty Team + Transfer Pricing Team), member same scope but role='member', guest sees nothing in the org (zero workspace_members + zero dept_members), only their personal workspace
- Middleware blocks sandbox sessions from `/app/admin/<non-uuid>/*` and `/app/admin/onboarding`
- Demo authorship preserved via ghost-user clones (records keep "created by Vikram Singh" etc., not the sandbox visitor)

---

*Generated end of Sprint O-a (sandbox + hardening). Next: Sprint O proper (UI/UX polish) — interactive with user.*

---

## 11. Sprint P (Nango) — code is live, env is the only blocker

Wired end-to-end in code (commits before this entry):

| Layer | File(s) |
|---|---|
| Config / SDK wrapper | `src/lib/integrations/nango/client.ts` |
| Provider catalog (5 first-class) | `src/lib/integrations/nango/providers.ts` |
| Per-provider normalizers | `src/lib/integrations/nango/providers/{gmail,google-drive,slack,notion,confluence}.ts` |
| Ingest path (raw_items + scope filter + triage enqueue) | `src/lib/integrations/nango/ingest.ts` |
| Connect-session mint | `POST /api/integrations/nango/session` |
| Status board | `GET /api/integrations/nango/status` |
| Manual sync | `POST /api/integrations/nango/sync` |
| Backfill (3 pages × 100) | `POST /api/integrations/nango/backfill` |
| Per-connection scope CRUD | `GET/PATCH /api/integrations/nango/scope` |
| Disconnect | `POST /api/integrations/nango/disconnect` |
| Webhook (auth + sync_completed) | `POST /api/nango/webhook` |
| UI panel | `src/components/enterprise/nango-connect-panel.tsx` (rendered in `/app/integrations`) |

**Self-hosted Nango stack (live on droplet):**

| Path | Value |
|---|---|
| Compose dir | `/var/www/nango/` |
| Containers | `nango-server` (image `nangohq/nango-server:hosted` v0.70.1) + `nango-db` (postgres:16) |
| Server bind | `127.0.0.1:3003` → container `:8080` |
| Public URL | `https://nango.enterprise.reattend.com` (nginx vhost `/etc/nginx/sites-enabled/nango`, Let's Encrypt cert auto-renews) |
| OAuth callback | `https://nango.enterprise.reattend.com/oauth/callback` (give this to every provider) |
| Encryption key | in `/var/www/nango/.env` — **back up off-droplet, losing it kills every stored OAuth token** |
| DB password | in `/var/www/nango/.env` |
| Restart | `cd /var/www/nango && docker compose restart nango-server` |
| Logs | `docker logs nango-server -f` |

**Provisioning state (as of 2026-04-28):**

| What | Where | State |
|---|---|---|
| Admin account on Nango | `pb@reattend.ai` (manually `email_verified=true` in `_nango_users` since SMTP isn't configured) | done |
| `NANGO_HOST` PM2 env | `https://nango.enterprise.reattend.com` | done |
| `NANGO_SECRET_KEY` PM2 env | (value lives in `pm2 env 0` on droplet only — never committed) | done |
| `NANGO_WEBHOOK_SECRET` PM2 env | (value lives in `pm2 env 0` on droplet only — never committed) | done |
| Webhook URL set in Nango admin | `https://enterprise.reattend.com/api/nango/webhook` | done |
| OAuth apps registered (Google/Slack/Notion/Confluence) | Nango admin → Integrations | **TODO** |

**To inspect / rotate the live PM2 env vars:**
```bash
ssh root@167.99.158.143 'pm2 env 0 | grep NANGO'              # show
ssh root@167.99.158.143 'pm2 set enterprise:NANGO_SECRET_KEY "<new>" && pm2 restart enterprise'   # rotate
```

**To re-bootstrap a Nango admin if locked out** (no SMTP means password reset emails go nowhere):
```bash
ssh root@167.99.158.143 "docker exec nango-db psql -U nango -d nango -c \\
  \"UPDATE _nango_users SET email_verified = true WHERE email = 'you@reattend.ai';\""
# then for password reset: generate bcrypt hash via Nango admin, or wipe row and re-signup
```

**Last remaining step before customers can connect:**

5. In Nango admin (`https://nango.enterprise.reattend.com` → Integrations → New Integration), register one OAuth app per provider: `google-mail`, `google-drive`, `slack`, `notion`, `confluence`. For each:
   - Go to the provider's dev console (Google Cloud Console, api.slack.com, notion.so/my-integrations, atlassian.com/dev) and create an OAuth app there.
   - Authorized redirect URI: `https://nango.enterprise.reattend.com/oauth/callback` (always this).
   - Copy `client_id` + `client_secret` back into Nango.
   - Each Nango integration also needs a Sync (Nango UI → Syncs → New) publishing the model names our normalizers expect: `GmailEmail`, `Document`, `SlackMessage`, `NotionPage`, `ConfluencePage`. The default Nango sync templates work for v1.
6. Visit `/app/integrations` while signed in to the app — the "Connectors are being enabled" empty state flips to 5 working Connect buttons. Click Connect on Gmail. Google's OAuth screen pops up. Authorize. Backfill runs synchronously (≤ 300 records) and memories appear in `/app/memories`.

**Cloud vs self-hosted:** decided on self-hosted (gov ICP requires it; SMB doesn't care). Cloud signup at app.nango.dev was abandoned mid-setup on 2026-04-28 in favor of the self-hosted stack above.

**Per-connection scope filter** is enforced inside `passesScope` in `ingest.ts`. Three lists per connection (include / exclude / domain). Stored in `integrations_connections.settings` JSON. Editable from the Scope dialog in the panel.

**Connection IDs are reversible**: `<userId>__<providerKey>` so the webhook can always route back to a workspace via `parseNangoConnectionId`.

**Roadmap connectors** (Teams, SharePoint, SAP, Jira/Linear/GitHub) listed as informational tiles below the Nango panel — pending OAuth scope review and Nango sync script availability.

**What's deliberately NOT done yet** (post-launch):
- Slack bot inline-ask + "save this thread" command (requires Slack app review)
- Per-channel Slack allow-list UI (current scope filter is text-substring only)
- Decision-from-pinned-thread workflow (needs UI in /app/decisions)
- MS Teams full coverage (Nango supports OAuth; sync scripts are still custom-needed)
- Real-time sync status card on Home (status API exists; just no Home tile yet — drop into Sprint Q)

## 12. Personal — Web Store rejection, privacy rewrite, paid-tier ask fix (2026-09-07)

**Context:** Chrome Web Store rejected Reattend Personal 1.0.0 ("Purple Nickel": privacy policy missing collection/handling/storage/sharing). Root cause: `personal.reattend.com/privacy` was still Enterprise's policy (employer-as-controller, AWS, Stripe, SCIM, a fictional DPO) and never mentioned the extension.

**Done:**
- `/privacy` rewritten from verified facts: DigitalOcean nyc1 hosting, Paddle, Resend, Google sign-in + GA4 (website/app only, not extension), AI processors named per plan (BYOK: Anthropic/OpenAI/Google under the user's key; Managed: Anthropic under ours), AES-256-GCM provider keys, SHA-256 API tokens, 10-min OTP, self-serve export/erase. Dedicated "The Chrome extension" section: what `chrome.storage.sync` holds, exactly when data is sent, permission-by-permission. Deployed (force-static → rebuild).
- Made two retention claims true rather than aspirational: installed `pm2-logrotate` (retain 30, 50M, compress) on the droplet; daily cron prunes `/root/reattend-personal-backup-*.db` older than 30 days.
- Extension 1.0.1: related-memories card (`showAmbient`) now **off by default** — with the pin on every site it was sending page URL/title on load (background browsing data, contradicting the listing). Options toggle relabelled (was mislabelled "Show the capture pin"; it never controlled the pin). Zip + `STORE_LISTING.md`/`STORE_SUBMISSION.md` updated.
- **Production bug fixed (paid tier):** `resolveLLM` in `byok.ts` threw `NoAIConfiguredError('personal')` before the tier check, so every Managed user on Personal was metered by `consumeAiQuery` and then told "No AI provider configured" on every question. Found via the promo demo account. Fix looks the tier up itself; verified live with a real answer.
- Promo video: `~/Desktop/reattend-personal-promo.mp4` (29.4s, 1080p). Pipeline in scratch `promo/` (Playwright recorder + ffmpeg assembler); demo account `promo-demo@reattend.ai` (Sam Carter, 22 seeded memories) still exists; its API token is revoked.

**Note on vendor naming:** the privacy policy names AI vendors as sub-processors. That's a legal-disclosure necessity and deliberate; the "never name vendors in user-facing copy" rule still applies to marketing/product copy.

**EXACT next step:** resubmit 1.0.1 in the Web Store dashboard with privacy URL `https://personal.reattend.com/privacy`; in the reviewer note, point to sections 02 (collect), 03 (extension), 04 (use), 05 (share), 06 (storage), 07 (retention). Still needed from Partha: screenshots + listing icon; GST/CIN/address if the Paddle receipt should become a tax invoice; decide whether to keep the promo demo account.

## 13. Convergence — Personal becomes a tenant of reattend.com (2026-09-08)

**Decision (Partha, 2026-09-08):** one repo, one deployment, one identity, one extension. Personal is a no-org account on reattend.com, not a separate product on a separate droplet. Enterprise is sales-only — a personal account never self-upgrades into an org; orgs are provisioned by us. No workspace switcher. Entry points (`/personal`, `/register`) decide onboarding, not a "personal or enterprise?" question. Pattern is Notion/Atlassian: same login, tenant decides the shape.

**Why:** two SQLite DBs meant two user tables, two admin panels, two extensions, two privacy policies, two support pages, and every Personal fix had to be hand-ported (§12 was that). Personal is a growth channel, not a second product; the fork was costing more than the isolation bought.

**Shipped (Enterprise repo):**
- `3ceab8b` — ports from Personal: `ProviderAuthError` (401/403 → fail fast, `markKeyInvalid*`, notification instead of silent retries), buffered SSE parsing in `llm.ts` (chunk-boundary bug was dropping words from streamed answers), `resolveLLM` personal-tier fix, `resolveLLMForWorkspace` paid-tier platform-key fallback, mode-aware triage (`personal` keeps reference material, explicit tray captures never vetoed), capture meter (`captures_this_month`/`captures_reset_at`, `consumeCapture`, 429 `capture_quota_exceeded`, professional = 1000/mo — a guess, revisit), memories page silent 15s prepend poll, Inbox nav + rail badge, `byok` in billing status, connected-key state + receipts + `settings/billing/invoice/[id]`.
- `938b680` — first-run redirect to `/onboarding` gated on `onboarding_completed === false` AND `createdAt >= 2026-09-08` (a `UPDATE users` backfill on prod was rejected; the cutoff makes it unnecessary — 0/33 existing users affected).
- `cca48b7` — `/onboarding` is now the personal 3-step wizard (what Reattend is → BYOK or 7-day Managed trial → extension), org members skip straight through; topbar switcher replaced by a static context label; personal-home upsell removed; agents/billing CTAs say "Reattend for teams" / "Talk to us about teams"; `personalPriceId()` + `PADDLE_PRICE_PERSONAL_MONTHLY` (set on prod); `/api/billing/checkout` and `/api/billing/start-trial` handle no-org callers on their own user row (webhook keyed on `customData.userId`); `/personal` serves `personal.html` (was 308), `/personal/pricing` serves `personal-pricing.html`; `/app/extension` page ported (allowed with no org), `public/downloads/reattend-extension.zip` = extension 0.4.0.

**Extension repo (`enterprise_extension` `dfea1ba`, v0.4.0, built, not published):** site controls (`siteMode all|whitelist`, `blockedDomains`), selection tooltip "Save to Reattend", toast, `showAmbient` off by default, popup logo + ⌥⇧A hint, `activeTab` dropped, copy de-branded to plain "Reattend". This is THE extension going forward; the Personal listing submission gets withdrawn.

**Not done yet (in order):**
1. ~~Verify the `cca48b7` deploy~~ **Done 2026-09-08 15:48 UTC:** all static checks green; real signup `tenant-test-0908@reattend.ai` → `/api/user` shows `onboardingCompleted:false` + post-cutoff `createdAt` (client gate fires) → start-trial → `professional`/`trialing` to 2026-09-15 → `/api/ask` 200 with no key. Two test rows left on prod (`tenant-test-0908@`, `tenant-test-0908b@reattend.ai`); delete from admin when convenient. Note the first-run redirect is client-side (`useEffect` in app layout) — curl on `/app` returns 200, that's expected.
2. Publish 0.4.0 to the "Reattend" Web Store listing with privacy URL `reattend.com/privacy`; withdraw the Personal submission. `reattend.com/privacy` still needs a personal-account section (port §12's extension section + BYOK/Managed processors) — one policy, org annex.
3. Domain claiming (an org claims `@acme.com`; existing personal accounts on that domain get an invite, never auto-merged).
4. Decommission the Personal droplet: nginx 301 `personal.reattend.com/*` → `reattend.com/personal`, export the ~5 Personal users by hand (invite them; don't copy rows across DBs), single `/support`.
5. Parked: Enterprise extension token → 401 on `reattend.com/api/tray/me` (likely base-URL/token host mismatch in the old 0.3 build; retest with 0.4.0 before debugging).

**Verification list for the deploy:** `/personal` 200 (not 308), `/personal/pricing` 200, `/onboarding` HTML contains the wizard, no "Switch context" string in the client bundle, `/app/extension` present in `prerender-manifest`/routes, `pm2 describe enterprise` online, then signup → `/onboarding` → Managed trial → `/api/billing/status` shows `professional`/`trialing`.

**Post-deploy bugs found by Partha's first real signup (fixed 2026-09-08/09):**
- `73f0377` — `testProviderKey` ran a 5-token generation and logged nothing, so a valid OpenAI key could 422 with no trace. Now an authenticated list-models call per provider (429 = valid, 401/403 → clear message, failures logged `[byok] key check failed`). Wizard short-circuits when `/api/billing/me` shows a key or non-free tier.
- `94df105` — `/app` ↔ `/onboarding` white-screen loop. `(app)/app/page.tsx` still had the 2026-08-25 rule "zero orgs + not grandfathered → /onboarding" (when /onboarding meant create-org). Removed; no-org = PersonalHomePage, always. First-run redirect lives ONLY in the app layout gate. Verified in a headless browser: set-up account stays on /app, fresh account reaches the wizard once. `personalLegacyGrandfathered` is now unused by any gate.
- Known but not fixed: the first-run redirect fires ~6-8s after `/app` paints for a fresh account (waits on `/api/user`). Cosmetic; make it server-side or move the check earlier if it annoys anyone.

**Batch 2 (2026-09-09, Partha's review of the personal shell):**
- `b93ea93` — `/api/tray/tokens` no longer 402s Free accounts (extension is free on every plan; `requireExtensionAccess` is the only gate). Wizard provider picker is a segmented control (native select had invisible text).
- `81a2cb8` — kill list executed for no-org accounts: `/app/agents`, `/app/legend`, `/app/admin/onboarding` off the allowlist; sidebar Agents + topbar Legend org-only; Settings' duplicate extension quick-start replaced with a pointer to `/app/extension`. Decisions/Search/Integrations/Tasks headers read correctly for one person. Kept on purpose: Decisions, Tasks, Compose (useful solo).
- `6856641` — capture surfaces 4 → 2: Memories "New memory" → `/app/brain-dump` (its modal + own POST deleted); `QuickCapture` deleted (it double-bound ⌘K against Search); every opener now opens `CaptureDrawer` (⌘N). Deliberately stopped at two: the drawer (quick single capture) and the Capture page (firehose multi-item parse) are different jobs; merging them into one component is a refactor with no user-visible win right now.
- `42280ed` — Landscape: connect-drag selects the new link and opens a relation picker (11 kinds, PATCH `/api/enterprise/graph/links`), edge colours by kind; board is full-bleed by default for both tenants (`localStorage lsc.board.fullscreen`), Esc/⌘F/Exit leave it, Rewind link in the bar.

**Marketing site refresh (2026-09-09, `b2d9f67`):** source `~/Desktop/ui design/codex/landing-design/` (Partha's new light design). Copied into `public/landing-design/` with paths rewritten (`/codex/landing-design/` → `/landing-design/`, hub links → clean routes, `resource-detail.js route()` route-shaped, `Compliance.html#` → `/compliance#`). All 14 marketing pages + `/personal`, `/personal/pricing` replaced; `/tool` and `/game` hubs are now static (`route.ts`), React index pages deleted. **Deliberately NOT copied:** the design's nested `free-*/`, `tool/*/`, `game/*/`, `play/`, `record/` shells - they are mockups (a form that prints a canned sentence), while the repo's React versions are the real working tools with their own SEO; the hubs link straight to those. Follow-up `8aae33d` (same day): the 29 interactive pages now wear the new chrome via the shared components - `marketing-navbar` (design topbar + mobile drawer + signed-in CTA swap), `marketing-hero` (detail hero, action button scrolls to the live tool), `marketing-shell` (per-route tint + 'Keep exploring'/closing), `marketing-footer`, `game-layout`. Per-route copy/tint generated from the design's `resources` map into `resource-meta.ts`. CSS: `resource-shell.css` = shell rules extracted from the design's three stylesheets, every selector scoped under `.rshell`, element rules dropped, so tool bodies (Tailwind) are untouched. Verified side by side vs prod: planner task-add and bingo name/continue identical. `/subprocessors` also uses MarketingShell and picked up the chrome. `630c02b`: 26 React marketing pages (help, blog, glossary, compare, features, docs, faq, security, use-case…) used `MarketingNavbar` standalone and rendered it unstyled (`/help` was visibly broken) - `resource-shell.css` now emits every selector in ancestor-`.rshell` and self-`.rshell` forms and navbar/footer mark their own roots, so the header is identical on every marketing page without wrapping each one. All static pages' topbars replaced by `landing.html`'s exact header with `aria-current` per page (one variant left; `signin.html` has no topbar by design). Rendered-header fingerprint verified identical across static, shell and standalone pages. Dashboard untouched, per instruction. Also untouched (still old design, still linked from the new nav): `/help`, `/glossary`, `/blog`, `/register`.

**Dashboard redesign (2026-09-09, `45f81d3`):** source `~/Desktop/ui design/codex/src/` + `REDESIGN.md`. The snapshot's base commit is `ab2a6d9` (found by hashing its unmodified files against history), so every design edit sat on top of that morning's work - 25 of the 28 changed files were **clean takes** (our copy identical to base), which is why no behaviour had to be re-merged.

- **Taken as-is:** shell (`globals.css` one Inter voice; root layout light-first `defaultTheme="light" enableSystem={false}` - was dark/system), five new CSS layers (`product-`, `enterprise-`, `inner-pages-`, `chat-`, `dark-refresh` + `modern-workspace`), `site-refresh.css`/`site-dark.css`, all nine `components/ui/*` primitives (rounder, softer shadows), sidebar (Home→Overview, Chat→Ask your brain, AI-status chip, More dropdown), topbar (AI-ready chip, explicit sun/moon toggle), Home + personal-home (`WorkspaceFocus`/`MemoryPulse`/`WorkspacePerspective` third pane), Ask (three-pane, searchable+deletable history, `?q=` draft), Tasks/Wiki/Hierarchy overview panels, Control Room rail (+Hierarchy, +back link) and the new `admin/[orgId]/hierarchy` route.
- **Kept ours over the snapshot:** `marketing-{navbar,shell,hero}` (ours is built from `landing-design`'s own CSS and is newer), `/tool` + `/game` route handlers, `resource-*` files, and `white_logo.svg` for dark mode (the snapshot pointed both light and dark at the black mark).
- **Fixed in the snapshot:** leftover `Lattice` codename on Home; dark rules missing for the four stat tiles, the perspective panel's heading/link, the rail user card and the Ask toolbar pills (all kept their light paint) - appended to `dark-refresh.css`.
- **Signals from your brain (`4121137`, Partha's call):** the panel in the mock that the snapshot's code omitted, now built for both homes. Three cards, each one a real endpoint - CONNECTION FOUND = a `contradicts` link from `/api/enterprise/graph`, WORTH RESURFACING = the on-this-day cohort from `/resurface`, GAINING ATTENTION = top view count from `/trending`. Renders only the cards with something to say, and nothing on an empty account. `/resurface` and `/trending` gained the same no-org branch `/graph` already had (org → that org's workspaces, no org → the caller's own; RBAC unchanged and still the gate), so one component serves both tenants. This also turns three built-but-never-rendered components' worth of data into a visible feature.
- **Decided by Partha (2026-09-09):** public marketing site stays light-only.
- **Not done, per that decision:** no dark toggle on the public marketing site. The snapshot ships `site-dark.css` and adds `ThemeEditionToggle` to `landing/navbar`, `public-nav` and `site-nav` - but all three are unused by any page, and the 14 static marketing pages render outside React (no ThemeProvider), so they can never go dark. A toggle on React marketing pages only would mean `/help` dark while `/` is light. **Open question for Partha.**
- **Preview mocks vs code:** the seven `*-preview.html` show aspirational numbers (12,481 memories, health 82, "Signals from your brain"). Where the designer's own `.tsx` differs from the mock, the `.tsx` wins - e.g. Home renders Quick actions, not a signals panel. Control Room already had Memory health / Drift & risk / Export cockpit, so nothing had to be invented.
- **Verified in a browser** as org super_admin and as a fresh personal account: 13 + 8 routes render, no runtime errors, both editions toggle, marketing header fingerprint unchanged. Local DB needed `npx tsx src/lib/db/migrate.ts` first (`subscriptions.captures_this_month` was missing, which 500'd `/api/user`).

**Fix batch + Enterprise demo (2026-09-09, `8c6d499`, `190ab05`):**

- **Scope bleed I introduced and Partha caught.** The no-org branch of `/resurface` and `/trending` scoped to *every* workspace the caller belonged to. An org member also belongs to org-linked workspaces, so org memory could appear on a personal screen. Both now scope to the caller's **active** workspace - the rule `/graph` already used. Confirmed against prod rows for `parthajy@gmail.com` (Personal 9 records + General 627 org-linked). **The lesson: "no org" means the active workspace, never all memberships.**
- **Rail chip clipping:** `.rail-ai-status` flex-shrank to 22px inside an `overflow:hidden` rail; org rails carry 3 more nav items so they hit it first. Now `flex:none` and the rail scrolls.
- **Landscape had no controls:** full-bleed used `position:fixed; inset:0; z-index:50`, and the topbar/rail paint above it, so the board's own bar was covered. `/app/landscape` is already a full-bleed route, so the board now just fills that area (`:has()` on the page wrapper). Legend, search, zoom, Rewind, Exit all reachable; relation picker unchanged.
- **Tasks:** three per-family 2-col grids → one dense auto-fit grid with the family as a card tag; the block explainer → a one-line process strip.
- **Agents:** page frame matches Tasks/Wiki, denser grid, and the broken "Each agent is Chat with" sentence fixed.
- Sync status is a real 4-column grid (was a wrapping inline list); Inbox left the rail (topbar bell owns notifications, both badges cap at 99+); Extension is `personalOnly`; Mac build reads "coming soon"; AI-ready pill removed; new persistent **No AI key connected** banner (personal → Settings, org admin → Control Room, non-admin members and paid/Managed see nothing), and billing's key links follow the same split.
- **Enterprise demo (Partha's design):** marketing keeps Book a demo; **Talk to sales** opens the pre-filled demo org. Signed-in personal accounts get **Try Enterprise** in the topbar. The demo swaps your session for a persona, so `/api/sandbox/launch` writes an httpOnly `demo_return` cookie (server-side, from the verified session, signed, 12h) and the new **`/api/sandbox/exit`** trades it for a 60s SSO ticket to hand the real account back. Anonymous visitors get no cookie and land on marketing; a deleted account cannot be revived by a stale cookie. Demo banner = what it is + Schedule a meeting + Exit demo; the AI-key banner is suppressed inside it. Verified: personal → demo (21 members / 16 memories / 12 decisions) → back to the same account.
- **Sandbox removed from all marketing pages** (the `/sandbox` route stays - it *is* the demo). Memories/topbar duplication: Partha said leave as is.
- Still open, not caused by this work: **Paddle receipts 403** (`/api/billing/transactions` - the API key lacks the transactions read scope, needs Partha); the inbox banner's "N memories flagged for review" actually counts unread notifications, and now sits above the pulse's "0 need review", which counts overdue verification cadences (0 records have one set).

**Marketing CTA model settled (2026-09-10, `9f689f0`).** Partha: "we do not need both Talk to Sales and Book a Demo. How does Notion play this? Will personal guys feel confused?"

- **The audit:** nav was Sign in / Talk to sales / Book a demo - one auth link, **two sales buttons, zero self-serve CTA**, on a product whose growth motion is Personal. On /pricing both names already pointed at the same Calendly.
- **The pattern (unanimous):** Notion "Get Notion free" + "Request a demo"; Figma "Get started free" + "Contact sales"; Slack "Try for free" + "Talk to sales"; Atlassian "Get it free" + "Contact sales". **Two CTAs, never two sales CTAs. And none of them put an enterprise demo in the top nav** - it sits inside the enterprise path after the visitor self-selects.
- **Decided:** nav is `Sign in · Talk to sales (Calendly) · Start free (/register)`, identical on all 14 static pages and the React nav. The sandbox is reached only from the **Managed tier on /pricing** and the **closing CTA on /product** ("Explore a live demo workspace"). That answers the confusion worry: the demo is no longer one click from the homepage for a personal-intent visitor.
- **Live bug found and fixed:** the **Managed pricing tier was white text on a near-white card** - it used to be dark, `site-refresh.css` forced it light with `!important` and never overrode pricing.html's `#fff` text rules, so the entire feature list was invisible from the marketing refresh until now. **Lesson: when overriding a card's background in the refresh layer, override its text colours in the same rule.**
- Also fixed: `/product`'s "Talk to founders" pointed at `/register` not a booking; four dead `href="#"` links (two "Download PDF" offers with no PDF, a privacy revision-history page that does not exist, a status link now pointing at the real status page); the sign-in page sent new users to "Talk to sales" instead of Start free.

**Personal nav + Landscape-as-board (2026-09-10, `767488f`).**

- **Sign in and Start free were one door.** `/login` and `/register` both run email→OTP through `findOrCreateUser`, and the app's first-run gate routes new accounts to `/onboarding` either way - so two buttons were two doors to one room. Nav keeps **Start free** only. The wizard now also short-circuits when `onboarding_completed` is already true (it previously only checked org / key / paid tier), so returning users who click Start free are not walked through it again.
- **Onboarding truncation:** "Claude (Anthropic)" / "Gemini (Google)" overflowed the provider pills onto a clipped second line. Short labels + a pill that cannot clip. Verified: zero overflowing elements on the step.
- **Landscape is a board now:** always full-bleed, rail auto-collapses while open (user's own preference restored on unmount), windowed/Exit toggle and ⌘F removed. Controls stay.
- **What each personal "More" item actually did (checked, not assumed):**
  - `Decisions` - every fetch is `/api/enterprise/organizations/${activeOrgId}/...` with `if (!activeOrgId) return`. **Provably empty for a personal account** → removed from the rail *and* from `NO_ORG_ALLOWED_PREFIXES`.
  - `Transcripts` - **live**: the extension writes `type: 'transcript'` via `/api/tray/voice`, and the page reads `/api/records?type=transcript`. Promoted to the rail.
  - `Integrations` - promoted. **CORRECTION (verified on prod): Nango IS live, and personal accounts can already connect.** My first check grepped `.env.local` and found no `NANGO_*` keys, so I wrongly reported connectors dead. `NANGO_SECRET_KEY` is not in `.env.local` at all - it lives in the **pm2 process env** (set at start time, persisted in the pm2 dump), which is why `getNangoConfig().configured` is true. Proof: a no-org account gets `configured: true`, 13 connector cards (Gmail, Drive, Calendar, Slack, Notion, Linear, GitHub, Confluence…), and `POST /api/integrations/nango/session` returns 200 with a real `sessionToken`. None of session/finalize/backfill require an org - all are `requireAuth` + workspace. **So no "coming soon" is warranted; the coming-soon string only renders on the `!configured` branch, which never fires today.** Lesson: check the *running process* env, not just `.env.local`.
  - `Downloads` - for one person it lists only the Chrome build, which *is* `/app/extension` → folded in.
  - Nothing left worth hiding → **More is org-only**, and the topbar's Apps + Integrations icons are org-only too.
- **"Connect a key" landed on Settings → Profile.** Settings tabs are now deep-linkable (`?tab=ai-provider`, controlled `<Tabs>` reading the URL once on mount), the Control Room section has an `#ai-provider` anchor, and the banner + billing card each point at the right one for the account type.

## Enterprise hard audit (2026-09-10) - "make sure every fucking thing works"

**Method:** all 6 test suites; a browser sweep of all 52 Enterprise routes and all 71 Enterprise GET endpoints against **production** as an org super_admin (via a sandbox session - isolated, full demo data, auto-cleaned); a static audit of every mutation handler for permission gates; the prod error log; the crontab; and the job queue.

**Clean:** 6/6 suites pass (RBAC 36 assertions, policies, agents, transfer, audit chain, briefing). 50/52 routes render with no runtime errors. **71/71 GET endpoints - zero server errors** (the 5 non-200s are correct validation: missing required params, SSO-not-enabled). No dead controls, no TODO/unimplemented surfaces in Enterprise UI. Of 8 mutation handlers without an org-permission gate, 7 are correctly user-scoped (`compliance/erase` only erases the caller and demands they type their own email; `import-personal` is safe because `resolveTargetWorkspace` enforces membership and otherwise returns no target). The 299 `TypeError ... reading 'bind'` in the logs are Next.js deploy-window noise, not a product fault.

**Four real defects found and fixed:**

1. **`/api/enterprise/meeting-prep` never existed** (`b58a348`). The org Home has fetched it since the dashboard was built (`a167767`); only `/meeting-prep/[eventId]` was ever implemented, so every org home load 404'd and silently fell back to "No meetings on deck". Base route added.

2. **`users.active_context_org_id` is a column almost nobody sets** (`b849e02`) - **the big one.** Written only by two explicit setters that normal web usage never calls; **23 of 24 prod org members had it NULL**. Every server path reading it raw therefore treated a paying org member as a personal free user: the extension gate 402'd them out (**almost certainly the extension failure reported on 2026-09-08**), `/api/ask` billed their personal free subscription and refused to answer, tray captures filed into the personal workspace, billing status showed "Free" to org admins, **checkout would have sold an org admin a personal single-seat plan**, start-trial started the personal trial, and `consumeCapture` metered org members against the personal cap. New `resolveActiveOrgId()` prefers the stored context *only while the membership still exists*, else falls back to real membership ordered by join date. Personal accounts (no memberships) resolve to null exactly as before. **Lesson: never read `active_context_org_id` raw - always go through the resolver.**

3. **`/api/jobs/cron` was never scheduled.** It is the ONLY caller of `runWeeklyDigest`, `runMeetingBriefs`, `runCrossWorkspaceSynthesis`, `runMemoryGapDetection` and `autoSyncAllIntegrations` - so five built features had **never once run in production** (confirmed: all 148 `system` notifications are "Some memories could not be processed"; zero digests/briefs/synthesis/gaps ever created). It also drains triage: **107 raw items were sitting at status `new`**. Verified a manual run is clean (HTTP 200, ~4 min, drains 20/run: 107 → 87), then added a crontab entry `*/30` wrapped in `flock -n` so a 4-minute run can never overlap itself. None of the five send outbound email - they write in-app notifications only, which is why enabling them was safe.

4. **Record-verify denied multi-org admins** (`b849e02`). The admin check took the caller's *first* org membership (`findFirst` on userId alone) then compared its id to the record's org - so an admin who also belongs to another org could be handed the wrong row and refused on records they administer. False negative, never an escalation.

5. **Two links to `/docs/permissions`, a route that does not exist** (`553feb0`). Next.js prefetches visible links, so the dead href surfaced as an intermittent 404 on the offboard page - it took three sweeps to catch because it only fires when the link is in view. The worse instance was on the **access-denied screen every user sees when they lack a permission**; the other leaked the internal repo path "docs/permissions.md" into the admin UI. Removed / repointed at the real Roles & permissions screen. A follow-up sweep of every internal `href` in the app against the route tree found **no other dangling links**.

**Final state:** 51/52 routes clean (the 52nd was this link, now fixed), **71/71 GET endpoints with zero server errors**, and the 4 previously-untestable endpoints (`meeting-prep/[eventId]`, `roles/[roleId]`, `invites/[token]`, `records/[recordId]/shares`) now verified by creating the data first - which also exercised their POST paths (create event / role / invite / resend / record). Proof the active-org fix works: a sandbox super_admin with a NULL stored context now gets `{"hasOrg":true,"isAdmin":true,"seats":{"current":21},"price":15}` from `/api/billing/status`, where before it would have returned the personal branch.

**Known and NOT fixed (need Partha):** Paddle receipts 403 (the API key lacks the transactions read scope); the inbox banner's "N memories flagged for review" counts unread notifications, not memories. **Not reproducible:** the parked `/api/tray/me` 401 - a freshly minted token returns 200 on current prod, and a bogus token correctly 401s.

**Paddle + inbox + extension pin (2026-09-10, `8ec52a1`, ext `8bb0ce9`).**

- **Paddle receipts fixed.** Partha supplied a new live key; verified it reads `/transactions`, `/subscriptions`, and both the Personal price (`pri_01m1dbaz9ce0t0fex130p88jfn` = "Monthly Subscription") and product (`pro_01m1dba25qb1evkeag8pqhkp1s` = "Reattend Personal") before installing it. Swapped into prod `.env.local` (old one backed up), `pm2 restart --update-env`; `/api/billing/transactions` now 200s with no Paddle 403 in the log. **The key was pasted in plaintext in chat - it should be rotated.**
- **Inbox was capped at 100** so 500+ of Partha's 615 items were unreachable. The API already supported `offset` but reported `total: enriched.length` (the page size). Now: real count, `hasMore`, `?q=` server-side search over title+body, new `POST /api/notifications/bulk` (accept/reject/rescue/dismiss over an id array, ownership enforced per row, unknown ids skipped rather than failing the batch). UI: search box, per-row checkboxes, select-all-shown, bulk bars, load-more, true tab counts. Verified with 130 seeded items: all 130 reachable, search narrowed to 19 server-side, bulk accept cleared 19 in one request.
- **Two contradictory labels fixed:** the banner said "N memories flagged for review" while counting unread *notifications*, directly above a pulse metric reading "0 need review" counting overdue *verification cadences*. Now "N items waiting for you" and "due for re-check".
- **Extension v0.4.1: the pin is draggable** and remembers where it was dropped (viewport fractions in `chrome.storage.sync`, clamped on drop and resize). 4px threshold keeps a non-moving press a one-tap capture. `reattend-extension-v0.4.1.zip` built.
- **Pricing, still open (Partha to decide):** current live model is Free BYOK / **Managed $15 seat** (self-serve to 99) / **Enterprise $29 seat** (5+). Partha floated $19. My recommendation: raise Managed $15→$19, keep Enterprise $29, keep two paid tiers rather than three. Caveat: that is a **27% rise for existing subscribers** - grandfather them in Paddle. Trial: keep **no-card** (current behaviour; `start-trial` never touches Paddle). Self-serve Enterprise: worth adding a "Buy Enterprise" button with a seat stepper beside "Talk to sales", **but SSO must be verifiably self-configurable first** - `/app/admin/[orgId]/sso` renders but an end-to-end SSO setup has never been tested.
- **Extension next:** publish 0.4.1 to the Web Store (the Google-approved build is the OLD one - 0.4.x with the selection button, cross-tenant support and the draggable pin has never been published). Then live in-page suggestions, which Partha approved - **must be off by default and per-site opt-in**, or it is both a privacy story to defend to Google and an uninstall driver.

**Paddle key rotated + extension org-billing fix (2026-09-10, `7199647`).**

- Partha could not rotate the old Paddle key, so he issued a new one and put it in the local `.env.local`. Verified it against `/transactions`, `/subscriptions`, the Personal price and product **before** installing, then wrote it to prod (old file backed up) and `pm2 restart --update-env`. `/api/billing/transactions` 200s, zero 403s. **Receipts are working.**
- **Extension gate read the wrong subscription.** `requireExtensionAccess` called `getOrCreateSubscription(callerId)`, but in an org billing lives on the org's `createdBy` row - so on a paid org **only the billing owner could use the extension and every other member got a 402** despite the org paying for them. Now reads `getOrgBillingSubscription(orgId)` with a fallback to the caller's row for personal accounts, and the 402 copy is org-aware (telling a member to "connect a key" was useless - org keys are admin-only). Verified on prod: the `Tests` org resolves to `professional/active`, so every member now passes.
- **Cross-tenant answer:** one build, one URL. Default `baseUrl` is `https://reattend.com`; the token identifies the account and the server resolves personal vs org. **Trap:** a token minted against the old `personal.reattend.com` will not work - re-generate from reattend.com.
- Extension **v0.4.1** built and zipped (`reattend-extension-v0.4.1.zip`), loadable unpacked from `dist/`. Web Store still has the OLD approved build.
- **Blocked on Partha:** new Paddle price IDs for Managed $19/mo + $182.40/yr (grandfathering the two live $15 subscriptions), confirmation that the Enterprise $29 price IDs are real, the Web Store upload, and a decision on whether to verify SSO end-to-end before shipping self-serve Enterprise.

**Remember:** never mix Personal and Enterprise (Partha, repeated). Concretely now: personal code paths key off "no org", never off a hostname or a separate DB.
