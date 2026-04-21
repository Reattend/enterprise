import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, isNull } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'

// POST /api/enterprise/organizations/[orgId]/roles/[roleId]/assign
// Body: { userId: string, transferNotes?: string, vacate?: boolean }
//
// Transfer pattern: end the current holder's assignment (endedAt=now),
// then insert a new assignment for the incoming user. If `vacate: true` is
// passed and no userId, the role becomes vacant (current assignment ended,
// no replacement). transferNotes are attached to the *outgoing* assignment —
// that's the handover note written by/about the person leaving.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; roleId: string }> },
) {
  try {
    const { orgId, roleId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const role = await db
      .select()
      .from(schema.employeeRoles)
      .where(and(eq(schema.employeeRoles.id, roleId), eq(schema.employeeRoles.organizationId, orgId)))
      .limit(1)
    if (!role[0]) return NextResponse.json({ error: 'role not found in org' }, { status: 404 })

    const body = await req.json()
    const { userId, transferNotes, vacate } = body as {
      userId?: string
      transferNotes?: string
      vacate?: boolean
    }

    if (!vacate && (!userId || typeof userId !== 'string')) {
      return NextResponse.json({ error: 'userId is required (or set vacate:true)' }, { status: 400 })
    }

    // Validate incoming user is an active org member
    if (userId) {
      const mem = await db
        .select()
        .from(schema.organizationMembers)
        .where(and(
          eq(schema.organizationMembers.organizationId, orgId),
          eq(schema.organizationMembers.userId, userId),
          eq(schema.organizationMembers.status, 'active'),
        ))
        .limit(1)
      if (!mem[0]) return NextResponse.json({ error: 'target user is not an active org member' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()

    // End any current assignment — endedAt is null for the currently-held slot
    const current = await db
      .select()
      .from(schema.roleAssignments)
      .where(and(eq(schema.roleAssignments.roleId, roleId), isNull(schema.roleAssignments.endedAt)))
      .limit(1)

    if (current[0]) {
      if (userId && current[0].userId === userId) {
        return NextResponse.json({ error: 'that user already holds this role' }, { status: 409 })
      }
      await db
        .update(schema.roleAssignments)
        .set({
          endedAt: nowIso,
          transferNotes: transferNotes || current[0].transferNotes || null,
        })
        .where(eq(schema.roleAssignments.id, current[0].id))
    }

    // Insert new assignment (unless vacating)
    if (userId) {
      await db.insert(schema.roleAssignments).values({
        roleId,
        userId,
        organizationId: orgId,
        startedAt: nowIso,
      })
      // Role status reflects latest state
      await db
        .update(schema.employeeRoles)
        .set({ status: 'active', updatedAt: nowIso })
        .where(eq(schema.employeeRoles.id, roleId))
    } else {
      await db
        .update(schema.employeeRoles)
        .set({ status: 'vacant', updatedAt: nowIso })
        .where(eq(schema.employeeRoles.id, roleId))
    }

    auditFromAuth(auth, 'role_change', {
      resourceType: 'employee_role',
      resourceId: roleId,
      departmentId: role[0].departmentId ?? null,
      metadata: {
        roleTitle: role[0].title,
        outgoingUserId: current[0]?.userId ?? null,
        incomingUserId: userId ?? null,
        vacated: !userId,
        transferNotesLength: transferNotes?.length ?? 0,
      },
    })

    return NextResponse.json({
      ok: true,
      roleId,
      outgoingUserId: current[0]?.userId ?? null,
      incomingUserId: userId ?? null,
      vacated: !userId,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
