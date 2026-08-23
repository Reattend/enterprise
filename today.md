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
  canonical URL is now bare `reattend.com`. `package.json` name is now `"reattend"`, PM2
  `ecosystem.config.js` process name is now `reattend` (not `enterprise`), deploy path is now
  `/var/www/reattend` (not `/var/www/enterprise`). **CLAUDE.md's deploy section is stale on this
  — it still says `/var/www/enterprise` + `pm2 stop enterprise`.** Verify the live droplet path
  before running the documented deploy command; don't trust CLAUDE.md's literal paths here
  without checking `pm2 list` first.
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

**⚠️ Superseded by the rebrand in §0.1 — domain, PM2 process name, and deploy path all changed
on 2026-05-02. The table below reflects the current repo config (`package.json`,
`ecosystem.config.js`); the droplet's actual live state hasn't been re-verified since.**

| Thing | Value |
|---|---|
| Local repo | `/Users/partha/Desktop/enterprise` |
| Extension repo | `/Users/partha/Desktop/enterprise_extension` |
| GitHub (app) | `github.com/Reattend/enterprise` |
| Droplet | `167.99.158.143` |
| PM2 process | `reattend` (was `enterprise` — renamed in `ecosystem.config.js`, verify with `pm2 list` before deploying) |
| Domain | `https://reattend.com` (was `enterprise.reattend.com`, see §0.1) |
| Deploy path on droplet | `/var/www/reattend` (was `/var/www/enterprise` — `ecosystem.config.js` `cwd` confirms this) |
| DB | SQLite via better-sqlite3 + Drizzle |
| Migrations | `npx tsx src/lib/db/migrate.ts` (custom, additive) |
| LLMs | Claude Sonnet for all 8 ask endpoints (Haiku-tiering was tried 2026-05-05 for cost, reverted same day) · Groq Whisper |
| Nango | proxy-fetcher pattern now, not Nango-hosted syncs — see §0.5. Self-hosted at `https://nango.enterprise.reattend.com` per the original setup; re-verify this URL still resolves post-rebrand. |
| Test/staging | `test.reattend.com` — separate droplet, see §0.6 and `STAGING.md` |
| Rabbit | not deployed (Year 2). Active dev repo is `/Users/partha/Desktop/rabbit`. |

Deploy (verify PM2 process name + path on the droplet first — see warning above):
`git push` → `ssh root@167.99.158.143 "cd /var/www/reattend && git pull --ff-only && pm2 stop reattend && rm -rf .next && NODE_OPTIONS='--max-old-space-size=3072' npm run build && pm2 start reattend --update-env"`.
Always include `npx tsx src/lib/db/migrate.ts` if schema changed. Full reasoning for the
stop-before-build sequencing is in CLAUDE.md's deploy section (still accurate on the *why*, just
check the *names* first).

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
