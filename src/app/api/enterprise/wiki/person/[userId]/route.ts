import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  buildAccessContext,
  filterToAccessibleRecords,
  filterToAccessibleWorkspaces,
} from '@/lib/enterprise'
import { getOrGenerateSummary, isPageStale } from '@/lib/enterprise/wiki/summarize'

// GET /api/enterprise/wiki/person/[userId]?orgId=...
// Returns the person's wiki page: role, dept memberships, records they
// authored / are mentioned in, decisions they made, knowledge-at-risk flag
// (offboarded + records exist), Claude summary.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: caller } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const { userId } = await params

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Org membership (status, role, title)
    const [membership] = await db.select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.userId, userId),
        eq(schema.organizationMembers.organizationId, orgId),
      )).limit(1)
    if (!membership) return NextResponse.json({ error: 'not a member' }, { status: 404 })

    // Dept memberships
    const deptMemberRows = await db.select({
      departmentId: schema.departmentMembers.departmentId,
      role: schema.departmentMembers.role,
    }).from(schema.departmentMembers)
      .where(and(
        eq(schema.departmentMembers.userId, userId),
        eq(schema.departmentMembers.organizationId, orgId),
      ))
    const deptIds = deptMemberRows.map((m) => m.departmentId)
    const deptNames = deptIds.length
      ? await db.select({ id: schema.departments.id, name: schema.departments.name, kind: schema.departments.kind })
          .from(schema.departments).where(inArray(schema.departments.id, deptIds))
      : []
    const deptNameById = new Map(deptNames.map((d) => [d.id, d]))
    const departments = deptMemberRows.map((m) => ({
      ...deptNameById.get(m.departmentId),
      role: m.role,
    })).filter((d) => d.id)

    // Current role assignments
    const roleAssignments = await db.select({
      roleId: schema.roleAssignments.roleId,
      startedAt: schema.roleAssignments.startedAt,
      endedAt: schema.roleAssignments.endedAt,
      title: schema.employeeRoles.title,
      deptId: schema.employeeRoles.departmentId,
    }).from(schema.roleAssignments)
      .innerJoin(schema.employeeRoles, eq(schema.employeeRoles.id, schema.roleAssignments.roleId))
      .where(and(
        eq(schema.roleAssignments.userId, userId),
        eq(schema.roleAssignments.organizationId, orgId),
      ))
    const currentRoles = roleAssignments.filter((r) => !r.endedAt)

    // Scope for records: workspaces in this org the caller can see
    const wsLinkRows = await db.select().from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const allWs = Array.from(new Set(wsLinkRows.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(caller, allWs)

    // Records authored by this user, RBAC-filtered
    let authored: any[] = []
    if (accessibleWs.length) {
      const rows = await db.select().from(schema.records)
        .where(and(
          inArray(schema.records.workspaceId, accessibleWs),
          eq(schema.records.createdBy, userId),
        )).orderBy(desc(schema.records.createdAt)).limit(50)
      const ctx = await buildAccessContext(caller)
      const allowed = await filterToAccessibleRecords(ctx, rows.map((r) => r.id))
      authored = rows.filter((r) => allowed.has(r.id))
    }

    // Decisions by this user
    const decisions = await db.select().from(schema.decisions)
      .where(and(
        eq(schema.decisions.organizationId, orgId),
        eq(schema.decisions.decidedByUserId, userId),
      )).orderBy(desc(schema.decisions.createdAt)).limit(20)

    const atRisk = membership.status === 'offboarded' && authored.length > 0

    const { summary, cached, lastRecordAt, generatedAt } = await getOrGenerateSummary({
      organizationId: orgId,
      pageType: 'person',
      pageKey: userId,
      label: user.name || user.email,
      records: authored.slice(0, 30).map((r) => ({
        id: r.id, title: r.title, summary: r.summary, content: r.content, type: r.type, createdAt: r.createdAt,
      })),
    })

    return NextResponse.json({
      person: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: membership.role,
        title: membership.title,
        status: membership.status,
        offboardedAt: membership.offboardedAt,
      },
      departments,
      currentRoles: currentRoles.map((r) => ({ title: r.title, deptId: r.deptId })),
      authored: authored.slice(0, 30).map((r: any) => ({
        id: r.id, title: r.title, type: r.type, createdAt: r.createdAt,
      })),
      decisions: decisions.map((d) => ({
        id: d.id, title: d.title, status: d.status, decidedAt: d.decidedAt,
      })),
      summary,
      summaryCached: cached,
      summaryGeneratedAt: generatedAt,
      stale: isPageStale(lastRecordAt),
      lastRecordAt,
      atRisk,
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
