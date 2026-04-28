# Reattend Enterprise — Session Handoff

**Last updated:** 2026-04-28 (Sprint P · self-hosted Nango live at nango.enterprise.reattend.com, PM2 wired, only OAuth provider apps remain)
**Branch:** `main` — pushed
**Live at:** https://enterprise.reattend.com · public sandbox at https://enterprise.reattend.com/sandbox
**Sprints shipped:** A, B, C, D1-D3, E, F, G, H, I, J, K, L, M, N, O-a, O-b, P (code-complete — see §11)
**Sprints remaining before launch:** rest of O (UI/UX polish), Q (infra hardening), R (billing), then launch

---

## 1. Where it runs (unchanged)

| Thing | Value |
|---|---|
| Local repo | `/Users/partha/Desktop/enterprise` |
| Extension repo | `/Users/partha/Desktop/enterprise_extension` |
| GitHub (app) | `github.com/Reattend/enterprise` |
| Droplet | `167.99.158.143` |
| PM2 process | `enterprise` |
| Domain | `enterprise.reattend.com` |
| DB | SQLite via better-sqlite3 + Drizzle |
| Migrations | `npx tsx src/lib/db/migrate.ts` (custom, additive) |
| LLMs | Claude (answering) · Groq Llama 3.3 + Haiku rerank · Groq Whisper |
| Nango | self-hosted at `https://nango.enterprise.reattend.com` (Docker on droplet, SSL live, admin = `pb@reattend.ai`, PM2 env wired). Only OAuth provider apps remain. See §11. |
| Rabbit | not deployed (Year 2) |

Deploy: `git push` → `ssh root@167.99.158.143 "cd /var/www/enterprise && git pull --ff-only && rm -rf .next && npm run build && pm2 restart enterprise"`. Always include `npx tsx src/lib/db/migrate.ts` if schema changed.

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

### Sprint O — UI/UX polish (the bonfire before Nango) · ~2 days
- Spacing + typography audit
- Loading states everywhere
- Error boundaries
- Animation timing standardization
- Mobile/tablet final pass at 375 / 768 / 1024
- Accessibility (keyboard nav, screen reader, focus rings, color contrast)
- Empty states on every surface
- Toast consistency
- Dark mode review
- Lighthouse 90+ on Home / Ask / Legend / Landscape
- Microcopy review

### Sprint P — Nango + Slack/Notion/MS Teams · ~3-4 days
- Self-host Nango or managed
- Slack connector (decision-from-pinned-thread workflow)
- Notion connector (workspace or selected-db)
- MS Teams (meetings + channels + files)
- Slack bot (inline ask)
- Per-connector permission preview
- Real-time sync status card on Home

### Sprint Q — Infrastructure hardening · ~1 day
- WAL + nightly R2/S3 backups
- HA / second droplet plan
- Sentry monitoring
- Status page
- Secret management (Doppler / dotenv vault)
- Cron jobs verified running

### Sprint R — Billing + pilot signup · ~2 days
- Paddle/Stripe enterprise subs
- Org-level plan management UI
- 30-day trial flow with auto-seeded demo data
- Seat-based billing + invoicing
- Pilot signup from landing
- Gov "Quote" path

Then launch.

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
git log --oneline -5           # last 5 sprints visible
npm run test:rbac              # 36/36 passing
```

Tell next session: "Read today.md and pick up Sprint O proper (UI/UX polish — interactive)." It will know.

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
