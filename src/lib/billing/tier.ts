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
//   ("Managed")     - $15/seat/mo (or $144/yr = 20% off), self-serve up to
//                     99 seats, runs on the platform's own Claude key.
//                     7-day no-card trial (start-trial route) - always
//                     paired with a "talk to sales" option in the UI, not a
//                     replacement for it. Soft-capped at aiQueriesPerMonth
//                     (not unlimited - a flat per-seat fee funding literally
//                     unlimited tokens is its own bleed). The quota + tier
//                     are shared org-wide off the org creator's subscription
//                     row (see resolveLLMForOrg / the ask route's
//                     billingOwnerId resolution) - one paying seat unlocks
//                     AI for the whole org, by design.
//   Enterprise      - $29/seat/mo, 5+ seats, + RBAC + SSO + audit log. Not
//                     self-serve - talk-to-sales only, manually granted via
//                     /api/admin/grant-pro. Also where 100+-seat orgs land
//                     (professional's 99-seat self-serve ceiling pushes them
//                     here). These customers bring their own BYOK key too
//                     (same as Free), Enterprise pricing is for the
//                     compliance/RBAC/SSO features, not AI compute.

export type Tier = 'free' | 'professional' | 'enterprise'

export interface TierLimits {
  // Volume gates (numeric. -1 means unlimited.)
  aiQueriesPerMonth: number
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
    // but bounds worst-case Claude spend on a flat $15/seat/mo fee. UI
    // should nudge ("heavy usage? talk to us about Enterprise") well
    // before this, not just wall at it - see api/ask/route.ts.
    aiQueriesPerMonth: 800,
    retentionDays: -1,
    maxSeats: 99, // self-serve ceiling - 100+ seats requires talk-to-sales (Enterprise tier)
    minSeats: 1,
    integrationsAll: true,
    rbac: false,
    sso: false,
    auditLog: false,
    exitInterviewAgent: false,
    adminCockpit: false,
    chromeExtensionAutoIngest: true,
    displayName: 'Managed',
    monthlyPrice: 15,
    annualPriceTotal: 144, // $15 × 12 × 0.8 = $144.00
  },
  enterprise: {
    aiQueriesPerMonth: -1,
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
    monthlyPrice: 29,
    annualPriceTotal: 278.4, // $29 × 12 × 0.8 = $278.40
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
    [process.env.PADDLE_PRICE_PROFESSIONAL_YEARLY || '']: { tier: 'professional', billingCycle: 'annual' },
    [process.env.PADDLE_PRICE_ENTERPRISE_MONTHLY || '']: { tier: 'enterprise', billingCycle: 'monthly' },
    [process.env.PADDLE_PRICE_ENTERPRISE_YEARLY || '']: { tier: 'enterprise', billingCycle: 'annual' },
  }
  delete map[''] // drop the empty-key fallback if any env var was missing
  return map[priceId] || null
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
export const TRIAL_DAYS = 7
