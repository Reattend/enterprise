import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { hasPermission } from '@/lib/enterprise/permissions'

// POST /api/enterprise/organizations/[orgId]/decisions/[decisionId]/reverse
// Body: { reason: string, supersededById?: string }
// If supersededById is provided, status becomes 'superseded'; otherwise 'reversed'.
// Both record the reversal metadata. Cannot reverse an already-reversed decision.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string; decisionId: string }> }) {
  try {
    const { orgId, decisionId } = await params
    // Org membership only — perm check is dept-scoped after we load the decision.
    const auth = await requireOrgAuth(req, orgId)
    if (isAuthResponse(auth)) return auth

    const existing = await db
      .select()
      .from(schema.decisions)
      .where(and(
        eq(schema.decisions.id, decisionId),
        eq(schema.decisions.organizationId, orgId),
      ))
      .limit(1)
    const decision = existing[0]
    if (!decision) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const allowed = await hasPermission(
      { userId: auth.userId, organizationId: orgId, departmentId: decision.departmentId ?? null },
      'decisions.manage',
    )
    if (!allowed) {
      return NextResponse.json({ error: 'missing permission: decisions.manage' }, { status: 403 })
    }

    if (decision.status === 'reversed' || decision.status === 'superseded') {
      return NextResponse.json({ error: `already ${decision.status}` }, { status: 409 })
    }

    const body = await req.json()
    const { reason, supersededById } = body as { reason?: string; supersededById?: string }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return NextResponse.json({ error: 'reason is required (min 3 chars)' }, { status: 400 })
    }

    // Optional: validate supersededById is another in-org, active decision
    if (supersededById) {
      if (supersededById === decisionId) {
        return NextResponse.json({ error: 'cannot supersede with itself' }, { status: 400 })
      }
      const other = await db
        .select()
        .from(schema.decisions)
        .where(and(
          eq(schema.decisions.id, supersededById),
          eq(schema.decisions.organizationId, orgId),
        ))
        .limit(1)
      if (!other[0]) {
        return NextResponse.json({ error: 'supersededById decision not found in org' }, { status: 400 })
      }
    }

    const nowIso = new Date().toISOString()
    const newStatus = supersededById ? 'superseded' : 'reversed'

    await db
      .update(schema.decisions)
      .set({
        status: newStatus,
        reversedAt: nowIso,
        reversedByUserId: auth.userId,
        reversedReason: reason.trim(),
        supersededById: supersededById || null,
        updatedAt: nowIso,
      })
      .where(eq(schema.decisions.id, decisionId))

    auditFromAuth(auth, 'decision_reverse', {
      resourceType: 'decision',
      resourceId: decisionId,
      departmentId: decision.departmentId ?? null,
      metadata: {
        status: newStatus,
        reason: reason.trim().slice(0, 500),
        supersededById: supersededById || null,
      },
    })

    const updated = await db.select().from(schema.decisions).where(eq(schema.decisions.id, decisionId)).limit(1)
    return NextResponse.json({ decision: updated[0] })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
