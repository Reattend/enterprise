# Reattend Enterprise — Session Handoff

**Last updated:** 2026-04-25 (end of Sprint O-a · sandbox + hardening)
**Branch:** `main` — pushed
**Live at:** https://enterprise.reattend.com · public sandbox at https://enterprise.reattend.com/sandbox
**Sprints shipped:** A, B, C, D1-D3, E, F, G, H, I, J, K, L, M, N, O-a (sandbox + hardening)
**Sprints remaining before launch:** O proper (UI/UX polish — interactive with user), P (Nango), Q (infra), R (billing), then launch

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
| Nango | not deployed (Sprint P) |
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
