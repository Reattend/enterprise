import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/members/[userId]/impact
// What would be lost / needs a successor if this user were offboarded now.
// Returns: roles currently held, decisions made, records authored,
// dept memberships. Drives the offboard wizard's summary + transfer picker.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> },
) {
  try {
    const { orgId, userId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    // Confirm user is actually in this org
    const mem = await db
      .select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, orgId),
        eq(schema.organizationMembers.userId, userId),
      ))
      .limit(1)
    if (!mem[0]) return NextResponse.json({ error: 'user not in org' }, { status: 404 })

    const userRow = await db
      .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)

    // Roles currently held
    const currentAssignments = await db
      .select({
        assignmentId: schema.roleAssignments.id,
        roleId: schema.roleAssignments.roleId,
        startedAt: schema.roleAssignments.startedAt,
      })
      .from(schema.roleAssignments)
      .where(and(
        eq(schema.roleAssignments.userId, userId),
        eq(schema.roleAssignments.organizationId, orgId),
        isNull(schema.roleAssignments.endedAt),
      ))

    const roleIds = currentAssignments.map((a) => a.roleId)
    const roleRows = roleIds.length
      ? await db.select().from(schema.employeeRoles).where(inArray(schema.employeeRoles.id, roleIds))
      : []
    const roleById = new Map(roleRows.map((r) => [r.id, r]))

    // Record ownership count per role (how much knowledge transfers with each)
    const ownership = roleIds.length
      ? await db
          .select({ roleId: schema.recordRoleOwnership.roleId })
          .from(schema.recordRoleOwnership)
          .where(inArray(schema.recordRoleOwnership.roleId, roleIds))
      : []
    const ownedCountByRole = new Map<string, number>()
    for (const o of ownership) ownedCountByRole.set(o.roleId, (ownedCountByRole.get(o.roleId) ?? 0) + 1)

    const rolesHeld = currentAssignments.map((a) => {
      const r = roleById.get(a.roleId)!
      return {
        assignmentId: a.assignmentId,
        roleId: a.roleId,
        title: r?.title ?? '(unknown)',
        departmentId: r?.departmentId ?? null,
        seniority: r?.seniority ?? null,
        startedAt: a.startedAt,
        ownedRecordsCount: ownedCountByRole.get(a.roleId) ?? 0,
      }
    })

    // Decisions made by this user
    const decisionsByUser = await db
      .select({
        id: schema.decisions.id,
        title: schema.decisions.title,
        status: schema.decisions.status,
        decidedAt: schema.decisions.decidedAt,
      })
      .from(schema.decisions)
      .where(and(
        eq(schema.decisions.organizationId, orgId),
        eq(schema.decisions.decidedByUserId, userId),
      ))

    // Department memberships (for context, not transferred automatically)
    const deptMemberships = await db
      .select({
        departmentId: schema.departmentMembers.departmentId,
        role: schema.departmentMembers.role,
      })
      .from(schema.departmentMembers)
      .where(and(
        eq(schema.departmentMembers.organizationId, orgId),
        eq(schema.departmentMembers.userId, userId),
      ))

    return NextResponse.json({
      user: userRow[0] ?? { id: userId, name: 'unknown', email: 'unknown' },
      membership: {
        role: mem[0].role,
        status: mem[0].status,
        title: mem[0].title,
        offboardedAt: mem[0].offboardedAt,
      },
      rolesHeld,
      decisionsCount: decisionsByUser.length,
      recentDecisions: decisionsByUser.slice(0, 10),
      departmentMemberships: deptMemberships,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
