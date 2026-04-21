import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  listAccessibleDepartmentIds,
  buildAccessContext,
  filterToAccessibleRecords,
} from '@/lib/enterprise'
import { getOrGenerateSummary, isPageStale } from '@/lib/enterprise/wiki/summarize'

// GET /api/enterprise/wiki/dept/[deptId]
// Returns the dept wiki page: Claude summary + recent records + members +
// linked decisions + policies (placeholder) + stale indicator.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deptId: string }> },
) {
  try {
    const { userId } = await requireAuth()
    const { deptId } = await params

    const dept = await db.query.departments.findFirst({
      where: eq(schema.departments.id, deptId),
    })
    if (!dept) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // RBAC: user must have access to this dept (direct membership or ancestor).
    const accessible = new Set(await listAccessibleDepartmentIds(userId, dept.organizationId))
    if (!accessible.has(deptId)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Head user (stable org-level ownership)
    let head: { id: string; name: string | null; email: string } | null = null
    if (dept.headUserId) {
      const [h] = await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, dept.headUserId))
        .limit(1)
      if (h) head = h
    }

    // Direct dept members
    const memberRows = await db
      .select({
        userId: schema.departmentMembers.userId,
        role: schema.departmentMembers.role,
        name: schema.users.name,
        email: schema.users.email,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.departmentMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.departmentMembers.userId))
      .where(eq(schema.departmentMembers.departmentId, deptId))

    // Workspaces linked to this dept → records in them → RBAC filter
    const wsLinks = await db.select().from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.departmentId, deptId))
    const wsIds = wsLinks.map((l) => l.workspaceId)

    let records: Array<{
      id: string; title: string; summary: string | null; content: string | null;
      type: string; createdAt: string;
    }> = []
    if (wsIds.length) {
      const all = await db.select({
        id: schema.records.id,
        title: schema.records.title,
        summary: schema.records.summary,
        content: schema.records.content,
        type: schema.records.type,
        createdAt: schema.records.createdAt,
      }).from(schema.records)
        .where(inArray(schema.records.workspaceId, wsIds))
        .orderBy(desc(schema.records.createdAt))
        .limit(50)
      // Strip records the user can't see (visibility rules)
      const ctx = await buildAccessContext(userId)
      const allowed = await filterToAccessibleRecords(ctx, all.map((r) => r.id))
      records = all.filter((r) => allowed.has(r.id))
    }

    // Linked decisions (org-wide but filtered by dept)
    const decisions = await db.query.decisions.findMany({
      where: and(
        eq(schema.decisions.organizationId, dept.organizationId),
        eq(schema.decisions.departmentId, deptId),
      ),
      orderBy: desc(schema.decisions.createdAt),
      limit: 10,
    })

    // Claude summary (cached)
    const { summary, cached, lastRecordAt, generatedAt } = await getOrGenerateSummary({
      organizationId: dept.organizationId,
      pageType: 'dept',
      pageKey: deptId,
      label: dept.name,
      records: records.slice(0, 30),
    })

    return NextResponse.json({
      dept: {
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        kind: dept.kind,
        description: dept.description,
        parentId: dept.parentId,
        head,
      },
      summary,
      summaryCached: cached,
      summaryGeneratedAt: generatedAt,
      stale: isPageStale(lastRecordAt),
      lastRecordAt,
      recordCount: records.length,
      records: records.slice(0, 20).map((r) => ({
        id: r.id, title: r.title, summary: r.summary, type: r.type, createdAt: r.createdAt,
      })),
      members: memberRows,
      decisions: decisions.map((d) => ({
        id: d.id, title: d.title, status: d.status, createdAt: d.createdAt,
      })),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
