import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/roles/[roleId]
// Returns a single role with its full assignment history (incl. handover notes
// written on outgoing transfers), plus counts for owned records + decisions
// attributed to the role.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; roleId: string }> },
) {
  try {
    const { orgId, roleId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const roleRows = await db
      .select()
      .from(schema.employeeRoles)
      .where(and(
        eq(schema.employeeRoles.id, roleId),
        eq(schema.employeeRoles.organizationId, orgId),
      ))
      .limit(1)
    const role = roleRows[0]
    if (!role) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Full assignment history — newest first by startedAt
    const assignments = await db
      .select()
      .from(schema.roleAssignments)
      .where(eq(schema.roleAssignments.roleId, roleId))
      .orderBy(desc(schema.roleAssignments.startedAt))

    const userIds = Array.from(new Set(assignments.map((a) => a.userId)))
    const usersRows = userIds.length
      ? await db
          .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
          .from(schema.users)
          .where(inArray(schema.users.id, userIds))
      : []
    const userById = new Map(usersRows.map((u) => [u.id, u]))

    const history = assignments.map((a) => {
      const u = userById.get(a.userId)
      return {
        id: a.id,
        userId: a.userId,
        userName: u?.name ?? 'unknown',
        userEmail: u?.email ?? 'unknown',
        startedAt: a.startedAt,
        endedAt: a.endedAt,
        transferNotes: a.transferNotes,
        isCurrent: a.endedAt === null,
      }
    })

    // Owned records + decisions counts
    const ownedRecords = await db
      .select({ id: schema.recordRoleOwnership.recordId })
      .from(schema.recordRoleOwnership)
      .where(eq(schema.recordRoleOwnership.roleId, roleId))

    const decidedCount = (await db
      .select({ id: schema.decisions.id })
      .from(schema.decisions)
      .where(and(
        eq(schema.decisions.organizationId, orgId),
        eq(schema.decisions.decidedByRoleId, roleId),
      ))).length

    return NextResponse.json({
      role,
      currentHolder: history.find((h) => h.isCurrent) ?? null,
      history,
      ownedRecordsCount: ownedRecords.length,
      decidedCount,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// PATCH /api/enterprise/organizations/[orgId]/roles/[roleId]
// Updates metadata (title, description, seniority, departmentId, status).
// For assignment changes, use /assign. For archival: status='archived'.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; roleId: string }> },
) {
  try {
    const { orgId, roleId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if (typeof body.title === 'string' && body.title.trim().length >= 2) patch.title = body.title.trim()
    if (typeof body.description === 'string') patch.description = body.description
    if (typeof body.seniority === 'string' || body.seniority === null) {
      patch.seniority = body.seniority || null
      // Resolve seniorityRank from taxonomy if label matches
      if (body.seniority) {
        const tax = await db
          .select()
          .from(schema.organizationTaxonomy)
          .where(and(
            eq(schema.organizationTaxonomy.organizationId, orgId),
            eq(schema.organizationTaxonomy.kind, 'seniority_rank'),
            eq(schema.organizationTaxonomy.label, body.seniority),
          ))
          .limit(1)
        patch.seniorityRank = tax[0]?.rankOrder ?? null
      } else {
        patch.seniorityRank = null
      }
    }
    if (typeof body.departmentId === 'string' || body.departmentId === null) {
      if (body.departmentId) {
        const d = await db.select().from(schema.departments).where(eq(schema.departments.id, body.departmentId)).limit(1)
        if (!d[0] || d[0].organizationId !== orgId) {
          return NextResponse.json({ error: 'invalid departmentId' }, { status: 400 })
        }
      }
      patch.departmentId = body.departmentId || null
    }
    if (body.status === 'archived' || body.status === 'active' || body.status === 'vacant') {
      patch.status = body.status
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no updatable fields' }, { status: 400 })
    }
    patch.updatedAt = new Date().toISOString()

    await db
      .update(schema.employeeRoles)
      .set(patch)
      .where(and(
        eq(schema.employeeRoles.id, roleId),
        eq(schema.employeeRoles.organizationId, orgId),
      ))

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
