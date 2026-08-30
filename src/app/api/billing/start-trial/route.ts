import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getOrCreateSubscription } from '@/lib/billing/gates'
import { TRIAL_DAYS } from '@/lib/billing/tier'

export const dynamic = 'force-dynamic'

// Self-serve Managed trial - no card, no Paddle checkout. /onboarding and
// /app/admin/onboarding's "Start 7-day free trial" button calls this
// directly (always alongside a "Talk to sales" option - this never
// replaces it, see today.md 2026-08-29). Sets tier=professional,
// status=trialing, trialEndsAt=now+7d with no paddleSubscriptionId; the
// lazy check in getOrCreateSubscription() (and the downgrade cron) auto-
// reverts to Free if no card gets added before it expires.
//
// One-time only: an org that has already used a trial (trialEndsAt already
// set on its billing row) can't re-trigger this by calling it again - has
// to go through actual Paddle checkout to get back on Managed.
//
// IMPORTANT: the trial is flipped on the ORG'S BILLING OWNER (org.createdBy),
// not necessarily the calling user. Billing is a per-user table, but Managed
// is sold as "AI for your whole org" - the ask route and canOrgAddMember
// both resolve tier/quota off org.createdBy's subscription row (see
// getOrgBillingSubscription in billing/gates.ts). If this route flipped the
// CALLER's own row instead, an admin who isn't the org's creator would
// start a trial that silently does nothing for the org.
export async function POST() {
  try {
    const { userId } = await requireAuth()

    // Managed is an org-level product (per-user billing table, org-scoped
    // features) and is never available in Personal mode - Personal is
    // BYOK-only, full stop (see today.md). Gate on activeContextOrgId
    // rather than trusting the client.
    const userRow = await db.select({ activeContextOrgId: schema.users.activeContextOrgId })
      .from(schema.users).where(eq(schema.users.id, userId)).then(r => r[0])
    const orgId = userRow?.activeContextOrgId
    if (!orgId) {
      return NextResponse.json(
        { error: 'org_required', message: 'Managed requires an organization. Personal accounts are BYOK-only - connect a key in Settings instead.' },
        { status: 403 },
      )
    }

    // Admin/super_admin only - starting a trial changes AI access and
    // seat capacity for the whole org, not just the caller.
    const membership = await db.query.organizationMembers.findFirst({
      where: and(eq(schema.organizationMembers.organizationId, orgId), eq(schema.organizationMembers.userId, userId)),
    })
    if (!membership || (membership.role !== 'admin' && membership.role !== 'super_admin')) {
      return NextResponse.json({ error: 'forbidden', message: 'Only an org admin can start the Managed trial.' }, { status: 403 })
    }

    const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) })
    if (!org) {
      return NextResponse.json({ error: 'not_found', message: 'Organization not found.' }, { status: 404 })
    }

    const sub = await getOrCreateSubscription(org.createdBy)

    if (sub.tier !== 'free' || sub.trialEndsAt) {
      return NextResponse.json(
        { error: 'trial_unavailable', message: sub.tier !== 'free' ? 'This organization is already on a paid plan.' : 'This organization has already used its Managed trial.' },
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

    // Cosmetic sync only - organizations.plan drives the Control Room pill
    // and the on-prem/air-gapped deployment gate (settings/page.tsx), it is
    // NOT read for AI access (that's subscriptions.tier, checked above).
    // One-way: cancellation doesn't revert this - an admin can flip it back
    // in Settings if they want the pill to read "free" again.
    if (org.plan === 'free') {
      await db.update(schema.organizations).set({ plan: 'managed' }).where(eq(schema.organizations.id, orgId))
    }

    return NextResponse.json({ ok: true, tier: 'professional', trialEndsAt: trialEnd.toISOString() })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
