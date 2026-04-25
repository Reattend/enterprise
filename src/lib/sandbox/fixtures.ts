// AI fixtures for the public sandbox.
//
// These are pre-canned responses surfaced when a sandbox session hits any
// AI endpoint. Key design goals:
//   1. Showcase the product's "magic" without invoking the LLM
//   2. Deterministic — every visitor sees the same output, which makes demos
//      reproducible and the messaging coherent
//   3. Match the *shape* the real endpoint would return, so the UI doesn't
//      have to branch (streaming chat: same text protocol; oracle: same
//      5-section dossier markdown)
//
// Retrieval is fuzzy — we match the visitor's input against a list of
// suggested questions. If nothing matches, we serve the "generic scripted
// demo" answer that explains what they should try next.

export type SandboxSuggestion = {
  id: string
  question: string
  category: 'start-here' | 'decisions' | 'exits' | 'ops'
}

export const SANDBOX_SUGGESTIONS: SandboxSuggestion[] = [
  // start-here
  { id: 'beps',     question: 'What did we decide about the BEPS treaty position, and what depends on that decision?', category: 'start-here' },
  { id: 'rajiv',    question: 'If Rajiv left tomorrow, what would we lose?', category: 'exits' },
  { id: 'vendor-x', question: 'What did the org know about Vendor X on March 3, 2025?', category: 'start-here' },
  // decisions
  { id: 'stale',    question: 'Which of our active policies are stale and why?', category: 'decisions' },
  { id: 'reversed', question: 'Which decisions have we reversed this year, and why?', category: 'decisions' },
  { id: 'contradict', question: 'Are any of our active decisions contradicting each other?', category: 'decisions' },
  // exits
  { id: 'ramp',     question: 'Draft a first-week onboarding packet for a new Deputy Director in International Taxation.', category: 'exits' },
  { id: 'exit-q',   question: 'Generate exit interview questions for Rajiv based on his memory footprint.', category: 'exits' },
  // ops
  { id: 'tomorrow', question: 'What should I prepare before tomorrow\'s BEPS sync with the EU delegation?', category: 'ops' },
  { id: 'trending', question: 'What memories are trending in the department this week?', category: 'ops' },
]

// Canned Chat answers. Key = suggestion id. Each returns the full streaming
// protocol the real endpoint emits: ANSWER ---FOLLOWUPS--- ---OFFERS---.
// Sources are returned as a separate list so they can go in the X-Sources
// header exactly like the live endpoint.
export type SandboxChatFixture = {
  answer: string
  sources: Array<{ id: string; title: string; type: string; workspace?: string }>
  followUps: string[]
  offers: string[]
}

export const SANDBOX_CHAT: Record<string, SandboxChatFixture> = {
  beps: {
    answer: `The BEPS treaty position was decided on **October 14, 2024** by the Inter-Ministerial Committee [1]. The position: India will sign Pillar Two but reserve its right to a digital services tax for 18 months post-ratification [2].

Three active policies depend on this decision:

- **Tax residency rules for MNCs** (Policy v2.3) — references the Pillar Two global minimum at 15% [3]
- **Digital services tax framework** (Policy v1.1) — the 18-month reservation clause is load-bearing here [4]
- **Double-taxation avoidance template** — updated Nov 2024 to align with the treaty [5]

If the position is reversed or renegotiated, all three of these silently misalign — that's the blast radius.

---FOLLOWUPS---
- Who was in the room when BEPS was decided?
- What was the rationale for the 18-month reservation?
- Has anyone proposed reversing this position?

---OFFERS---
- Show me the full blast radius for the BEPS decision
- Draft a briefing note summarizing the BEPS position for new hires`,
    sources: [
      { id: 'demo-m1', title: 'Inter-Ministerial Committee minutes — Oct 14, 2024', type: 'meeting', workspace: 'International Taxation' },
      { id: 'demo-m2', title: 'BEPS treaty position decision record', type: 'decision', workspace: 'International Taxation' },
      { id: 'demo-m3', title: 'Tax Residency Rules for MNCs · v2.3', type: 'policy', workspace: 'Policy Library' },
      { id: 'demo-m4', title: 'Digital Services Tax Framework · v1.1', type: 'policy', workspace: 'Policy Library' },
      { id: 'demo-m5', title: 'Double-Taxation Avoidance Template — Nov 2024 revision', type: 'policy', workspace: 'Policy Library' },
    ],
    followUps: [
      'Who was in the room when BEPS was decided?',
      'What was the rationale for the 18-month reservation?',
      'Has anyone proposed reversing this position?',
    ],
    offers: [
      'Show me the full blast radius for the BEPS decision',
      'Draft a briefing note summarizing the BEPS position for new hires',
    ],
  },

  rajiv: {
    answer: `Rajiv Sharma is the Director of International Taxation, four years in. His memory footprint shows concentration in three areas the org would lose if he left tomorrow:

**1. BEPS treaty thread** — he authored 11 of the 12 decisions in the file, including the Pillar Two position and the digital services tax reservation [1][2]. Three active policies depend on these.

**2. EU delegation relationships** — the informal Tuesday 9am call with Brussels counterparts isn't on any calendar; it lives only in Rajiv's head and his weekly Slack DMs [3]. If he leaves, the call stops unless his successor is introduced explicitly.

**3. The BEPS form bug** — the legacy submission form silently maps a blank tax year to "2020", causing silent misfiles. Rajiv flagged it in 2023 but the fix is still pending; everyone who submits works around it manually [4].

That's the handoff doc the Exit Interview Agent would write. Want me to generate the full structured version?

---FOLLOWUPS---
- What's in Rajiv's Tuesday 9am Brussels call?
- What happens to the BEPS form bug if nobody inherits the workaround?
- Who should we introduce to Rajiv's EU counterparts?

---OFFERS---
- Run the Exit Interview Agent for Rajiv
- Draft a handoff doc for Rajiv's role`,
    sources: [
      { id: 'demo-m6', title: 'BEPS decision thread (11 entries authored by Rajiv Sharma)', type: 'decision', workspace: 'International Taxation' },
      { id: 'demo-m7', title: 'Pillar Two position — signed Oct 14, 2024', type: 'decision', workspace: 'International Taxation' },
      { id: 'demo-m8', title: 'Slack #eu-delegation weekly thread', type: 'meeting', workspace: 'International Taxation' },
      { id: 'demo-m9', title: 'BEPS submission form bug report — May 2023', type: 'insight', workspace: 'International Taxation' },
    ],
    followUps: [
      'What\'s in Rajiv\'s Tuesday 9am Brussels call?',
      'What happens to the BEPS form bug if nobody inherits the workaround?',
      'Who should we introduce to Rajiv\'s EU counterparts?',
    ],
    offers: [
      'Run the Exit Interview Agent for Rajiv',
      'Draft a handoff doc for Rajiv\'s role',
    ],
  },

  'vendor-x': {
    answer: `As of **March 3, 2025**, the org had logged the following about Vendor X [1][2][3]:

- Contract signed **January 12, 2024** with a 3-year term, auto-renew clause [1]
- Delivery performance: **two missed milestones** logged in Q4 2024, one resolved, one carried forward [2]
- Compliance review: **open**, owned by Priya Iyer — raised Feb 21, 2025 regarding data residency discrepancy [3]
- No escalations to Joint Secretary level as of this date
- Spend YTD (as of Mar 3): ₹2.4 crore against ₹6 crore annual cap

The first time this vendor was escalated to Secretary level was **March 28, 2025** — 25 days after the date you asked about. Use the Time Machine slider to see the state change.

---FOLLOWUPS---
- What changed between March 3 and the Secretary escalation?
- Who first raised the data residency issue?
- What's the current status of Vendor X?

---OFFERS---
- Open Time Machine at March 3, 2025
- Generate a vendor-history timeline for Vendor X`,
    sources: [
      { id: 'demo-v1', title: 'Vendor X contract signed — Jan 12, 2024', type: 'decision', workspace: 'Procurement' },
      { id: 'demo-v2', title: 'Q4 2024 delivery performance review', type: 'meeting', workspace: 'Procurement' },
      { id: 'demo-v3', title: 'Data residency compliance review — open, Priya Iyer', type: 'insight', workspace: 'Procurement' },
    ],
    followUps: [
      'What changed between March 3 and the Secretary escalation?',
      'Who first raised the data residency issue?',
      'What\'s the current status of Vendor X?',
    ],
    offers: [
      'Open Time Machine at March 3, 2025',
      'Generate a vendor-history timeline for Vendor X',
    ],
  },

  stale: {
    answer: `Three active policies are flagged stale right now, based on verification cadence + upstream decision changes [1]:

- **Data Residency Policy v1.2** — last verified 14 months ago; the EU GDPR adequacy decision it cites was revoked in Nov 2024 [2]
- **Vendor Onboarding Checklist v2.0** — last verified 11 months ago; depends on the (now revised) Procurement Code of Conduct v3.1 [3]
- **Tax Residency Rules for MNCs v2.3** — last verified 9 months ago; the BEPS Pillar Two position it references was refined in Feb 2025 [4]

The self-healing dashboard auto-generates a "needs review" task for each. Nobody has picked them up in the last 30 days.

---FOLLOWUPS---
- Who owns the Data Residency Policy?
- What breaks if we don't refresh the Tax Residency rules?
- Show me the full contradictions list

---OFFERS---
- Assign reviewers to all three stale policies
- Draft the revision for Data Residency Policy v1.3`,
    sources: [
      { id: 'demo-s1', title: 'Self-Healing dashboard snapshot — Apr 22, 2026', type: 'insight', workspace: 'Compliance' },
      { id: 'demo-s2', title: 'EU GDPR adequacy decision — revoked Nov 2024', type: 'decision', workspace: 'Compliance' },
      { id: 'demo-s3', title: 'Procurement Code of Conduct v3.1', type: 'policy', workspace: 'Procurement' },
      { id: 'demo-s4', title: 'BEPS Pillar Two position refinement — Feb 2025', type: 'decision', workspace: 'International Taxation' },
    ],
    followUps: [
      'Who owns the Data Residency Policy?',
      'What breaks if we don\'t refresh the Tax Residency rules?',
      'Show me the full contradictions list',
    ],
    offers: [
      'Assign reviewers to all three stale policies',
      'Draft the revision for Data Residency Policy v1.3',
    ],
  },

  reversed: {
    answer: `Three decisions have been reversed in the last 12 months [1][2][3]:

- **Vendor Y single-source exemption** (Jun 2025 → reversed Sep 2025). Reason: competitive bid process re-established after audit finding [1]
- **Remote-first work guidance** (Jan 2025 → reversed May 2025). Reason: department heads requested in-person coordination for Q2 budget cycle [2]
- **Informal minutes acceptance** (Aug 2025 → reversed Nov 2025). Reason: compliance flag — formal minutes are an audit requirement [3]

All three reversals are fully chained — predecessors linked, successors linked, blast-radius computed. The audit log shows who, when, and why for each.

---FOLLOWUPS---
- Who pushed to reverse the remote-first guidance?
- What other decisions did the Vendor Y reversal break?
- Are there any pending-reversal proposals on the table right now?

---OFFERS---
- Show me the blast radius for the remote-first reversal
- Generate a reversals-this-year report for the Secretary`,
    sources: [
      { id: 'demo-r1', title: 'Vendor Y single-source exemption — reversed Sep 2025', type: 'decision', workspace: 'Procurement' },
      { id: 'demo-r2', title: 'Remote-first work guidance — reversed May 2025', type: 'decision', workspace: 'HR' },
      { id: 'demo-r3', title: 'Informal minutes acceptance — reversed Nov 2025', type: 'decision', workspace: 'Compliance' },
    ],
    followUps: [
      'Who pushed to reverse the remote-first guidance?',
      'What other decisions did the Vendor Y reversal break?',
      'Are there any pending-reversal proposals on the table right now?',
    ],
    offers: [
      'Show me the blast radius for the remote-first reversal',
      'Generate a reversals-this-year report for the Secretary',
    ],
  },

  contradict: {
    answer: `Self-healing found **two active contradictions** in the current policy set [1]:

**1. Data retention window** — the Records Management Policy v2.1 says 7 years; the GDPR Data Subject Rights Policy v1.3 says "no longer than necessary, cap 5 years." Both are active. Most recent decision (Jan 2026) favors the 5-year cap but neither policy was updated [2][3].

**2. Vendor approval threshold** — Procurement Code v3.1 says "above ₹50 lakh requires Joint Secretary sign-off"; the Delegated Financial Powers table lists the threshold as ₹1 crore. Operational teams are using the ₹1 crore threshold [4][5].

These are exactly the kind of gaps that surface only when someone asks the right question across the corpus. Reattend flagged both automatically — the Secretary hasn't yet scheduled a reconciliation.

---FOLLOWUPS---
- Who should we loop in to resolve the retention contradiction?
- Which policy wins under current enforcement practice?
- Are there similar contradictions in the HR policy set?

---OFFERS---
- Draft a reconciliation memo for the Secretary
- Schedule a policy sync with both policy owners`,
    sources: [
      { id: 'demo-c1', title: 'Self-Healing contradictions report — Apr 22, 2026', type: 'insight', workspace: 'Compliance' },
      { id: 'demo-c2', title: 'Records Management Policy v2.1 (7-year retention)', type: 'policy', workspace: 'Compliance' },
      { id: 'demo-c3', title: 'GDPR Data Subject Rights Policy v1.3 (5-year cap)', type: 'policy', workspace: 'Compliance' },
      { id: 'demo-c4', title: 'Procurement Code v3.1 (₹50 lakh threshold)', type: 'policy', workspace: 'Procurement' },
      { id: 'demo-c5', title: 'Delegated Financial Powers (₹1 crore threshold)', type: 'policy', workspace: 'Finance' },
    ],
    followUps: [
      'Who should we loop in to resolve the retention contradiction?',
      'Which policy wins under current enforcement practice?',
      'Are there similar contradictions in the HR policy set?',
    ],
    offers: [
      'Draft a reconciliation memo for the Secretary',
      'Schedule a policy sync with both policy owners',
    ],
  },

  ramp: {
    answer: `Here's what the Onboarding Genie would write for a new Deputy Director in International Taxation, grounded in the dept's memory graph:

**Week 1 — read these (in order)**
1. BEPS treaty position decision record + the 11 linked decisions — this is the central thread
2. Pillar Two global minimum policy v2.3
3. Digital Services Tax Framework v1.1 — pay attention to the 18-month reservation clause
4. Double-Taxation Avoidance Template — Nov 2024 revision

**People to meet**
- Rajiv Sharma (Director, International Taxation) — weekly 1:1; ask about the Tuesday 9am Brussels call
- Priya Iyer (Deputy Director, Cross-Border Tax) — ask her about the Vendor X data residency escalation
- Vikram Rao (Joint Secretary) — monthly sync; he drives budget cycle decisions

**Agents to try**
- Ask Oracle with "What did we decide about BEPS?"
- Run the Self-Healing dashboard to see which policies in your area are stale
- Open Time Machine at 12 months ago to see the state the day you joined

**Watch out for**
- The BEPS submission form silently maps blank year to 2020 — enter 2025 explicitly
- Vendor Y's data residency status is in flux; do not sign new engagements until the compliance review closes

---FOLLOWUPS---
- Who assigns the first 30-60-90 day goals for this role?
- What's the budget cycle cadence I need to know?
- Where do I find prior handoff docs for this role?

---OFFERS---
- Schedule the Week 1 intro meetings with Rajiv, Priya, and Vikram
- Generate a 30-60-90 day plan for this role`,
    sources: [
      { id: 'demo-o1', title: 'BEPS decision thread (12 entries)', type: 'decision', workspace: 'International Taxation' },
      { id: 'demo-o2', title: 'Pillar Two Global Minimum Policy v2.3', type: 'policy', workspace: 'Policy Library' },
      { id: 'demo-o3', title: 'Handoff doc for previous Deputy Director (Rajeev Kumar, 2023)', type: 'note', workspace: 'HR' },
    ],
    followUps: [
      'Who assigns the first 30-60-90 day goals for this role?',
      'What\'s the budget cycle cadence I need to know?',
      'Where do I find prior handoff docs for this role?',
    ],
    offers: [
      'Schedule the Week 1 intro meetings with Rajiv, Priya, and Vikram',
      'Generate a 30-60-90 day plan for this role',
    ],
  },

  'exit-q': {
    answer: `Based on Rajiv Sharma's memory footprint (47 decisions authored, 14 meetings chaired, 112 policies referenced), the Exit Interview Agent would ask:

**1.** The BEPS Pillar Two position has 3 active dependencies. If the Council renegotiates, what's the order in which we should update the three downstream policies, and who should be in each room?

**2.** You've flagged the BEPS submission form bug three times over two years. What's the workaround you personally use, and what breaks if a new hire tries to submit blind?

**3.** The Tuesday 9am Brussels call with EU delegation — there's no calendar entry. Who are the three counterparts, what's their cadence, and what topics are usually on the agenda?

**4.** Vendor X compliance review — you owned the escalation through the end of February. What's your read on the data residency issue, and which way do you think it should land?

**5.** If you could only do one handoff task before leaving, which would it be — and why?

Each question is grounded in Rajiv's actual memory footprint. Click into any of them and you'll see the count of memories that shaped the question.

---FOLLOWUPS---
- Draft the handoff doc from Rajiv's expected answers
- Add a sixth question about EU relationships
- Show me the memory footprint chart for Rajiv

---OFFERS---
- Send these questions to Rajiv
- Generate a full 5-question follow-up prompt set`,
    sources: [
      { id: 'demo-e1', title: 'Rajiv Sharma memory footprint — 47 decisions / 14 meetings / 112 policies', type: 'insight', workspace: 'HR' },
      { id: 'demo-e2', title: 'BEPS submission form bug — May 2023, May 2024, Feb 2025', type: 'insight', workspace: 'International Taxation' },
      { id: 'demo-e3', title: 'Vendor X compliance review — open, owned by Rajiv', type: 'decision', workspace: 'Procurement' },
    ],
    followUps: [
      'Draft the handoff doc from Rajiv\'s expected answers',
      'Add a sixth question about EU relationships',
      'Show me the memory footprint chart for Rajiv',
    ],
    offers: [
      'Send these questions to Rajiv',
      'Generate a full 5-question follow-up prompt set',
    ],
  },

  tomorrow: {
    answer: `Tomorrow's BEPS sync with the EU delegation is at **10:00 AM IST**. Here's what the Meeting Prep card pulled together [1]:

**Attendees**: Rajiv Sharma (you), Vikram Rao (Joint Sec), Ingrid Schmidt (EU DG TAXUD), Marco Rossi (Italian Finance)

**What they know about us**: our Pillar Two position (Oct 2024), our 18-month digital services tax reservation, and the Feb 2025 refinement on intra-group payments.

**Open loops from the last sync (Feb 12, 2026)**:
- Ingrid promised a written position on intra-group licensing — not yet received
- We committed to sharing our provisional statistics by end of March — **sent, confirmed received**
- Marco raised concerns about small-country impact — unresolved

**What's likely on the agenda**: follow-up on intra-group licensing, preview of the Jun 2026 Council meeting, possible new agenda item on carbon border tax given the EU's latest positioning paper [2].

**What to prepare**: the latest provisional statistics packet, a one-pager on the small-country impact assessment, and the list of internal names (from Finance + Commerce) that Marco asked for.

---FOLLOWUPS---
- Send a pre-read to Ingrid and Marco
- What did we commit to at the Feb 12 sync?
- Who on our team should join virtually?

---OFFERS---
- Draft the pre-read for the EU delegation
- Compile the small-country impact one-pager`,
    sources: [
      { id: 'demo-t1', title: 'BEPS sync Feb 12, 2026 — minutes', type: 'meeting', workspace: 'International Taxation' },
      { id: 'demo-t2', title: 'EU Carbon Border Tax positioning paper — Apr 2026', type: 'insight', workspace: 'International Taxation' },
    ],
    followUps: [
      'Send a pre-read to Ingrid and Marco',
      'What did we commit to at the Feb 12 sync?',
      'Who on our team should join virtually?',
    ],
    offers: [
      'Draft the pre-read for the EU delegation',
      'Compile the small-country impact one-pager',
    ],
  },

  trending: {
    answer: `Top memories by views in the last 7 days [1]:

- **BEPS Pillar Two position — Oct 2024** (42 views, +18% vs last week) — someone opened a proposal to refine the reservation clause
- **Vendor X compliance review** (31 views) — Priya escalated to Secretary on Monday
- **Self-Healing stale policies list** (28 views) — three policies flagged; nobody has picked them up
- **Remote-first reversal — May 2025** (19 views) — HR is writing a retrospective
- **Q2 budget cycle template** (16 views) — quarterly ritual

The pattern: BEPS stays hot (always does), and the Vendor X escalation is the new thread this week. If you're onboarding, start with BEPS; if you're operational, start with Vendor X.

---FOLLOWUPS---
- What's the Vendor X Monday escalation about?
- Show me everything Priya authored this week
- Why is the stale policies list trending?

---OFFERS---
- Open the Vendor X decision record
- Subscribe me to BEPS updates`,
    sources: [
      { id: 'demo-tr1', title: 'Trending dashboard — week of Apr 15-22, 2026', type: 'insight', workspace: 'Home' },
    ],
    followUps: [
      'What\'s the Vendor X Monday escalation about?',
      'Show me everything Priya authored this week',
      'Why is the stale policies list trending?',
    ],
    offers: [
      'Open the Vendor X decision record',
      'Subscribe me to BEPS updates',
    ],
  },
}

// Fallback when the visitor types something off-script. Explains the
// guided-demo concept and nudges them to click a suggested chip.
export const SANDBOX_CHAT_FALLBACK: SandboxChatFixture = {
  answer: `You're in the **Reattend Enterprise sandbox** — a guided tour. The AI is running in scripted-demo mode so every visitor sees the same magic moments.

For the best experience, click one of the suggested questions below. They each trigger a pre-canned answer that shows how Reattend would respond against a real organization's memory.

On a live deployment, Reattend would:
1. Retrieve the 150 most relevant memories from your org
2. Re-rank them down to the top 30 with our fast reranker
3. Synthesize a grounded, cited answer in under 3 seconds
4. Show you every source that informed a claim

---FOLLOWUPS---
- What did we decide about the BEPS treaty position, and what depends on that decision?
- If Rajiv left tomorrow, what would we lose?
- Which of our active policies are stale and why?

---OFFERS---
- Show me the scripted demo list
- Take me to the Exit Interview Agent`,
  sources: [
    { id: 'demo-sandbox', title: 'Sandbox guided-demo mode', type: 'note', workspace: 'Sandbox' },
  ],
  followUps: [
    'What did we decide about the BEPS treaty position, and what depends on that decision?',
    'If Rajiv left tomorrow, what would we lose?',
    'Which of our active policies are stale and why?',
  ],
  offers: [
    'Show me the scripted demo list',
    'Take me to the Exit Interview Agent',
  ],
}

// Fuzzy-match a free-text question to a fixture id. We look for
// high-signal tokens in the question against each suggestion's keywords.
// Returns the fixture id or null if no match clears the threshold.
export function matchSandboxQuestion(question: string): string | null {
  const q = question.toLowerCase()
  // Ordered by specificity — more specific first
  const patterns: Array<[RegExp, string]> = [
    [/beps.*(depends|what.*depend)/i, 'beps'],
    [/beps/i, 'beps'],
    [/rajiv.*(left|leave|gone|quit)|if rajiv/i, 'rajiv'],
    [/vendor\s*x/i, 'vendor-x'],
    [/stale/i, 'stale'],
    [/reversed|reversal/i, 'reversed'],
    [/contradict/i, 'contradict'],
    [/onboarding|first.week|new (deputy|hire)|ramp/i, 'ramp'],
    [/exit interview|leaving.*(question|footprint)/i, 'exit-q'],
    [/tomorrow|next meeting|meeting prep/i, 'tomorrow'],
    [/trending|most.*view/i, 'trending'],
  ]
  for (const [re, id] of patterns) {
    if (re.test(q)) return id
  }
  return null
}

// ─── Brain Dump fixture ──────────────────────────────────────────
// The parse endpoint returns a preview: items[] in {kind, title, summary}
// shape. Canned preview matches what the AI would extract from the dump in
// the demo script.

export const SANDBOX_BRAIN_DUMP = {
  items: [
    { kind: 'decision', title: 'Pillar Two ratification with 18-mo DST reservation', summary: 'Decision logged Oct 14, 2024 — will be updated as reservation clock approaches expiry.' },
    { kind: 'action',   title: 'Review BEPS reservation clock before Apr 14, 2026', summary: 'Secretary to chair; three downstream policies must be re-confirmed before that date.' },
    { kind: 'action',   title: 'Intro successor to Ingrid Schmidt + Marco Rossi', summary: 'Tuesday 9am Brussels call — no calendar entry; handoff needed if Rajiv departs.' },
    { kind: 'question', title: 'Is the Vendor X data residency breach remediable?', summary: 'Depends on Vendor X legal cooperation. Secretary reviewing this week.' },
    { kind: 'fact',     title: 'BEPS submission form defaults blank year to 2020', summary: 'Flagged 3× by Rajiv. Workaround: enter year explicitly until fix ships.' },
  ],
  meta: { sandbox: true, model: 'scripted-demo' },
}

// ─── Onboarding Genie fixture ────────────────────────────────────
// Returns a full structured packet keyed to a mock new hire.

export const SANDBOX_ONBOARDING_GENIE = {
  packet: {
    headline: 'Deputy Director, Cross-Border Tax — first-week packet',
    summary: 'You are joining the International Taxation department, which owns the BEPS treaty thread. Here\'s what to read, who to meet, and what to watch out for.',
    readThese: [
      'BEPS treaty position decision record (Oct 2024) + 11 linked decisions',
      'Pillar Two Global Minimum Policy v2.3',
      'Digital Services Tax Framework v1.1 — the 18-month reservation clause is load-bearing',
      'Double-Taxation Avoidance Template — Nov 2024 revision',
    ],
    peopleToMeet: [
      { name: 'Rajiv Sharma', role: 'Director, International Taxation', context: 'Weekly 1:1; ask about the Tuesday 9am Brussels call' },
      { name: 'Priya Iyer', role: 'Deputy Director, Cross-Border Tax', context: 'Ask about the Vendor X data residency escalation' },
      { name: 'Vikram Rao', role: 'Joint Secretary', context: 'Monthly sync; drives budget cycle decisions' },
    ],
    agentsToTry: [
      'Ask Oracle with "What did we decide about BEPS?"',
      'Run the Self-Healing dashboard to see which policies in your area are stale',
      'Open Time Machine at 12 months ago to see the state the day you joined',
    ],
    watchOutFor: [
      'The BEPS submission form silently maps blank year to 2020 — enter year explicitly',
      'Vendor Y data residency is in flux; do not sign new engagements until compliance closes',
    ],
  },
  meta: { sandbox: true },
}

// ─── Handoff Doc fixture ─────────────────────────────────────────
// The real endpoint produces a 7-section markdown string that the UI renders.

export const SANDBOX_HANDOFF_DOC = `# Handoff: Director, International Taxation

## 1. Summary
Rajiv Sharma carries four years of context on the BEPS treaty thread, the EU
delegation channel, and a known submission-form bug. The single most important
thing for the successor to absorb: **the BEPS Pillar Two reservation clock
expires April 14, 2026** — a decision must be on file before then.

## 2. Active Projects
- **BEPS treaty position** — state: live, next action: reservation clock review with Secretary before Apr 14, 2026
- **Vendor X compliance escalation** — state: open, next action: convert to Notice of Breach this week
- **Q2 budget cycle** — state: in flight, next action: submit dept estimates by May 5

## 3. Relationships to Preserve
- **Ingrid Schmidt** (EU DG TAXUD) — Tuesday 9am IST weekly call; introduce successor at the next sync
- **Marco Rossi** (Italian Finance) — same call; separately emails on small-country impact topics
- **Priya Iyer** (Deputy Director) — inherits all Vendor X work

## 4. Tribal Knowledge
- **Tuesday 9am Brussels call** — not on any calendar. Cadence is weekly except during EU Council meeting weeks.
- **Budget estimates format** — the JS template everyone uses was written by the outgoing Finance Advisor in 2022; nobody else can edit it cleanly.
- **Ingrid's reply pattern** — she acknowledges within 24h but substantive replies take 5-7 business days; don't re-send.

## 5. Gotchas
- The **BEPS submission form silently maps a blank year field to 2020**. Always enter year explicitly. Flagged 3× (May 2023, May 2024, Feb 2025) — fix still pending.
- The **Pillar Two reservation expires Apr 14, 2026**. If nothing is on file, the 18-month DST window closes silently.

## 6. Open Loops
- Ingrid owes a written position on intra-group licensing (promised Feb 12, 2026)
- Marco asked for the list of internal Finance + Commerce names — not yet sent
- Data Residency Policy v1.2 is stale and needs a reviewer (self-healing flagged 3 months ago)

## 7. First Week Checklist
- [ ] Read the BEPS decision thread in order
- [ ] 1:1 with Priya Iyer (inherits Vendor X)
- [ ] 1:1 with Vikram Rao (Joint Secretary)
- [ ] Read the Oct 2024 committee minutes cover to cover
- [ ] Confirm attendance at next Tuesday Brussels call; schedule intro to Ingrid + Marco
- [ ] File reservation-clock review agenda item with Secretary's office`

// ─── Compose / Draft fixture ─────────────────────────────────────
export const SANDBOX_COMPOSE = {
  subject: 'BEPS sync follow-up — provisional statistics + small-country note',
  body: `Ingrid, Marco —

Thanks for the productive sync yesterday. Per our commitments:

1. **Provisional statistics packet** — attached. Confirms our position on intra-group licensing falls within the original Oct 2024 framework.

2. **Small-country impact assessment (Marco's ask)** — on track for end-May delivery. We'll share the draft for informal review two weeks before.

3. **Intra-group licensing written position (Ingrid's ask)** — we'll hold this open on our side until we receive yours. No deadline from our end.

One new thread: the Apr 14 reservation clock is approaching. We'll table a formal review on our side this week; happy to share the outcome if useful for your preparation for the June Council meeting.

Best,
Rajiv`,
  tone: 'professional',
  meta: { sandbox: true },
}

// ─── Start My Day fixture ────────────────────────────────────────
export const SANDBOX_START_MY_DAY = {
  headline: 'Three things to look at this morning',
  focus: `1. **Vendor X** — Priya re-escalated to Secretary Monday. Your call on data residency remediation vs. termination should probably land by Wednesday.

2. **BEPS reservation clock** — we're **23 days** from the Apr 14 review deadline. Nothing is on file yet; good morning to put the agenda item in.

3. **Tomorrow's EU sync** — agenda primed; the small-country impact one-pager is the new ask from Marco. Priya can draft; you review.`,
  changedSince: [
    'Priya escalated Vendor X to Secretary (Apr 18)',
    'Data Residency Policy v1.2 flagged stale by self-healing (Apr 19)',
    'Ingrid confirmed receipt of provisional statistics packet (Apr 21)',
  ],
  meta: { sandbox: true },
}

// Universal sandbox-guard helper — endpoints that don't have a specific
// fixture can call this to return a 200 with a friendly "scripted demo"
// message. Keeps the UI from breaking when a visitor clicks "Generate".
export function sandboxNotImplementedResponse(feature: string): {
  status: 'sandbox'
  message: string
  feature: string
  meta: { sandbox: true }
} {
  return {
    status: 'sandbox',
    message: `${feature} runs in scripted-demo mode in the sandbox. Try the Chat or Oracle tabs for a full guided tour, or start a pilot to run this on your org's live data.`,
    feature,
    meta: { sandbox: true },
  }
}

// ─── Oracle dossier fixtures ─────────────────────────────────────
// Oracle renders a 5-section markdown dossier. We provide three pre-built
// dossiers mapped to the same ids as chat, so a user can flip between
// modes and see the deeper version of the same question.

export type SandboxOracleFixture = {
  dossier: string
  sources: Array<{ id: string; title: string; type: string; workspace?: string; passage?: string }>
}

export const SANDBOX_ORACLE: Record<string, SandboxOracleFixture> = {
  beps: {
    dossier: `## Situation

The Inter-Ministerial Committee signed the BEPS Pillar Two global minimum tax position on **October 14, 2024**, with an 18-month reservation clause for a digital services tax [1]. The position has since been refined twice — Feb 2025 (intra-group payments) and Dec 2025 (threshold interpretation) [2][3]. Three active policies depend on the position remaining stable.

## Evidence

- **Primary decision**: Inter-Ministerial Committee minutes, Oct 14, 2024. Present: Joint Secretary Vikram Rao, Director Rajiv Sharma, Advisor Sanjay Verma, representatives from MEA and Commerce. Passed unanimously [1]
- **Dependent policies** [4][5][6]:
  - Tax Residency Rules for MNCs v2.3 — explicitly cites Pillar Two 15%
  - Digital Services Tax Framework v1.1 — the 18-month clock is load-bearing
  - Double-Taxation Avoidance Template — Nov 2024 revision
- **Most recent refinement**: Dec 18, 2025 committee note on threshold interpretation [3]

## Risks

- **Short-term**: the 18-month reservation clock expires **April 14, 2026**. No successor decision is yet on file. If the clock lapses without action, the digital services tax window closes silently.
- **Medium-term**: EU carbon border tax conversations (raised Apr 2026 [7]) may introduce a new dependency not yet captured in the chain.
- **Personnel**: 11 of the 12 thread entries are authored by Rajiv Sharma. His absence would create a single-point-of-failure on interpretive knowledge (see exit interview dossier).

## Recommendations

1. Schedule the reservation-clock review **before April 14, 2026** — the Secretary should chair.
2. Commission a formal dependency map of all downstream policies; attach to the decision record as an appendix.
3. Begin knowledge-transfer sessions between Rajiv and a second Director-level owner to de-risk the personnel concentration.
4. Add a tag on all BEPS-adjacent memories to enable one-click pulls on future questions.

## Unknowns

- Whether the EU counterparts have drafted their internal response to our Dec 2025 refinement — Ingrid promised a written position that has not yet arrived
- What the small-country impact assessment Marco Rossi asked for will conclude (due end of May 2026)
- Whether the Jun 2026 Council meeting agenda will include a formal carbon border tax item or keep it informal`,
    sources: [
      { id: 'demo-o-beps-1', title: 'Inter-Ministerial Committee minutes — Oct 14, 2024', type: 'meeting', workspace: 'International Taxation', passage: '"The committee resolved unanimously to adopt the Pillar Two global minimum position with an 18-month reservation clause for digital services tax, effective from the date of signature."' },
      { id: 'demo-o-beps-2', title: 'BEPS refinement — Feb 2025 intra-group payments', type: 'decision', workspace: 'International Taxation', passage: '"Refines the original Oct 2024 position by clarifying that intra-group licensing payments fall under the original 15% minimum floor."' },
      { id: 'demo-o-beps-3', title: 'BEPS refinement — Dec 2025 threshold interpretation', type: 'decision', workspace: 'International Taxation', passage: '"The threshold interpretation is harmonized to the EU standard: EUR 750 million consolidated group turnover, two-year lookback."' },
      { id: 'demo-o-beps-4', title: 'Tax Residency Rules for MNCs v2.3', type: 'policy', workspace: 'Policy Library', passage: '"This policy aligns with the Pillar Two 15% global minimum as ratified by the committee on October 14, 2024."' },
      { id: 'demo-o-beps-5', title: 'Digital Services Tax Framework v1.1', type: 'policy', workspace: 'Policy Library', passage: '"The digital services tax may be applied for a period of up to eighteen (18) months from the date of Pillar Two ratification."' },
      { id: 'demo-o-beps-6', title: 'Double-Taxation Avoidance Template — Nov 2024', type: 'policy', workspace: 'Policy Library' },
      { id: 'demo-o-beps-7', title: 'EU Carbon Border Tax positioning paper — Apr 2026', type: 'insight', workspace: 'International Taxation' },
    ],
  },

  rajiv: {
    dossier: `## Situation

Rajiv Sharma is the Director of International Taxation, four years in. He authored 47 decision records, chaired 14 meetings, and referenced 112 policies across his tenure. If he left tomorrow, three knowledge clusters would move out of the organization with him.

## Evidence

- **BEPS thread ownership** — 11 of 12 BEPS-lineage decisions are authored by Rajiv. Three active policies depend on these [1][2]
- **EU delegation channel** — the Tuesday 9am Brussels call (Ingrid Schmidt, Marco Rossi) appears in no calendar; only in Rajiv's direct Slack channel and personal notes [3]
- **BEPS submission form bug** — flagged by Rajiv three times (May 2023, May 2024, Feb 2025); unfixed. The workaround is to enter the year explicitly instead of relying on the default [4]
- **Authorship concentration** — Rajiv is sole author on 9 decisions in the last 12 months; co-author on 4 more

## Risks

- **High**: the Apr 14, 2026 BEPS reservation clock review depends on interpretive context Rajiv alone holds. Without transfer, the Secretary will chair a review with incomplete grounding.
- **Medium**: the EU channel collapses silently — Ingrid and Marco will stop engaging if the cadence lapses, and the next meeting is Jun 2026.
- **Low-medium**: new hires will rediscover the form bug and misfile; probability scales with volume of submissions, ~1 bad entry per 30 submissions based on pre-workaround rate.

## Recommendations

1. Run the **Exit Interview Agent** now, before departure — it will produce a structured 7-section handoff doc grounded in Rajiv's memory footprint. (Click the Exit Interview tile on this demo.)
2. Introduce a successor to Ingrid and Marco at the next sync (tomorrow 10:00 AM IST) — attendee list already primed in Meeting Prep.
3. File a priority ticket to fix the BEPS submission form bug this quarter, while the workaround is still in active tribal memory.
4. Open the handoff doc to all Director-level peers; the Tuesday-call context is broadly useful.

## Unknowns

- Whether Rajiv has surfaced all of his interpretive heuristics in writing, or whether some remain only in conversations that weren't captured
- Whether the EU counterparts will accept a new primary contact without a warm intro
- What priority the form-bug fix would actually receive vs. other backlog work`,
    sources: [
      { id: 'demo-o-r-1', title: 'BEPS decision thread — 11 of 12 authored by Rajiv Sharma', type: 'decision', workspace: 'International Taxation', passage: '"Authorship: Rajiv Sharma (11); co-authored (1)."' },
      { id: 'demo-o-r-2', title: 'Rajiv Sharma authorship footprint 2025-2026', type: 'insight', workspace: 'HR', passage: '"47 decisions authored, 14 meetings chaired, 112 policy references."' },
      { id: 'demo-o-r-3', title: 'Slack #eu-delegation — cadence log', type: 'meeting', workspace: 'International Taxation', passage: '"Weekly Tuesday 9:00 AM IST call. Participants: Rajiv Sharma, Ingrid Schmidt (DG TAXUD), Marco Rossi (IT Finance)."' },
      { id: 'demo-o-r-4', title: 'BEPS submission form bug reports — May 2023, May 2024, Feb 2025', type: 'insight', workspace: 'International Taxation', passage: '"When the year field is left blank on submission, the form defaults to 2020. Workaround: enter year explicitly each time."' },
    ],
  },

  sandbox_default: {
    dossier: `## Situation

You're running Oracle in the sandbox, where it serves a fixed set of deep-research dossiers. The three available demo topics are **BEPS treaty position**, **If Rajiv left tomorrow**, and **Vendor X point-in-time**.

## Evidence

Ask any of these three questions to see Oracle render a full 5-section dossier with source citations and passage highlights — the same thing your real org would see, except here the answer is pre-rendered from scripted fixtures. Real deployment runs our deep-research engine over 150 retrieved candidates reranked down to 30.

## Risks

If you free-text a question off-script, Oracle falls back to the BEPS dossier so the UI still renders. For a genuine test run, spin up a pilot — we'll seed Oracle on your org's actual memory graph.

## Recommendations

1. Click "What did we decide about the BEPS treaty position..." for a policy-dependency dossier
2. Click "If Rajiv left tomorrow..." for a succession-risk dossier
3. Click "What did the org know about Vendor X on March 3..." for a point-in-time audit dossier

## Unknowns

- What questions are most valuable to your specific organization
- Which of our seeded memories would map 1:1 to yours — and which won't`,
    sources: [
      { id: 'demo-oracle-sandbox', title: 'Oracle sandbox demo mode', type: 'note', workspace: 'Sandbox', passage: 'This is a scripted Oracle demo. Real deployments run against your live memory graph.' },
    ],
  },

  'vendor-x': {
    dossier: `## Situation

Vendor X is a mid-size software provider under a 3-year contract signed Jan 12, 2024. As of Apr 22, 2026, the org's cumulative footprint on this vendor includes two missed milestones (one unresolved), an open data residency compliance review, and a Mar 28, 2025 escalation to Secretary level. The vendor remains in active status with ₹2.4 crore YTD spend against a ₹6 crore cap.

## Evidence

- **Contract**: 3-year term, signed Jan 12, 2024, auto-renew unless terminated 90 days before expiry [1]
- **Delivery history**: Q4 2024 — two missed milestones. Milestone M3 resolved in Jan 2025 with service credit; Milestone M5 carried forward, still unresolved as of this report [2]
- **Compliance**: data residency review opened Feb 21, 2025 by Priya Iyer. Concern: vendor's EU sub-processor storing Indian resident data in Frankfurt contrary to contractual "India-only" clause [3]
- **Escalations**: first Secretary-level escalation Mar 28, 2025; re-escalated Apr 18, 2026 (this Monday) [4]
- **Renewal runway**: auto-renew decision point Oct 2026 (90 days before contract end)

## Risks

- **Immediate**: the Apr 18 escalation triggered a Secretary review. If mishandled in the next 10 days, could force a mid-term termination — estimated cost ₹80 lakh early-termination fee, plus ₹1.2 crore switching cost for a successor vendor.
- **Compliance**: data residency breach is auditable. Regulator inquiry (not yet filed) would add reputational and potentially regulatory financial exposure.
- **Operational**: two mid-size workflows depend on Vendor X systems. Switching runway minimum 6 months.

## Recommendations

1. Resolve M5 milestone within 14 days — assign Priya or escalate again.
2. Convert the data residency concern into a formal Notice of Breach this week, while the Secretary is engaged.
3. Run a parallel vendor search under "contingency" status — don't wait until termination decision.
4. Pull the Blast Radius view on the Vendor X relationship to see every policy and decision that depends on this contract.

## Unknowns

- Whether Vendor X's legal team will cooperate on a data residency remediation plan or force a legal battle
- Whether M5 can technically be completed given the team turnover Vendor X reported in Mar 2026
- What Secretary's personal preference is: remediate, terminate, or re-scope`,
    sources: [
      { id: 'demo-o-v-1', title: 'Vendor X contract — signed Jan 12, 2024', type: 'decision', workspace: 'Procurement', passage: '"Three-year term commencing January 12, 2024. Auto-renewal unless written notice of non-renewal is provided at least ninety (90) days prior to expiry."' },
      { id: 'demo-o-v-2', title: 'Q4 2024 Vendor X delivery review', type: 'meeting', workspace: 'Procurement', passage: '"M3 resolved with 10% service credit (Jan 2025). M5 carried forward; root cause: capacity shortfall on vendor side."' },
      { id: 'demo-o-v-3', title: 'Data residency compliance review — Feb 21, 2025', type: 'insight', workspace: 'Compliance', passage: '"Priya Iyer raised concern: Vendor X\'s Frankfurt sub-processor storing Indian resident data violates the \\"India-only\\" clause in Schedule 3."' },
      { id: 'demo-o-v-4', title: 'Vendor X escalation log — Mar 2025, Apr 2026', type: 'decision', workspace: 'Procurement', passage: '"First escalated to Secretary on Mar 28, 2025. Re-escalated Apr 18, 2026 following continued non-remediation."' },
    ],
  },
}
