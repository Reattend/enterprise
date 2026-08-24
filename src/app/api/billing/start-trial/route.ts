import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getOrCreateSubscription } from '@/lib/billing/gates'
import { TRIAL_DAYS } from '@/lib/billing/tier'

export const dynamic = 'force-dynamic'

// Self-serve Managed trial - no card, no Paddle checkout. Registration's
// "Managed" option calls this directly. Sets tier=professional,
// status=trialing, trialEndsAt=now+15d with no paddleSubscriptionId; the
// lazy check in getOrCreateSubscription() (and the downgrade cron) auto-
// reverts to Free if no card gets added before it expires - same mechanism
// as the old 45-day trial, just a shorter window and no checkout step.
//
// One-time only: a user who has already used a trial (trialEndsAt already
// set) can't re-trigger this by calling it again - has to go through actual
// Paddle checkout to get back on Managed after the free trial lapses.

export async function POST() {
  try {
    const { userId } = await requireAuth()

    // Managed is an org-level product (per-user pricing but org-scoped
    // features) and is never available in Personal mode - Personal is
    // BYOK-only, full stop (see today.md). Gate on activeContextOrgId
    // rather than trusting the client: the registration flow creates the
    // org and sets this *before* calling here, so legitimate callers
    // always pass; a Personal/zero-org user calling this directly gets a
    // clean rejection instead of a silently-inert trial state.
    const userRow = await db.select({ activeContextOrgId: schema.users.activeContextOrgId })
      .from(schema.users).where(eq(schema.users.id, userId)).then(r => r[0])
    if (!userRow?.activeContextOrgId) {
      return NextResponse.json(
        { error: 'org_required', message: 'Managed requires an organization. Personal accounts are BYOK-only - connect a key in Settings instead.' },
        { status: 403 },
      )
    }

    const sub = await getOrCreateSubscription(userId)

    if (sub.tier !== 'free' || sub.trialEndsAt) {
      return NextResponse.json(
        { error: 'trial_unavailable', message: sub.tier !== 'free' ? 'Already on a paid plan.' : 'You\'ve already used your Managed trial.' },
        { status: 409 },
      )
    }

    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86_400_000)
    await db.update(schema.subscriptions).set({
      tier: 'professional',
      status: 'trialing',
      trialEndsAt: trialEnd.toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.subscriptions.id, sub.id))

    return NextResponse.json({ ok: true, tier: 'professional', trialEndsAt: trialEnd.toISOString() })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
