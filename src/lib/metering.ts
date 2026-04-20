import { db, schema } from './db'
import { eq, and, asc } from 'drizzle-orm'
import { validateApiToken } from './auth/token'
import { getUserSubscription } from './auth'

// ─── Trial-based metering ──────────────────────────────
// All users get unlimited usage for 60 days from first use.
// After trial: Pro ($20/mo) for AI features, or free forever (manual notes only).
const TRIAL_DAYS = 60

type Tier = 'anonymous' | 'registered' | 'smart'

// ─── Resolve auth from request headers ─────────────────
// Supports both anonymous (X-Device-Id) and authenticated (Bearer token)
export async function resolveAuth(headers: Headers): Promise<{
  deviceId: string | null
  userId: string | null
  workspaceId: string | null
  tier: Tier
}> {
  const deviceId = headers.get('x-device-id')
  const authHeader = headers.get('authorization')

  // Try token auth first
  if (authHeader) {
    const tokenResult = await validateApiToken(authHeader)
    if (tokenResult) {
      // Check subscription tier
      const sub = await getUserSubscription(tokenResult.userId)
      const tier: Tier = sub.isSmartActive ? 'smart' : 'registered'
      return {
        deviceId,
        userId: tokenResult.userId,
        workspaceId: tokenResult.workspaceId,
        tier,
      }
    }
  }

  // Fall back to anonymous device ID
  if (deviceId) {
    return {
      deviceId,
      userId: null,
      workspaceId: null,
      tier: 'anonymous',
    }
  }

  // No auth at all
  return { deviceId: null, userId: null, workspaceId: null, tier: 'anonymous' }
}

// ─── Get trial days remaining for a device/user ────────
async function getTrialDaysLeft(deviceId: string | null, userId: string | null): Promise<number> {
  // Find the earliest usage record for this device or user
  let firstRecord
  if (userId) {
    firstRecord = await db.query.usageDaily.findFirst({
      where: eq(schema.usageDaily.userId, userId),
      orderBy: asc(schema.usageDaily.createdAt),
    })
  }
  if (!firstRecord && deviceId) {
    firstRecord = await db.query.usageDaily.findFirst({
      where: eq(schema.usageDaily.deviceId, deviceId),
      orderBy: asc(schema.usageDaily.createdAt),
    })
  }

  if (!firstRecord) {
    // No usage yet — full trial
    return TRIAL_DAYS
  }

  // Use calendar dates (not timestamps) so day 1 = first usage date
  const firstDate = firstRecord.createdAt.slice(0, 10) // YYYY-MM-DD
  const todayDate = new Date().toISOString().slice(0, 10)
  const firstMs = new Date(firstDate + 'T00:00:00Z').getTime()
  const todayMs = new Date(todayDate + 'T00:00:00Z').getTime()
  const daysSinceFirst = Math.round((todayMs - firstMs) / (1000 * 60 * 60 * 24))
  return Math.max(0, TRIAL_DAYS - daysSinceFirst)
}

// ─── Check if operation is allowed ──────────────────────
export async function checkAllowed(
  deviceId: string | null,
  userId: string | null,
  tier: Tier,
): Promise<{ allowed: boolean; remaining: number; limit: number; tier: Tier; used: number; trialDaysLeft: number }> {
  const trialDaysLeft = await getTrialDaysLeft(deviceId, userId)

  // Smart tier: always unlimited
  if (tier === 'smart') {
    return { allowed: true, remaining: Infinity, limit: Infinity, tier, used: 0, trialDaysLeft: 0 }
  }

  // Trial active: unlimited for everyone
  if (trialDaysLeft > 0) {
    return { allowed: true, remaining: Infinity, limit: Infinity, tier, used: 0, trialDaysLeft }
  }

  // Trial expired + not paid → blocked
  return {
    allowed: false,
    remaining: 0,
    limit: 0,
    tier,
    used: 0,
    trialDaysLeft: 0,
  }
}

// ─── Record a usage operation ───────────────────────────
export async function recordUsage(
  deviceId: string | null,
  userId: string | null,
  tier: Tier,
  _operation: string,
) {
  const today = new Date().toISOString().slice(0, 10)

  // Find existing row
  let usage
  if (userId) {
    usage = await db.query.usageDaily.findFirst({
      where: and(
        eq(schema.usageDaily.userId, userId),
        eq(schema.usageDaily.date, today),
      ),
    })
  } else if (deviceId) {
    usage = await db.query.usageDaily.findFirst({
      where: and(
        eq(schema.usageDaily.deviceId, deviceId),
        eq(schema.usageDaily.date, today),
      ),
    })
  }

  if (usage) {
    await db.update(schema.usageDaily)
      .set({
        opsCount: usage.opsCount + 1,
        tier,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.usageDaily.id, usage.id))
  } else {
    await db.insert(schema.usageDaily).values({
      deviceId,
      userId,
      date: today,
      opsCount: 1,
      tier,
    })
  }
}

// ─── Get usage stats (for settings display) ─────────────
export async function getUsageStats(
  deviceId: string | null,
  userId: string | null,
  tier: Tier,
) {
  const today = new Date().toISOString().slice(0, 10)
  const trialDaysLeft = await getTrialDaysLeft(deviceId, userId)
  const isActive = tier === 'smart' || trialDaysLeft > 0

  let usage
  if (userId) {
    usage = await db.query.usageDaily.findFirst({
      where: and(
        eq(schema.usageDaily.userId, userId),
        eq(schema.usageDaily.date, today),
      ),
    })
  } else if (deviceId) {
    usage = await db.query.usageDaily.findFirst({
      where: and(
        eq(schema.usageDaily.deviceId, deviceId),
        eq(schema.usageDaily.date, today),
      ),
    })
  }

  const used = usage?.opsCount ?? 0

  const isPro = tier === 'smart'
  const AI_QUERY_LIMIT = 20

  return {
    tier,
    plan: isPro ? 'pro' : 'free',
    used,
    limit: isActive ? -1 : 0, // -1 = unlimited, 0 = blocked
    remaining: isActive ? -1 : 0,
    trialDaysLeft,
    trialExpired: trialDaysLeft <= 0 && tier !== 'smart',
    aiQueriesUsedToday: used,
    aiQueriesLimit: isPro ? null : AI_QUERY_LIMIT,
    date: today,
  }
}

// ─── Build 429 rate limit response ──────────────────────
export function rateLimitResponse(tier: Tier, used: number, limit: number) {
  return Response.json({
    error: 'trial_expired',
    tier,
    used,
    limit,
    next_tier: 'smart',
    message: 'Your free trial has ended. Upgrade to Pro ($20/mo) to continue using AI features, or keep using Reattend as a free notetaker.',
  }, { status: 429 })
}
