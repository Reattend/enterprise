import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { paddle } from '@/lib/billing/paddle'
import { tierToPriceId, TIER_LIMITS } from '@/lib/billing/tier'
import { getOrCreateSubscription } from '@/lib/billing/gates'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

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

  // Reuse the customer's existing Paddle customer ID if we have one (so they
  // see saved payment methods). Otherwise Paddle creates one on first checkout.
  const sub = await getOrCreateSubscription(userId)

  try {
    const txn = await paddle().transactions.create({
      items: [{ priceId, quantity: seats }],
      customerId: sub.paddleCustomerId || undefined,
      // Stamp the user id into custom data so the webhook can reverse-lookup
      // which Reattend user this subscription belongs to.
      customData: { userId, userEmail },
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
