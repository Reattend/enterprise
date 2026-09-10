import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { resolveActiveOrgId } from '@/lib/enterprise/active-org'
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

    const orgId = await resolveActiveOrgId(userId)

    if (!orgId) {
      // Personal accounts have a real subscription row of their own - the old
      // hardcoded 'free' rendered a paying personal Managed user as Free.
      const { getKeyStatus } = await import('@/lib/ai/byok')
      const [personalSub, personalKey] = await Promise.all([
        getOrCreateSubscription(userId),
        getKeyStatus(null, userId).catch(() => null),
      ])
      return NextResponse.json({
        hasOrg: false,
        isAdmin: false,
        tier: personalSub.tier,
        status: personalSub.status,
        trialEndsAt: personalSub.trialEndsAt,
        seats: { current: 1, cap: null },
        price: TIER_LIMITS.professional.monthlyPrice,
        byok: personalKey ? { provider: personalKey.provider, keyLast4: personalKey.keyLast4, status: personalKey.status } : null,
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

    const { getKeyStatus: getOrgKeyStatus } = await import('@/lib/ai/byok')
    const orgKey = await getOrgKeyStatus(orgId, null).catch(() => null)
    return NextResponse.json({
      byok: orgKey ? { provider: orgKey.provider, keyLast4: orgKey.keyLast4, status: orgKey.status } : null,
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
