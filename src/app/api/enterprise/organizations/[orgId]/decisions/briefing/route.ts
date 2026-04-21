import { NextRequest, NextResponse } from 'next/server'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
  buildDecisionsBriefing,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/decisions/briefing
//   ?departmentId=... (optional — scope to one dept)
//   ?roleId=...       (optional — for transfer handovers)
//   ?userId=...       (optional — "Partha's decisions")
//   ?from=ISO&to=ISO  (optional — date window)
//   ?format=markdown  (default) | json
//
// Returns a handover-ready brief. Use case: incoming VP asks "what has
// Engineering decided this year and what's been walked back?" → click →
// they get the markdown they can paste into Notion or print.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const q = req.nextUrl.searchParams
    const format = (q.get('format') || 'markdown').toLowerCase()
    const result = await buildDecisionsBriefing({
      organizationId: orgId,
      departmentId: q.get('departmentId') || null,
      roleId: q.get('roleId') || null,
      userId: q.get('userId') || null,
      fromIso: q.get('from'),
      toIso: q.get('to'),
    })

    auditFromAuth(auth, 'export', {
      resourceType: 'decisions_briefing',
      metadata: {
        format,
        rowCount: result.rowCount,
        departmentId: q.get('departmentId'),
        roleId: q.get('roleId'),
        userId: q.get('userId'),
      },
    })

    if (format === 'json') {
      return NextResponse.json(result)
    }

    const dateTag = new Date().toISOString().slice(0, 10)
    return new NextResponse(result.markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="decisions-briefing-${orgId.slice(0, 8)}-${dateTag}.md"`,
        'X-Briefing-Row-Count': String(result.rowCount),
        'X-Briefing-Active': String(result.activeCount),
        'X-Briefing-Reversed': String(result.reversedCount),
      },
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
