// Paywall + quota helpers. API routes call these to enforce tier limits.
//
// Pattern:
//   const sub = await getOrCreateSubscription(userId)
//   if (!hasFeature(sub, 'rbac')) return 403
//
// or for the AI quota:
//   const remaining = await consumeAiQuery(userId)
//   if (remaining === 'exceeded') return 429
//
// Side effects (counter increments, soft deletes) live here so the API
// routes stay thin.

import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { TIER_LIMITS, type Tier } from './tier'

export type SubscriptionRow = typeof schema.subscriptions.$inferSelect

/**
 * Loads the user's subscription row, creating a Free-tier row on the fly if
 * none exists. Every authenticated user has exactly one row in this table.
 *
 * If the user is on a paid trial that has ended without a Paddle subscription
 * being created, this also auto-downgrades them to Free (defense in depth -
 * the cron is the primary actor, this is the lazy fallback).
 */
export async function getOrCreateSubscription(userId: string): Promise<SubscriptionRow> {
  let row = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.userId, userId),
  })

  if (!row) {
    const [created] = await db
      .insert(schema.subscriptions)
      .values({
        userId,
        planKey: 'normal', // legacy column, not read for tier decisions
        tier: 'free',
        status: 'active',
        seatCount: 1,
      })
      .returning()
    row = created
  }

  // Lazy trial-expiry downgrade (the cron is the primary path; this is a safety net
  // for the moment between cron runs).
  if (
    row.tier !== 'free' &&
    !row.paddleSubscriptionId &&
    row.trialEndsAt &&
    new Date(row.trialEndsAt) < new Date()
  ) {
    await db
      .update(schema.subscriptions)
      .set({
        tier: 'free',
        status: 'expired',
        seatCount: 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.subscriptions.id, row.id))
    row.tier = 'free'
    row.status = 'expired'
    row.seatCount = 1
  }

  return row
}

export function tierLimits(tier: Tier) {
  return TIER_LIMITS[tier]
}

export function hasFeature(
  sub: SubscriptionRow,
  feature: 'integrationsAll' | 'rbac' | 'sso' | 'auditLog' | 'exitInterviewAgent' | 'adminCockpit' | 'chromeExtensionAutoIngest',
): boolean {
  return TIER_LIMITS[sub.tier as Tier][feature]
}

/**
 * Extension feature gate. The Chrome extension (any /api/tray/* endpoint)
 * requires *some* AI actually be configured - either a BYOK key (org
 * default, per-user override, or personal) or an active Managed
 * subscription. Both Free/BYOK and Managed get the extension per the
 * 2026-08-23 restructure; the old "Professional+ only" tier gate is gone.
 * Personal accounts are excluded entirely regardless of BYOK status - by
 * design, Personal never gets extension access (see today.md).
 *
 * Apply this immediately after validateApiToken() in any tray route. Re-runs
 * on every call so losing AI access (key removed, subscription lapsed)
 * revokes extension access immediately.
 *
 * Returns null on success, or a Response with 402 Payment Required + a
 * machine-readable error body the extension can render as an upgrade prompt.
 */
export async function requireExtensionAccess(userId: string): Promise<Response | null> {
  const { resolveByokKey } = await import('@/lib/ai/byok')

  const userRow = await db.select({ activeContextOrgId: schema.users.activeContextOrgId })
    .from(schema.users).where(eq(schema.users.id, userId)).then(r => r[0])
  const activeContextOrgId = userRow?.activeContextOrgId ?? null

  // Personal (no active org) is BYOK-only for AI answering, but never gets
  // the extension at all - even with a personal key configured.
  if (!activeContextOrgId) {
    return Response.json(
      {
        error: 'extension_not_available_for_personal',
        message: 'The Reattend extension is available for organization accounts, not Personal.',
      },
      { status: 402 },
    )
  }

  const byok = await resolveByokKey({ organizationId: activeContextOrgId, userId })
  if (byok) return null

  const sub = await getOrCreateSubscription(userId)
  if (sub.tier === 'professional' || sub.tier === 'enterprise') return null

  return Response.json(
    {
      error: 'extension_requires_ai_configured',
      message: 'Connect an AI provider key (free) or upgrade to Managed to enable the extension.',
      currentTier: sub.tier,
      settingsUrl: 'https://reattend.com/app/settings',
      upgradeUrl: 'https://reattend.com/pricing',
    },
    { status: 402 },
  )
}

/**
 * AI-query quota check + consume in one shot.
 * Returns:
 *   - { ok: true,  remaining: number | 'unlimited' }
 *   - { ok: false, remaining: 0, resetAt: ISO string } when over quota
 *
 * Resets the counter when the calendar month rolls over (rather than running
 * a separate reset cron - calendar-aware so a user's quota doesn't carry stale
 * counts across a month boundary).
 */
export async function consumeAiQuery(userId: string): Promise<
  | { ok: true; remaining: number | 'unlimited' }
  | { ok: false; remaining: 0; resetAt: string }
> {
  const sub = await getOrCreateSubscription(userId)
  const limits = TIER_LIMITS[sub.tier as Tier]

  // Paid tiers: unlimited, no counter needed.
  if (limits.aiQueriesPerMonth < 0) return { ok: true, remaining: 'unlimited' }

  const now = new Date()
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const lastResetMonth = sub.aiQueriesResetAt ? sub.aiQueriesResetAt.slice(0, 7) : ''

  // New calendar month → reset the counter to 0 before the increment.
  let used = sub.aiQueriesThisMonth
  if (lastResetMonth !== monthKey) used = 0

  // Already at cap?
  if (used >= limits.aiQueriesPerMonth) {
    // Compute "first of next month" UTC for the resetAt hint.
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0))
    return { ok: false, remaining: 0, resetAt: nextMonth.toISOString() }
  }

  const newUsed = used + 1
  await db
    .update(schema.subscriptions)
    .set({
      aiQueriesThisMonth: newUsed,
      aiQueriesResetAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })
    .where(eq(schema.subscriptions.id, sub.id))

  return { ok: true, remaining: limits.aiQueriesPerMonth - newUsed }
}

/**
 * Simple seat-count enforcement when adding a teammate.
 * Returns true if the user can add more seats.
 */
export async function canAddSeat(userId: string, currentSeatCount: number): Promise<boolean> {
  const sub = await getOrCreateSubscription(userId)
  const limits = TIER_LIMITS[sub.tier as Tier]
  if (limits.maxSeats < 0) return true // unlimited
  return currentSeatCount < limits.maxSeats
}

/**
 * Helper for the soft-delete cron - returns the cutoff date for old records
 * for a given user. Free tier: 90 days ago. Paid: never (returns null).
 */
export async function retentionCutoffFor(userId: string): Promise<Date | null> {
  const sub = await getOrCreateSubscription(userId)
  const limits = TIER_LIMITS[sub.tier as Tier]
  if (limits.retentionDays < 0) return null
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - limits.retentionDays)
  return d
}
