import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, lte, count } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
  pruneAuditBefore,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/audit/retention
// Returns the current retention config + a safe-to-prune preview.
//
// The retention value lives in organizations.settings.auditRetentionDays.
// 0 = infinite (government / regulated default). Positive = days kept,
// older rows are eligible for pruning.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.audit.read')
    if (isAuthResponse(auth)) return auth

    const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1)
    if (!org) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const settings = org.settings ? JSON.parse(org.settings) : {}
    const days: number = typeof settings.auditRetentionDays === 'number' ? settings.auditRetentionDays : 0

    // Count rows older than the retention cutoff — preview only, no delete.
    let eligibleToPrune = 0
    let cutoffIso: string | null = null
    if (days > 0) {
      cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const [row] = await db.select({ value: count() })
        .from(schema.auditLog)
        .where(and(
          eq(schema.auditLog.organizationId, orgId),
          lte(schema.auditLog.createdAt, cutoffIso),
        ))
      eligibleToPrune = Number(row?.value ?? 0)
    }

    return NextResponse.json({
      retentionDays: days,
      infinite: days === 0,
      cutoffIso,
      eligibleToPrune,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// PATCH /api/enterprise/organizations/[orgId]/audit/retention
// Body: { retentionDays: number } — 0 = infinite retention.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const days = Number(body.retentionDays)
    if (!Number.isFinite(days) || days < 0 || days > 3650) {
      return NextResponse.json({ error: 'retentionDays must be an integer 0-3650' }, { status: 400 })
    }

    const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1)
    if (!org) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const settings = org.settings ? JSON.parse(org.settings) : {}
    settings.auditRetentionDays = Math.floor(days)

    await db.update(schema.organizations)
      .set({ settings: JSON.stringify(settings), updatedAt: new Date().toISOString() })
      .where(eq(schema.organizations.id, orgId))

    auditFromAuth(auth, 'permission_change', {
      resourceType: 'audit_retention',
      resourceId: orgId,
      metadata: { retentionDays: settings.auditRetentionDays },
    })

    return NextResponse.json({ ok: true, retentionDays: settings.auditRetentionDays })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/organizations/[orgId]/audit/retention
// Body: {} — runs a prune NOW using the configured retentionDays.
// Returns the count of rows deleted. Requires org.manage (destructive).
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1)
    if (!org) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const settings = org.settings ? JSON.parse(org.settings) : {}
    const days: number = typeof settings.auditRetentionDays === 'number' ? settings.auditRetentionDays : 0
    if (days === 0) {
      return NextResponse.json({ error: 'retention is infinite — set retentionDays > 0 first' }, { status: 400 })
    }

    const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const deleted = await pruneAuditBefore(orgId, cutoffIso)

    auditFromAuth(auth, 'admin_action', {
      resourceType: 'audit_prune',
      resourceId: orgId,
      metadata: { cutoffIso, deleted, retentionDays: days },
    })

    return NextResponse.json({ deleted, cutoffIso, retentionDays: days })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
