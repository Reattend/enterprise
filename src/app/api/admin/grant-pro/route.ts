import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireSuperAdmin } from '@/lib/admin/auth'

type Tier = 'professional' | 'enterprise'

const VALID_TIERS: Tier[] = ['professional', 'enterprise']

/**
 * POST /api/admin/grant-pro
 * Manually flip a user to a paid tier with no Paddle interaction.
 * Body: { email, tier?: 'professional' | 'enterprise', seatCount?: number, billingCycle?: 'monthly' | 'annual' }
 * Defaults: tier=professional, seatCount=1 (5 if enterprise), billingCycle=monthly.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const body = await req.json()
    const { email, tier: rawTier, seatCount: rawSeats, billingCycle: rawCycle } = body as {
      email?: string
      tier?: string
      seatCount?: number
      billingCycle?: string
    }
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const normalizedEmail = email.toLowerCase().trim()
    const tier: Tier = (VALID_TIERS as string[]).includes(rawTier ?? '') ? (rawTier as Tier) : 'professional'
    const billingCycle: 'monthly' | 'annual' = rawCycle === 'annual' ? 'annual' : 'monthly'
    const minSeats = tier === 'enterprise' ? 5 : 1
    const seatCount = Math.max(minSeats, Number.isFinite(rawSeats) ? Math.floor(Number(rawSeats)) : minSeats)

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.userId, user.id),
    })

    const updates = {
      // Keep planKey populated for legacy callers — 'smart' for any paid tier.
      planKey: 'smart' as const,
      status: 'active' as const,
      tier,
      seatCount,
      billingCycle,
      trialEndsAt: null,
      // No real Paddle subscription — leave price/sub/customer ids null so
      // webhook code can detect "manually granted" rows.
      paddlePriceId: null,
      currentPeriodEnd: null,
      renewsAt: null,
      updatedAt: new Date().toISOString(),
    }

    if (existingSub) {
      await db.update(schema.subscriptions)
        .set(updates)
        .where(eq(schema.subscriptions.userId, user.id))
    } else {
      await db.insert(schema.subscriptions).values({
        userId: user.id,
        ...updates,
      })
    }

    return NextResponse.json({
      ok: true,
      message: `${normalizedEmail} is now on ${tier} (${seatCount} seat${seatCount === 1 ? '' : 's'}, ${billingCycle}).`,
      tier,
      seatCount,
      billingCycle,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/grant-pro
 * Revoke paid tier — move user back to free.
 * Body: { email }
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const normalizedEmail = email.toLowerCase().trim()

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await db.update(schema.subscriptions)
      .set({
        planKey: 'normal',
        tier: 'free',
        seatCount: 1,
        billingCycle: null,
        status: 'canceled',
        trialEndsAt: null,
        currentPeriodEnd: null,
        renewsAt: null,
        paddlePriceId: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.subscriptions.userId, user.id))

    return NextResponse.json({ ok: true, message: `${normalizedEmail} moved back to free.` })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
