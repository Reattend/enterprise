import { NextRequest, NextResponse } from 'next/server'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
  buildAuditExport,
  bundleToCsv,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/audit/export?format=csv|json&from=ISO&to=ISO
// Returns a tamper-evident audit bundle. The chain tip at the top of the
// CSV (or `chainTip` in JSON) is the "signature" — auditors re-hash the
// rows and compare. Any row edit invalidates every subsequent row hash.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.audit.read')
    if (isAuthResponse(auth)) return auth

    const format = (req.nextUrl.searchParams.get('format') || 'csv').toLowerCase()
    const fromIso = req.nextUrl.searchParams.get('from')
    const toIso = req.nextUrl.searchParams.get('to')

    const bundle = await buildAuditExport({
      organizationId: orgId,
      fromIso,
      toIso,
    })

    auditFromAuth(auth, 'export', {
      resourceType: 'audit_log',
      metadata: {
        format,
        rowCount: bundle.rowCount,
        windowStart: fromIso,
        windowEnd: toIso,
        chainTip: bundle.chainTip,
      },
    })

    if (format === 'json') {
      return NextResponse.json(bundle, {
        headers: {
          'Content-Disposition': `attachment; filename="audit-${orgId}-${bundle.generatedAt.slice(0, 10)}.json"`,
        },
      })
    }

    const csv = bundleToCsv(bundle)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-${orgId}-${bundle.generatedAt.slice(0, 10)}.csv"`,
        'X-Audit-Chain-Tip': bundle.chainTip,
        'X-Audit-Row-Count': String(bundle.rowCount),
      },
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
