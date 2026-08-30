import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getOrgBillingSubscription, getOrCreateSubscription, canOrgAddMember } from '@/lib/billing/gates'
import { TIER_LIMITS } from '@/lib/billing/tier'

export const dynamic = 'force-dynamic'

// GET /api/billing/status - the current org's Managed billing status
// (trial banner, /app/settings/billing). Readable by any org member; the
// `isAdmin` flag tells the client whether to show action buttons (start
// trial / checkout) or a read-only "ask an admin" state. Personal (no org)
// always reads as free/BYOK-only - see start-trial's identical guard.
export async function GET() {
  try {
    const { userId } = await requireAuth()

    const userRow = await db.select({ activeContextOrgId: schema.users.activeContextOrgId })
      .from(schema.users).where(eq(schema.users.id, userId)).then(r => r[0])
    const orgId = userRow?.activeContextOrgId ?? null

    if (!orgId) {
      return NextResponse.json({
        hasOrg: false,
        isAdmin: false,
        tier: 'free',
        status: 'active',
        trialEndsAt: null,
        seats: { current: 0, cap: null },
        price: TIER_LIMITS.professional.monthlyPrice,
      })
    }

    const [membership, sub, seatCheck] = await Promise.all([
      db.query.organizationMembers.findFirst({
        where: and(eq(schema.organizationMembers.organizationId, orgId), eq(schema.organizationMembers.userId, userId)),
      }),
      getOrgBillingSubscription(orgId),
      canOrgAddMember(orgId),
    ])

    const isAdmin = membership?.role === 'admin' || membership?.role === 'super_admin'
    const resolvedSub = sub ?? await getOrCreateSubscription(userId)

    return NextResponse.json({
      hasOrg: true,
      isAdmin,
      tier: resolvedSub.tier,
      status: resolvedSub.status,
      trialEndsAt: resolvedSub.trialEndsAt,
      seats: { current: seatCheck.current, cap: seatCheck.cap },
      price: TIER_LIMITS.professional.monthlyPrice,
    })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
