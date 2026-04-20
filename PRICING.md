# Reattend Pricing

**Single source of truth for all pricing copy in the codebase.**
Any time you display a price, plan name, or feature — match this file exactly.

---

## Plans

### Free — $0 / forever
- Unlimited memories
- 5 AI queries / day
- 1 integration of your choice
- 2 meeting recordings / day
- Desktop app + browser extension
- Keyword search

### Pro — $9 / month  ·  $75 / year (saves 2 months)
- 60-day free trial, no credit card required
- Unlimited AI queries
- All integrations (Gmail, Google Calendar, Google Meet, Slack, + future)
- Unlimited meeting recordings
- Semantic search + knowledge graph
- Writing assist
- Priority support
- Early access to new features

### Teams — $7 / user / month  ·  $56 / user / year (saves 2 months)
- Minimum 3 users
- Everything in Pro
- Shared memory spaces
- Team knowledge base
- Admin dashboard
- Bulk onboarding

### Enterprise — Custom pricing
- Everything in Teams
- Unlimited users & teams
- SSO / SAML authentication
- Custom data retention policies
- Dedicated support & onboarding
- SLA & uptime guarantees
- Custom integrations
- On-premise deployment option

---

## Key rules
- Free plan is **free forever** (not a trial)
- Pro 60-day trial is full Pro access, no credit card
- Annual billing: Pro saves 2 months ($75/yr vs $108/yr), Teams saves 2 months ($56/user/yr vs $84/user/yr)
- Teams minimum is **3 users**
- The Paddle price ID in `.env` must match the Pro plan at $9/month

## Paddle Price IDs (live)
| Plan | Billing | Price ID |
|------|---------|----------|
| Pro | Monthly | `pri_01khtqv8advskhd9nq2eks9pm7` |
| Pro | Annual | `pri_01kmjwfjfsjaq942pkk4tdhgc7` |
| Teams | Monthly | `pri_01kmjwkq1mx4r5hsnhvrrh0kvz` |
| Teams | Annual | `pri_01kmjwnmh111qh0tc06rvemtwc` |

Env var names: `NEXT_PUBLIC_PADDLE_PRICE_ID`, `NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID`, `NEXT_PUBLIC_PADDLE_TEAMS_PRICE_ID`, `NEXT_PUBLIC_PADDLE_TEAMS_ANNUAL_PRICE_ID`

## Files that display pricing
- `src/app/pricing/pricing-content.tsx` — public pricing page ✅ (source of truth UI)
- `src/app/(app)/app/billing/page.tsx` — in-app billing page (keep in sync)
