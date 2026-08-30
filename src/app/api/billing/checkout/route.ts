import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { paddle } from '@/lib/billing/paddle'
import { tierToPriceId, TIER_LIMITS } from '@/lib/billing/tier'
import { getOrCreateSubscription } from '@/lib/billing/gates'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

// POST /api/billing/checkout
//   body: { tier: 'professional' | 'enterprise', cycle: 'monthly' | 'annual', seats?: number }
//
// Creates a Paddle transaction (in 'draft' status) and returns the transaction
// ID. The client opens Paddle.js with that ID and the user completes payment
// in the overlay. Once Paddle confirms, the webhook fires and our DB updates.
//
// This is the ONLY way the user upgrades from Free → Professional/Enterprise.
// No magic env-only price IDs leak to the client; the client only sees the
// transaction ID.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const userId = session.user.id
  const userEmail = session.user.email

  // Managed/Enterprise are org-scoped products - Personal (zero-org) never
  // gets Managed, paid or trial (see start-trial's identical guard and
  // today.md). Real money doesn't buy an exception: without an org,
  // resolveLLM() would still hard-block AI usage regardless of tier.
  const [callerRow] = await db.select({ activeContextOrgId: schema.users.activeContextOrgId })
    .from(schema.users).where(eq(schema.users.id, userId)).limit(1)
  const orgId = callerRow?.activeContextOrgId
  if (!orgId) {
    return NextResponse.json(
      { error: 'org_required', message: 'Managed requires an organization. Personal accounts are BYOK-only - connect a key in Settings instead.' },
      { status: 403 },
    )
  }

  // Admin/super_admin only - this is org-wide billing, not a personal purchase.
  const membership = await db.query.organizationMembers.findFirst({
    where: and(eq(schema.organizationMembers.organizationId, orgId), eq(schema.organizationMembers.userId, userId)),
  })
  if (!membership || (membership.role !== 'admin' && membership.role !== 'super_admin')) {
    return NextResponse.json({ error: 'forbidden', message: 'Only an org admin can manage billing.' }, { status: 403 })
  }

  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) })
  if (!org) {
    return NextResponse.json({ error: 'not_found', message: 'Organization not found.' }, { status: 404 })
  }

  let body: { tier?: string; cycle?: string; seats?: number }
  try { body = await req.json() } catch { body = {} }

  const tier = body.tier
  const cycle = body.cycle
  if (tier !== 'professional' && tier !== 'enterprise') {
    return NextResponse.json({ error: 'invalid tier' }, { status: 400 })
  }
  if (cycle !== 'monthly' && cycle !== 'annual') {
    return NextResponse.json({ error: 'invalid cycle' }, { status: 400 })
  }

  const limits = TIER_LIMITS[tier]
  const seats = Math.max(limits.minSeats, Math.min(body.seats ?? limits.minSeats, limits.maxSeats < 0 ? 9999 : limits.maxSeats))

  const priceId = tierToPriceId(tier, cycle)
  if (!priceId) {
    return NextResponse.json({ error: 'price not configured' }, { status: 500 })
  }

  // Billed to the ORG'S BILLING OWNER (org.createdBy), same convention as
  // start-trial - the webhook writes to this row, and it's what the ask
  // route / canOrgAddMember resolve org-wide tier and quota against. An
  // admin who isn't the org's creator can still initiate checkout, but the
  // resulting subscription lands on the creator's row so the whole org
  // actually benefits from it.
  const sub = await getOrCreateSubscription(org.createdBy)

  try {
    const txn = await paddle().transactions.create({
      items: [{ priceId, quantity: seats }],
      customerId: sub.paddleCustomerId || undefined,
      // Stamp the ORG'S BILLING OWNER id into custom data so the webhook
      // updates the same row start-trial (and canOrgAddMember) resolve
      // against - not necessarily the admin who clicked "Subscribe."
      // organizationId is along for the ride so the webhook can also sync
      // the (cosmetic, non-AI-gating) organizations.plan pill.
      customData: { userId: org.createdBy, userEmail, organizationId: orgId },
      // Where to bounce on success/cancel from the overlay.
      checkout: {
        url: `${process.env.NEXTAUTH_URL || 'https://reattend.com'}/app/settings/billing?success=1`,
      },
    })

    // If Paddle gave us a customerId on the transaction (it does for new customers),
    // stash it now so future actions reuse the same customer.
    const paddleCustomerId = (txn as any)?.customerId
    if (paddleCustomerId && !sub.paddleCustomerId) {
      await db
        .update(schema.subscriptions)
        .set({ paddleCustomerId, updatedAt: new Date().toISOString() })
        .where(eq(schema.subscriptions.id, sub.id))
    }

    return NextResponse.json({ transactionId: txn.id })
  } catch (err: any) {
    console.error('[checkout] Paddle transaction.create failed:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to start checkout' },
      { status: 500 },
    )
  }
}
