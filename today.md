# Reattend Enterprise — Session Handoff

**Date saved:** 2026-04-22
**Branch:** `main` (clean, fully pushed)
**Live at:** https://enterprise.reattend.com
**Last commit:** `90c3c7a` Polish D2/D3: audit drill-down, search no-results, tablet breakpoint, RBAC test fix

On resume: read this file. Everything you need to pick up is here.

---

## 1. Where the product actually runs

| Thing | Value |
|---|---|
| Local repo | `/Users/partha/Desktop/enterprise` |
| GitHub | `github.com/Reattend/enterprise` (public) |
| Droplet IP | `167.99.158.143` (DigitalOcean) |
| Droplet path | `/var/www/enterprise` |
| Process manager | PM2 — app name `enterprise` |
| Web server | nginx + certbot SSL in front of PM2 on localhost port |
| Domain | `enterprise.reattend.com` → droplet IP |
| DB | SQLite (`data/reattend.db`) via better-sqlite3 + Drizzle |
| LLM answering | Claude (via `ANTHROPIC_API_KEY` on droplet) |
| LLM triage/embeddings/rerank | Groq Llama 3.3 70B + Haiku rerank (via `GROQ_API_KEY`) |
| Whisper | Groq whisper-large-v3-turbo for voice transcription |
| Rabbit | **Not deployed.** Plan is Claude/Groq → Rabbit over time. |
| Nango self-host | Deferred — Gmail/Slack/Calendar ingest still stubbed |

---

## 2. Deploy process (exact commands)

Local → GitHub → droplet. Always in this order.

```bash
# 1. Commit
git add -A
git commit -m "<msg>"

# 2. Push
git push origin main

# 3. Deploy to droplet
ssh root@167.99.158.143 "cd /var/www/enterprise && \
  git pull --ff-only && \
  rm -rf .next && \
  npm run build > /tmp/build.log 2>&1 && \
  pm2 restart enterprise && \
  sleep 2 && \
  curl -sS -o /dev/null -w 'HTTP %{http_code} · %{time_total}s\n' \
    https://enterprise.reattend.com/app"
```

Expected response: `HTTP 307 · <1s` (307 = auth redirect, healthy).

**Always `rm -rf .next` before build on the droplet** — incremental Next.js cache has bitten us more than once.

SSH can drop mid-build on flaky WiFi. If the push succeeds but the droplet didn't rebuild, re-run from step 3. Use `run_in_background=true` for the SSH command in Claude Code to survive disconnects.

---

## 3. What's shipped (chronological, with commit hashes)

### Foundation — Sprints 1–9 (pre-deploy, from prior sessions)
Full org/dept/team hierarchy, RBAC, decisions, transfers, policies, agents, wiki, self-healing. Documented in the ENTERPRISE.md file and the earlier `docs/progress.md`.

### Post-deploy triage · `4f910f7`
Killed `/app/projects` (conflict with Memory), simplified sidebar, seeded 10 default agents for new orgs, loosened invite-email domain restriction.

### Sprint A — voice + expert routing · `252778e`
- `src/components/enterprise/voice-recorder.tsx` — MediaRecorder + live waveform, 120s max
- `src/app/api/records/voice/route.ts` — Groq Whisper → ingest pipeline. Has `?transcriptOnly=1` for brain-dump flow.
- `src/app/api/enterprise/ask-experts/route.ts` — scores authored records ×3, decisions ×5, entity mentions ×2, recency ×1.5
- `src/components/enterprise/ask-experts-dialog.tsx` — ⌘⇧K "Who should I ask?" with Claude explanations
- `src/components/enterprise/reasoning-trace.tsx` — animated pipeline reveal
- `src/app/api/ask/route.ts` emits `X-Trace` header with real pipeline metrics

### Sprint B — daily briefing + oracle · `83c8e69`
- `src/app/api/enterprise/start-my-day/route.ts` — delta-since-last-visit (localStorage anchor), Claude 3-4 sentence focus
- `src/components/enterprise/start-my-day-card.tsx` — Home card, hidden on quiet days
- `src/app/api/enterprise/resurface/route.ts` — same-week records from 1/2/3/5 years ago, hidden on young orgs
- `src/app/api/ask/oracle/route.ts` — 150 FTS candidates → RBAC → Haiku rerank top 30 → Claude 5-section dossier (Situation/Evidence/Risks/Recommendations/Unknowns)
- `src/app/(app)/app/oracle/page.tsx` — full page with 5-stage pipeline indicator + dossier renderer
- Sidebar Oracle entry (Crown icon)

### Sprint C — brain dump + blast radius + genie · `17f0a9f`
- `src/app/api/enterprise/brain-dump/route.ts` — preview mode (Claude parses raw into decision/question/action/fact with source spans) + commit mode
- `src/app/(app)/app/brain-dump/page.tsx` — textarea or mic with `?transcriptOnly=1`
- `src/app/api/enterprise/decisions/[decisionId]/blast-radius/route.ts` — linked memories + policies + predecessors/successors + people + Claude narrative
- `src/components/enterprise/blast-radius-dialog.tsx` — score = memories×1 + policies×4 + preds×3 + successors×5 + people×1, tiers contained/significant/systemic
- `src/app/api/enterprise/onboarding-genie/route.ts` — walks dept ancestors+descendants, Claude writes personalised first-week packet
- `src/app/(app)/app/admin/[orgId]/onboarding-genie/page.tsx` — form with DepartmentTreePicker
- Sidebar Brain Dump (BrainCircuit icon)
- "Blast" button wired into admin decisions list

### Time Machine · `d9d2a60`
- `src/app/api/enterprise/timeline/route.ts` — point-in-time state with `reversedAt` + supersession-chain semantics + 24-month sparkline
- `src/app/(app)/app/timeline/page.tsx` — slider + playback (600ms/tick) + anchor filter (all/topic/person/dept) + animated metric cards
- Sidebar Time Machine (History icon)

### Enterprise docs panel · `a606031`
- `src/components/app/topbar.tsx` — rewrote the BookOpen docs panel for Enterprise
- 14-row role matrix (actions × super_admin/admin/member/guest)
- Every feature doc row carries RolePill strip showing who can access it
- "You are in this org as" banner at top shows current user's role
- Sections: Capture, Recall, Sidebar, **Memory Cockpit (admin-only)**, Security, Shortcuts

### Polish D1 — empty states + real notifications · `2b7ca1b`
- `src/components/ui/empty-state.tsx` — reusable `<EmptyState>`
- Rewrote three weak empty states: Members, Admin Decisions, Policies (non-author)
- `src/lib/enterprise/notify.ts` — `notifyDepartmentMembers` (walks ancestor chain + includes org admins) and `notifyOrgMembers`
- Decision-create → emits `decision_pending` to dept + ancestors + admins (excludes decider)
- Policy-publish (first time only) → emits `todo` to every org member (for ack)
- Fire-and-forget — notify failures don't block the response

### Polish D2/D3 — audit drill-down + search + mobile + RBAC test · `90c3c7a`
- Memory detail page: "History" button (admin-only) → `/app/admin/:orgId/audit?resourceId=X`
- Audit page reads `?resourceId=` URL param, shows inline chip + clear-filter button
- Search no-results → three routed CTAs (Chat / Oracle / Brain Dump) + type-filter clear
- Mobile breakpoint widened 640 → 768 so tablet portrait gets drawer
- Search-bar placeholder shortens on narrow screens
- Fixed `test:rbac` teardown (swapped per-table deletes for `PRAGMA foreign_keys = OFF` window); all 36 assertions pass

---

## 4. Product surface at a glance

### User-facing routes
- `/app` — Home (StartMyDayCard + onboarding checklist + policy pending banner)
- `/app/oracle` — deep-research Q&A
- `/app/brain-dump` — textarea or voice → Claude-parsed structured memories
- `/app/timeline` — Time Machine, 24-month scrubber
- `/app/tasks` — action items (static page, not yet data-driven)
- `/app/memories` + `/memories/[id]` — memory list/detail
- `/app/wiki` — auto-generated topic + people pages
- `/app/agents` — agent directory (10 seeded by default)
- `/app/policies` — policies list with ack state
- `/app/search` — global search (FTS + rerank)
- `/app/chat` — conversational Q&A with `X-Trace` + `X-Sources`

### Admin Cockpit (admin/super_admin only) — `/app/admin/:orgId/...`
- `/` — cockpit home (onboarding checklist for new orgs)
- `/members` — invite/remove/role-change, bulk CSV invite
- `/departments` — tree editor
- `/decisions` — decisions log + **Blast Radius** button
- `/onboarding-genie` — new-hire packet generator
- `/health` — self-healing dashboard (stale policies, contradictions, gaps)
- `/audit` — audit log (filters + CSV export + `?resourceId=` drill-down)
- `/policies` — author/publish policies
- `/agents` — create/edit agents
- `/compliance` — placeholder
- `/sso` — placeholder
- `/settings` — plan + SSO (super_admin only for billing)
- `/transfers`, `/roles`, `/taxonomy` — enterprise admin surfaces

### Role matrix (short form — docs panel in topbar has the full version)

| Action | Super | Admin | Member | Guest |
|---|---|---|---|---|
| Ask / search org memory | ✓ | ✓ | ✓ scoped | ◐ |
| Capture memory | ✓ | ✓ | ✓ | — |
| See all departments | ✓ | ✓ | — | — |
| Invite/remove members | ✓ | ✓ | — | — |
| Publish policies | ✓ | ✓ | — | — |
| Create agents | ✓ | ✓ | ◐ | — |
| Audit log / self-heal | ✓ | ✓ | — | — |
| Onboarding Genie | ✓ | ✓ | — | — |
| Time Machine | ✓ | ✓ | ◐ | — |
| Billing / SSO / transfer ownership | ✓ | — | — | — |

Source of truth: `src/lib/enterprise/rbac.ts`.

---

## 5. Next sprint (what's NOT done, in priority order)

### Tier 1 — blocks real usage (next session focus)
1. **Gmail connector** (real) — OAuth, refresh token rotation, incremental sync. Deferred because it needs Nango self-host or direct OAuth infra.
2. **Slack connector** (real) — same as above. These two unlock the SMB-200 ICP described in the strategy doc.
3. **PDF / DOCX upload pipeline** — chunk + embed + index. Critical for state-gov ICP.
4. **Agent execution runtime** — today agents are mostly metadata. Need a worker that actually runs them against a corpus + logs results.
5. **Onboarding glitch diagnosis** — user flagged, never repro'd. Need steps.

### Tier 2 — robustness
6. Graph view perf — React Flow stutters past ~500 nodes; needs level-of-detail or clustering
7. Notification system coverage — `mention`, `needs_review`, `suggestion` types still never emitted
8. Audit retention UI — API exists, no admin screen
9. More RBAC tests — current suite is record-level only; add API-surface tests (can `member` hit admin routes?)

### Tier 3 — polish
10. Empty states we haven't touched yet (Wiki tabs sidebars could be stronger)
11. Keyboard shortcuts page (we document them but don't have a `?` shortcut list)
12. Graph perf + Time Machine prefetch

### Tier 4 — enterprise hardening (quarter project each)
- OCR pipeline for scanned docs (state-gov unlock)
- Redaction + PII scrubbing
- Legal hold + retention schedules
- SOC 2 Type II prep
- StateRAMP moderate prep (gov path)
- On-prem Rabbit (deal-closer for gov/regulated)

---

## 6. Strategy context (for LLM to frame decisions)

### ICPs (picked after F500 discussion)
1. **SMB up to 200 employees** — Year 1 target. They live in Slack + Gmail + Notion + Drive. Short sales cycle (2-8 weeks), founder-signed, SOC 2 Type II is sufficient. We're ~70% there — biggest gap is real connectors.
2. **US state government** — Year 2 target. Paper-heavy, admin turnover every 4 years = perfect fit for Transfer Protocol + Decision Log + FOIA-ready audit. 12-18 month sales cycle, on-prem is a deal-closer. Biggest gap is OCR/document ingest + StateRAMP/CJIS compliance paperwork.
3. **F500** — Year 3+. Don't chase until we have 50+ SMB + 5+ gov reference customers.

### Rabbit strategy (critical — don't lose this)
- Claude + Groq are **tutors, not competitors**. Every Q&A pair in prod becomes training data.
- After 6 months with 20-50 pilots → 50-500k `(context, question, good_answer)` triples.
- Train Rabbit on **three narrow tasks only**:
  1. Retrieval Q&A over memory corpus
  2. Triage / classification at capture
  3. Structured extraction (Brain Dump, Onboarding Genie)
- Keep Claude as the **evaluator forever** — nightly regression suite.
- Unit economics: Claude ≈ $5-15/seat/mo, Rabbit self-hosted ≈ $0.50-2/seat/mo. The margin flip is the moat.
- On-prem Rabbit is the gov deal-closer — Claude/OpenAI can never claim "stays on your network."

### F500 honest assessment (summary from earlier discussion)
As a Series B demo: wins. As a product a Walmart/JPMorgan CIO would deploy today: **no, not yet.** Missing pieces are integrations, compliance, on-prem, HA, retention, audit integrity. What we have right is the architecture (memory-first, decision-centric, RBAC-scoped, AI-native). Execute; don't redesign.

---

## 7. Key files / directories (if resuming blind)

```
src/
  app/
    (app)/app/                 # every authenticated page
      admin/[orgId]/           # admin cockpit
      memories/[id]/page.tsx   # memory detail (has History button now)
      oracle/, brain-dump/, timeline/  # recent Sprint A-D features
    api/
      enterprise/              # all enterprise endpoints
      ask/, ask/oracle/        # Q&A routes
      records/voice/           # Whisper transcription
      notifications/           # /count + GET/PUT
  components/
    app/sidebar.tsx            # nav items list + mobile drawer
    app/topbar.tsx             # org pill + search + docs panel (RBAC-scoped)
    enterprise/                # all enterprise-specific UI components
    ui/empty-state.tsx         # reusable <EmptyState/>
  lib/
    db/schema.ts               # single source of truth for DB
    enterprise/
      rbac.ts                  # role matrix source of truth
      rbac-records.ts          # record-level visibility filter
      notify.ts                # notifyDepartmentMembers / notifyOrgMembers
      index.ts                 # barrel file — add new enterprise exports here
    ai/                        # llm, prompts, agents, cron jobs
scripts/
  test-rbac.ts                 # run with `npm run test:rbac` — all 36 pass
```

---

## 8. Open issues / footguns

- **Onboarding glitch** still unresolved. Need repro steps from user.
- **Personal Reattend is the upstream fork**; CLAUDE.md still references some personal patterns. If something looks weird, assume it's inherited from Personal and may not fit Enterprise semantics.
- **Next.js dynamic server warnings** during build — pre-existing, expected, safe to ignore (they're informational about which routes can't be pre-rendered).
- **`data/reattend.db` is the production DB** on the droplet. Never `rm -rf data/`. Backups aren't configured — that's a Tier 2 task.
- **DNS flakes on `git push`** sometimes — just retry.

---

## 9. How to resume

```bash
# On the Mac, after reboot:
cd /Users/partha/Desktop/enterprise
git status       # should be clean on main
git log --oneline -5   # confirm last commit is 90c3c7a

# In a fresh Claude Code session, say:
# "Read today.md"
# Then say what you want to work on next.
```

Suggested next move: **ship one real connector (Gmail via direct OAuth or Nango self-host)**. Everything else is sugar until ingest actually flows automatically. That unlocks SMB-200 demos.

Backup move: **onboarding glitch diagnosis + Tier 1 polish items (graph perf, more notification types)**.

Backup to the backup: **start state-gov groundwork** — PDF/DOCX upload pipeline (chunk + embed + FTS index), because it's the single biggest capability gap for that ICP.

---

*Generated 2026-04-22 at session end. State is self-consistent; `tsc --noEmit` passes; `npm run test:rbac` passes 36/36; site serves 307 on `/app` (healthy).*
