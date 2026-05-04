# The Orb

> _"After 100 days, Reattend doesn't just remember. It predicts."_

A north-star vision doc for the feature that turns Reattend from "knowledge tool" into "second brain that reads your mind." Not for shipping next sprint. Read this when you're ready to build the moat.

---

## The promise (in one paragraph)

After 100 days of using Reattend — and a 7-day-in-a-row engagement streak — a small, glowing dot appears in the top-right of every page. The user clicks it. The screen goes black. A pulsing orb floats in the center. Type a question. The orb answers — not from your archive, but from your **patterns**. What you'll ask next. What decision you keep avoiding. What you'll regret in 6 months if you don't course-correct now. Every answer is just logic — pattern detection on 100 days of behavioral data. But to the user it feels like the product is reading their mind.

Glean can't do this. Notion can't do this. ChatGPT Enterprise can't do this. Reattend can, because the schema captured decisions + memories + queries + calendar + audit from day one. **The Orb is the moat.**

---

## The unlock mechanic (the "earn it" rule)

The Orb is **not** a feature you get on day 1. It's a milestone you earn. Two conditions, both required:

| Requirement | Threshold | Why |
|---|---|---|
| **Longitudinal use** | 100 calendar days since signup | We need enough decisions, queries, and behavioral data to detect real patterns. Earlier and the Orb makes wrong predictions, breaks trust forever. |
| **Engagement streak** | 7 days in a row of active use (any signed-in session counts) | We need the user to treat Reattend as a daily tool, not a quarterly one. The Orb is for power users; the streak filters them in. |

**Until both are met:** The Orb is not visible in the UI. No nav entry. No tooltip. Nothing.

**Once both are met:** A dramatic unlock moment.
- The first time the user logs in after meeting both conditions, a full-screen takeover plays:
  - Black screen fades in
  - A small glowing dot appears in the center
  - It pulses, grows into a full orb
  - Text fades in: _"You've earned The Orb."_
  - One sentence: _"Click it any time. It will tell you what you can't see."_
  - "Continue" button → returns to normal app, with a small pulsing dot now permanent in the top-right
- After this moment, the Orb is always there. One click → black hole.

**The marketing pitch:** "Stay with Reattend long enough and it stops being a tool. It becomes an oracle." Mention The Orb in marketing copy. Don't show it on the home page. Make people want to earn it.

---

## The aesthetic: black hole UI

Once the Orb is opened, the rest of the app DISAPPEARS. No sidebar. No nav. No header. Just:

- **Background:** pure black (`#000`), with a subtle radial gradient pulsing slowly outward from center. Optional: a faint star-field that drifts. Cinematic.
- **The Orb:** a glowing sphere at the center, ~120px diameter. Pulses gently in time with the user's actual pulse if we can detect it (later — for v1 just a constant gentle glow). Color: the violet from our brand, but more luminous. Feels alive.
- **Input:** a single text field at the bottom of the screen, no chrome. Placeholder: _"Ask the Orb anything about your future."_
- **Output:** when the Orb answers, text fades in floating just above the input, in a serif font (Instrument Serif — the same one from email). Streamed, character by character, like the Orb is thinking. No avatars, no chat bubbles, no Markdown. Just text in space.
- **Past questions:** as the conversation continues, old exchanges fade slightly, drifting upward and outward from the orb like a memory dissolving. The current exchange is always closest to the orb.
- **Exit:** ESC key, or a tiny "✕" in the corner, that fades in only on hover. Returning to the app feels like surfacing from underwater — soft fade back to the normal UI.

**The intent:** the Orb does not feel like another tab in the product. It feels like **stepping out** of the product and into a private moment. Reverence. Singular focus. People should want to use The Orb at 11pm with a glass of wine. Not at 3pm during a Slack flood.

---

## The interaction model: per-user, conversational, future-oriented

The Orb is **personal**. Not your org's patterns — **your** patterns. Your decisions, your queries, your calendar rhythm, your communication graph, your memory access habits, your write times, your reading patterns.

You talk to it. It talks back. Examples of questions and what it could answer:

| You ask | The Orb answers (with the pattern it's reading from) |
|---|---|
| "What am I about to ask?" | "Based on your last 4 Sundays — Q3 OKR status. You've asked it every week before Monday standup. Want me to pre-load it?" |
| "What decision am I avoiding?" | "You've started — and not finished — a 'switch from Notion to Linear' memory three times in the last 90 days. Each time you stop within 6 hours of starting. The pattern says you're avoiding it because the migration cost is unclear. Want me to draft the cost analysis?" |
| "What will I regret in 6 months?" | "If your hiring pace continues, you'll have 4 ICs reporting to you by November. You historically struggle with >3 direct reports — you raised that concern 3 times in the last year. Want to plan a manager hire now?" |
| "Show me my future self in 1 year" | "If your current trajectory holds: 60% more memories per week (you're accelerating), more cross-dept involvement, 2x decisions logged per quarter. The risk pattern: you're spending 70% of your queries on Engineering, 5% on Sales. In 6 months at this ratio your sales context will be stale." |
| "What should I focus on this week?" | "Three threads have been open >14 days without a decision: pricing tier rename, the Sarah onboarding plan, the Q1 board prep. The pricing one matches the cadence pattern of decisions you usually make on Wednesdays." |
| "Who should I talk to today?" | "Karen. You usually meet weekly; it's been 17 days. Last time she went silent for 17+ days, she came back with a resignation letter at her last company. (Pattern from public LinkedIn data — soft signal, not certain.)" |
| "What am I lying to myself about?" | "You said in 4 separate memories over the last 60 days that you'd 'cut Notion costs.' We still pay $2,047/mo. The check has cleared every month. Pattern: this is your most-promised-but-never-acted commitment of the year." |

Notice the shape: the Orb doesn't tell the user what to DO. It surfaces what they might already know but haven't faced. **It mirrors. It doesn't prescribe.**

---

## What the Orb knows about each user (data inventory)

After 100 days, per user, we have:

- **Decision history**: every decision they decided / participated in / reversed. Including titles, rationales, status changes, dept context.
- **Query history**: every chat session, every Ask call. Topics they keep returning to. Questions they've never asked but their peers have.
- **Calendar rhythm**: meetings, who they meet, what time of day, frequency.
- **Memory access patterns**: which memories they read repeatedly. Which they've never opened. Which they viewed once and never returned to.
- **Write patterns**: when they capture (time of day, day of week), how long their memories tend to be, what they don't write about.
- **Audit trail**: every action they took. Tells of working hours, productivity windows, breaks.
- **Entity graph**: who they mention. Who mentions them. Who they avoid mentioning.
- **Promise / commitment extraction**: every "I'll do X" that came out of their voice memos and brain dumps. Tagged with maturity dates. Auto-checked against subsequent activity.
- **Streak / cadence baseline**: their personal cadence per activity. So we know what "normal" is and what's anomalous.
- **Reversal vulnerability profile**: which decision types they tend to reverse vs which stick. Lets us flag risk on new decisions in those categories.

This is enough to pattern-match. No LLM black box, no embeddings-only similarity — straight SQL aggregation + a small LLM at the surface layer for narrative quality.

---

## The 14 patterns the Orb can detect (ranked by wow / cost)

### Tier 1 — pure SQL, no LLM, looks like magic

1. **Reversal warning**: similar new decision matches one previously reversed → "you've tried this 3 times before."
2. **Pre-meeting pre-fetch**: calendar event in N hours + recurring pre-meeting query pattern → pre-load it.
3. **Cadence anomaly**: dept silent for >2x the historical baseline → "either everything is fine or capture has stopped."
4. **Promise tracker**: extracted "I'll do X" promise + maturity date passed without fulfillment → surface.
5. **New-hire question echo**: new user asks what last 3 new hires also asked → pre-build their onboarding.
6. **Person availability**: someone's response time has degraded sharply → flag for proactive reach-out.

### Tier 2 — needs cheap LLM (Llama 70B or Haiku)

7. **Release rhythm forecast**: ship cadence is X days; next due in Y → here's the open work.
8. **Crisis-decision risk score**: decisions made under historical risk conditions (late hours, low context, single decider) → soft warning.
9. **Pre-briefing**: next calendar item + history of "what I missed last time" → pre-flight check.
10. **Topic emergence**: cluster of memories around a new theme → "something is brewing in [area]."

### Tier 3 — longitudinal, only after a year of data

11. **Personal seasonality**: same concern, same time of year, multiple years → "you raise this every Q4 W9. We're in W8."
12. **Topic-velocity profile**: this category of decision usually involves N people for D days → flag outliers.
13. **Habit drift**: "you used to verify memories every 60 days. Last 90 days you've stopped." → re-engage.
14. **Attrition early signal**: behavior pattern matches historical pre-resignation profile → surface to the individual ONLY (not their manager).

---

## The branding lines

For marketing pages, when this ships:

- **The hook**: _"After 100 days, Reattend stops being a tool. It becomes an oracle."_
- **The differentiator**: _"Glean tells you what you wrote. The Orb tells you what you'll write tomorrow."_
- **The retention**: _"The longer you use Reattend, the more it knows you. That's the moat."_
- **The aspiration**: _"Earn The Orb."_

For the unlock moment:

- _"You've earned The Orb."_
- _"It will tell you what you can't see."_

For the empty state (Orb open, user hasn't asked anything yet):

- _"Ask anything about your future. I see your patterns."_

For when the Orb is wrong (because it will be):

- _"I read your past to predict your future. Sometimes I'm wrong. Tell me, and I'll learn."_

---

## Why this is THE moat

| Competitor | Why they can't do this |
|---|---|
| **Glean** | Search-box architecture. No concept of user behavior over time. No decision schema. No audit log. Doesn't watch *behavior*; it indexes documents. |
| **Notion AI** | Per-page Q&A. No cross-document memory model. No longitudinal user model. Notion is a publishing platform; Reattend is a behavioral observatory. |
| **ChatGPT Enterprise** | No persistent org schema. Each chat is fresh. Plus, sending your decisions to OpenAI's training set is a non-starter for any enterprise customer. |
| **Custom internal tools** | They could build it, but they won't. The schema design takes a year. By the time they finish, we're 2 years ahead. |

After a customer hits 100 days + the Orb starts predicting accurately, switching cost = "I'd lose my Orb's understanding of me." That's a $1M ARR retention story. Per customer.

---

## Be honest about the hard parts

### 1. The creepy line
Predictions about INDIVIDUALS surface only to that individual. Never to their manager, their admin, their dept head. The Orb is a private mirror, not a surveillance tool.
- ✅ "Karen, you've been quieter than usual. Anything we can help with?" → shows to Karen
- ❌ "Karen looks like she's about to resign" → never shows to anyone else

For managers, only **aggregates** are visible: "3 of 12 dept members show pattern X — consider retention 1:1s." Never names attached.

### 2. False positives kill the Orb in 2 weeks
Bar for shipping a prediction: a user reading it would say _"huh, yeah, you're right."_ Not "what?" Not "obvious." Just *huh*.

Build the feedback loop into the UI from day 1: every Orb answer ends with two ghost buttons — _"useful"_ / _"not useful"_. Track per-pattern confidence. Stop showing patterns whose confidence drops below 70%. Resurface when the algorithm improves.

### 3. Don't predict things humans should decide
- ✅ "Your last 3 hiring decisions in Q4 led to attrition by Q2" → pattern, surfaced for awareness
- ❌ "You should fire Bob" → never. Not the Orb's job.
- ❌ "You should pause this decision" → soft only, never imperative

The Orb mirrors. It doesn't prescribe. It surfaces patterns the user already knows but hasn't faced. Think therapist, not boss.

### 4. Privacy + audit
Every Orb prediction about a specific person → audit log entry. Open-by-default audit so anyone can see what patterns are being run on them. Make this a feature, not a hidden compliance burden. The user must be able to see their own Orb data and delete patterns.

### 5. The first impression is everything
The unlock moment must be **flawless**. If the first 3 questions someone asks the Orb get bad answers, they never come back. Beta-test the unlock flow with at least 20 users at the 100-day mark before opening it to all. Tune the patterns until those 20 people say "huh, yeah, you're right" 80%+ of the time.

### 6. We need ML observability
Per-user Orb prediction quality. Per-pattern hit rate. Time-to-feedback. Stale pattern decay. Build the dashboard before launch. Without it, the Orb degrades silently and we won't know.

---

## How to discover it before unlocking (the mystique)

Users should know The Orb exists but not see it. Sources of mystique:

1. **Marketing copy**: home page mentions "Earn The Orb" with no explanation. People click around looking for it.
2. **A locked indicator** in the top-right corner of `/app`: a faint outline of an orb, with a subtle counter. Hover → tooltip: _"X of 100 days · Y of 7-day streak."_ No description of what it does. Mystery.
3. **The first time a user hits the streak counter** (e.g., day 5 of 7), a soft notification: _"You're 2 days from earning The Orb. Don't break the streak."_ — gamification kicks in.
4. **Existing Orb-holders can SHOW their Orb to others** (read-only "I'll show you what mine just told me" — share screen, never share data). Word-of-mouth viral loop.
5. **Onboarding** mentions the unlock as the long-term promise: _"Most Reattend power users earn The Orb around day 100. Start your streak today."_

The combination = **aspiration**. The Orb becomes the thing people stay for, the thing they tell their friends about, the thing they protect their streak for.

---

## Phased build plan (when we're ready — NOT NOW)

**Phase 0 (1 week)** — instrumentation:
- Add `users.orb_unlocked_at` (nullable) and `users.engagement_streak_days` columns
- Background worker increments the streak on first daily session, resets on miss
- Daily cron checks: signup_at < (now - 100 days) AND streak >= 7 → flip `orb_unlocked_at = now`
- No UI yet. We're just collecting eligibility data.

**Phase 1 (2 weeks)** — the door, no contents:
- Locked orb indicator in top-right (counter visible)
- The unlock animation (dramatic full-screen takeover)
- Black-hole UI scaffold (background, orb, input, output area)
- Wire to a basic Ask endpoint that just answers "what's in your memory" — no patterns yet
- Goal: the EXPERIENCE feels right before the intelligence is built

**Phase 2 (1 month)** — the 6 Tier-1 patterns:
- Reversal warning, pre-meeting pre-fetch, cadence anomaly, promise tracker, new-hire echo, person availability
- Each pattern as a separate detector module in `src/lib/orb/patterns/`
- Per-pattern confidence + feedback loop wired in
- Daily morning email: "Your Orb has 3 things to tell you" (read-only preview, click → full Orb)

**Phase 3 (1 quarter)** — Tier 2 patterns + voice:
- LLM-narrated answers via Sonnet (long-form reflection responses)
- Voice mode: speak to the Orb, hear it speak back (Whisper + ElevenLabs)
- Pre-meeting Orb on every calendar event
- "Orb briefing" daily audio digest you can listen to on a walk

**Phase 4 (year)** — full personality:
- The Orb has a name (let users name their own?)
- Memory of past Orb conversations (it references "you asked me about Sarah three weeks ago — here's an update")
- Shareable highlights ("the Orb said something interesting today" → public sharing with full data anonymization)

---

## The single line for the website (when this ships)

> _"Reattend is the only memory tool that gets sharper as you use it. Earn The Orb at day 100."_

That sentence ends the Glean comparison forever. Glean can't make that promise. Notion can't. We can.

---

## Status

**Not building this now.** Test week first. Sprint O / P / Q / R first. Real customers first.

Build The Orb when:
1. We have 100+ paying customers (so we have the longitudinal data)
2. We have a customer success person who can do the 20-user unlock-flow QA
3. The base product is rock solid (no surprise outages, no auth flakiness)

This doc is the north star. Read it when you're tempted to ship something gimmicky. The Orb is the opposite of gimmicky — it's the slow-baked, earned, magical reward for using the product. Don't dilute it by shipping a watered-down version.

---

_Filed under: vision / north-star / not-yet_
_Originated: 2026-05-03, in conversation with Partha. The naming and the "earned" mechanic are his._
