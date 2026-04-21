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

// GET /api/enterprise/wiki/topic/[topicSlug]?orgId=...
// Returns the topic wiki page: records tagged/entity-linked to the slug,
// Claude summary, the depts where it shows up, stale flag.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ topicSlug: string }> },
) {
  try {
    const { userId } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const { topicSlug } = await params
    const topic = decodeURIComponent(topicSlug).toLowerCase().trim()
    if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

    // Scope: workspaces in this org the user can see
    const linkRows = await db.select().from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const allWs = Array.from(new Set(linkRows.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)
    if (accessibleWs.length === 0) {
      return NextResponse.json({ records: [], summary: '', departments: [] })
    }

    // Pull all records in scope, then filter by tag or entity match
    const allRecs = await db.select().from(schema.records)
      .where(inArray(schema.records.workspaceId, accessibleWs))
      .orderBy(desc(schema.records.createdAt))
      .limit(300)

    // Records whose tags contain our slug
    const tagHits = allRecs.filter((r) => {
      if (!r.tags) return false
      try {
        const arr: string[] = JSON.parse(r.tags)
        return arr.some((t) => String(t || '').trim().toLowerCase() === topic)
      } catch { return false }
    })

    // Records linked to an entity whose name matches the slug
    // Drizzle doesn't have a clean case-insensitive match; we pull entities
    // for this workspace set via the record_entities join, then filter in JS.
    const linkedRecIds = allRecs.map((r) => r.id)
    const reLinkRows = linkedRecIds.length
      ? await db.select({ recordId: schema.recordEntities.recordId, entityId: schema.recordEntities.entityId })
          .from(schema.recordEntities)
          .where(inArray(schema.recordEntities.recordId, linkedRecIds))
      : []
    const entityIds = Array.from(new Set(reLinkRows.map((l) => l.entityId)))
    const entityRows = entityIds.length
      ? await db.select().from(schema.entities).where(inArray(schema.entities.id, entityIds))
      : []
    const matchingEntityIds = entityRows
      .filter((e) => e.name.trim().toLowerCase() === topic && e.kind !== 'person')
      .map((e) => e.id)

    let entityHits: typeof allRecs = []
    if (matchingEntityIds.length) {
      const matchSet = new Set(matchingEntityIds)
      const hitRecIds = new Set(reLinkRows.filter((l) => matchSet.has(l.entityId)).map((l) => l.recordId))
      entityHits = allRecs.filter((r) => hitRecIds.has(r.id))
    }

    // Union, RBAC-filter
    const unionMap = new Map<string, typeof allRecs[number]>()
    for (const r of [...tagHits, ...entityHits]) unionMap.set(r.id, r)
    const union = Array.from(unionMap.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    const ctx = await buildAccessContext(userId)
    const allowed = await filterToAccessibleRecords(ctx, union.map((r) => r.id))
    const visible = union.filter((r) => allowed.has(r.id))

    // Dept breakdown (via workspace_org_links)
    const wsIds = Array.from(new Set(visible.map((r) => r.workspaceId)))
    const wsLinkRows = wsIds.length
      ? await db.select().from(schema.workspaceOrgLinks).where(inArray(schema.workspaceOrgLinks.workspaceId, wsIds))
      : []
    const deptCounts = new Map<string, number>()
    for (const link of wsLinkRows) {
      if (!link.departmentId) continue
      const count = visible.filter((r) => r.workspaceId === link.workspaceId).length
      deptCounts.set(link.departmentId, (deptCounts.get(link.departmentId) || 0) + count)
    }
    const deptRows = deptCounts.size
      ? await db.select({ id: schema.departments.id, name: schema.departments.name, kind: schema.departments.kind })
          .from(schema.departments)
          .where(inArray(schema.departments.id, Array.from(deptCounts.keys())))
      : []
    const departments = deptRows.map((d) => ({ ...d, recordCount: deptCounts.get(d.id) || 0 }))
      .sort((a, b) => b.recordCount - a.recordCount)

    const { summary, cached, lastRecordAt, generatedAt } = await getOrGenerateSummary({
      organizationId: orgId,
      pageType: 'topic',
      pageKey: topic,
      label: topic,
      records: visible.slice(0, 30).map((r) => ({
        id: r.id, title: r.title, summary: r.summary, content: r.content, type: r.type, createdAt: r.createdAt,
      })),
    })

    return NextResponse.json({
      topic,
      summary,
      summaryCached: cached,
      summaryGeneratedAt: generatedAt,
      stale: isPageStale(lastRecordAt),
      lastRecordAt,
      recordCount: visible.length,
      records: visible.slice(0, 30).map((r) => ({
        id: r.id, title: r.title, summary: r.summary, type: r.type, createdAt: r.createdAt,
      })),
      departments,
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
