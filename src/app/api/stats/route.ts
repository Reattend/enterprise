import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, sql, desc, gte } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const { workspaceId } = await requireAuth()

    // Parallel queries for all dashboard stats
    const [
      allRecords,
      allLinks,
      allEntities,
      allProjects,
      rawItemsNew,
      recentRecords,
      activityRows,
    ] = await Promise.all([
      db.query.records.findMany({
        where: eq(schema.records.workspaceId, workspaceId),
      }),
      db.query.recordLinks.findMany({
        where: eq(schema.recordLinks.workspaceId, workspaceId),
      }),
      db.query.entities.findMany({
        where: eq(schema.entities.workspaceId, workspaceId),
      }),
      db.query.projects.findMany({
        where: eq(schema.projects.workspaceId, workspaceId),
      }),
      db.query.rawItems.findMany({
        where: and(
          eq(schema.rawItems.workspaceId, workspaceId),
          eq(schema.rawItems.status, 'new'),
        ),
      }),
      db.query.records.findMany({
        where: eq(schema.records.workspaceId, workspaceId),
        orderBy: desc(schema.records.createdAt),
        limit: 8,
      }),
      db.query.activityLog.findMany({
        where: eq(schema.activityLog.workspaceId, workspaceId),
        orderBy: desc(schema.activityLog.createdAt),
        limit: 200,
      }),
    ])

    // Type breakdown
    const typeCounts: Record<string, number> = {}
    for (const r of allRecords) {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1
    }

    // Link type breakdown
    const linkTypeCounts: Record<string, number> = {}
    for (const l of allLinks) {
      linkTypeCounts[l.kind] = (linkTypeCounts[l.kind] || 0) + 1
    }

    // Entity kind breakdown
    const entityKindCounts: Record<string, number> = {}
    for (const e of allEntities) {
      entityKindCounts[e.kind] = (entityKindCounts[e.kind] || 0) + 1
    }

    // Confidence distribution (buckets: 0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0)
    const confidenceBuckets = [0, 0, 0, 0, 0]
    for (const r of allRecords) {
      const c = r.confidence ?? 0.5
      const bucket = Math.min(Math.floor(c * 5), 4)
      confidenceBuckets[bucket]++
    }

    // Activity over last 7 days
    const now = new Date()
    const dailyActivity: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const count = allRecords.filter(r => r.createdAt.slice(0, 10) === dateStr).length
      dailyActivity.push({ date: dateStr, count })
    }

    // Monthly activity (last 6 months)
    const monthlyActivity: { month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('en-US', { month: 'short' })
      const count = allRecords.filter(r => r.createdAt.slice(0, 7) === monthStr).length
      monthlyActivity.push({ month: label, count })
    }

    // Top tags
    const tagCounts: Record<string, number> = {}
    for (const r of allRecords) {
      if (r.tags) {
        try {
          const tags = JSON.parse(r.tags) as string[]
          for (const t of tags) {
            tagCounts[t] = (tagCounts[t] || 0) + 1
          }
        } catch {}
      }
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }))

    return NextResponse.json({
      overview: {
        totalRecords: allRecords.length,
        totalProjects: allProjects.length,
        totalNodes: allEntities.length,
        totalConnections: allLinks.length,
        inboxItems: rawItemsNew.length,
      },
      typeCounts,
      linkTypeCounts,
      entityKindCounts,
      confidenceBuckets,
      dailyActivity,
      monthlyActivity,
      topTags,
      recentRecords: recentRecords.map(r => ({
        id: r.id,
        type: r.type,
        title: r.title,
        summary: r.summary,
        confidence: r.confidence,
        createdAt: r.createdAt,
      })),
      projects: allProjects.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
