# Reattend Enterprise — Demo Runbook

**Audience:** sales / founder / engineering hand-off team running live demos.
**Length:** 12-minute walkthrough · five "money moments" · ends on the Exit Interview reveal.
**Demo data:** the seeder at `scripts/seed-demo-org.ts` populates a "Ministry of Finance (Demo)" org with 22 members, 12 decisions, 5 policies, 1 completed exit interview, 6 OCR jobs, prompts, calendar events, verification badges. Run `npm run seed:demo -- demo-presenter@reattend.com` before every session.

---

## Pre-flight (60 seconds before the call)

- [ ] DB seeded (`npm run seed:demo`) — verify the demo org appears in the org switcher
- [ ] Active org: **Ministry of Finance (Demo)**
- [ ] Toolbar pinned items: Reattend extension, browser zoomed to 110%
- [ ] Tab 1: `/app` (Home) — for steps 1, 2
- [ ] Tab 2: `/app/admin/<demo-org-id>/decisions` — for step 3
- [ ] Tab 3: `/app/admin/<demo-org-id>/exit-interviews` — for step 5
- [ ] Tab 4: a whitelisted page (Gmail demo account or Notion) — for the extension reveal
- [ ] Phone notifications off

---

## The five money moments

### 1. Morning brief (90 seconds) — "feels like a chief of staff"

**Open:** `/app`

**Say:**
> "This is what every employee opens first thing Monday. Reattend has read every memory the org has logged since they were last here, written a three-sentence focus brief, and surfaced what changed."

**Point at:**
- **Start My Day** card — three-sentence Claude focus
- **Meeting Prep** card — "BEPS sync with EU in 12 minutes" with click-to-expand brief, related memories, attendee context
- **Trending** card — top 5 most-viewed memories this week
- **Memory Resurface** card — "1 year ago today: we made [decision]"

**Demo punch:** click the next-meeting in Meeting Prep. The expand reveals the Claude-written heads-up, related memories with citations, and open questions from prior context.

**Transition:**
> "OK, the day's started. Let me ask the system something hard."

---

### 2. Ask Oracle (90 seconds) — "feels like Glean but smarter"

**Open:** `/app/ask` → toggle to **Oracle**

**Type:** *"What did we decide about the BEPS treaty position, and what depends on that decision?"*

**As it runs (~25 seconds):**
> "Oracle isn't fast. It's pulling 150 candidate memories, having Claude Haiku rerank the top 30, then handing the curated set to Claude Sonnet to write a structured five-section dossier. Watch the pipeline."

**Point at:**
- **Pipeline indicator** — five steps, real measurements
- **Dossier sections:** Situation / Evidence / Risks / Recommendations / Unknowns
- **Sources** at the bottom — every claim cites [M#] / [D#], and clicking a source shows the **exact passage** from the memory that informed the answer (passage highlighting from Sprint I)

**Transition:**
> "Now — every executive's nightmare. Imagine I'm about to reverse one of these decisions. What breaks?"

---

### 3. Blast Radius (60 seconds) — "this is what corporate amnesia costs"

**Open:** `/app/admin/<orgId>/decisions` → click any decision flagged with red status → **Blast Radius**

**Point at:**
- **Score** in top-right (e.g., "32 — Significant" or "68 — Systemic")
- **Linked memories** — explicit references this decision is load-bearing for
- **Predecessor / successor chain** — the decisions this one replaced + the ones built on top of it
- **People who would need to be in the room** — inferred from authorship and entity mentions
- **Claude narrative** at the top — 2-3 sentence impact summary

**Say:**
> "If I'd reversed this without seeing the blast radius, four policies would have silently misaligned. That's the difference between making a decision and making a decision in context."

**Transition:**
> "Now let me show you something that doesn't exist anywhere else. Reverse the clock."

---

### 4. Time Machine (60 seconds) — "see what we knew, when"

**Open:** `/app/landscape?mode=temporal`

**Drag the slider** to ~12 months ago. Then **click Play**.

**Say:**
> "This is point-in-time state. As of any moment in the last 24 months, what did the org know? Which decisions were active? Which had been reversed yet, which hadn't? It's the same memory graph, but indexed by 'as of'."

**Point at:**
- **Animated metric cards** — counts re-pulse on every scrub
- **Active decisions panel** — populates dynamically as time changes
- **Memories panel** — only shows what existed at that point

**Use case prompt:**
> "When auditors ask 'what did the company know about Vendor X on March 3', this is the answer."

**Transition (this is the setup for the close):**
> "Last one. This is the demo we built Reattend for."

---

### 5. Exit Interview Agent (90 seconds) — the close

**Open:** `/app/admin/<orgId>/exit-interviews` (the seeder pre-populates a completed one)

**Say:**
> "Let's say Rajiv just gave notice. He's the Director of International Taxation, four years in, carries the entire BEPS treaty thread in his head. I'm his manager. Watch what happens."

**Click the completed interview row.** Show the page.

**Point at:**
- The 5 **questions Claude wrote**, each grounded in Rajiv's actual memory footprint (count: how many memories on each topic)
- His **answers** in the panels
- Click **Open handoff doc** — the saved memory record

**The handoff doc** has these sections (from the seeded data):
1. Summary — single most important thing
2. Active Projects — state, contact, next action
3. Relationships to Preserve
4. Tribal Knowledge — including the Tuesday 9am informal
5. Gotchas — the BEPS form silently mapping blank year to 2020
6. Open Loops
7. First Week Checklist

**Say (slowly):**
> "This is what the new hire reads on their first day. The Tuesday morning meeting is in there. The BEPS form bug is in there. The names of the three people they have to introduce themselves to are in there. Six weeks of ramp time, gone."

**Close:**
> "Glean can find this stuff if you know what to search for. We're the only product that asks the question on your behalf, gets the answers, and writes the handoff for you. That's why we exist."

---

## Backup beats (when the room asks for more)

### Onboarding Genie

`/app/admin/<orgId>/onboarding-genie` → fill out a fake new hire's name, role, department → click **Generate packet**. Claude reads the dept's memory graph and writes a personalized first-week packet (decisions to know, people to meet, policies to ack, agents to try).

### OCR pipeline (gov track)

`/app/admin/<orgId>/ocr` → drag any PDF or image into the upload zone → watch a job spin up → completed jobs link to memory records with PII redaction counts visible. Pre-seeded jobs already populate the dashboard.

### Self-healing dashboard

`/app/admin/<orgId>/health` → "Run scan" → highlights stale policies + contradictions + orphaned records. The notifications panel shows the corresponding `suggestion` notification that fired.

### Chrome extension

Switch to the whitelisted browser tab. Show:
- **Floating R-pin** bottom-right — click captures title + URL + selection
- **Right-click → Attend** — three-option menu
- **Alt+Shift+A** opens the Ask sidebar — point at how it picks up page context
- **Ambient card** — refresh a Gmail thread that matches a seeded memory; bottom-left card with related memories appears

### Compliance + audit WORM

`/app/admin/<orgId>/audit` → click **Verify chain**. "All N rows verified" — explain the sha256 chain in one sentence:
> "Every audit row is hash-linked to the previous one. If anyone modifies a historical row, this button surfaces the exact tampered row id. That's the difference between an audit log and a compliance artifact."

`/compliance` → public page shows the certifications matrix and what we have today (encryption, RBAC, WORM, PII redaction, GDPR controls).

---

## Common objections + answers

| Question | Answer |
|---|---|
| "Why not Glean?" | Glean does enterprise search. We do organizational memory — decisions, exits, handoffs, time travel, self-healing. Different soul, even if the search bar looks similar. Show step 5. |
| "How do we get data in?" | Three paths: (1) Chrome extension on whitelisted apps captures as you work; (2) integrations via Nango (Slack, Notion, Teams shipping pre-launch; Google post-CASA); (3) for gov clients, a trainer ships in and OCR-ingests legacy paper. |
| "What about hallucinations?" | Every answer cites the exact source memory. Oracle additionally shows the passage from the memory that informed the claim. If the memory doesn't have it, Claude says so — see the Unknowns section. |
| "Compliance?" | `/compliance` page. SOC 2 Type I in Q1 post-launch (kicking off at GA), II Q2+, GDPR controls live today, StateRAMP Moderate prep for gov, CJIS addendum on request, on-premise deployment for clients who can't egress. |
| "Cost vs Glean?" | We don't compete on Glean's price — we compete on the wedge. Per-seat pricing is comparable for SMB; enterprise + gov is quote-only. Year 2 we ship on-prem Rabbit and the per-seat economics collapse to <$2/seat/month. |
| "What if we leave?" | GDPR-grade data export in user settings (one button, JSON bundle of everything we have). For org-level export, contact-sales — we provide the full SQL dump within 5 business days. |
| "How does the AI not see things it shouldn't?" | Two-tier RBAC: org role + per-department role. Record-level visibility is enforced at retrieval time — the LLM literally never receives memories the user can't see. Test suite ships with 36 RBAC assertions, runs every build. |

---

## Trouble-shooting

- **Demo org missing from switcher** — re-run `npm run seed:demo -- <your-email>`. The seeder is idempotent; safe to re-run any time.
- **Oracle hangs / errors** — `ANTHROPIC_API_KEY` likely expired on the droplet. Switch to Chat mode for the demo, then file a follow-up.
- **Trending card shows "0 views"** — seeder's view counts are window-relative; if it's been > 7 days since seeding, the views fell out of the window. Re-seed.
- **Extension pin doesn't appear** — confirm token is pasted in extension options + the current site is in the whitelist (or in the org's required/recommended policy).

---

*Last updated: with Sprint N. Update this when demo flow changes — sales team is the audience, not engineering.*
