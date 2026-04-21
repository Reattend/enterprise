import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
  listAtRisk,
} from '@/lib/enterprise'

// GET /api/enterprise/transfers/at-risk?orgId=...
// Returns everyone in the org with unassigned authored records (the "people
// whose knowledge could vanish" list). Gated by org.members.manage since the
// dashboard reveals who's offboarded / churn-risk.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const ctx = await getOrgContext(userId, orgId)
    if (!ctx || !hasOrgPermission(ctx, 'org.members.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const people = await listAtRisk(orgId)
    return NextResponse.json({
      people,
      totals: {
        atRiskUsers: people.length,
        atRiskRecords: people.reduce((sum, p) => sum + p.atRiskRecords, 0),
        offboardedWithRisk: people.filter((p) => p.status === 'offboarded' && p.atRiskRecords > 0).length,
      },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
