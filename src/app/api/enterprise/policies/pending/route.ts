import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  pendingPoliciesForUser,
  getOrgContext,
} from '@/lib/enterprise'

// GET /api/enterprise/policies/pending?orgId=...
// Returns the current user's pending policy acknowledgments — the self-
// healing signal rendered on Home and in the inbox notifications.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const ctx = await getOrgContext(userId, orgId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const pending = await pendingPoliciesForUser({ userId, organizationId: orgId })
    return NextResponse.json({ pending, count: pending.length })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
