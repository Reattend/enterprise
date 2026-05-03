import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireSuperAdmin } from '@/lib/admin/auth'
import { sendTrialGrantedEmail } from '@/lib/email'

type Tier = 'professional' | 'enterprise'
const VALID_TIERS: Tier[] = ['professional', 'enterprise']

/**
 * POST /api/admin/extend-trial
 * Grant a comp trial of a paid tier for N days. No card required.
 * Body: { email, days, tier?: 'professional' | 'enterprise', seatCount?: number }
 *   days: 1..365
 *   tier: defaults to 'professional'
 *   seatCount: defaults to 1 (5 minimum if enterprise)
 *
 * If the user already has an active trial, the trial end date is extended
 * by `days` from the LATER of (now, current trialEndsAt) — so an admin
 * granting "30 more days" to a user with 5 days left ends up at +35 days
 * total, not 30.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const body = await req.json()
    const { email, days, tier: rawTier, seatCount: rawSeats } = body as {
      email?: string
      days?: number
      tier?: string
      seatCount?: number
    }

    if (!email || typeof days !== 'number' || days < 1 || days > 365) {
      return NextResponse.json({ error: 'Valid email and days (1-365) required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const tier: Tier = (VALID_TIERS as string[]).includes(rawTier ?? '') ? (rawTier as Tier) : 'professional'
    const minSeats = tier === 'enterprise' ? 5 : 1
    const seatCount = Math.max(minSeats, Number.isFinite(rawSeats) ? Math.floor(Number(rawSeats)) : minSeats)

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.userId, user.id),
    })

    // Stack on top of any existing trial: extend from whichever is later
    // between now and the current trialEndsAt.
    const nowMs = Date.now()
    const existingMs = existingSub?.trialEndsAt ? new Date(existingSub.trialEndsAt).getTime() : nowMs
    const baseMs = Math.max(nowMs, existingMs)
    const trialEnd = new Date(baseMs + days * 86_400_000)

    const updates = {
      planKey: 'smart' as const,
      status: 'trialing' as const,
      tier,
      seatCount,
      trialEndsAt: trialEnd.toISOString(),
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

    const daysLeft = Math.ceil((trialEnd.getTime() - nowMs) / 86_400_000)

    // Fire-and-forget welcome — don't block the admin action on email send.
    sendTrialGrantedEmail({
      toEmail: normalizedEmail,
      name: user.name || normalizedEmail.split('@')[0],
      tier,
      daysGranted: days,
      trialEndsAt: trialEnd.toISOString(),
    }).catch(err => console.error('[extend-trial] email send failed:', err))

    return NextResponse.json({
      ok: true,
      message: `Granted ${days} day${days === 1 ? '' : 's'} of ${tier} to ${normalizedEmail}. Trial ends ${trialEnd.toISOString().split('T')[0]} (${daysLeft} days from now).`,
      tier,
      seatCount,
      trialEndsAt: trialEnd.toISOString(),
      daysLeft,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Extend trial error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
