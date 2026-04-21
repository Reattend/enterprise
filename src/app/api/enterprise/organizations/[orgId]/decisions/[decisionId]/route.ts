import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
  canAccessDepartment,
} from '@/lib/enterprise'

async function loadDecision(orgId: string, decisionId: string) {
  const rows = await db
    .select()
    .from(schema.decisions)
    .where(and(
      eq(schema.decisions.id, decisionId),
      eq(schema.decisions.organizationId, orgId),
    ))
    .limit(1)
  return rows[0] ?? null
}

// GET /api/enterprise/organizations/[orgId]/decisions/[decisionId]
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string; decisionId: string }> }) {
  try {
    const { orgId, decisionId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const decision = await loadDecision(orgId, decisionId)
    if (!decision) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Dept-scoped access check for non-admin members
    const isAdmin = auth.orgCtx.orgRole === 'super_admin' || auth.orgCtx.orgRole === 'admin'
    if (!isAdmin && decision.departmentId) {
      const ok = await canAccessDepartment(auth.userId, decision.departmentId)
      if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    return NextResponse.json({ decision })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// PATCH /api/enterprise/organizations/[orgId]/decisions/[decisionId]
// Updatable: outcome, rationale, context, tags, status (archived only via this route)
// Reversing and superseding have their own endpoints for clarity + audit.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orgId: string; decisionId: string }> }) {
  try {
    const { orgId, decisionId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const decision = await loadDecision(orgId, decisionId)
    if (!decision) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Only the decider, a dept_head, or org admin can edit
    const isAdmin = auth.orgCtx.orgRole === 'super_admin' || auth.orgCtx.orgRole === 'admin'
    const isOwner = decision.decidedByUserId === auth.userId
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'only the decider or an admin can edit' }, { status: 403 })
    }

    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if (typeof body.outcome === 'string') patch.outcome = body.outcome
    if (typeof body.rationale === 'string') patch.rationale = body.rationale
    if (typeof body.context === 'string') patch.context = body.context
    if (Array.isArray(body.tags)) patch.tags = JSON.stringify(body.tags)
    if (typeof body.title === 'string' && body.title.trim().length > 0) patch.title = body.title.trim()
    if (body.status === 'archived') patch.status = 'archived'

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no updatable fields' }, { status: 400 })
    }

    patch.updatedAt = new Date().toISOString()

    await db.update(schema.decisions).set(patch).where(eq(schema.decisions.id, decisionId))

    auditFromAuth(auth, 'update', {
      resourceType: 'decision',
      resourceId: decisionId,
      departmentId: decision.departmentId ?? null,
      metadata: { changedFields: Object.keys(patch).filter((k) => k !== 'updatedAt') },
    })

    const updated = await loadDecision(orgId, decisionId)
    return NextResponse.json({ decision: updated })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
