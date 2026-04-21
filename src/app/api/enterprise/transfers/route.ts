import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
  performTransfer,
  auditForAllUserOrgs,
  extractRequestMeta,
} from '@/lib/enterprise'

// POST /api/enterprise/transfers
// Body: {
//   orgId, fromUserId, toUserId, roleId,
//   reason: 'offboard'|'role_change'|'temporary'|'correction',
//   transferNotes?, markOffboarded?: boolean
// }
// Returns: { transferEventId, recordsTransferred, decisionsTouched }
export async function POST(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'
    const body = await req.json()
    const { orgId, fromUserId, toUserId, roleId, reason, transferNotes, markOffboarded } = body

    if (!orgId || !fromUserId || !reason) {
      return NextResponse.json({ error: 'orgId, fromUserId, reason are required' }, { status: 400 })
    }
    if (!['offboard', 'role_change', 'temporary', 'correction'].includes(reason)) {
      return NextResponse.json({ error: 'invalid reason' }, { status: 400 })
    }

    const ctx = await getOrgContext(userId, orgId)
    if (!ctx || !hasOrgPermission(ctx, 'org.members.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const result = await performTransfer({
      organizationId: orgId,
      fromUserId,
      toUserId: toUserId || null,
      roleId: roleId || null,
      reason,
      transferNotes: transferNotes || null,
      initiatedByUserId: userId,
      markOffboarded: !!markOffboarded,
    })

    const meta = extractRequestMeta(req)
    auditForAllUserOrgs(userId, userEmail, 'admin_action', {
      resourceType: 'knowledge_transfer',
      resourceId: result.transferEventId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        fromUserId, toUserId: toUserId || null, roleId: roleId || null, reason,
        recordsTransferred: result.recordsTransferred,
      },
    })

    return NextResponse.json(result)
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
