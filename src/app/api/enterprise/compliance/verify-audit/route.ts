import { NextRequest, NextResponse } from 'next/server'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
  verifyAuditChain,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/compliance/verify-audit?orgId=...
// Admin-only. Walks the audit chain and confirms no rows were modified or
// re-ordered since insertion. Reports the first broken link with row id for
// forensics.
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const auth = await requireOrgAuth(req, orgId, 'org.audit.read')
    if (isAuthResponse(auth)) return auth

    const result = await verifyAuditChain(orgId)
    return NextResponse.json(result)
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
