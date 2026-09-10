// Single source of truth for what each subscription tier is allowed to do.
// Read by the gates in `./gates.ts` and by any UI that needs to render
// "what does the next tier unlock" lists.
//
// Pricing (USD), post-2026-08-29 self-serve-trial restructure:
//   Free ("BYOK")   - $0, bring your own Anthropic/OpenAI/Gemini key, free
//                     forever. No platform AI cost - see lib/ai/byok.ts,
//                     which hard-stops free orgs with no key configured
//                     instead of silently falling back to the platform key.
//                     Unlimited seats (it's the org's own AI bill, not ours).
//   Professional
//   ("Managed")     - $19/seat/mo (or $182.40/yr = 20% off), self-serve up to
//                     99 seats, runs on the platform's own Claude key.
//                     15-day no-card trial for orgs, 7 for personal - see
//                     TRIAL_DAYS_BY_TIER, which mirrors the Paddle price
//                     trial_period exactly. Always
//                     paired with a "talk to sales" option in the UI, not a
//                     replacement for it. Soft-capped at aiQueriesPerMonth
//                     (not unlimited - a flat per-seat fee funding literally
//                     unlimited tokens is its own bleed). The quota + tier
//                     are shared org-wide off the org creator's subscription
//                     row (see resolveLLMForOrg / the ask route's
//                     billingOwnerId resolution) - one paying seat unlocks
//                     AI for the whole org, by design.
//   Enterprise      - NOT A PRICE. Kept only as a grant-only label for
//                     negotiated deals (on-prem, air-gapped, 100+ seats)
//                     applied by hand via /api/admin/grant-pro.
//                     It deliberately unlocks nothing Professional does not
//                     already have: RBAC, SSO and the audit log were never
//                     gated in code, and the pricing page has always
//                     advertised them under Managed. Charging $29 for them
//                     would have been selling the same product twice
//                     (Partha, 2026-09-10). Its Paddle prices are archived,
//                     so it cannot be bought self-serve either.

export type Tier = 'free' | 'professional' | 'enterprise'

export interface TierLimits {
  // Volume gates (numeric. -1 means unlimited.)
  aiQueriesPerMonth: number
  capturesPerMonth: number   // -1 = unlimited; BYOK and org users are never metered
  retentionDays: number
  maxSeats: number       // -1 (unlimited) for Free, 99 for Pro, -1 for Enterprise
  minSeats: number       // 1 for Free/Pro, 5 for Enterprise
  // Feature gates (boolean)
  integrationsAll: boolean    // false on Free (manual + extension only)
  rbac: boolean               // two-tier RBAC (org + dept) - Enterprise only
  sso: boolean                // SAML/OIDC SSO - Enterprise only
  auditLog: boolean           // hash-chained audit trail - Enterprise only
  exitInterviewAgent: boolean // Enterprise only
  adminCockpit: boolean       // Enterprise only
  chromeExtensionAutoIngest: boolean // Pro + Enterprise
  // Display
  displayName: string
  monthlyPrice: number    // dollars per seat per month
  annualPriceTotal: number // dollars per seat per year (~20% off the monthly rate)
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    aiQueriesPerMonth: 100,
    capturesPerMonth: -1,
    retentionDays: 90,
    maxSeats: -1, // unlimited - Free is BYOK, it's the org's own AI bill
    minSeats: 1,
    integrationsAll: false,
    rbac: false,
    sso: false,
    auditLog: false,
    exitInterviewAgent: false,
    adminCockpit: false,
    chromeExtensionAutoIngest: false,
    displayName: 'Free',
    monthlyPrice: 0,
    annualPriceTotal: 0,
  },
  professional: {
    // Soft cap, not unlimited: generous enough that ~no real user notices,
    // but bounds worst-case Claude spend on a flat $19/seat/mo fee. UI
    // should nudge ("heavy usage? talk to us about Enterprise") well
    // before this, not just wall at it - see api/ask/route.ts.
    aiQueriesPerMonth: 800,
    capturesPerMonth: 1000,
    retentionDays: -1,
    maxSeats: 99, // self-serve ceiling - 100+ seats requires talk-to-sales (Enterprise tier)
    minSeats: 1,
    integrationsAll: true,
    // These four were false while nothing in the codebase read them and the
    // pricing page advertised all of them under Managed. The paywall never
    // existed; the table just claimed it did. One paid org price, and it
    // includes everything. (2026-09-10)
    rbac: true,
    sso: true,
    auditLog: true,
    exitInterviewAgent: false,
    adminCockpit: false,
    chromeExtensionAutoIngest: true,
    displayName: 'Managed',
    monthlyPrice: 19,
    annualPriceTotal: 182.40, // $19 × 12 × 0.8 = $182.40
  },
  enterprise: {
    aiQueriesPerMonth: -1,
    capturesPerMonth: -1,
    retentionDays: -1,
    maxSeats: -1,
    minSeats: 5,
    integrationsAll: true,
    rbac: true,
    sso: true,
    auditLog: true,
    exitInterviewAgent: true,
    adminCockpit: true,
    chromeExtensionAutoIngest: true,
    displayName: 'Enterprise',
    // Same numbers as Professional: there is one paid org price. These exist
    // only so seat-total maths does not divide by a zero for a granted org.
    monthlyPrice: 19,
    annualPriceTotal: 182.40
  },
}

// Maps a Paddle price ID (from .env) → tier + billing cycle so the webhook
// handler can decode "what did the user just buy?" without hardcoding strings.
export interface PriceMapping {
  tier: 'professional' | 'enterprise'
  billingCycle: 'monthly' | 'annual'
}

export function priceIdToTier(priceId: string | null | undefined): PriceMapping | null {
  if (!priceId) return null
  const map: Record<string, PriceMapping> = {
    [process.env.PADDLE_PRICE_PROFESSIONAL_MONTHLY || '']: { tier: 'professional', billingCycle: 'monthly' },
    // Personal accounts buy Managed at a flat single-seat price; same tier.
    [process.env.PADDLE_PRICE_PERSONAL_MONTHLY || '']: { tier: 'professional', billingCycle: 'monthly' },
    [process.env.PADDLE_PRICE_PROFESSIONAL_YEARLY || '']: { tier: 'professional', billingCycle: 'annual' },
    [process.env.PADDLE_PRICE_ENTERPRISE_MONTHLY || '']: { tier: 'enterprise', billingCycle: 'monthly' },
    [process.env.PADDLE_PRICE_ENTERPRISE_YEARLY || '']: { tier: 'enterprise', billingCycle: 'annual' },
  }
  delete map[''] // drop the empty-key fallback if any env var was missing
  return map[priceId] || null
}

// Personal (no-org) Managed: one seat, monthly only, its own Paddle price.
export function personalPriceId(): string | null {
  return process.env.PADDLE_PRICE_PERSONAL_MONTHLY || null
}

// Reverse lookup - used by the checkout endpoint to translate
// (tier, billingCycle) → Paddle price ID for the transaction creation call.
export function tierToPriceId(tier: 'professional' | 'enterprise', cycle: 'monthly' | 'annual'): string | null {
  if (tier === 'professional' && cycle === 'monthly') return process.env.PADDLE_PRICE_PROFESSIONAL_MONTHLY || null
  if (tier === 'professional' && cycle === 'annual')  return process.env.PADDLE_PRICE_PROFESSIONAL_YEARLY || null
  if (tier === 'enterprise' && cycle === 'monthly')   return process.env.PADDLE_PRICE_ENTERPRISE_MONTHLY || null
  if (tier === 'enterprise' && cycle === 'annual')    return process.env.PADDLE_PRICE_ENTERPRISE_YEARLY || null
  return null
}

// Read by /api/billing/start-trial to set trialEndsAt. Wired into the UI at
// /onboarding and /app/admin/onboarding (2026-08-29) - "Start 7-day free
// trial" always sits next to a "Talk to sales" option, never replaces it.
// metering.ts has an unrelated, older 60-day trial concept tied to the
// legacy Personal/"smart" tier - do not confuse the two.
export const TRIAL_DAYS = 15

// Trial length per tier, kept equal to the trial_period on the matching
// Paddle price so the no-card trial and a card checkout never promise
// different things. Verified against Paddle 2026-09-10:
//   Reattend Personal      $9/mo         trial 7 days
//   Reattend Professional  $19/mo        trial 15 days
//   Reattend Professional  $182.40/yr    trial 15 days
export const TRIAL_DAYS_BY_TIER: Record<'personal' | 'professional', number> = {
  personal: 7,
  professional: 15,
}

/** Days of trial for a caller: personal accounts get 7, orgs get 15. */
export function trialDaysFor(hasOrg: boolean): number {
  return hasOrg ? TRIAL_DAYS_BY_TIER.professional : TRIAL_DAYS_BY_TIER.personal
}
