import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { paddle } from '@/lib/billing/paddle'
import { getOrCreateSubscription } from '@/lib/billing/gates'

// GET /api/billing/portal
//
// Generates a one-time customer-portal URL on Paddle's hosted UI where the
// user can update payment method, switch annual/monthly, change seat count,
// download invoices, or cancel. Avoids us having to build any of that.
//
// We intentionally don't issue this URL until the user has a Paddle customer
// ID (i.e. they've completed at least one checkout). Free users get a 404.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const sub = await getOrCreateSubscription(session.user.id)
  if (!sub.paddleCustomerId) {
    return NextResponse.json({ error: 'no subscription yet' }, { status: 404 })
  }
  try {
    const session_ = await paddle().customerPortalSessions.create(sub.paddleCustomerId, [])
    const url = (session_ as any)?.urls?.general?.overview
    if (!url) throw new Error('Paddle did not return a portal URL')
    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('[portal] Paddle customerPortalSessions.create failed:', err)
    return NextResponse.json({ error: err?.message || 'portal unavailable' }, { status: 500 })
  }
}
