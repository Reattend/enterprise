import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getOrCreateSubscription } from '@/lib/billing/gates'
import { TIER_LIMITS, type Tier } from '@/lib/billing/tier'

// GET /api/billing/me
//
// Returns the calling user's subscription state shaped for the billing UI.
// Read-only and idempotent — getOrCreateSubscription will create the row
// the first time so anyone hitting this implicitly gets a Free row created.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const sub = await getOrCreateSubscription(session.user.id)
  const limits = TIER_LIMITS[sub.tier as Tier]

  return NextResponse.json({
    tier: sub.tier,
    status: sub.status,
    seatCount: sub.seatCount,
    billingCycle: sub.billingCycle,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    paddleSubscriptionId: sub.paddleSubscriptionId,
    aiQueriesUsed: sub.aiQueriesThisMonth,
    aiQueriesLimit: limits.aiQueriesPerMonth, // -1 means unlimited
  })
}
