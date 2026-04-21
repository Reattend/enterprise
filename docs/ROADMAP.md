# Reattend Enterprise — Roadmap & Strategy

**Last updated:** 2026-04-20
**Purpose:** single source of truth for what we've built, what's broken, what's next, and why. Kept terse. Updated after every substantial session.

---

## What we're building (one-liner)

Reattend Enterprise is the **organizational memory layer** — every decision, policy, meeting, document, and piece of institutional knowledge captured, linked, and preserved across the ingress of Nango-connected sources. It overlaps Glean + Cohere + MS Copilot while adding the one thing none of them have: temporal memory with decision tracking, self-healing, and knowledge-stays-with-role transfer.

## Strategic positioning

| | Glean | Cohere | MS Copilot | **Reattend Enterprise** |
|---|---|---|---|---|
| Connected search | ✓ | ✗ | ✓ (MS only) | ✓ |
| LLM chat over org | ✓ | ✓ | ✓ (MS only) | ✓ |
| Agent builder / AI apps | ✓ | partial (Coral) | partial (Copilot Studio) | ✓ |
| Governance console | ✓ | ✗ | ✓ | ✓ |
| On-prem / air-gapped | ✗ | ✓ | ✗ | ✓ (Rabbit v2.1) |
| **Temporal memory (decisions + reversals)** | ✗ | ✗ | ✗ | **✓** |
| **Self-healing (stale / contradictions)** | ✗ | ✗ | ✗ | **✓** |
| **Knowledge-stays-with-role** | ✗ | ✗ | ✗ | **✓** |
| **7+ level org hierarchy (govt-ready)** | limited | ✗ | ✗ | **✓** |
| Price/user/month | $25 | custom | $30 (E5) | **$8 (Business)** |

**Tagline direction:** *Organizational memory. The layer beneath search.*

---

## Requirements (hard constraints)

1. **Everything org- and role-bound.** Users see only what their role + team + dept + policies entitle them to. No exceptions.
2. **Replace Copilot inside Microsoft shops.** Every knowledge-work task Copilot does, we do it with broader scope + temporal memory.
3. **Glean + Cohere overlap, plus our moat.** See table above.
4. **Dynamic scale — 10-person startup to 10,000-employee ministry.** Same product, feature-gated + infra-swapped by tier.
5. **Solve organizational amnesia end-to-end.** Capture → Triage → Store → Embed → Link → Surface → Protect → Transfer. No step weak.

---

## Architecture tiers

| Tier | Users | DB | LLM | Ingestion | Search | Deployment |
|---|---|---|---|---|---|---|
| Starter | 10–50 | SQLite (WAL) | Groq + Claude (SaaS) | in-process | FTS5 + sqlite-vec | Vercel / single VM |
| Business | 50–500 | Postgres + pgvector | Groq + Claude (SaaS) | job queue (Redis / SQS) | Postgres FTS + pgvector | DO droplet / AWS |
| Enterprise | 500–10K | Postgres (sharded by org) | Rabbit on-prem option | dedicated workers | Postgres + optional Elasticsearch | Kubernetes |
| Government | dept-level | Postgres on-prem | Rabbit on-prem required | air-gapped | local Elasticsearch | on-prem bare metal |

**Same UX.** Features feature-gated: SSO (Enterprise+), on-prem (Enterprise+), custom taxonomy (all), integrations count (per tier), seat limits.

---

## The end-to-end amnesia loop

```
  CAPTURE (Nango integrations + manual + desktop + Chrome ext + email forward)
    ↓
  TRIAGE   Claude extracts: type, title, summary, entities, tags, decision?
    ↓
  STORE    records + decisions + policies + attachments tables
    ↓
  EMBED    FastEmbed BGE (semantic) + FTS5 (lexical)
    ↓
  LINK     linking agent: same_topic, contradicts, continuation_of, leads_to
    ↓
  SURFACE  Search · Chat · Graph · Agents
    ↓
  PROTECT  Self-healing: stale / orphaned / contradiction / gap detectors
    ↓
  TRANSFER Knowledge-stays-with-role: offboard preserves role + handover notes
```

Any step weak → amnesia leaks. Today: CAPTURE needs Nango; all others structurally present.

---

## Nango integration UX

### For the admin
1. **Integrations** page (cockpit) lists 400+ connectors (Nango catalog)
2. Click **Connect Gmail** → choose user-level (each user OAuths) or workspace-level (service account)
3. Backfill window (default: 30d), sync frequency (real-time via webhook / hourly / daily)
4. Save config → config lands in `integrations_connections` + Nango creates the connection

### For the employee
- Home shows **Sync status** card: `Gmail ✓ · Slack ✓ · Drive 47% initial sync · Confluence not connected`
- Each sync shows today's counts + errors + last-sync timestamp
- Profile → Connected integrations → pause / disconnect

### Data path
```
Nango (OAuth + sync)
  → webhook to /api/integrations/webhook
    → raw_items row (source='gmail'/'slack'/…)
      → existing triage pipeline
```

### Permissions
- Nango returns source permissions with each item
- We mirror into record visibility (`private | team | department | org`)
- Drive doc shared only with Finance → record inherits Finance-only
- This is the non-negotiable feature for Glean parity

### Top 10 sources for launch
1. Gmail · 2. Slack · 3. Microsoft Teams · 4. Google Drive · 5. SharePoint (Nango on-prem for gov)
6. Confluence · 7. Notion · 8. Jira · 9. GitHub · 10. Salesforce

---

## The org wiki (emergent, not separate)

The wiki **isn't a new surface** — it's a reorganized browse over existing memory.

### Three navigation axes
1. **Hierarchy**: Org → Dept → Team → Project → Record
2. **Topics** (Claude-inferred clusters): *Tax treaty negotiations*, *Hiring freeze history*, *Client: Nike*
3. **People**: each person's page — what they decided, roles they hold, their team context

### Per-page auto-content (Claude)
- Summary (from constituent memories)
- Related topics / decisions / policies
- Recent activity (7-day window)
- Contradictions warning if any
- Stale badge if content > threshold old

### Integrated interactions
- Every page queryable via **Chat scoped to that page**
- Search always scoped to user's access
- Graph overlay available on any page

**For Monday demo:** we don't ship a dedicated `/app/wiki` — the existing Search + Chat + Graph + Team + Projects surfaces already *are* the wiki. A dedicated browse view is v2.

---

## Current state (what's built)

### Admin cockpit (8 tabs)
Overview · Members · Departments · Roles · Decisions · Self-healing · Audit log · Taxonomy · SSO · Settings

### Employee experience (8 sidebar items)
Home · Memory · My team · Decisions · Graph · Agents · Policies · Settings
Plus: **Capture** + **Chat** buttons (primary), **Search** in topbar (⌘K)

### Data model
- 20+ tables across auth / workspaces / records / embeddings / projects / boards
- Enterprise: organizations · departments · organization_members · department_members · employee_roles · role_assignments · decisions · audit_log · sso_configs · knowledge_health · workspace_org_links · record_role_ownership · enterprise_invites · organization_taxonomy · agents

### AI pipeline
- Triage (Groq Llama 3.3 70B)
- Embedding (FastEmbed BGE local)
- Linking (similarity + entity overlap)
- Ask (Claude Sonnet for SaaS, Rabbit for on-prem)
- Self-healing (4 detectors: stale, orphaned, gap, contradiction + rehash)

### Demo seed
Ministry of Finance — 7-level hierarchy, 22 members, 12 decisions (3 reversed, 1 superseded), 11 record_links, 5 real agents with system prompts, 3 offboardings, 2 vacant roles with orphaned records.

---

## Known bugs (as of today)

| # | Bug | Fix | Effort |
|---|---|---|---|
| 1 | Onboarding page shows even when user has an org | Redirect to /app/admin/[orgId] if user has orgs | 15min |
| 2 | Creating a project doesn't show up in the list | Re-fetch projects after POST; ensure workspace scope correct | 20min |
| 3 | "Reattend suggests projects" doesn't work / Claude not wired | Lower MIN_CLUSTER=2, truthful UI copy, wire Claude for naming | 2h |
| 4 | Graph is basic — needs Miro-like interactivity | Fullscreen, manual link creation, edge labels, delete, search, cluster containers | 5-6h |
| 5 | Clicking "Chat" on agent opens full page, should open side drawer | New AgentChatDrawer component, invoked from agent cards | 4h |

---

## Priority queue — committed sprint plan

Order locked. Demo polish moved to LAST — real features first.

### Sprint 1 — Ingestion depth (~2 days) ← **in flight**
1. **Content-hash deduplication** — SHA-256 on raw_items before triage; flag duplicates
2. **Near-duplicate detection** — embedding cosine > 0.95 → merge + cross-reference
3. **Extractors** — PDF (pdf-parse), DOCX (mammoth), XLSX (xlsx); plumb into ingestion
4. **Cross-encoder reranker** — top-50 from hybrid → Claude Haiku ranks → top-10 go to chat

### Sprint 2 — Enterprise RBAC (~2 days)
5. **Per-record `visibility` column** (`private | team | department | org`) + migration
6. **Record-level access filter** in every read API (search, chat, graph, memory list)
7. **Role-cascading rules** — VP sees dept-tree, dept_head sees dept, manager sees team, member sees team + private
8. **Cross-dept sharing** — explicit "share with department X" action on record detail
9. **RBAC integration test suite** — HR user cannot see Engineering records via any surface

### Sprint 3 — Nango scaffolding (~DONE, full rollout deferred)
**Status**: scaffolding shipped. Full production rollout moved to Sprint 10.5
(self-hosted Nango on reattend.com infra) so every OAuth callback is
`nango.reattend.com/oauth/callback`, not `api.nango.dev/oauth/callback`.
Enterprise customers' security teams will reject a third-party callback.

What's already built (kept, works, covered by tests):
- Nango client wrapper + env config + normalizer contract
- 5 provider normalizers (Gmail, Drive, Slack, Notion, Confluence) with
  16 unit tests (`npm run test:nango`)
- `/api/nango/webhook` signature-verified + raw_items writer + triage enqueue
- `/api/integrations/nango/{session,status,disconnect,sync}` APIs
- `NangoConnectPanel` in sidebar → Integrations with "Powered by Nango"
- RBAC-compatible (raw_items land in user's workspace; visibility inherits
  workspace rules)

Deferred work (Sprint 10.5):
- Self-host Nango via docker compose on reattend infra (Postgres + Redis
  + Nango server + nginx with LetsEncrypt)
- Register production OAuth apps for Gmail / Drive / Slack / Notion /
  Confluence with reattend.com callback URLs
- Domain: `nango.reattend.com` for the Nango API host
- Scope pickers at connect time (labels / channels / folders)
- Backfill job — pull last 30d on first connect
- Per-user sync status card on Home dashboard
- Retention: TTL on raw_items that never got promoted

### Sprint 4 — Wiki view (~3 days)
15. **`/app/wiki` route** — 3 nav tabs: Hierarchy, Topics, People
16. **Auto-generated page summaries** — Claude writes 100-word summaries per dept/project/topic
17. **Stale badges** on wiki pages (90d threshold)
18. **Cross-reference panel** on each page — linked topics + decisions + policies

### Sprint 5 — Policies v2 (~3 days)
19. **Policies table + migration** — applicability JSON, version, effective_date, supersedes_id
20. **Admin policy authoring page** — rich-text editor, scope picker, effective-date
21. **Policy acknowledgment tracking** + compliance export
22. **Diff viewer** — v2 vs v1 side-by-side
23. **Self-healing detector** — policy pending acks surfaced per user/dept

### Sprint 6 — Agent builder (~4 days)
24. **Builder page `/app/admin/[orgId]/agents/new`** — name, scope multi-select, system prompt, test chat
25. **Publish flow** — draft → published → visible to scoped users
26. **Deployment targets** — Slack OAuth, Teams bot, API endpoint with rotating key, email handler
27. **Per-agent analytics** — queries/day, avg rating, top questions

### Sprint 7 — MS Copilot replacement (~2 weeks)
28. **Chrome/Edge browser extension** — overlays "Reattend assist" panel on Word/Excel/PPT/Outlook/Teams web
29. **Draft email mode** `/app/chat?task=draft-email`
30. **Slide-deck outline mode** `/app/chat?task=draft-slides`
31. **Nango: Outlook + SharePoint + OneDrive + Teams + OneNote**

### Sprint 8 — Infra + scale (~1 week)
32. **Postgres migration** — dual-write via Drizzle provider switch, data migration script
33. **Job queue on Redis / SQS** — replace SQLite-backed queue
34. **Background worker deployment** — split app server from triage/embedding workers
35. **Observability** — OpenTelemetry → Datadog; p95 latency dashboards

### Sprint 9 — Security & compliance (~1 week)
36. **SSO/SAML end-to-end** with Azure AD tenant
37. **Audit export** — PDF/CSV signed by hash chain for tamper evidence
38. **Data retention auto-prune cron** — enforces `auditRetentionDays`
39. **SOC 2 Type 1 prep** — policies doc, encryption verification, access reviews (3-6mo)

### Sprint 10 — Polish & UX (~3 days)
40. **Keyboard shortcuts everywhere** — ⌘K, ⌘N, ⌘J, ⌘G with `?` modal
41. **Live cursors + presence on graph** (stretch — Miro signature)
42. **Exports** — graph→PNG/SVG, audit→PDF, memory→CSV, decisions→markdown briefing
43. **Loading skeletons** on every page

### Sprint 10.5 — Self-hosted Nango + production integrations (~2 days)
Promoted from deferred Sprint 3 tail, done just before demo polish so
OAuth apps survive the demo and every enterprise eye-test passes.

- **Self-host Nango**: `docker compose up` on our prod VPS (Postgres +
  Redis + 2 Node services). Point `NANGO_HOST=https://nango.reattend.com`.
- **Production OAuth apps** for all 5 providers, Google/Slack/Notion/
  Atlassian consoles, callback URLs all `*.reattend.com`
- **Purge Nango Cloud** test account; rotate secret keys
- **Scope pickers** in NangoConnectPanel (labels, channels, folders)
- **Backfill job** — first 30 days of history on first connect
- **Home dashboard card** — "Gmail ✓ synced 12 min ago · 47 items ingested"
- **Retention** — TTL on un-promoted raw_items
- **Remove** leftover 100-card Personal-Reattend grid from
  `/app/integrations` page; only Nango providers remain

### Sprint 11 — Demo polish (~1 day)
44. **Agent system prompt actually applied in `/api/ask`**
45. **Scope enforcement in Chat** — filter retrieval by agent's `scopeConfig`
46. **Memory → decision promotion button**
47. **Capture drawer live triage progress**
48. **Home personal feed** (not chat landing)
49. **Seed policies** into demo org
50. **Seed ask history rows** so chat has activity on fresh logins

---

## How this replaces Copilot inside Microsoft

Copilot's actual value per app:
- **Word**: rewrite / summarize / suggest → we surface as Chat mode + Browser extension overlay
- **Excel**: formula help / chart gen → *skip for now, Copilot wins here*
- **PowerPoint**: slide gen from outline → Chat mode `?task=draft-slide-deck` pulls from memory
- **Outlook**: email drafting / thread summary → same Chat mode with email context prepended
- **Teams**: meeting recap → existing transcript pipeline + auto-decision extraction
- **M365 Search**: unified search → our Search already does this **plus** Gmail / Slack / Notion / etc.

**Our advantage:**
- All M365 content ingested via Nango alongside every other source
- Temporal memory (decisions, reversals) — Copilot doesn't have this
- On-prem option — Copilot is cloud-only
- Price: $8/user vs $30/user

**Implementation for Copilot parity:** ~3 weeks. Browser extension is the biggest piece.

---

## Playbook for the Monday demo

The 3-minute pitch the seeded demo enables:

> "This is Reattend Enterprise. Organizational memory for the Ministry of Finance. Seven levels of hierarchy, 22 members, 12 formal decisions on record.
>
> Watch what happens when someone leaves. Director of Income Tax — her 47 memory records, 12 decisions authored, 3 open handover threads — all transfer to her successor with her handover notes attached.
>
> Self-healing flagged three problems this week: 2 orphaned policies from the vacancy, 1 contradiction between hiring freeze decisions made 6 months apart, 1 silent department that hasn't captured memory in 90 days.
>
> Your team can chat with any of 5 purpose-built agents, trained on the knowledge each of them needs. Policy Helper answers compliance questions citing the clause. Decision Lookup catches duplicate debates before they happen.
>
> The graph shows every decision linked to every contradiction — the chain of reasoning preserved forever.
>
> Glean can search your documents. We remember your decisions."

---

## Files of record

- `CLAUDE.md` — project-wide instructions, architecture, stack
- `ENTERPRISE.md` — enterprise-specific architecture + positioning
- `docs/progress.md` — session-by-session build log
- `docs/ROADMAP.md` — this file
- `scripts/seed-demo-org.ts` — the Ministry of Finance seed

---

*Next session updates appended below.*

## Deferred — Nango self-host migration
**Status**: Not urgent. Using Nango Cloud SaaS for now with test keys.

**When to do it**:
- First enterprise customer signs a contract that requires on-prem (government, bank, healthcare)
- OR Nango's SaaS pricing crosses ~$500/mo for our usage
- OR we hit a compliance blocker (SOC 2 Type II audit, India DPDPA, etc.)

**How to do it (~1 day of work)**:
1. Spin up Nango's open-source server via `docker compose` on our VPS (or the customer's)
2. Migrate provider configs from cloud dashboard to self-hosted dashboard (same UI, just on our host)
3. Change one line: `NANGO_HOST=https://nango.customer.internal` in env
4. Re-auth flow: users reconnect once (OAuth tokens don't migrate across hosts)
5. Point Google/Slack/etc. OAuth app callback URLs at the new host

**Why we're safe deferring**:
- Nango server is open source (Elastic License 2.0, github.com/NangoHQ/nango)
- Our code only calls the standard API surface — no proprietary SaaS-only features
- If Nango-the-company dies, the self-host path is still there
