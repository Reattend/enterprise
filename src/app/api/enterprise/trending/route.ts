import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { sql, eq, inArray, and, gte } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  buildAccessContext,
  filterToAccessibleRecords,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/trending?orgId=...&days=7&limit=5
// Returns the top-N most-viewed records in the last `days` days, RBAC-filtered.
// Used by the Home Trending widget + admin analytics dashboard.

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '7'), 90)
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '5'), 50)

    const { userId } = await requireAuth()
    const ctx = await getOrgContext(userId, orgId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

    // Group by record_id, count views, order by count desc
    const topViews = await db.select({
      recordId: schema.recordViews.recordId,
      viewCount: sql<number>`cast(count(*) as integer)`,
    })
      .from(schema.recordViews)
      .where(gte(schema.recordViews.viewedAt, since))
      .groupBy(schema.recordViews.recordId)
      .orderBy(sql`count(*) desc`)
      .limit(limit * 4)  // overshoot to survive RBAC filtering

    if (topViews.length === 0) return NextResponse.json({ items: [] })

    const accessCtx = await buildAccessContext(userId)
    const allowed = await filterToAccessibleRecords(accessCtx, topViews.map((r) => r.recordId))
    const visible = topViews.filter((r) => allowed.has(r.recordId)).slice(0, limit)
    if (visible.length === 0) return NextResponse.json({ items: [] })

    const rowsRaw = await db.select()
      .from(schema.records)
      .where(inArray(schema.records.id, visible.map((r) => r.recordId)))

    const byId = new Map(rowsRaw.map((r) => [r.id, r]))
    const items = visible.map((v) => {
      const rec = byId.get(v.recordId)
      if (!rec) return null
      return {
        id: rec.id,
        title: rec.title,
        type: rec.type,
        summary: rec.summary,
        viewCount: v.viewCount,
        createdAt: rec.createdAt,
      }
    }).filter(Boolean)

    return NextResponse.json({ items, windowDays: days })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
