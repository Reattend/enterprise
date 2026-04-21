import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  listAccessibleDepartmentIds,
} from '@/lib/enterprise'

// GET /api/enterprise/wiki/tree?orgId=...
// Returns the dept tree scoped to what the caller can see. Each node carries:
//   - id, name, slug, kind, parentId, headUserId
//   - recordCount (records in linked workspaces)
//   - memberCount (direct dept members)
//   - lastRecordAt (freshness)
//
// One flat array — the UI nests via parentId so we don't need recursive JSON.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const accessible = new Set(await listAccessibleDepartmentIds(userId, orgId))
    if (accessible.size === 0) return NextResponse.json({ departments: [] })

    const rows = await db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.organizationId, orgId))
    const visible = rows.filter((d) => accessible.has(d.id))
    const visibleIds = visible.map((d) => d.id)

    // Workspaces linked to each visible dept
    const wsLinks = visibleIds.length
      ? await db.select().from(schema.workspaceOrgLinks).where(inArray(schema.workspaceOrgLinks.departmentId, visibleIds))
      : []
    const wsByDept = new Map<string, string[]>()
    for (const link of wsLinks) {
      if (!link.departmentId) continue
      if (!wsByDept.has(link.departmentId)) wsByDept.set(link.departmentId, [])
      wsByDept.get(link.departmentId)!.push(link.workspaceId)
    }

    // Record counts + freshness per dept via linked workspaces
    const allWsIds = Array.from(new Set(wsLinks.map((l) => l.workspaceId)))
    const recordsByWs = new Map<string, { count: number; lastAt: string | null }>()
    if (allWsIds.length) {
      const rawRecords = await db
        .select({ workspaceId: schema.records.workspaceId, createdAt: schema.records.createdAt })
        .from(schema.records)
        .where(inArray(schema.records.workspaceId, allWsIds))
      for (const r of rawRecords) {
        const prev = recordsByWs.get(r.workspaceId) || { count: 0, lastAt: null as string | null }
        prev.count += 1
        if (!prev.lastAt || r.createdAt > prev.lastAt) prev.lastAt = r.createdAt
        recordsByWs.set(r.workspaceId, prev)
      }
    }

    // Member counts per dept
    const memberRows = visibleIds.length
      ? await db.select({ departmentId: schema.departmentMembers.departmentId })
          .from(schema.departmentMembers)
          .where(inArray(schema.departmentMembers.departmentId, visibleIds))
      : []
    const membersByDept = new Map<string, number>()
    for (const m of memberRows) {
      membersByDept.set(m.departmentId, (membersByDept.get(m.departmentId) || 0) + 1)
    }

    const departments = visible.map((d) => {
      const wsIds = wsByDept.get(d.id) || []
      let count = 0
      let lastAt: string | null = null
      for (const wsId of wsIds) {
        const agg = recordsByWs.get(wsId)
        if (!agg) continue
        count += agg.count
        if (!lastAt || (agg.lastAt && agg.lastAt > lastAt)) lastAt = agg.lastAt
      }
      return {
        id: d.id,
        name: d.name,
        slug: d.slug,
        kind: d.kind,
        parentId: d.parentId,
        headUserId: d.headUserId,
        recordCount: count,
        memberCount: membersByDept.get(d.id) || 0,
        lastRecordAt: lastAt,
      }
    })

    return NextResponse.json({ departments })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
