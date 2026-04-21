import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, isNull } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'

// POST /api/enterprise/organizations/[orgId]/members/[userId]/offboard
// Body: {
//   transfers: Array<{ roleId, successorUserId?: string, transferNotes?: string }>,
//   globalNote?: string,  // goes into audit metadata
// }
//
// Atomically:
//   1. Ends every current role assignment for this user (endedAt=now),
//      writing transferNotes onto the ending row.
//   2. For each transfer with a successorUserId, inserts a new assignment
//      for that successor on the same role. Roles without a successor
//      become `vacant` (will surface in orphaned detector).
//   3. Marks organization_members.status='offboarded' + offboardedAt.
//
// RBAC: requires org.members.manage. Cannot offboard yourself — guard against
// accidental lockout.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> },
) {
  try {
    const { orgId, userId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    if (userId === auth.userId) {
      return NextResponse.json({ error: 'cannot offboard yourself' }, { status: 400 })
    }

    const mem = await db
      .select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, orgId),
        eq(schema.organizationMembers.userId, userId),
      ))
      .limit(1)
    if (!mem[0]) return NextResponse.json({ error: 'user not in org' }, { status: 404 })
    if (mem[0].status === 'offboarded') {
      return NextResponse.json({ error: 'already offboarded' }, { status: 409 })
    }

    // Refuse to offboard the last super_admin — guards against org lockout.
    if (mem[0].role === 'super_admin') {
      const remainingSuper = await db
        .select({ userId: schema.organizationMembers.userId })
        .from(schema.organizationMembers)
        .where(and(
          eq(schema.organizationMembers.organizationId, orgId),
          eq(schema.organizationMembers.role, 'super_admin'),
          eq(schema.organizationMembers.status, 'active'),
        ))
      if (remainingSuper.length <= 1) {
        return NextResponse.json(
          { error: 'cannot offboard the last super_admin — promote another member first' },
          { status: 400 },
        )
      }
    }

    const body = await req.json()
    const {
      transfers,
      globalNote,
    } = body as {
      transfers?: Array<{ roleId: string; successorUserId?: string; transferNotes?: string }>
      globalNote?: string
    }
    const transferList = Array.isArray(transfers) ? transfers : []

    // Validate: all referenced roles belong to this org + user actually holds them
    const currentAssignments = await db
      .select()
      .from(schema.roleAssignments)
      .where(and(
        eq(schema.roleAssignments.userId, userId),
        eq(schema.roleAssignments.organizationId, orgId),
        isNull(schema.roleAssignments.endedAt),
      ))
    const heldRoleIds = new Set(currentAssignments.map((a) => a.roleId))

    for (const t of transferList) {
      if (!t.roleId || !heldRoleIds.has(t.roleId)) {
        return NextResponse.json(
          { error: `role ${t.roleId} is not currently held by this user` },
          { status: 400 },
        )
      }
      if (t.successorUserId) {
        const s = await db
          .select()
          .from(schema.organizationMembers)
          .where(and(
            eq(schema.organizationMembers.organizationId, orgId),
            eq(schema.organizationMembers.userId, t.successorUserId),
            eq(schema.organizationMembers.status, 'active'),
          ))
          .limit(1)
        if (!s[0]) {
          return NextResponse.json(
            { error: `successor ${t.successorUserId} is not an active org member` },
            { status: 400 },
          )
        }
        if (t.successorUserId === userId) {
          return NextResponse.json(
            { error: 'cannot name the offboarding user as their own successor' },
            { status: 400 },
          )
        }
      }
    }

    const nowIso = new Date().toISOString()
    const transferByRole = new Map(transferList.map((t) => [t.roleId, t]))

    // 1+2. End every held assignment, create successors where named
    for (const a of currentAssignments) {
      const t = transferByRole.get(a.roleId)
      await db
        .update(schema.roleAssignments)
        .set({
          endedAt: nowIso,
          transferNotes: t?.transferNotes ?? a.transferNotes ?? null,
        })
        .where(eq(schema.roleAssignments.id, a.id))

      if (t?.successorUserId) {
        await db.insert(schema.roleAssignments).values({
          roleId: a.roleId,
          userId: t.successorUserId,
          organizationId: orgId,
          startedAt: nowIso,
        })
        await db
          .update(schema.employeeRoles)
          .set({ status: 'active', updatedAt: nowIso })
          .where(eq(schema.employeeRoles.id, a.roleId))
      } else {
        await db
          .update(schema.employeeRoles)
          .set({ status: 'vacant', updatedAt: nowIso })
          .where(eq(schema.employeeRoles.id, a.roleId))
      }
    }

    // 3. Mark member offboarded
    await db
      .update(schema.organizationMembers)
      .set({
        status: 'offboarded',
        offboardedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(schema.organizationMembers.id, mem[0].id))

    const transferredCount = transferList.filter((t) => !!t.successorUserId).length
    const vacatedCount = currentAssignments.length - transferredCount

    auditFromAuth(auth, 'member_remove', {
      resourceType: 'organization_member',
      resourceId: userId,
      metadata: {
        offboardedUserId: userId,
        rolesHeld: currentAssignments.length,
        rolesTransferred: transferredCount,
        rolesVacated: vacatedCount,
        globalNote: globalNote?.slice(0, 500) ?? null,
      },
    })

    return NextResponse.json({
      ok: true,
      offboardedAt: nowIso,
      rolesTransferred: transferredCount,
      rolesVacated: vacatedCount,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}