# Reattend Enterprise - Progress Tracker

## Session: Enterprise Phase 1 — Foundation (Schema + RBAC + Audit)
**Date**: 2026-04-20
**Status**: FOUNDATION LAYER COMPLETE

### Built
- [x] 12 enterprise tables added to `src/lib/db/schema.ts`:
  - `organizations` (tenant root, plan/deployment/SSO settings)
  - `departments` (self-ref for Department → Division → Team tree)
  - `organization_members` (org-level role: super_admin/admin/member/guest + status)
  - `department_members` (dept-level role: dept_head/manager/member/viewer)
  - `employee_roles` + `role_assignments` (knowledge stays with the role, not the person)
  - `decisions` (first-class decision tracking + reversed/superseded state)
  - `audit_log` (immutable, denormalized user_email for retention)
  - `sso_configs` (Azure AD / Okta / Google Workspace / SAML / OIDC)
  - `knowledge_health` (computed per-dept for self-healing dashboard)
  - `workspace_org_links` (links existing workspaces to org/dept + visibility)
  - `record_role_ownership` (records owned by role — survive departures)
- [x] Migration `drizzle/0002_enterprise_foundation.sql` generated + applied cleanly
- [x] `src/lib/enterprise/rbac.ts`:
  - `getOrgContext`, `getDeptContext` loaders
  - `hasOrgPermission` / `hasDeptPermission` + `assert*` variants
  - `listAccessibleDepartmentIds` (BFS descent through dept tree)
  - `listAccessibleWorkspaceIds` (resolves org_wide + dept-scoped visibility)
  - `filterToAccessibleWorkspaces` (bulk filter for search/graph)
  - Non-enterprise workspaces (no link row) pass through — existing `workspace_members` governs them
- [x] `src/lib/enterprise/audit.ts`:
  - `writeAudit` (immutable insert)
  - `writeAuditAsync` (fire-and-forget for hot paths like /ask)
  - `writeAuditForUser` (joins email from users table)
  - `queryAudit` (filter by user/action/resource/date)
  - `pruneAuditBefore` (only delete API — no default, explicit cutoff required)
- [x] Full `tsc --noEmit` passes

### Key design decisions
- **Workspaces stay backwards compatible** — enterprise link is via `workspace_org_links` (separate table), not columns on `workspaces`. Personal Reattend inheritance works untouched.
- **Org admins/super_admins see all departments** in their org. Dept heads see their dept + all descendants via self-ref parent chain.
- **Audit writes are immutable.** Only `pruneAuditBefore` can remove rows, and it requires an explicit cutoff (no default retention).
- **Denormalized `user_email`** in audit_log so entries survive user deletion for compliance/retention.
- **Knowledge-follows-role** pattern: `employee_roles` + `role_assignments` (endedAt=null means current holder) + `record_role_ownership` gives us the transfer protocol foundation.

### Not yet done (next up)
- [ ] SSO/SAML integration (Azure AD first — largest enterprise footprint)
- [ ] Seed script updates for enterprise demo org
- [ ] Invite-email flow (currently members API requires the user to already exist)
- [ ] Wire audit logging into `/api/search`, `/api/deepthink`, `/api/integrations/*`
- [ ] Settings page in admin dashboard (org-level settings, SSO, retention policy)
- [ ] LLM-confirmation pass for contradiction candidates (promote from "suspected" to "confirmed")
- [ ] Schedule self-healing scans on a daily cron + notify admins of new critical findings
- [ ] Per-department Self-healing view (currently org-wide only)
- [ ] Workspace + record picker in decision create form (currently requires pasting IDs)
- [ ] Hook stale/reversed decisions into self-healing (auto-surface as `stale` or `contradiction` findings)
- [ ] Reactivate an offboarded member (reverse flow)
- [ ] Show role transfer history (who held it, what notes they left) on role detail page
- [ ] Record ownership assignment UI (currently rows can be written but no UI to set ownership)

---

## Session: Enterprise Phase 1 — API + Onboarding
**Date**: 2026-04-20
**Status**: API LAYER + ONBOARDING COMPLETE

### Built
- [x] `src/lib/enterprise/api.ts` — `requireOrgAuth` (resolves auth + org context + permission in one call), `auditFromAuth`, `extractRequestMeta`, `handleEnterpriseError`, standardized `isAuthResponse` type guard
- [x] `src/lib/enterprise/audit.ts` — added `auditForAllUserOrgs` for routes that serve both personal and enterprise users (no-op for personal-only users)
- [x] `POST/GET /api/enterprise/organizations` — create org (caller becomes super_admin), list caller's orgs
- [x] `GET/PATCH /api/enterprise/organizations/[orgId]` — org detail + super_admin update (name/plan/deployment/seatLimit/settings)
- [x] `GET/POST /api/enterprise/organizations/[orgId]/departments` — list departments (filtered to user's access), create dept/division/team with optional parent
- [x] `GET/POST /api/enterprise/organizations/[orgId]/members` — list org members (joined with users table), invite/add existing user (idempotent — re-POST updates role), optional same-call department add
- [x] Audit wired into `/api/ask` POST (query audit with truncated question in metadata)
- [x] Audit wired into `/api/records` POST (create) and DELETE
- [x] Onboarding page at `/app/admin/onboarding` — 3-step wizard (org name + slug, plan selection with Business recommended, deployment: SaaS / On-Prem / Air-Gapped)
- [x] Full `npm run build` succeeds — all 4 enterprise API routes + onboarding page compiled

### Key design decisions
- **Route helper pattern**: `requireOrgAuth(req, orgId, permission?)` returns either `EnterpriseAuth` or `NextResponse` (401/403). Route handlers call `isAuthResponse(x)` as an early-return type guard, then use `auth.orgCtx` for scoped queries.
- **Super_admin bootstrap**: the user who calls POST /api/enterprise/organizations becomes the org's super_admin automatically via a transactional insert into `organization_members`.
- **Only super_admin can mint super_admin**: enforced in the members POST route to prevent privilege escalation.
- **Invite flow deferred**: members POST currently requires the target email to already have a user account. Full invite-by-email (pending row + email + accept link) is a Phase 2 item — not blocking Phase 1 dogfooding.
- **`auditForAllUserOrgs` fan-out**: /api/ask and /api/records serve both personal and enterprise users. The helper fans audit writes out to every active org the user belongs to. Personal-only users have zero orgs → zero audit writes → zero overhead.
- **Slug validation**: orgs have globally unique slugs; departments have org-scoped unique slugs. Both auto-derived from name, with a regex check `^[a-z0-9][a-z0-9-]*$`.
- **Redirect target after onboarding**: `/app/admin/[orgId]/departments` — this page doesn't exist yet; it's the natural next step the admin wants (set up the dept tree before inviting members).

### Files added/changed
```
Added:
  src/lib/enterprise/api.ts
  src/app/api/enterprise/organizations/route.ts
  src/app/api/enterprise/organizations/[orgId]/route.ts
  src/app/api/enterprise/organizations/[orgId]/departments/route.ts
  src/app/api/enterprise/organizations/[orgId]/members/route.ts
  src/app/(app)/app/admin/onboarding/page.tsx

Changed:
  src/lib/enterprise/index.ts                  (re-export api module)
  src/lib/enterprise/audit.ts                  (added auditForAllUserOrgs)
  src/app/api/ask/route.ts                     (audit query)
  src/app/api/records/route.ts                 (audit create + delete)
```

---

## Session: Enterprise Phase 1 — Admin Dashboard
**Date**: 2026-04-20
**Status**: ADMIN DASHBOARD COMPLETE

### Built
- [x] `GET /api/enterprise/organizations/[orgId]/audit` — paginated audit query with action/userId/resourceType/from/to filters (requires `org.audit.read` — super_admin + admin only)
- [x] `src/app/(app)/app/admin/[orgId]/layout.tsx` — org-scoped admin shell with tab nav (Overview / Members / Departments / Audit log / Settings) and org header showing name + plan + deployment pills
- [x] `/app/admin/[orgId]` — overview: 4 stat cards (active members, departments, recent activity, health score placeholder), recent members panel, recent audit panel
- [x] `/app/admin/[orgId]/members` — add member form (email + title + role), member list with inline role dropdown, status pill (active/offboarded), "only super_admin can mint super_admin" handled server-side
- [x] `/app/admin/[orgId]/departments` — create form (name + kind + parent selector), tree view with expand/collapse, kind icons (Building/Network/Users2), breadcrumb indent
- [x] `/app/admin/[orgId]/audit` — filter bar (action dropdown, user email, resource type), scrollable list with action icons, click-to-expand event detail with metadata JSON viewer
- [x] Full `npm run build` — all 5 admin pages (layout + 4 tabs) compiled successfully

### Key design decisions
- **Client-side `use(params)`** for all [orgId] routes since they're `'use client'` components. Next 15+ pattern.
- **Layout fetches org once**, children fetch their own data. Avoids context prop drilling.
- **Auto-expand departments on first load** so the tree isn't empty-looking on arrival. Expanded set lives in client state, so rapid clicks feel instant.
- **Member role change is a POST** to the same endpoint used for invites (idempotent). Saves a PATCH route and keeps API surface tight.
- **Audit page doesn't paginate yet** — we fetch up to 200 entries and client-filter by email. When a customer hits that ceiling we'll add cursor pagination, but it's not needed on day one.
- **User-email filter is client-side**, other filters (action, resourceType) are server-side. Email isn't indexed in the audit query, so filtering server-side would require a JOIN to users — client filter is cheaper at this scale.
- **Settings tab exists in nav but no page yet** — intentional; placeholder for SSO/retention config that comes with the Azure AD work.

### Files added/changed
```
Added:
  src/app/api/enterprise/organizations/[orgId]/audit/route.ts
  src/app/(app)/app/admin/[orgId]/layout.tsx
  src/app/(app)/app/admin/[orgId]/page.tsx
  src/app/(app)/app/admin/[orgId]/members/page.tsx
  src/app/(app)/app/admin/[orgId]/departments/page.tsx
  src/app/(app)/app/admin/[orgId]/audit/page.tsx
```

### Admin dashboard tour (for next session)
Full flow now works:
1. Sign up / log in at `/login`
2. Create org at `/app/admin/onboarding` (wizard: name → plan → deployment)
3. Redirects to `/app/admin/[orgId]/departments` — build your dept tree
4. `/app/admin/[orgId]/members` — add teammates (must have accounts for now)
5. Use the product normally — every /ask query and every /records create/delete writes an audit entry
6. `/app/admin/[orgId]/audit` — watch the audit trail in real time

---

## Session: Enterprise Phase 2 — Self-Healing (The Moat)
**Date**: 2026-04-20
**Status**: SELF-HEALING V1 COMPLETE

### Why this matters
This is the feature Glean **cannot** build without rewriting their stack. Their core is search indexes, not a temporal memory graph. Self-healing requires knowing which records should contradict or confirm each other — that needs the memory graph we already have.

### Built
- [x] `src/lib/enterprise/self-healing/types.ts` — `Finding`, `ScanResult`, severity weights
- [x] `src/lib/enterprise/self-healing/detectors.ts` — four detectors:
  - **Stale**: records past their type-specific threshold (decisions=180d, policies=270d, notes=540d, etc.). Skips locked records.
  - **Orphaned**: records owned by an `employee_role` whose current assignment has `endedAt` (role vacant). This is the knowledge-follows-role signal — when someone leaves without a named successor, their ownership rows surface here.
  - **Gap**: departments with members but no new records in 90 days. Catches "silent teams" — the main failure mode.
  - **Contradiction (v1)**: entity-grouped pre-filter → cosine similarity > 0.82 on embeddings → opposition-keyword check (10 regex pairs: approved/rejected, ship/revert, build/buy, remote/RTO, etc.). O(pair-candidates) capped at 400.
- [x] `src/lib/enterprise/self-healing/runner.ts` — `runHealthScan` runs all detectors in parallel, writes roll-up row to `knowledge_health` (departmentId=null) plus per-dept rows. `getLatestHealth` reads the most recent row. Normalized 0–100 score with a 10-record floor so tiny orgs don't tank.
- [x] `GET/POST /api/enterprise/organizations/[orgId]/health` — GET returns latest (no scan), POST triggers scan synchronously. Gated by `org.audit.read` to match audit visibility.
- [x] `/app/admin/[orgId]/health` — scan button, 5 stat cards (score + 4 kinds), filterable pill nav, severity-colored finding list with per-kind icons
- [x] Added "Self-healing" tab to admin layout nav (between Departments and Audit log)
- [x] Overview page wired to the real health score (replaces "—" placeholder)

### Key design decisions
- **Sync scan, not background job**: the `job_queue.type` enum is fixed by migration and adding a type would require one more DB change. Health scans are cheap enough to run inline (< 5s for modest orgs). If scale demands async, we'll add a job type then.
- **Contradiction detection is heuristic-first**: no LLM call required. Entity overlap + embedding similarity + opposition keywords. Fast, cheap, and surfaces the obvious ones. Phase 2 adds an LLM confirmation pass that promotes "suspected" → "confirmed".
- **`MAX_PAIRS_CHECKED = 400`**: caps contradiction pair explosion. An org with 1000 records sharing one common entity could otherwise pair 500k. In practice the entity pre-filter tightens this a lot; the cap is insurance.
- **Severity weights**: critical=5, warning=2, info=0. Score deductions normalized against max(totalRecords, 10) so a single critical finding doesn't tank a 3-record org.
- **Per-department roll-ups written in the same scan**: one pass, N+1 inserts. Lets us add per-dept dashboards later without re-scanning.
- **Stored findings capped at 500 org-wide and 200 per-dept** in the `findings` JSON column, keeping rows small. Raw detector output is returned in the API response for the live UI regardless.

### Files added/changed
```
Added:
  src/lib/enterprise/self-healing/types.ts
  src/lib/enterprise/self-healing/detectors.ts
  src/lib/enterprise/self-healing/runner.ts
  src/lib/enterprise/self-healing/index.ts
  src/app/api/enterprise/organizations/[orgId]/health/route.ts
  src/app/(app)/app/admin/[orgId]/health/page.tsx

Changed:
  src/app/(app)/app/admin/[orgId]/layout.tsx   (added Self-healing tab)
  src/app/(app)/app/admin/[orgId]/page.tsx     (wired real health score)
```

---

## Session: Enterprise Phase 2 — Decision Tracking
**Date**: 2026-04-20
**Status**: DECISION TRACKING V1 COMPLETE

### Why this matters
The second moat. Glean can index documents that happen to contain decisions but it can't tell you:
- Was this decision reversed? When? Why?
- Did we rehash this same decision three times?
- Who's the role owner of this call — and is that role currently held?

Those are first-class shapes in our `decisions` table, not hopeful full-text matches.

### Built
- [x] `GET/POST /api/enterprise/organizations/[orgId]/decisions` — list (filter by status/departmentId, access-filtered for non-admins), create (validates workspace belongs to org, dept belongs to org, record belongs to workspace, role belongs to org)
- [x] `GET/PATCH /api/.../decisions/[decisionId]` — detail (dept-scoped access check), patch (only decider or admin can edit — updatable: title, context, rationale, outcome, tags; status→archived only)
- [x] `POST /api/.../decisions/[decisionId]/reverse` — body `{ reason, supersededById? }`. If `supersededById` given → status becomes `superseded`; otherwise `reversed`. Rejects reversing an already-reversed decision. Self-supersede rejected.
- [x] `/app/admin/[orgId]/decisions` — list with status pill filter (active/superseded/reversed/archived/all), inline create form (title + context + rationale + workspace + optional department)
- [x] `/app/admin/[orgId]/decisions/[decisionId]` — detail with status pill, context/rationale/outcome sections, references card (workspace, dept, record, decider IDs), Edit mode (inline form patches), Reverse mode (reason required, optional supersededById → branches status), automatic "View replacement →" link for superseded decisions
- [x] Added "Decisions" tab to admin layout nav (between Departments and Self-healing)
- [x] Audit wired: `decision_create` on POST, `update` on PATCH, `decision_reverse` on reverse action

### Key design decisions
- **Reverse vs supersede as one endpoint**: the action is philosophically the same ("this is no longer current"). Presence of `supersededById` in the body branches the status. Simpler than two nearly-identical endpoints.
- **Only decider or admin can edit**: prevents retroactive rewriting of other people's decisions. Admins can clean up obvious errors without a ticket.
- **"Only decider or admin" in PATCH, but anyone with dept access in reverse**: reversal isn't rewriting history — it's adding to it. A successor should be able to reverse a predecessor's decision; they just can't edit what was originally written.
- **404 vs 403 vs "already X"**: granular status codes so the UI can show distinct messages without parsing strings.
- **No workspace picker yet in create form**: requires a listing API we don't have. Users paste workspaceId for v1. The form is otherwise fully wired.
- **Access-filtered list for non-admins**: after the SQL query we filter out decisions tied to departments the caller can't see. Admins see everything.
- **Reverse requires 3+ char reason**: nudges real rationale instead of "oops".
- **Reversing records `reversedByUserId` + `reversedAt`**: these fields survive user deletion (via the audit log's denormalized user_email), so the reversal attribution isn't lost when someone leaves.

### Files added/changed
```
Added:
  src/app/api/enterprise/organizations/[orgId]/decisions/route.ts
  src/app/api/enterprise/organizations/[orgId]/decisions/[decisionId]/route.ts
  src/app/api/enterprise/organizations/[orgId]/decisions/[decisionId]/reverse/route.ts
  src/app/(app)/app/admin/[orgId]/decisions/page.tsx
  src/app/(app)/app/admin/[orgId]/decisions/[decisionId]/page.tsx

Changed:
  src/app/(app)/app/admin/[orgId]/layout.tsx   (added Decisions tab)
```

### Admin dashboard status (7 tabs now)
Overview · Members · Departments · **Decisions** · Self-healing · Audit log · Settings

---

## Session: Enterprise Phase 2 — Transfer Protocol (The Product Story)
**Date**: 2026-04-20
**Status**: TRANSFER PROTOCOL V1 COMPLETE

### Why this matters
This is **the** demo for selling to enterprises. The entire pitch — "organizational memory that never forgets when someone leaves" — becomes concrete and walkable. Schema was ready since Phase 1; this session closed the loop with APIs + wizard UI.

### The story, now runnable end-to-end
1. Create employee roles — "VP Engineering", "Finance Controller". Assign current holders.
2. Decisions can be attributed to a role (not just the person).
3. When someone leaves, run the **offboard wizard**:
   - **Review** — see their impact: roles held, records owned, decisions authored
   - **Transfer** — pick a successor for each role, write handover notes
   - **Confirm** — atomic txn ends assignments, creates successor assignments, marks member offboarded
4. Unassigned roles surface as **orphaned findings** in Self-healing (already wired — detector was built before the UI).
5. The new holder inherits everything the role owns — handover notes come with.

### Built
- [x] `GET/POST /api/enterprise/organizations/[orgId]/roles` — list (enriched with current holder name/email, record-ownership count, decisions-made count, vacancy flag), create (optional assign in same request)
- [x] `POST /api/.../roles/[roleId]/assign` — transfer pattern: end current assignment (endedAt=now, write transferNotes to outgoing), insert new assignment, update role status. `vacate: true` ends without replacement. Rejects "that user already holds this role". Updates `employee_roles.status` to match.
- [x] `GET /api/.../members/[userId]/impact` — returns roles held, decisions authored + 10 recent, dept memberships. Drives the wizard's review + transfer steps.
- [x] `POST /api/.../members/[userId]/offboard` — atomic multi-step txn: end every held assignment, create successors where named, vacate the rest, mark `organizationMembers.status='offboarded'` + `offboardedAt`. Validates successors are active org members, rejects self-offboarding, **rejects offboarding the last super_admin** (lockout guard).
- [x] `/app/admin/[orgId]/roles` — list with vacancy banner (count at top), Briefcase/UserCheck/UserX/Crown status icons, inline transfer/assign form with handover notes + vacate checkbox
- [x] `/app/admin/[orgId]/members/[userId]/offboard` — 3-step wizard (Review → Transfer → Confirm), step indicator, per-role successor picker + notes, summary + optional global note, success redirects to members list
- [x] Added "Offboard" rose-colored button on active member rows in Members page
- [x] Added "Roles" tab to admin nav (between Departments and Decisions)

### Key design decisions
- **Role status mirrors assignment state**: inserting an active assignment sets `employee_roles.status='active'`; vacating sets it to `'vacant'`. Redundant with assignments but faster for filtered queries.
- **Transfer notes on the outgoing assignment, not the incoming one**: the note is the handover *from* the person leaving. It stays attached to their final assignment row so the history is preserved ("what did X write when they handed off").
- **Orphaned role detection is already wired**: Phase 1 Self-healing queries `record_role_ownership` ⨯ `role_assignments` where the current assignment is null. Vacant roles show up immediately in the health dashboard.
- **Last-super_admin lockout guard**: offboard endpoint counts remaining active super_admins; if ≤1, it refuses. The message tells you to promote another member first — no silent failures.
- **Self-offboard rejected at API level**: even a super_admin can't offboard themselves. Removes a whole class of "I accidentally locked myself out" support tickets.
- **Wizard step skip logic**: if the user has zero roles held, the transfer step is skipped and we go straight to confirm. Review still runs — it shows you what you're about to do.
- **Decisions are NOT transferred**: they remain attributed to the original `decidedByUserId`. That's historical truth. The `decidedByRoleId` (if set) keeps them linked to the role so successors still see them in their role context.
- **Offboarding preserves `organization_members` row**: we only flip status, we don't delete. This keeps `audit_log.userEmail` joinable and any foreign-key references (decisions, comments, etc.) intact.

### Files added/changed
```
Added:
  src/app/api/enterprise/organizations/[orgId]/roles/route.ts
  src/app/api/enterprise/organizations/[orgId]/roles/[roleId]/assign/route.ts
  src/app/api/enterprise/organizations/[orgId]/members/[userId]/impact/route.ts
  src/app/api/enterprise/organizations/[orgId]/members/[userId]/offboard/route.ts
  src/app/(app)/app/admin/[orgId]/roles/page.tsx
  src/app/(app)/app/admin/[orgId]/members/[userId]/offboard/page.tsx

Changed:
  src/app/(app)/app/admin/[orgId]/layout.tsx        (added Roles tab)
  src/app/(app)/app/admin/[orgId]/members/page.tsx  (added Offboard button)
```

### Admin dashboard status (8 tabs now)
Overview · Members · Departments · **Roles** · Decisions · Self-healing · Audit log · Settings

---

## Session: Enterprise Phase 2 — Workspace Auto-Wire + Memory Health Cockpit
**Date**: 2026-04-20
**Status**: IN PROGRESS (cockpit shipped, taxonomy unlock next)

### Why this session
User tested the admin dashboard and pushed back:
1. Workspace_id requirement on decision form made no sense (correct — it was an implementation detail leaking to the UI)
2. Overview page looked like a CRUD console, not a product that solves amnesia
3. Compared to Glean's admin console which is insight-first with governance signals

Reframed positioning: **we are organizational memory, not search**. The admin cockpit is the sales weapon — the first thing buyers see needs to show amnesia signals, not member counts.

### Built
- [x] **Workspace auto-wire**: creating a `kind='team'` department now auto-provisions a backing workspace (rows in `workspaces`, `workspace_members` with creator as owner + dept head as admin, default `projects` row, `workspace_org_links`). Higher-level depts/divisions remain pure hierarchy (no workspace).
- [x] **Decisions API resolves workspace from departmentId** — the user picks a team, server finds the linked workspace. Explicit `workspaceId` still accepted for API callers that want the override.
- [x] **Decisions create form rewritten**: single dropdown of team-kind departments. If no teams exist, shows a clear prompt to go create one. No more pasting IDs.
- [x] **`/api/enterprise/organizations/[orgId]/overview` aggregation route** — single query returns: hero metrics (health score, total records, decisions this month + reversed rate, active members, sources active/total, ask volume 30d), amnesia signals (stale/orphaned/contradictions/gaps from latest `knowledge_health` row), knowledge gravity (top 10 depts by records), decision velocity (12 weekly buckets with decisions + reversed + records), turnover impact (5 most recent offboardings with records/decisions/roles-vacated), pending handovers (vacant roles with ownership), critical findings (top 5 criticals from latest scan).
- [x] **Overview page rewritten as Memory Health Cockpit** with 6 sections:
  - **Hero**: 4 big-metric cards + in-place "Run self-healing scan" button that re-renders cockpit on completion
  - **Amnesia signals**: 4 kind cards (stale/orphaned/contradictions/silent depts)
  - **Velocity charts**: 12-week bar charts (Decision velocity with reversed overlay; Ingestion volume + sources active count + ask volume)
  - **Knowledge gravity**: horizontal bar chart of top 10 depts by record count
  - **Turnover impact**: list showing what each offboarded member authored + roles still vacant ("Glean cannot compute this")
  - **Pending handovers** + **Critical findings**: side-by-side action queues

### Key design decisions
- **Team IS a workspace**: `kind='team'` departments auto-get a workspace at creation time. Division/department kinds stay pure hierarchy. This matches how enterprise users think — you work inside a team, not "inside a workspace".
- **Explicit `workspaceId` still supported in decisions API**: advanced callers (scripts, API integrations) can bypass dept resolution. UI never needs it.
- **No chart library dependency added**: used existing recharts package — but for these charts the simple SVG/CSS bar primitives were tighter. Kept recharts in reserve for more complex viz later.
- **"Glean cannot compute this" is the North Star copy**: the turnover impact panel and amnesia signals are surfaces specifically designed to be demoable as "you can't do this with a search product". Positioning baked into the UI.
- **Empty-state as teacher**: if the org has no memories + no scan, show an explicit "Your memory is empty — go create a team" card with a link. Every panel has an informative empty state, not just "no data".
- **Run scan button on Overview**: admins don't need to navigate to Self-healing to refresh signals. Cockpit owns the refresh loop.

### Files added/changed
```
Added:
  src/app/api/enterprise/organizations/[orgId]/overview/route.ts

Changed (significantly):
  src/app/api/enterprise/organizations/[orgId]/departments/route.ts
    (auto-create workspace for team-kind depts)
  src/app/api/enterprise/organizations/[orgId]/decisions/route.ts
    (resolve workspace from departmentId; workspaceId now optional)
  src/app/(app)/app/admin/[orgId]/decisions/page.tsx
    (team dropdown, no workspaceId field)
  src/app/(app)/app/admin/[orgId]/page.tsx
    (complete rewrite as Memory Health Cockpit)
```

### Also fixed earlier in session
- **Next 15 `use(params)` pattern** applied by mistake; this repo is Next 14. Client pages receive `params` as a plain object — fixed all 10 client admin pages from `use(params)` to direct destructure.

### Still pending (ordered)
- [ ] **Flexible taxonomy**: drop `department.kind` + `employee_roles.seniority` enums → free-text + rank_order. Per-org taxonomy editor in Settings. Unlocks big orgs (Google-scale hierarchy) + government (Ministry → Dept → Wing → Section + "Joint Secretary"/"Under Secretary" seniority).
- [ ] SSO/SAML (Azure AD first)
- [ ] Settings page (org config, SSO wiring, retention policy, taxonomy editor)
- [ ] Invite-email flow (current members API requires target user to exist)
- [ ] Wire audit logging into `/api/search`, `/api/deepthink`, `/api/integrations/*`
- [ ] Daily cron for self-healing scans + admin notification on new criticals
- [ ] LLM-confirmation pass for contradiction candidates
- [ ] Per-department Self-healing view
- [ ] Hook stale/reversed decisions into self-healing as additional finding sources
- [ ] "Admin" shortcut in employee sidebar for users who admin any org
- [ ] Access verification + sensitive findings sub-tabs (Glean parity for IT buyer checklist)

---

# Reattend.com (Personal) - Progress Tracker

## Session: Initial Build
**Date**: 2026-02-17
**Status**: PHASE 1 COMPLETE

## Completed
- [x] CLAUDE.md + progress.md
- [x] Next.js 14 project with TypeScript, Tailwind CSS, shadcn/ui
- [x] SQLite database schema (23 tables) + Drizzle ORM
- [x] Database migrations + seed script (100 integrations, demo data, plans)
- [x] NextAuth.js v5 with credentials provider
- [x] App shell: sidebar (collapsible), topbar (theme, ask, inbox), responsive layout
- [x] Landing page with hero, features, CTA
- [x] Login + Register pages (30-day trial)
- [x] Dashboard with stats, recent memories, action items, memory health
- [x] Inbox page with quick capture, triage (single + bulk), status filters
- [x] Memories list (list/grid view, filters, search) + detail page (edit, comments, links, entities, activity)
- [x] Projects list (grid, AI suggestions) + detail page (records, entities, decisions)
- [x] Memory Graph (React Flow, custom nodes, edge types, filters panel, legend, side panel)
- [x] Boards list + whiteboard (sticky notes, record nodes, text, arrows, color picker, AI auto-layout, memory sidebar)
- [x] Search page (hybrid/semantic/text modes, recent searches)
- [x] Integrations directory (100 items, categories, search, detail modals, webhook test, SDK docs)
- [x] Settings (profile, workspace, members/invite, preferences, agent aggressiveness, agent logs)
- [x] Billing stubs (plans, usage, invoices, checkout modal)
- [x] AI Pipeline: triage agent, embedding job, linking agent, ask agent
- [x] Provider-agnostic LLM interface with mock mode
- [x] Centralized prompt management (versioned)
- [x] Background job queue (SQLite-backed)
- [x] API routes: /api/ingest, /api/triage, /api/ask, /api/records, /api/projects, /api/search
- [x] Rate limiting on ingest endpoint
- [x] Dark mode + light mode
- [x] Framer Motion animations throughout
- [x] Build passes successfully
- [x] README with full documentation

## Session: Desktop Tray App
**Date**: 2026-02-24
**Status**: SCAFFOLDING COMPLETE — BUILDS SUCCESSFULLY

### Backend API (in reattend.com)
- [x] `api_tokens` table added to Drizzle schema + migration
- [x] Token auth helper (`src/lib/auth/token.ts`)
- [x] Tray API routes: /api/tray/tokens, /api/tray/capture, /api/tray/search, /api/tray/ask, /api/tray/analyze

### Desktop App (`/Users/partha/Desktop/reattend-desktop/`)
- [x] Tauri 2.0 project scaffold (Rust + React + Vite + Tailwind)
- [x] System tray, global shortcuts, capture/ask/settings/ambient windows
- [x] Rust API client, config persistence, Swift OCR plugin
- [x] macOS .app bundle + .dmg installer builds successfully

### Not Yet Done
- [ ] Apple Developer ID signing + notarization
- [ ] Token generation UI in dashboard settings
- [ ] Bundle Swift binary into .app Resources
- [ ] End-to-end testing with deployed API

## Session: Free Team Games + Multiplayer Rooms
**Date**: 2026-02-28 to 2026-03-02
**Status**: COMPLETE — DEPLOYED TO PRODUCTION

### Built 10 Games
- [x] Icebreaker Spinner, Team Bingo, Would You Rather, Two Truths One Lie
- [x] 5-Second Challenge, This or That, Team Trivia, Hot Takes
- [x] Guess the Colleague, Team Superlatives

### Multiplayer Infrastructure
- [x] DB tables: game_rooms, game_players, game_actions (SQLite)
- [x] API endpoints: /api/game-rooms/* (create, join, poll, action, host update)
- [x] useGameRoom hook (create/join/poll/submit via polling)
- [x] useLocalGameState hook (localStorage persistence)
- [x] /play page (mobile room code entry)
- [x] Shared components: GameLayout, GlassCard, TeamNameInput, RoomLobby, PlayerWaiting
- [x] 8 games with room mode, 2 screen-share only
- [x] /game index page with all 10 games
- [x] Sitemap updated with all game pages + /play

## Session: SEO Audit + Blog Content + AEO
**Date**: 2026-03-03
**Status**: COMPLETE — DEPLOYED TO PRODUCTION

### SEO Fixes
- [x] Fixed all metadata (canonical URLs, descriptions, OG tags across all pages)
- [x] Fixed robots.ts (was blocking everything, now allows / and disallows /app/ and /api/)
- [x] Fixed em dashes -> hyphens across all content
- [x] Added SiteNavigationElement entries for all free tools
- [x] Updated footer with comprehensive links

### Blog Posts (5 new, 18 total)
- [x] Meeting Debt: The Invisible Cost Nobody Tracks
- [x] What Happens to Team Knowledge When Someone Quits
- [x] The Engineering Manager's Guide to Architecture Decision Records
- [x] 5 Signs Your Team Has a Memory Problem
- [x] How to Run Meetings People Actually Remember
- [x] InlineCTA component for in-content CTAs
- [x] Internal cross-links: 15 links across 8 existing posts

### AEO / Structured Data
- [x] Glossary: 6 definition pages at /glossary/* with DefinedTerm JSON-LD
  - meeting-debt, decision-decay, institutional-memory, knowledge-half-life, tribal-knowledge, context-switching-tax
- [x] WebApplication JSON-LD on all 17 tool pages
- [x] RSS feed at /blog/feed.xml + linked in <head>
- [x] Sitemap updated with glossary entries

### Content Strategy (Not Code)
- [x] Syndication plan: ADR post -> Dev.to/Hashnode, Meeting Debt -> Medium (wait 3-5 days, set canonical)
- [x] HN submission plan: ADR post, Tue-Thu 9-11am ET, with author comment

## Session: Desktop Mega-App — Phase 1 (Main Window)
**Date**: 2026-03-05
**Status**: IN PROGRESS

### Goal
Transform the desktop tray app into a full desktop experience: full web app in main window, meeting recording with transcription, ambient AI helper.

### Phase 1: Main Window (Full Web App in Desktop) — COMPLETE
- [x] `/api/tray/session` endpoint: exchanges `rat_` bearer token for NextAuth session cookie, redirects to `/app`
- [x] `create_main_window()` in lib.rs: 1200x800 decorated, resizable webview loading the full web app
- [x] "Open Reattend" as first tray menu item with `Cmd/Ctrl+Shift+O` shortcut
- [x] `platform_show_in_dock()` on macOS: shows app in Dock when main window opens
- [x] Dock hide on main window close via `on_window_event`
- [x] Updated settings.tsx with new shortcut reference
- [ ] Verify cargo build passes (compiling after clean)

### Phase 2: Meeting Recording + Transcription — PENDING
- [ ] `audio.rs` module: cpal mic capture, WAV chunking via hound
- [ ] Tauri commands: start_meeting, stop_meeting, get_meeting_status
- [ ] API endpoints: /api/tray/meeting, /api/tray/meeting/chunk
- [ ] DB tables: meetings, transcript_segments
- [ ] Groq Whisper integration for transcription
- [ ] meeting.tsx frontend window
- [ ] Meeting app auto-detection + notification
- [ ] macOS microphone entitlements

### Phase 3: Ambient Helper v2 — PENDING
- [ ] companion.tsx side panel (320x600)
- [ ] Enhanced /api/tray/analyze with contradictions, action items, suggestions
- [ ] Real-time mode during meetings

## Not Yet Implemented (Stubs/Future)
- [ ] Real auth session validation on all routes
- [ ] Wire frontend to real API calls (currently using mock data in UI)
- [ ] Real LLM provider integration (Ollama is set up on AI VPS)
- [ ] File upload ingestion (PDF, DOCX, images, YouTube)
- [ ] Chrome extension
- [ ] Integration webhooks (real connections)
- [ ] Paddle real payment integration (stubs exist)
- [ ] SSO
- [ ] Email sending for invites
- [ ] Memory decay scoring
- [ ] Daily continuity machine
- [ ] Memory analysis page

## Strategic Direction
- **Current stage**: Individual + team adoption (bottom-up wedge)
- **Pricing**: Free (personal), $9/seat/month (teams)
- **Unique moat**: Contradiction detection + decision intelligence
- **Enterprise**: Not yet — need retention proof + 10 paying teams first
- **Next priorities**: Get individual users obsessed, track retention, convert to paying teams

## Architecture Decisions
- SQLite + Drizzle ORM for zero-infra, cheap hosting
- React Flow for both graph and whiteboard
- Mock AI mode for local dev - swap in any LLM provider
- shadcn/ui + Radix for premium component library
- Zustand for lightweight client state
- In-process job queue (SQLite-backed) - upgrade to Redis later
- Desktop app: Tauri 2.0 (Rust + webview), ~5MB, not Electron
- OCR: macOS Vision framework via Swift CLI binary
- Tray API: Bearer token auth (SHA-256 hashed, `rat_` prefix)
- Game rooms: SQLite polling (no WebSockets), 24h expiry, append-only actions
- Blog: Static JSX content in content.tsx (no MDX/CMS), metadata in data.ts
- AI VPS: Separate 8GB droplet running Ollama, firewalled to app VPS only

---

## Session: Sprint 3 — Nango Integrations (ingest-first)
**Date**: 2026-04-20
**Status**: SCAFFOLDING + 5 PROVIDERS SHIPPED

### Strategy (locked in this session)
Ingest-first, Nango-powered. Federated-at-query (Glean style) was rejected
because it breaks every moat we're building: temporal memory, self-healing,
transfer-protocol, on-prem Rabbit all need persistent corpus. Federated will
return later as a safety-net fallback (Sprint 7-ish).

### Built
- [x] `@nangohq/node` + `@nangohq/frontend` installed
- [x] `src/lib/integrations/nango/client.ts` — env config (NANGO_HOST,
      NANGO_SECRET_KEY, NANGO_PUBLIC_KEY, NANGO_WEBHOOK_SECRET), memoized client,
      canonical connection_id helpers (`userId__providerKey` for reversible routing)
- [x] `src/lib/integrations/nango/providers.ts` — catalog of 5 providers with
      Nango config keys, sync models, and triage-aggressiveness hints
- [x] `src/lib/integrations/nango/normalize.ts` — NormalizedRawItem shape +
      safe coercion helpers (asText, asIso)
- [x] `providers/gmail.ts`, `google-drive.ts`, `slack.ts`, `notion.ts`,
      `confluence.ts` — per-provider normalizers (Nango record → raw_items row)
- [x] `src/lib/integrations/nango/ingest.ts` — shared ingest path:
      `nango.listRecords()` → normalize → raw_items with externalId dedup →
      enqueue triage job. Finds/creates source row per provider category.
- [x] `POST /api/nango/webhook` — receives sync + auth events, signature
      verified via `nango.verifyIncomingWebhookRequest`, updates
      integrations_connections row on auth/delete, runs ingestFromNango on sync
- [x] `POST /api/integrations/nango/session` — creates Nango connect session
      with our canonical connection_id, returns session_token + publicKey + host
- [x] `GET  /api/integrations/nango/status` — returns per-provider
      connection state + `configured` flag for the UI
- [x] `POST /api/integrations/nango/disconnect` — calls Nango delete + marks
      our row disconnected
- [x] `POST /api/integrations/nango/sync` — manual sync kick (used right
      after connect so user sees data without waiting for Nango's cron)
- [x] `src/components/enterprise/nango-connect-panel.tsx` — top-of-page
      "Enterprise Integrations" panel with 5 real Connect buttons,
      "Powered by Nango" footer. Uses dynamic import of @nangohq/frontend so
      it doesn't bloat other pages. Yellow banner if NANGO_* env not set.
- [x] Panel mounted into `src/app/(app)/app/integrations/page.tsx` at top,
      above existing 100-card grid (additive, nothing removed)
- [x] `scripts/test-nango-normalizers.ts` — 16 synthetic-record unit tests
      for all 5 normalizers (registered as `npm run test:nango`). ALL PASS.
- [x] `.env.local` template updated with commented-out NANGO_* vars

### Customer setup (what they do)
- **SaaS**: click Connect → Nango OAuth modal → done. 60 seconds.
- **On-prem/gov**: run Nango self-hosted next to Rabbit. Set `NANGO_HOST` to
  their host. Tokens never leave their network. Primary differentiator vs Glean.

### Config in Nango dashboard (what we do per customer)
- Register provider configs with keys matching `providerConfigKey`:
  `google-mail`, `google-drive`, `slack`, `notion`, `confluence`
- Enable the default sync scripts Nango ships for each
- Point webhooks at `https://<customer>/api/nango/webhook`
- Set `NANGO_WEBHOOK_SECRET` in both Nango and our env

### What's next (not yet built)
- Scope pickers (which Gmail labels / Slack channels / Drive folders to sync) —
  default is "everything the OAuth scope allows"
- Per-provider triage heuristic tuning (Gmail marketing email filter, Slack
  decision-keyword boost)
- Attachment ingestion for Drive files (currently text-only; PDF/docx
  extraction already exists in upload path, just need to wire)
- Integration health metric for knowledge_health dashboard
- Retention: per-provider TTL on raw_items that never got promoted to records
