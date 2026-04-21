# End-to-end smoke test for enterprise.reattend.com

Run through this top-to-bottom. Note any step that's broken or weird — paste the observation back to the session and we'll fix. Target time: ~45 minutes.

---

## 0. Prerequisites

- `enterprise.reattend.com` loads (HTTPS green lock)
- `nango.reattend.com` loads the Nango dashboard
- You're signed in as a super_admin of a real org (or the demo-mof seed)

---

## 1. Home feed (the first impression)

- [ ] `https://enterprise.reattend.com/app` loads without error
- [ ] Greeting shows (Good morning/afternoon/evening)
- [ ] Org name is correct
- [ ] "Capture" and "Ask AI" buttons present top-right
- [ ] If there are pending policy acks, yellow banner lists them
- [ ] Recent memories card shows real records OR empty state
- [ ] Recent decisions card shows real decisions OR empty state
- [ ] Quick actions sidebar shows Transfer / Self-healing / Download briefing
- [ ] Sync status card hidden if nothing connected

**Refresh 3 times in a row.** No hydration-mismatch console errors should appear.

---

## 2. Capture flow

- [ ] Click **Capture** (or press ⌘N)
- [ ] Drawer slides in from right
- [ ] Paste 2-3 paragraphs of text (any decision you've made recently)
- [ ] Submit
- [ ] Success toast with record ID
- [ ] New record appears in Home → Recent memories after refresh
- [ ] Clicking the memory opens the detail page with Claude-generated summary

**Failure modes to watch for:**
- 500 on submit → check server logs on droplet: `journalctl -u reattend -n 50`
- Triage fails silently → `/app/inbox` will show it as "needs_review"

---

## 3. Ask AI

- [ ] Click **Ask AI** or go to `/app/chat`
- [ ] Type: *"What have we decided in the last month?"*
- [ ] Answer streams in
- [ ] Sources panel on the right shows real citations
- [ ] Follow-up works (ask "summarize that as 3 bullets")
- [ ] Response doesn't leak memories you shouldn't see (test with a non-admin account if possible)

---

## 4. Task modes

- [ ] `/app/tasks` gallery loads, shows 4 cards
- [ ] **Draft email**: fill fields → "Draft" → answer streams
- [ ] **Meeting prep**: fill → answer has 5 sections (last interaction, open threads, etc.)
- [ ] **Draft brief**: fill → structured output
- [ ] **Slide outline**: fill → slide-by-slide
- [ ] Refine chat below answer works

---

## 5. Memory → Decision promotion

- [ ] Open any memory detail page (`/app/memories/<id>`)
- [ ] Click **Promote to decision**
- [ ] Dialog opens, prefills title + summary
- [ ] Select a department
- [ ] Submit → toast → redirected to `/app/admin/[orgId]/decisions`
- [ ] New decision shows up in the list

---

## 6. Wiki

- [ ] `/app/wiki` loads with 3 tabs
- [ ] **Hierarchy**: dept tree renders, indented. Click a dept → summary + recent records
- [ ] **Topics**: ranked tag list. Click one → topic page with depts
- [ ] **People**: member list. Offboarded members float bottom with "at risk" badge
- [ ] Summaries are Claude-generated (not placeholder text)
- [ ] "cached" vs "fresh" badge on summary

---

## 7. Policies

- [ ] `/app/policies` lists 4 published + 1 draft (per seed)
- [ ] Click a policy → detail page
- [ ] Ack banner shows if you haven't acknowledged
- [ ] Click **Acknowledge** → confirmation, banner flips to green
- [ ] Admin: `/app/admin/[orgId]/policies/new` → author form loads
- [ ] Fill title + body + category → Publish → redirects back
- [ ] Non-admin: **New policy** button does NOT show

---

## 8. Agents

- [ ] `/app/agents` lists seeded agents (5 in demo)
- [ ] Click **Chat** on any → drawer opens, messages work
- [ ] Admin: click **Edit** on an agent (only visible to admins)
- [ ] Builder page loads with test chat on right
- [ ] Change system prompt → Save → test chat respects the new prompt
- [ ] Publish toggles work
- [ ] Analytics card shows queries/day (likely 0 on fresh deploy)
- [ ] Create an API key → plaintext shown ONCE → revoke

---

## 9. Transfer protocol (the money demo)

- [ ] `/app/admin/[orgId]/transfers` loads
- [ ] Summary cards: at-risk people, records, offboarded count
- [ ] List shows people with unanchored records
- [ ] Click **Transfer** on one → wizard opens
- [ ] Impact preview shows record + decision counts
- [ ] Pick role + successor + notes
- [ ] Submit → toast with counts → list refreshes (original row gone)
- [ ] Transfer history below shows the new event
- [ ] Wiki person page of the transferred user: shows "Transfer history" panel

---

## 10. Admin cockpit

- [ ] `/app/admin/[orgId]` shows:
  - Health score ring
  - Memories / decisions / members counts
  - Amnesia signals cards
  - Decision velocity chart
  - Pending handovers card
  - Critical findings card
- [ ] Click **Run self-healing scan** → scan runs → findings appear
- [ ] Tabs: Overview / Members / Departments / Roles / Decisions / Transfers / Self-healing / Audit / Compliance / Taxonomy / SSO / Settings — all load without 500

---

## 11. Compliance + audit

- [ ] `/app/admin/[orgId]/compliance` shows score ring + 11 controls
- [ ] Set retention to 30 days → Save → "prune eligible" count appears
- [ ] Click **Export CSV** → file downloads
- [ ] Open the CSV → first lines have "Chain tip: <hash>"
- [ ] Audit log page has **Export CSV (tamper-evident)** link

---

## 12. Decision briefing

- [ ] `/app/admin/[orgId]/decisions` → **Download briefing**
- [ ] Markdown file downloads
- [ ] Opens with `# Decision briefing — <org>`, sections for Active / Reversed / Superseded

---

## 13. Integrations (Nango)

- [ ] `/app/integrations` loads (clean, no "Coming Soon" cards)
- [ ] 5 providers show: Gmail / Drive / Slack / Notion / Confluence
- [ ] If you haven't configured Nango provider configs yet, "Connect" opens the Nango Connect UI. If that's blank or errors, Nango dashboard on `nango.reattend.com` needs provider setup (Google/Slack/etc OAuth credentials pasted in).
- [ ] After connect, **Scope** button opens scope dialog; save works
- [ ] Disconnect works

---

## 14. Keyboard shortcuts

- [ ] Press `?` anywhere → shortcut sheet opens
- [ ] ⌘K → navigates to search
- [ ] ⌘N → opens capture drawer
- [ ] ⌘J → navigates to inbox
- [ ] ⌘G → navigates to graph
- [ ] ⌘\ → toggles sidebar

---

## 15. Sign-out / sign-in as member

Create a second user (via invite from admin), sign in as them, verify:

- [ ] Admin cockpit link NOT visible in sidebar
- [ ] Member cannot visit `/app/admin/[orgId]` (403)
- [ ] Member cannot see "New policy" / "New agent" / "Transfer knowledge" buttons
- [ ] Member sees only records their RBAC entitles (create a private memory as admin first; member shouldn't see it)
- [ ] Member can ack a policy that applies to them

---

## What to paste back

For each failure, include:
- Step number
- What happened vs what you expected
- Browser console error (if any)
- Server log (`journalctl -u reattend -n 30 --no-pager` on the droplet)

I'll fix in batches.
