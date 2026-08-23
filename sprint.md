# Reattend Enterprise — Sprint Roadmap

**Last updated:** 2026-08-21 — see `today.md` §0 for the full 2026-04-28 → 2026-06-06 catch-up
this doc missed (139 commits: rebrand to plain `reattend.com`, Personal/Org merge, billing,
RBAC finalization, Nango proxy-fetcher connectors, staging environment, Landscape Space mode).
**First client:** **Government / secure org** (gov track is priority, SMB second) — unchanged
strategically, though marketing dropped the separate "Enterprise" brand name (today.md §0.1)
**Launch target:** O/P/Q/R all have commits behind them now. What's left is narrower: the
Sentry/status-page/HA slice of Q, an accessibility+Lighthouse pass, and confirming two
unverified items (Nango OAuth app registration, Paddle live-mode). See `today.md` §5.

---

## Strategic anchors

- **Two ICPs, one product:**
  1. **Government & secure orgs** — first client. Paper-heavy, admin-turnover-heavy, on-prem-required. We deploy manpower to scan documents, train staff, operate as a semi-managed service. **OCR quality is mission-critical.**
  2. **SaaS / startups up to 200 employees** — second client set. Cloud-native, Nango-connected. Slack / Notion / MS Teams first; Google deferred until post-CASA.
- **Amnesia is the wedge.** Decisions, Exit Interviews, Handoffs, Time Machine, Self-healing — these are the spine of every demo.
- **Nango + connectors are LAST** before launch. UI/UX polish is the sprint immediately before Nango ("the bonfire").
- **Managed AI now, on-prem Rabbit later.** Every production Q&A pair is future training data. Rabbit replacement is year 2.

---

## Where we are right now

**✅ Shipped & live at https://reattend.com** (domain changed from `enterprise.reattend.com`
on 2026-05-02 — see `today.md` §0.1)

**Since Sprint O-a (this section was last accurate), also shipped:**
- **O proper** — full design relaunch across public + app pages (`today.md` §0.4). Accessibility/
  Lighthouse audit from the original checklist not confirmed done.
- **P** — Nango connectors via proxy-fetcher pattern: Slack, Notion, GitHub, Linear, Drive,
  Confluence+Jira, Google Calendar (`today.md` §0.5). OAuth app registration in Nango admin
  unverified. MS Teams not done.
- **Q (partial)** — WAL mode + 3-layer backup plan done; Sentry, status page, HA still open
  (`today.md` §0.7).
- **R** — Paddle billing live: checkout, portal, trial banner, AI quota gate, downgrade cron
  (`today.md` §0.2). Live vs sandbox Paddle keys unconfirmed.
- **Personal/Org unification** — not in the original roadmap at all. Personal Reattend and
  Enterprise are now one product with a context switcher, not two separate codebases
  (`today.md` §0.1).
- **Staging environment** — `test.reattend.com`, 163-user synthetic org, fully separate from
  prod (`today.md` §0.6, `STAGING.md`).
- **Landscape Space mode** — 3D memory constellation, new default view at `/app/landscape`
  (`today.md` §0.8).

---

**Original pre-O-a shipped list (kept for history):**

Foundations + Sprints A through O-a:
- Org hierarchy, RBAC (8-rule record visibility, two-tier roles), Decisions, Transfers, Policies, Agents (10 seeded), Wiki
- **Sprint A** — voice capture, Ask Experts, reasoning trace
- **Sprint B** — Start My Day, Memory Resurface, Oracle Mode
- **Sprint C** — Brain Dump, Blast Radius, Onboarding Genie
- **Sprint D1-D3** — polish (empty states, notifications, audit drill-down, mobile, RBAC tests)
- Time Machine (point-in-time scrubbing)
- **Sprint E** — unified `/app/ask` (Chat + Oracle), unified `/app/landscape` (Temporal + Causal)
- **Sprint F** — integrations placeholder, DeepThink killed, capture deduped, Memory ↔ Wiki cross-links
- **Sprint G** — Exit Interview Agent, Handoff Generator, Legend page
- **Sprint H** — Meeting Prep + Action Agents (Draft Email Reply, Draft Team Broadcast)
- **Sprint I** — Glean + Guru polish: Trust badges, Verification cadence, Announcements, Trending, Admin analytics, Prompt library, Oracle passage highlighting
- **Sprint J** — Notifications + Agent runtime + Anonymous Ask
- **Sprint K** — Enterprise-grade OCR (Tesseract + pdf-parse, PII redaction, batch upload, quality dashboard) — gov track hero
- **Sprint L** — Compliance pack: WORM audit log (sha256 chain), GDPR self-export + erasure, public `/compliance` page, StateRAMP + CJIS docs
- **Sprint M** — Chrome extension policy + ambient corner card; `/api/tray/*` endpoints
- **Sprint N** — Demo org seeder + 12-min demo runbook + landing/pricing refresh
- **Sprint O-a** — **Public sandbox with 5 role personas + scripted AI fixtures** + RBAC hardening + isolation guards + persona diversity + AI-vendor cleanup from user-facing copy

Full feature catalog lives at `/app/legend` and in `today.md`. Recent commits since Sprint H are tracked in `today.md`.

---

# REMAINING PRE-LAUNCH SPRINTS

> Sprints H through O-a are shipped. The detailed scopes for each are kept below for reference, but the load-bearing sprints from here are **O proper → P → Q → R**.

---

## ✅ Sprint O proper — UI/UX polish — shipped, differently than planned

Didn't happen as a discrete polish pass — instead the whole app went through `claude.ai/design`
handoffs (Stripe-style landing, split-screen sign-in, redone Home/Capture/Memories/Landscape/
Wiki, warm-cream + indigo-violet theme app-wide). See `today.md` §0.4 for the commit list.

**Genuinely still open from the original checklist** (no commit confirms these):
- Accessibility — keyboard nav, screen-reader labels, focus rings, color contrast AA+
- Lighthouse 90+ on Home, Ask, Legend, Landscape
- Error boundaries — unclear if react error states got a pass
- Dark mode full review

## ➡️ NEXT — pick from the actually-open items

With O/P/Q/R all having shipped work behind them, there's no single "next sprint" anymore —
what's left is a punch list (`today.md` §5):
1. Sentry + status page + HA plan (rest of Sprint Q)
2. Accessibility + Lighthouse pass (leftover from O)
3. Confirm Nango OAuth apps are registered (leftover from P)
4. Confirm Paddle is on live keys, not sandbox (leftover from R)

---

# REFERENCE — completed sprints (kept for context)

## ✅ Sprint H — Meeting Prep + Action Agents

**Goal:** Close the day-in-the-life demo. Completes the "AI that works FOR me" beat.

**Deliverables:**
- `calendar_events` table + migration
- Meeting Prep Card on Home — shows next meeting in 15-min window with Claude-generated brief (last related decision, 3 relevant memories, open questions, attendee context)
- Admin utility to seed demo meetings (for pilot)
- Action agent #1: **Draft Email Reply** — paste thread, Claude composes memory-grounded reply
- Action agent #2: **Draft Team Broadcast** — pick a decision, Claude drafts Slack-style announcement + email variant
- `/app/agents` page gets an "Action agents" section with these two live + 6 coming-soon tiles
- Legend page updated

**Unlocks:** Day-in-the-life demo steps 2 + 4. The "it actually works for me" feeling.

---

## ✅ Sprint I — Glean + Guru polish pack · ~1.5 days

**Goal:** Steal category-validated UX patterns. Addresses "why not Glean?" objection.

**Deliverables:**
- **Guru: Verification cadence** — every memory gets owner + "verify every 30/60/90 days"; stale feeds Self-healing
- **Guru: Trust levels** — Verified / Unverified / Stale / Contradicted badges in Memory list
- **Guru: Announcements banner** — admin pins org-wide banner
- **Guru: Trending widget** — Home card "Hot in [dept] this week"
- **Glean: Admin analytics dashboard** — top unanswered questions, most-viewed memories, reach per dept
- **Glean: Collaboration graph** — Wiki People tab enhanced with co-authorship edges
- **Glean: Passage-level highlighting** — in Oracle answers, highlight the exact source sentence
- **Glean: Prompt library** — team-shared prompts, per-agent
- **Glean: Per-connector permission preview** — scaffolding for Sprint P

**Unlocks:** "Feels like a mature product." Materially closes the gap.

---

## ✅ Sprint J — Notifications coverage + Agent runtime · ~1.5 days

**Goal:** Close the defined-but-never-emitted notification types. Agents do things, not just answer.

**Deliverables:**
- Emit `mention` (when commenter @-refs someone)
- Emit `suggestion` (when contradiction detector finds one)
- Emit `needs_review` (low-confidence triage writes)
- Agent execution worker — agents run against corpus on schedule, log results to job_queue
- Agent analytics in the Activity tab (who ran, when, what outcome)
- Fix/build agent chat routes (`/api/enterprise/agents/{id}/chat`)
- Anonymous Ask (HR use case — asker hidden, answer public)

**Unlocks:** Notifications feel alive. Agents aren't just metadata.

---

## ✅ Sprint K — Enterprise-grade OCR · ~2-3 days · **GOV TRACK HERO**

**Goal:** Paper-to-memory at legal-grade accuracy. **This is our first-client unlock.**

**Deliverables:**
- Worker pipeline: scanned PDF → text → normal ingest
- **Tesseract baseline** — fallback for simple scans
- **Nougat / Amazon Textract layer** — complex layouts, tables, forms, multi-column
- **Confidence scoring per page** — pages below threshold flagged `needs_review`
- **PII redaction pass** — SSN / phone / address / credit card detection + masking, configurable per-org
- **Document de-skew + de-noise** preprocessing
- **Multi-language support** (English + Spanish minimum; French for Canadian gov later)
- **Legal hold flag + retention schedules** per record type (1yr / 7yr / 50yr)
- **Batch upload** — admin uploads a folder of 100+ scans; worker processes in background with progress visible
- **Audit trail** on every OCR event (original doc hash, processing time, confidence, redactions applied)
- **OCR quality dashboard** in admin cockpit — "% high-confidence, % needs-review"

**Unlocks:** The gov conversation. Without this we can't demo to a state CIO. **Priority is ACCURACY over speed.**

---

## ✅ Sprint L — Compliance pack · ~2 days

**Goal:** Unblock enterprise + gov procurement checklists.

**Deliverables:**
- **SSO SAML** real implementation (not stub) — Okta + Entra tested
- **Audit log WORM** — append-only, cryptographically chained (hash-linked rows) so tampering is detectable
- **GDPR data export** — user downloads everything we have on them
- **Right-to-erasure flow** — hard delete + immutable audit record
- **Privacy policy + Terms of Service** — proper enterprise versions (not Personal Reattend's)
- **Trust / security page** — SOC 2 roadmap, encryption specifics, data residency options, SOC 2 Type I timeline
- **StateRAMP Moderate prep** — security plan document, control mapping (paperwork starts; full cert is year 2)
- **CJIS addendum** — for law-enforcement-adjacent gov clients, document the controls

**Unlocks:** Gov procurement conversation. Most SMB buyers also want the trust page before signing.

---

## ✅ Sprint M — Chrome extension (Enterprise port) · ~1.5 days

**Goal:** Ambient capture + surfacing without any server-side OAuth or CASA.

**Deliverables:**
- Manifest v3 service worker + content script (ported from Personal Reattend)
- Per-org admin whitelist of domains + per-user additive personal list
- Floating "Capture to Reattend" pin on whitelisted pages
- Ambient "related memory" card when current URL appears in any memory
- API token flow in `/app/settings`
- Install instructions + one-click install link
- Extension respects org RBAC — member never sees admin-scope ambient cards

**Unlocks:** Gmail capture without Google OAuth / CASA. Guru-style "memory on every page" demo.

---

## ✅ Sprint N — Demo org + seed data + runbook · ~1 day

**Goal:** Pilots + sales demos land in a product that looks already-used.

**Deliverables:**
- Seeder script for "Acme Corp" demo org — 200 synthetic people, 18 months of memories, 40 decisions, 8 policies, 3 completed exit interviews with handoff docs, Onboarding Genie samples, realistic OCR'd docs
- Demo script runbook (90-second Exit Interview moment, full day-in-the-life walkthrough, Blast Radius moment)
- Landing page refresh at `enterprise.reattend.com/`
- Pricing page (two tiers: Team / Enterprise — gov quote-only)
- 3-min video walkthrough recording

**Unlocks:** You can hand the droplet URL to any prospect and they see a live, used product.

---

## Sprint P — Nango + Slack / Notion / MS Teams · ~3-4 days

**Goal:** Turn off "stubs" mode. Three connectors, done right. Google / SharePoint / Confluence post-launch.

**Deliverables:**
- **Nango self-hosted on droplet** (managed Nango Cloud as fallback if self-host blocks)
- **Slack connector** — channel allow-list, decision-proposal from pinned threads, verified ack workflow
- **Notion connector** — workspace or selected-db ingestion
- **MS Teams connector** — meetings + channels + files
- **Slack bot** — inline ask with citations, "save this thread as a memory" button
- **Per-connector permission preview** (from Sprint I) actually fires before user connects
- **Sync status card** on Home shows real state per connector
- **Admin cockpit → Integrations page** becomes real (replaces Sprint F placeholder)
- **Coming-soon tiles** for Google (post-CASA), SharePoint, Confluence, SAP, Jira, Linear, GitHub, Salesforce

**Unlocks:** Pilots use the product on real data. The demo isn't seeded anymore — it's real.

---

## Sprint Q — Infrastructure hardening · ~1 day

**Goal:** Losing customer data becomes non-negotiable.

**Deliverables:**
- SQLite + WAL + automated nightly backups to R2/S3 (Postgres migration plan for year 2 at 50+ orgs)
- HA considerations (second droplet behind load balancer if pilot traffic demands)
- Nginx rate limiting + DDoS mitigation
- All cron jobs verified running (self-healing, weekly digest, memory resurface, verification reminders, OCR worker)
- Log retention + rotation policy
- Sentry error monitoring
- Status page (status.reattend.com or embedded)
- Health check endpoints
- Proper secret management (Doppler / dotenv vault)

**Unlocks:** Legitimate 99.9% uptime claim. No accidental data loss.

---

## Sprint R — Billing + pilot signup · ~2 days

**Goal:** People can give you money.

**Deliverables:**
- Paddle or Stripe **enterprise** subscriptions (not personal — that was removed in Sprint E)
- Org-level plan management at `/admin/:orgId/settings/plan`
- Free 30-day trial flow (seeds demo data automatically)
- Seat-based billing with overage handling
- Invoicing + receipts
- Pilot signup flow from landing page
- In-app upgrade prompts at quota boundaries
- Gov "Quote" path — no self-serve, contact-sales

**Unlocks:** Revenue. Literally.

---

## Launch

- Security audit walkthrough (team + external consultant if needed)
- Load test — 200 concurrent users, 10k memories, 1k searches/min
- Final demo dress rehearsal
- Reference customer testimonials (if any pilots closed during M-R)
- Press kit
- Product Hunt / X / LinkedIn announcements ready
- Day-1 playbook (first-hour support, metrics to watch, rollback plan)
- Gov pilot kickoff scheduled (assisted-onboarding trainer dispatched to first client)

---

# POST-LAUNCH ROADMAP

## Quarter 1 after launch (first 90 days)

- **SOC 2 Type I audit kickoff** — 6-month process, start immediately
- **Google OAuth verification** (non-sensitive scopes) for Gmail metadata, Calendar, Drive metadata
- **First gov pilot execution** — assisted onboarding, OCR of legacy docs, staff training cadence
- **First SMB pilots** (3-5 companies) onboarded via Nango
- **Meeting intelligence partnership** — integrate Otter/Fathom/Fireflies as *export source* (we don't build transcription; we consume their output)
- **Jira / Linear / GitHub connectors** — pilot-driven order
- **Weekly digest cron** actually firing with rich content
- **Prompt library** content seeding for each vertical

## Quarter 2-3 after launch

- **Mobile apps** (iOS + Android) — read + search + voice capture. Write flows simpler than web.
- **Action agents going live** — Send Slack, Create Linear, Schedule Cal, Update Notion (the "coming soon" grid becomes real)
- **Collaboration graph v2** — ML-enhanced, not just co-occurrences
- **Work-graph-aware search ranking** — personalization based on recent activity, dept, role
- **Google CASA preparation** (budget $15-75k, 3-month process)
- **SOC 2 Type II audit** — kicks off after Type I lands
- **Sharepoint + Confluence connectors**

## Year 2

- **On-premise Rabbit deployment** — first gov client that asks for it. Claude-to-Rabbit distillation using 6+ months of production Q&A pairs.
- **Multi-region deployment** (EU + APAC data residency for enterprise)
- **Enterprise search ranking tuning** — 6 months of telemetry, personalization ML
- **StateRAMP Moderate full certification** (if first gov client is a state)
- **CJIS full certification** (if a law-enforcement-adjacent client needs it)
- **FedRAMP Moderate prep** (if federal gov interest materializes)
- **Advanced action agents** — multi-step workflows, task orchestration
- **Voice mode** — "brief me on the 10am" — walking-to-meeting mode
- **Artifacts-style editable outputs** — inline document generation (Claude-style)
- **F500 conversation** starts — we have references + compliance + scale

---

# NOT BUILDING NOW (deliberate exclusions before launch)

These were considered and deferred. Listed so we don't accidentally drift into them.

| Thing | Why deferred |
|---|---|
| Native mobile apps | Year 2. Web-responsive is sufficient for launch; Sprint O mobile pass covers baseline. |
| Full F500 compliance (SOC 2 Type II, FedRAMP) | 6-12+ month process. Type I starts post-launch; Type II is Q2+. |
| Google OAuth + CASA | $15-75k cost, 3-month wait. Defer until a Workspace-domain customer pays for it. Chrome extension covers Gmail for free in the interim. |
| Enterprise search ranking / personalization ML | Glean has a 3-year head start here. Our corpus per-org is small enough that FTS + semantic is fine for launch. Year-2 investment. |
| On-prem Rabbit | Need 6+ months of production Claude Q&A pairs to distill from. Year 2. |
| Multi-region data residency | EU + APAC specific demand signal first. |
| Advanced action orchestration (multi-step agent workflows) | v1 is single-step drafts. Orchestration post-launch once we know what users actually chain. |
| Voice "brief me" mode | Cool demo, but needs real calendar + stable mic UX. Post-launch. |
| Artifacts-style editable output | Generate-then-edit is the upgrade over Claude-style. Post-launch. |
| Transcription (Otter/Fathom clones) | Tar pit — don't build. Consume their output when partners exist. |
| Collections / freeform whiteboards | Had `/app/board`; removed in Sprint E. Projects + Wiki cover the need. |
| Prompt library full curation by vertical | Seeded in Sprint I, full content curation Q1 post-launch. |
| Advanced analytics (reach, time-to-answer, knowledge velocity) | Baseline in Sprint I. Deep analytics product is post-launch. |
| Mobile push notifications | Needs mobile apps first. |
| Desktop app | Was a Personal Reattend thing. Not enterprise-relevant. |
| Audio/video conferencing | Not our lane. Integrate with Zoom/Meet/Teams as data sources. |

---

# Quick reference — what each file/surface is for

- `today.md` — session handoff + product state snapshot (updated every sprint)
- `sprint.md` — this file (updated when scope changes)
- `CLAUDE.md` — codebase instructions, architecture, tech stack
- `/app/legend` — canonical in-product feature catalog for users
- `scripts/test-rbac.ts` — `npm run test:rbac`, 36/36 passing
- `src/lib/enterprise/rbac.ts` — source of truth for role matrix

**Deploy command**: see § 2 of `today.md`.
**Migration command**: `npx tsx src/lib/db/migrate.ts` (custom migrate script, not drizzle-kit).

---

*Sprint H kicks off immediately after this file lands in git.*
