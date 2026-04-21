import { NextRequest, NextResponse } from 'next/server'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
  queryAudit,
  type AuditAction,
} from '@/lib/enterprise'

const VALID_ACTIONS: AuditAction[] = [
  'query', 'read', 'create', 'update', 'delete', 'export',
  'login', 'logout', 'sso_login', 'role_change',
  'member_invite', 'member_remove', 'permission_change',
  'decision_create', 'decision_reverse',
  'admin_action', 'integration_connect', 'integration_disconnect',
]

// GET /api/enterprise/organizations/[orgId]/audit
// ?action=query&userId=...&from=ISO&to=ISO&limit=50&offset=0
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.audit.read')
    if (isAuthResponse(auth)) return auth

    const p = req.nextUrl.searchParams
    const actionParam = p.get('action')
    const action = actionParam && (VALID_ACTIONS as string[]).includes(actionParam)
      ? (actionParam as AuditAction)
      : undefined

    const rows = await queryAudit({
      organizationId: orgId,
      action,
      userId: p.get('userId') || undefined,
      resourceType: p.get('resourceType') || undefined,
      resourceId: p.get('resourceId') || undefined,
      departmentId: p.get('departmentId') || undefined,
      from: p.get('from') || undefined,
      to: p.get('to') || undefined,
      limit: Math.min(parseInt(p.get('limit') || '50'), 500),
      offset: parseInt(p.get('offset') || '0'),
    })

    return NextResponse.json({ entries: rows })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
