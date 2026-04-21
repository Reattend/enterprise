import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/roles
// Lists every employee role in the org with its current holder (if any),
// ownership count (records + decisions linked to the role), and vacancy state.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const roles = await db
      .select()
      .from(schema.employeeRoles)
      .where(eq(schema.employeeRoles.organizationId, orgId))

    if (roles.length === 0) return NextResponse.json({ roles: [] })

    const roleIds = roles.map((r) => r.id)

    // Current assignments: endedAt IS NULL
    const currentAssignments = await db
      .select({
        roleId: schema.roleAssignments.roleId,
        userId: schema.roleAssignments.userId,
        startedAt: schema.roleAssignments.startedAt,
      })
      .from(schema.roleAssignments)
      .where(and(inArray(schema.roleAssignments.roleId, roleIds), isNull(schema.roleAssignments.endedAt)))

    const currentByRole = new Map<string, { userId: string; startedAt: string }>()
    for (const a of currentAssignments) currentByRole.set(a.roleId, { userId: a.userId, startedAt: a.startedAt })

    const holderIds = Array.from(new Set(currentAssignments.map((a) => a.userId)))
    const holderRows = holderIds.length
      ? await db
          .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
          .from(schema.users)
          .where(inArray(schema.users.id, holderIds))
      : []
    const holderById = new Map(holderRows.map((h) => [h.id, h]))

    // Ownership counts — records linked via record_role_ownership
    const ownership = await db
      .select({ roleId: schema.recordRoleOwnership.roleId, recordId: schema.recordRoleOwnership.recordId })
      .from(schema.recordRoleOwnership)
      .where(inArray(schema.recordRoleOwnership.roleId, roleIds))
    const ownershipCount = new Map<string, number>()
    for (const o of ownership) ownershipCount.set(o.roleId, (ownershipCount.get(o.roleId) ?? 0) + 1)

    // Decision attribution counts
    const decisionsByRole = await db
      .select({ roleId: schema.decisions.decidedByRoleId })
      .from(schema.decisions)
      .where(and(
        eq(schema.decisions.organizationId, orgId),
        inArray(schema.decisions.decidedByRoleId, roleIds),
      ))
    const decisionCount = new Map<string, number>()
    for (const d of decisionsByRole) {
      if (!d.roleId) continue
      decisionCount.set(d.roleId, (decisionCount.get(d.roleId) ?? 0) + 1)
    }

    const enriched = roles.map((r) => {
      const cur = currentByRole.get(r.id)
      const holder = cur ? holderById.get(cur.userId) : undefined
      return {
        ...r,
        currentHolder: holder
          ? { userId: holder.id, name: holder.name, email: holder.email, startedAt: cur?.startedAt }
          : null,
        isVacant: !cur,
        ownedRecordsCount: ownershipCount.get(r.id) ?? 0,
        decidedCount: decisionCount.get(r.id) ?? 0,
      }
    })

    return NextResponse.json({ roles: enriched })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/organizations/[orgId]/roles
// Body: { title, description?, seniority?, departmentId?, assignToUserId? }
// If assignToUserId is provided, a role_assignments row is also created.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const { title, description, seniority, departmentId, assignToUserId } = body as {
      title?: string
      description?: string
      seniority?: string
      departmentId?: string
      assignToUserId?: string
    }

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return NextResponse.json({ error: 'title is required (min 2 chars)' }, { status: 400 })
    }

    // Look up seniorityRank from taxonomy if label matches
    let seniorityRank: number | null = null
    if (seniority) {
      const tax = await db
        .select()
        .from(schema.organizationTaxonomy)
        .where(and(
          eq(schema.organizationTaxonomy.organizationId, orgId),
          eq(schema.organizationTaxonomy.kind, 'seniority_rank'),
          eq(schema.organizationTaxonomy.label, seniority),
        ))
        .limit(1)
      if (tax[0]) seniorityRank = tax[0].rankOrder
    }

    if (departmentId) {
      const dept = await db.select().from(schema.departments).where(eq(schema.departments.id, departmentId)).limit(1)
      if (!dept[0] || dept[0].organizationId !== orgId) {
        return NextResponse.json({ error: 'invalid departmentId' }, { status: 400 })
      }
    }

    if (assignToUserId) {
      const mem = await db
        .select()
        .from(schema.organizationMembers)
        .where(and(
          eq(schema.organizationMembers.organizationId, orgId),
          eq(schema.organizationMembers.userId, assignToUserId),
          eq(schema.organizationMembers.status, 'active'),
        ))
        .limit(1)
      if (!mem[0]) return NextResponse.json({ error: 'assignToUserId is not an active org member' }, { status: 400 })
    }

    const roleId = crypto.randomUUID()
    await db.insert(schema.employeeRoles).values({
      id: roleId,
      organizationId: orgId,
      departmentId: departmentId || null,
      title: title.trim(),
      description: description || null,
      seniority: seniority || null,
      seniorityRank,
      status: assignToUserId ? 'active' : 'vacant',
    })

    if (assignToUserId) {
      await db.insert(schema.roleAssignments).values({
        roleId,
        userId: assignToUserId,
        organizationId: orgId,
      })
    }

    auditFromAuth(auth, 'create', {
      resourceType: 'employee_role',
      resourceId: roleId,
      departmentId: departmentId || null,
      metadata: { title: title.trim(), seniority: seniority || null, assignedTo: assignToUserId || null },
    })

    const created = await db.select().from(schema.employeeRoles).where(eq(schema.employeeRoles.id, roleId)).limit(1)
    return NextResponse.json({ role: created[0] }, { status: 201 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}