import { NextRequest, NextResponse } from 'next/server'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { runHealthScan, getLatestHealth } from '@/lib/enterprise/self-healing'

// GET /api/enterprise/organizations/[orgId]/health
// ?departmentId=... (default: org-wide roll-up)
// Returns the most recent scan for the given scope — does NOT trigger a scan.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const departmentId = req.nextUrl.searchParams.get('departmentId')
    const latest = await getLatestHealth(orgId, departmentId || null)
    if (!latest) {
      return NextResponse.json({ latest: null })
    }
    return NextResponse.json({ latest })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/organizations/[orgId]/health
// Trigger a new scan. Runs synchronously (a few seconds for modest orgs).
// Requires org.manage so regular admins — not just super_admins — can kick it.
// We use org.audit.read as the gate because viewing findings reveals audit-level data.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.audit.read')
    if (isAuthResponse(auth)) return auth

    const start = Date.now()
    const result = await runHealthScan(orgId)
    const durationMs = Date.now() - start

    auditFromAuth(auth, 'admin_action', {
      resourceType: 'health_scan',
      resourceId: orgId,
      metadata: {
        durationMs,
        findingsCount: result.findings.length,
        healthScore: result.healthScore,
      },
    })

    return NextResponse.json({
      result,
      durationMs,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
