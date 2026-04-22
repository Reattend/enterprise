# Reattend Enterprise — Session Handoff

**Date saved:** 2026-04-22 (late-evening sprint-G cycle)
**Branch:** `main` — pushed after every sprint
**Live at:** https://enterprise.reattend.com
**Latest commits:**
- Sprint G: Exit Interview Agent + Handoff Generator + Legend page (this sprint)
- `d2f1804` Sprint F: integrations placeholder, DeepThink gone, capture deduped, Memory↔Wiki cross-links
- `bcc7127` Sprint E: /app/ask + /app/landscape unified, killed stale Personal pages
- `90c3c7a` Polish D2/D3, `2b7ca1b` Polish D1
- `a606031` Topbar docs panel, `d9d2a60` Time Machine
- `17f0a9f` Sprint C wow, `83c8e69` Sprint B wow, `252778e` Sprint A wow

On resume: `git status` on `/Users/partha/Desktop/enterprise`, read this, continue.

---

## 1. Where the product actually runs

| Thing | Value |
|---|---|
| Local repo | `/Users/partha/Desktop/enterprise` |
| GitHub | `github.com/Reattend/enterprise` (public) |
| Droplet IP | `167.99.158.143` (DigitalOcean) |
| Droplet path | `/var/www/enterprise` |
| PM2 process | `enterprise` |
| Web server | nginx + certbot SSL |
| Domain | `enterprise.reattend.com` |
| DB | SQLite (`data/reattend.db`) + Drizzle. Use `npx tsx src/lib/db/migrate.ts` for custom migrations (drizzle-kit migrate is a different thing) |
| LLM (answers/synthesis) | Claude via `ANTHROPIC_API_KEY` |
| LLM (triage/rerank/embeddings) | Groq Llama 3.3 70B + Haiku via `GROQ_API_KEY` |
| Whisper | Groq whisper-large-v3-turbo |
| Nango | **not deployed yet** — deferred to right before GA |
| Rabbit | not deployed — see § 6 |

---

## 2. Deploy process

Local → GitHub → droplet. Always this order.

```bash
# 1. Commit + push
git add -A
git commit -m "…"
git push origin main

# 2. Deploy
ssh root@167.99.158.143 "cd /var/www/enterprise && \
  git pull --ff-only && \
  rm -rf .next && \
  npm run build > /tmp/build.log 2>&1 && \
  pm2 restart enterprise && \
  sleep 2 && \
  curl -sS -o /dev/null -w 'HTTP %{http_code} · %{time_total}s\n' \
    https://enterprise.reattend.com/app"
```

Expected: `HTTP 307 · <1s`. **If schema changed locally** (added / modified tables), also run on droplet:
```bash
ssh root@167.99.158.143 "cd /var/www/enterprise && npx tsx src/lib/db/migrate.ts"
```

SSH can drop mid-build; use `run_in_background=true` in Claude Code's Bash tool, or reconnect and re-run from the `npm run build` step.

---

## 3. Two client profiles (strategic targets — not F500 yet)

This is the single most important section to preserve.

### 3a. SaaS / startups up to 200 employees
- **Live in:** Slack + Gmail + Google Calendar + Notion/Confluence + Google Drive.
- **Ingestion plan:** Nango self-hosted on droplet OR managed Nango cloud. Configured per org by admin. Ships right before GA.
- **Pricing model:** per-seat self-serve (~$25–40/seat/month). Founder-signed, 2–8 week sales cycle, SOC 2 Type II is sufficient.
- **The pitch:** "Fast, memory-first AI companion for work. Better than Glean for your decisions, better than Notion AI for your history."
- **What they'll ask first:** "Does Slack just work?" — they must be able to connect in 30 minutes and see value in 72 hours.

### 3b. Government & secure organisations
- **Live in:** Paper, scanned PDFs, Word docs, SharePoint 2013, Teams, email, legacy mainframes. Cloud deployment is often a non-starter.
- **Ingestion plan:** **Assisted onboarding.** We dispatch a human trainer who:
  - Scans and uploads legacy documents manually (so OCR quality is mission-critical — budget for Tesseract + a pass over Nougat / DocLayNet / Amazon Textract).
  - Runs regular training sessions teaching members how to capture memories, ask questions, acknowledge policies.
  - Owns the department trees and initial configuration.
- **Deployment:** on-prem Rabbit, airgapped if needed. No data leaves the network.
- **Pricing:** enterprise licence + professional services. 12–18 month sales cycle.
- **Compliance:** StateRAMP moderate (minimum), CJIS for any law-enforcement-adjacent data, IRS 1075 for tax, FERPA for education, HIPAA for Medicaid. 6–12 months of compliance paperwork before first sale lands.
- **The pitch:** "Paper memory becomes digital, searchable, decision-aware, and survives every admin change. It literally cannot leak — runs on your servers."
- **Why gov is year 2, not year 1:** no compliance paperwork is done. Build SMB adoption first to fund that.

**Engineering implication of the dual ICP:**
- Every feature must work with **manual + connector + OCR** input paths.
- On-premise Rabbit is the moat for the gov track; Nango-based SaaS connectors are the moat for the SMB track. Design tenancy, config, and model routing so the same codebase serves both without forking.

---

## 4. Everything Reattend Enterprise can do today

**There is a canonical feature catalog at `/app/legend` inside the app** (open in-app). Below is the short version of what's live.

### Capture
- **Brain Dump (Firehose)** — paste raw stream, Claude parses into decision / question / action / fact items with source spans; preview + commit selected items.
- **Brain Dump (File)** — PDF / DOCX / image / audio / video up to 20MB via `/api/upload`.
- **Brain Dump (Link)** — paste URL, saves as `[Link]` record, ingest enriches.
- **Brain Dump (Voice)** — 120s MediaRecorder → Groq Whisper → transcript → back into Firehose.
- **Quick capture drawer** — ⌘N keyboard shortcut, scoped single-memory with team/project picker.
- **Scope picker in Firehose** — now has the same team/project dropdowns the drawer has (ported in Sprint F).

### Recall
- **/app/ask — Chat mode** (default) — streaming multi-turn Q&A with citations, X-Trace header, persistent chat threads.
- **/app/ask — Oracle mode** — 150 candidates → Claude Haiku rerank top 30 → 5-section structured dossier (Situation / Evidence / Risks / Recommendations / Unknowns).
- **Global search** (`⌘K`) — hybrid FTS + semantic, RBAC-filtered, with snippet highlighting + routed "no results" CTAs.
- **Who Should I Ask** (`⌘⇧K`) — top 5 experts ranked by authored × 3 + decisions × 5 + entity × 2 + recency × 1.5, with Claude explanations.
- **Memory Resurface** — records from same week 1/2/3/5 years ago, hidden on young orgs.

### Org knowledge
- **/app/memories** — record list with filter chips, timeline/grid/list views.
- **/app/wiki** — auto-encyclopedia with three lenses (Hierarchy / Topics / People), knowledge-at-risk flags, cross-linked to underlying memories.
- **/app/landscape — Temporal** — Time Machine 24-month slider with playback + anchor filter + sparkline + animated metrics.
- **/app/landscape — Causal** — React Flow graph of records + record_links edges (contradicts / leads_to / supersedes / related).
- **/app/policies** — authored policies with ack state; admins publish → every org member gets `todo` notification; members ack.
- **/app/agents** — 10 seeded Claude personas + Activity tab showing real jobQueue runs (triage, embed, link, project_suggest).
- **/app/tasks** — action items extracted from memories.

### Amnesia-specific (our actual moat)
- **Decisions log** — context, rationale, status (active/superseded/reversed/archived), linked memories.
- **Blast Radius simulator** — "if we reverse this, what breaks?" — linked memories + policies citing + predecessor/successor chain + people involved + Claude narrative + 0-50+ score.
- **Onboarding Genie** — form → Claude reads dept memory → personalized first-week packet (markdown).
- **Exit Interview Agent** — **NEW this sprint.** Admin starts → Claude pre-reads departing person's memory footprint → 10-15 targeted questions → departing person answers → Claude synthesizes handoff doc → saved as org-visible memory.
- **Handoff Generator** — **NEW this sprint.** Admin picks outgoing + incoming → Claude reads outgoing person's authored memories + decisions → personalized handoff doc with [M#]/[D#] citations → saved as memory.
- **Self-healing dashboard** — stale policies, unresolved contradictions, knowledge gaps.
- **Transfer Protocol** — memory ownership moves with role succession.

### Daily-use
- **Start My Day** card on Home — Claude 3-4 sentence focus + delta since last visit (localStorage anchor).
- **Reasoning trace** — animated pipeline replay on chat answers.
- **Audit log** — admin-only, filters + CSV export + `?resourceId=` drill-down from memory detail.
- **Memory Cockpit** — admin control panel with tabs for Members, Departments, Decisions, Transfers, **Exit interviews**, **Handoff**, Genie, Self-healing, Audit, Compliance, Taxonomy, SSO, Settings.
- **Legend** (`/app/legend`) — **NEW this sprint.** All-user feature catalog, role-scoped, with keyboard shortcuts and glossary.

### Security
- Two-tier RBAC (org + department), record-level visibility (private/team/dept/org).
- Real notification emission: decision_pending on create, todo on policy publish.
- 36/36 RBAC assertions pass (`npm run test:rbac`).

---

## 5. Navigation map

### Sidebar (all users see)
- Home
- Ask (Sparkles)
- Capture (BrainCircuit)
- Landscape (Network)
- Memory (Brain)
- Wiki (BookOpen)
- Agents (Bot)
- Policies (FileText)
- Tasks (Zap)
- — separator —
- Legend (Map icon) — **NEW**
- Integrations (Plug) — placeholder until Nango
- Settings (Settings)

### Admin cockpit tabs (admin + super_admin only)
Overview · Members · Departments · Roles · Decisions · Transfers · **Exit interviews** (NEW) · **Handoff** (NEW) · Genie · Self-healing · Audit log · Compliance · Taxonomy · SSO · Settings.

### Keyboard shortcuts
- `⌘K` global search
- `⌘⇧K` Who Should I Ask
- `⌘N` Quick capture drawer
- `G` then `M` / `W` / `A` / `L` / `P` navigate
- `?` shortcut list

---

## 6. What's NOT done (explicit punch list)

### Deferred to right before GA (per user)
- **Nango self-host** on droplet — unlocks Gmail / Slack / Calendar / Notion / SharePoint.

### Gov-track specific (year 2)
- **OCR pipeline** — scanned PDFs → text, high accuracy. Budget: Tesseract for baseline, layer in Nougat / Amazon Textract. **This is mission-critical for the gov ICP.**
- **Redaction + PII scrubbing** for sensitive docs.
- **Legal hold + retention schedules** (7-50 years gov requirements).
- **On-premise Rabbit** — the gov deal-closer. Train on (context, question, good_answer) triples from SMB production.
- **StateRAMP / CJIS / FERPA / HIPAA** compliance paperwork.

### Sprint H candidates (next)
- Meeting Prep card on Home (15 min before calendar event).
- Action-taking agents (draft Jira, send Slack, schedule follow-up).
- Slack / Teams bot (ask inline).
- Ambient browser extension ported for Enterprise.
- Anonymous ask for HR.

### Still unfixed
- Onboarding glitch — needs user repro.
- Graph perf past ~500 nodes (React Flow stutters).
- Notification types `mention`, `needs_review`, `suggestion` defined but not emitted.
- Agent chat routes (`/api/enterprise/agents/{id}/chat`) — survey suggested they don't exist; needs verification in live app.

---

## 7. Strategy one-pagers (don't lose these)

### Rabbit training plan
- Claude + Groq = tutors, not competitors.
- Every Q&A pair in production becomes training data.
- After 6 months with 20-50 pilots → 50-500k `(context, question, good_answer)` triples.
- Train Rabbit on **three narrow tasks only**:
  1. Retrieval Q&A over memory corpus
  2. Triage / classification at capture
  3. Structured extraction (Brain Dump, Onboarding Genie, Exit Interview, Handoff Generator)
- Keep Claude as the **evaluator forever** — nightly regression suite.
- Unit economics: Claude ≈ $5-15/seat/mo, Rabbit self-hosted ≈ $0.50-2/seat/mo. The margin flip is the moat.

### Demo narrative that wins vs Glean
1. Morning: Home + Start My Day card ("feels like a chief of staff")
2. Reply to a customer email with inline memory surfacing ("reads my mind") ← Sprint H
3. Ask a hard synthesis question; Oracle dossier pulls Slack thread + decision + policy ("like Glean but smarter")
4. Agent drafts Jira ticket, sends Slack confirm ("actually works for me") ← Sprint H
5. **The money demo**: "Priya gave notice Friday. Exit Interview Agent has her tribal knowledge captured; Handoff Generator built the packet; Onboarding Genie wrote Maya's first week." — this is the moment Glean physically cannot match.

Steps 1, 3, 5 are already built. Steps 2, 4 are Sprint H.

---

## 8. Open files / key paths

```
src/
  app/(app)/app/
    legend/page.tsx                            # NEW — feature catalog
    ask/ (page + chat-view + oracle-view)      # unified Ask
    landscape/ (page + temporal-view + causal-view) # unified Landscape
    brain-dump/page.tsx                        # capture, Firehose/File/Link tabs
    exit-interview/[id]/page.tsx               # NEW — participant session
    admin/[orgId]/
      exit-interviews/page.tsx                 # NEW — admin trigger + list
      handoff/page.tsx                         # NEW — one-click handoff
  app/api/enterprise/
    exit-interviews/route.ts                   # NEW — POST create, GET list
    exit-interviews/[id]/route.ts              # NEW — GET detail, PATCH answer/complete
    handoff/route.ts                           # NEW — POST run
  lib/db/
    schema.ts        # exitInterviews table added
    migrate.ts       # exit_interviews CREATE TABLE added
  lib/enterprise/
    notify.ts        # notifyDepartmentMembers + notifyOrgMembers
    rbac.ts          # role matrix source of truth
scripts/
  test-rbac.ts       # `npm run test:rbac` — 36/36 passing
```

---

## 9. Resume instructions

```bash
cd /Users/partha/Desktop/enterprise
git status   # should be clean on main after push
git log --oneline -5
```

Then in a fresh Claude Code session: **"Read today.md"**. Mention what to work on next.

Suggested orders of operation from here:
1. **Ship Sprint H** — Meeting Prep Card + action-taking agents + Slack bot. Completes the day-in-the-life demo.
2. **Polish Exit Interview / Handoff with seed data** — populate the droplet demo org with realistic names, decisions, memories, then test the flows end-to-end before showing to pilots.
3. **Nango ingestion** — one connector done completely (Slack recommended). Do this right before GA.
4. **Gov-track groundwork** — OCR pipeline, StateRAMP paperwork start. Year 2 move.

*Generated at sprint-G end. `npx tsc --noEmit` clean; `npm run test:rbac` 36/36 passing; site serves 307 on `/app` (healthy).*
