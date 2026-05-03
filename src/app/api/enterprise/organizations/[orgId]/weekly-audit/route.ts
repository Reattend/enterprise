import { NextRequest, NextResponse } from 'next/server'
import { requireOrgAuth, isAuthResponse, handleEnterpriseError } from '@/lib/enterprise'
import { getWeeklyAuditForOrg } from '@/lib/enterprise/weekly-audit'

// GET /api/enterprise/organizations/[orgId]/weekly-audit
//
// Returns the org's "what's rotting in your knowledge" report — score 0-100,
// top 3 leverage gaps, supporting evidence. Computed on the fly (not cached
// for v1 since the queries are cheap; v2 will cache hourly).
//
// Anyone with org.audit.read can view (CIO-style "show me the dashboard").
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.audit.read')
    if (isAuthResponse(auth)) return auth

    const audit = await getWeeklyAuditForOrg(orgId)
    if (!audit) return NextResponse.json({ error: 'org not found' }, { status: 404 })

    return NextResponse.json(audit)
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
