# Reattend — Launch Checklist

> Updated: 2026-03-26
> Rule: Check off only when tested and confirmed working in production.

---

## 1. Account Deletion
- [x] "Delete my account" button in settings (web app)
- [x] Deletes: user record, workspaces (if sole owner), workspace members, records, embeddings, sessions, API tokens
- [x] Confirmation dialog with typed confirmation ("delete my account")
- [x] Logs out and redirects to marketing site after deletion
- [x] Required for: Google Cloud OAuth approval, GDPR compliance

---

## 2. Admin Dashboard (`/admin`)
- [x] Gated to admin user only (hardcoded userId check)
- [x] **Users tab** — list of all users, plan, signup date, last active
- [x] **Usage tab** — questions asked (web + ext), memories saved, per-user breakdown
- [x] **Revenue tab** — active subscribers, plan breakdown (MRR from Paddle webhook data)
- [x] **Actions** — manually change user plan, delete user
- [x] **Health** — app uptime, DB record counts, last deploy timestamp

---

## 3. Copy Updates (10/day free tier)
- [x] Landing page pricing section: 10 AI queries/day confirmed
- [x] `/pricing` page: 10 AI queries/day confirmed
- [x] Billing page in dashboard: aligned
- [x] Extension popup / sidebar: shows live usage count
- [x] Note: limit is **10/day** (not month) — intentional, confirmed 2026-03-26

---

## 4. Chrome Extension
### Meeting Audio Recorder
- [x] Recording flow end-to-end tested (record → transcribe → save to Reattend)
- [x] Transcript appears correctly in web app under Transcripts
- [x] Edge case: microphone permission denied → mic-request.html flow
- [ ] Edge case: tab closed mid-recording (not yet tested)

### AI Question Counter
- [x] Extension enforces 10 queries/day via `/api/tray/ask` (server-side)
- [x] Usage indicator in extension popup (bar shows X/10)
- [x] Blocked at 10 with upgrade prompt in sidebar
- [x] Counter resets daily (per-day, not per-month)

### Meeting Recording Limit
- [x] Free users limited to 2 recordings/day (server-enforced)
- [x] 429 error surfaced in popup with upgrade CTA
- [x] Pro users: unlimited

### Submission
- [x] Version bumped to 1.1.0 in manifest.json
- [x] Chrome Web Store listing updated (description, permissions, data disclosure)
- [x] Submitted for review 2026-03-26

### Known open issue (non-blocking)
- [ ] Stop Recording button only shows when on the meeting tab — should show from any tab when recording is active

---

## 5. Documentation Pages
- [x] Chrome extension docs (install, connect, record, ask)
- [x] Integration docs (Slack, Google Calendar, API/Token)
- [x] All docs live in web app dashboard

---

## 6. External Platform Checks
- [x] **Google Cloud OAuth** — consent screen verification submitted, awaiting Google approval
- [ ] **Google Cloud OAuth** — approved (unblock: enables Google login for all users)
- [ ] **Google Search Console** — sitemap submitted, coverage checked, no crawl errors
- [x] **Slack App** — submitted for review, awaiting Slack verification
- [ ] **Paddle** — all 4 price IDs verified working end-to-end (Monthly Pro, Annual Pro, Monthly Teams, Annual Teams)

---

## 7. AI Answer Quality Testing
> In progress — testing over next 1 week (from 2026-03-26)

### Test Cases to Run
- [ ] Meeting transcript saved → ask "what did we decide in [meeting]?" → exact answer, no hallucination
- [ ] Multiple meetings → ask about specific one → correct one retrieved, not mixed
- [ ] Numbers/IDs in memory → ask for them → quoted exactly, not paraphrased
- [ ] Question not in memory → "I don't see this in your saved memories" — NOT an invented answer
- [ ] Long answer doesn't get cut off mid-sentence
- [ ] Cross-workspace search works correctly
- [ ] Slack message saved → retrievable via Ask
- [ ] Calendar event saved → retrievable via Ask

---

## 8. Pricing Enforcement
- [x] Extension: 10 queries/day enforced via `/api/tray/ask`
- [x] Extension: 2 meeting recordings/day enforced via `/api/tray/proxy/transcribe-meeting`
- [ ] Web app: AI query limit enforced (pending — after item 7 AI testing complete)
- [ ] Web app: upgrade prompt shown on limit hit (direct CTA to billing)
- [ ] Test: upgrade to Pro → limit removed immediately
- Note: Web app enforcement intentionally deferred until AI quality confirmed

---

## Phase 2 — Post-Launch (build after launch)

### Meeting Platform Integrations
| Platform | Method | Priority |
|---|---|---|
| Fireflies.ai | GraphQL API + webhooks — auto-ingest when meeting ends | High |
| Otter.ai | REST API + webhooks | High |
| Zoom | Zoom API — recordings + auto-transcripts | High |
| Google Meet | Google Workspace API (existing OAuth scope) | Medium |
| Read.ai | API (less documented) | Medium |
| Microsoft Teams / Copilot | Microsoft Graph API | Low (enterprise) |
| Fathom | No public API yet — Zapier only | Later |

### Other Post-Launch
- [ ] Onboarding email on signup (plain text, what you can do, how to get started)
- [ ] Billing confirmation emails (personal note beyond Paddle receipt)
- [ ] Mobile web — test on iOS Safari and Android Chrome

---

## Launch Sign-off
- [x] Account deletion live
- [x] Admin dashboard live
- [x] Extension submitted to Chrome Web Store
- [x] Pricing enforcement live on extension
- [ ] Google Cloud OAuth approved (unblocks all Google sign-in users)
- [ ] AI quality testing complete (item 7)
- [ ] Web app pricing enforcement live (item 8)
- [ ] No console errors on web app in production
- [ ] Paddle all 4 price IDs verified
- [ ] **Ship it.**
