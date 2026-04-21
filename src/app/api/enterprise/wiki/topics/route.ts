import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  buildAccessContext,
  filterToAccessibleRecords,
  filterToAccessibleWorkspaces,
} from '@/lib/enterprise'

// GET /api/enterprise/wiki/topics?orgId=...
// Returns a ranked list of topics. A "topic" here is:
//   - a tag used by ≥ 2 visible records, OR
//   - an entity.name used by ≥ 2 visible records (unioned)
// Ranking = visible record count (desc). Capped at 60 for a usable index.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    // All workspaces linked to this org → filter to user's accessible set
    const linksRows = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const allWs = Array.from(new Set(linksRows.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)
    if (accessibleWs.length === 0) return NextResponse.json({ topics: [] })

    // Pull records, RBAC-filter them
    const recs = await db.select({
      id: schema.records.id,
      tags: schema.records.tags,
      createdAt: schema.records.createdAt,
    }).from(schema.records)
      .where(inArray(schema.records.workspaceId, accessibleWs))
    const ctx = await buildAccessContext(userId)
    const allowed = await filterToAccessibleRecords(ctx, recs.map((r) => r.id))
    const visibleRecs = recs.filter((r) => allowed.has(r.id))

    // Aggregate tag counts
    const tagCounts = new Map<string, { count: number; lastAt: string }>()
    for (const r of visibleRecs) {
      if (!r.tags) continue
      try {
        const tags: string[] = JSON.parse(r.tags)
        for (const raw of tags) {
          const t = String(raw || '').trim().toLowerCase()
          if (!t) continue
          const prev = tagCounts.get(t) || { count: 0, lastAt: '' }
          prev.count += 1
          if (r.createdAt > prev.lastAt) prev.lastAt = r.createdAt
          tagCounts.set(t, prev)
        }
      } catch { /* bad JSON, skip */ }
    }

    // Union with entity names (kind='person' stays in People tab, others here)
    const entityLinks = visibleRecs.length
      ? await db.select({
          recordId: schema.recordEntities.recordId,
          entityId: schema.recordEntities.entityId,
        }).from(schema.recordEntities)
          .where(inArray(schema.recordEntities.recordId, visibleRecs.map((r) => r.id)))
      : []
    const entityIds = Array.from(new Set(entityLinks.map((l) => l.entityId)))
    const entityRows = entityIds.length
      ? await db.select().from(schema.entities).where(inArray(schema.entities.id, entityIds))
      : []
    const entById = new Map(entityRows.map((e) => [e.id, e]))
    const recById = new Map(visibleRecs.map((r) => [r.id, r]))

    for (const link of entityLinks) {
      const ent = entById.get(link.entityId)
      if (!ent || ent.kind === 'person') continue
      const t = ent.name.trim().toLowerCase()
      if (!t) continue
      const rec = recById.get(link.recordId)
      const prev = tagCounts.get(t) || { count: 0, lastAt: '' }
      prev.count += 1
      if (rec && rec.createdAt > prev.lastAt) prev.lastAt = rec.createdAt
      tagCounts.set(t, prev)
    }

    const topics = Array.from(tagCounts.entries())
      .filter(([, v]) => v.count >= 2)
      .map(([slug, v]) => ({
        slug,
        label: slug,
        recordCount: v.count,
        lastRecordAt: v.lastAt || null,
      }))
      .sort((a, b) => b.recordCount - a.recordCount)
      .slice(0, 60)

    return NextResponse.json({ topics })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
