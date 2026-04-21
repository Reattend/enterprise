import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
  computeAtRisk,
} from '@/lib/enterprise'

// GET /api/enterprise/transfers/preview?orgId=...&userId=...
// Returns the impact snapshot for a single user (the dashboard drill-down
// view). Used by the transfer wizard to show "before you click Transfer,
// here's what will move".
export async function GET(req: NextRequest) {
  try {
    const { userId: caller } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    const targetUserId = req.nextUrl.searchParams.get('userId')
    if (!orgId || !targetUserId) return NextResponse.json({ error: 'orgId and userId required' }, { status: 400 })

    const ctx = await getOrgContext(caller, orgId)
    if (!ctx || !hasOrgPermission(ctx, 'org.members.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const snapshot = await computeAtRisk(orgId, targetUserId)
    if (!snapshot) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ snapshot })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
