import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { sql, eq, and, gte, inArray, desc } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/analytics/overview?orgId=...&days=30
// Admin-only. Aggregates for the admin analytics dashboard:
//   - totals: active members, memories, decisions, policies, queries
//   - mostViewedMemories
//   - topQueriedAgents (if we track)
//   - reachByDepartment (memories per dept)
//   - staleCount (records past their verify cadence)
//   - recentActivity (job queue health)

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '30'), 180)
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

    const auth = await requireOrgAuth(req, orgId, 'org.audit.read')
    if (isAuthResponse(auth)) return auth

    // ── Totals ──
    const activeMembers = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, orgId),
        eq(schema.organizationMembers.status, 'active'),
      ))

    const wsLinks = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const orgWsIds = wsLinks.map((l) => l.workspaceId)

    let memoryCount = 0
    let recentMemoryCount = 0
    if (orgWsIds.length > 0) {
      const total = await db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.records)
        .where(inArray(schema.records.workspaceId, orgWsIds))
      memoryCount = total[0]?.count ?? 0
      const recent = await db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.records)
        .where(and(
          inArray(schema.records.workspaceId, orgWsIds),
          gte(schema.records.createdAt, since),
        ))
      recentMemoryCount = recent[0]?.count ?? 0
    }

    const decisionCount = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.decisions)
      .where(eq(schema.decisions.organizationId, orgId))

    const policyCount = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.policies)
      .where(eq(schema.policies.organizationId, orgId))

    // Staleness — count records with a cadence whose last-verified is past due
    let staleCount = 0
    if (orgWsIds.length > 0) {
      const stale = await db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.records)
        .where(and(
          inArray(schema.records.workspaceId, orgWsIds),
          sql`records.verify_every_days IS NOT NULL`,
          sql`(records.last_verified_at IS NULL OR julianday('now') - julianday(records.last_verified_at) > records.verify_every_days)`,
        ))
      staleCount = stale[0]?.count ?? 0
    }

    // Most-viewed memories in the window
    const topViews = orgWsIds.length > 0
      ? await db.select({
          recordId: schema.recordViews.recordId,
          viewCount: sql<number>`cast(count(*) as integer)`,
        })
          .from(schema.recordViews)
          .where(gte(schema.recordViews.viewedAt, since))
          .groupBy(schema.recordViews.recordId)
          .orderBy(sql`count(*) desc`)
          .limit(10)
      : []

    let mostViewed: Array<{ id: string; title: string; type: string; viewCount: number }> = []
    if (topViews.length > 0) {
      const recs = await db.select()
        .from(schema.records)
        .where(and(
          inArray(schema.records.id, topViews.map((r) => r.recordId)),
          inArray(schema.records.workspaceId, orgWsIds),
        ))
      const byId = new Map(recs.map((r) => [r.id, r]))
      mostViewed = topViews
        .map((v) => {
          const r = byId.get(v.recordId)
          return r ? { id: r.id, title: r.title, type: r.type, viewCount: v.viewCount } : null
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
    }

    // Queries in the window — count audit log rows where action=query
    const recentQueries = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.auditLog)
      .where(and(
        eq(schema.auditLog.organizationId, orgId),
        eq(schema.auditLog.action, 'query'),
        gte(schema.auditLog.createdAt, since),
      ))

    // Reach by department — number of memories per dept (via workspace link)
    const deptRows = await db.select()
      .from(schema.departments)
      .where(eq(schema.departments.organizationId, orgId))

    const reachByDepartment: Array<{ deptId: string; name: string; recordCount: number }> = []
    for (const d of deptRows) {
      const dWs = wsLinks.filter((l: any) => (l as any).departmentId === d.id).map((l) => l.workspaceId)
      if (dWs.length === 0) {
        reachByDepartment.push({ deptId: d.id, name: d.name, recordCount: 0 })
        continue
      }
      const c = await db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.records)
        .where(inArray(schema.records.workspaceId, dWs))
      reachByDepartment.push({ deptId: d.id, name: d.name, recordCount: c[0]?.count ?? 0 })
    }
    reachByDepartment.sort((a, b) => b.recordCount - a.recordCount)

    // Memory mix — count by record type (decision/meeting/idea/insight/etc).
    // Powers the donut on the home dashboard. Capped at 8 buckets server-side.
    let memoriesByType: Array<{ type: string; count: number }> = []
    if (orgWsIds.length > 0) {
      const typeRows = await db.select({
        type: schema.records.type,
        count: sql<number>`cast(count(*) as integer)`,
      })
        .from(schema.records)
        .where(inArray(schema.records.workspaceId, orgWsIds))
        .groupBy(schema.records.type)
      memoriesByType = typeRows
        .map((r) => ({ type: r.type, count: r.count }))
        .sort((a, b) => b.count - a.count)
    }

    // Decision status mix — active / superseded / reversed / archived
    const decisionStatusRows = await db.select({
      status: schema.decisions.status,
      count: sql<number>`cast(count(*) as integer)`,
    })
      .from(schema.decisions)
      .where(eq(schema.decisions.organizationId, orgId))
      .groupBy(schema.decisions.status)
    const decisionsByStatus = decisionStatusRows.map((r) => ({ status: r.status, count: r.count }))

    return NextResponse.json({
      windowDays: days,
      totals: {
        activeMembers: activeMembers[0]?.count ?? 0,
        memories: memoryCount,
        recentMemories: recentMemoryCount,
        decisions: decisionCount[0]?.count ?? 0,
        policies: policyCount[0]?.count ?? 0,
        recentQueries: recentQueries[0]?.count ?? 0,
        staleMemories: staleCount,
      },
      mostViewed,
      reachByDepartment: reachByDepartment.slice(0, 10),
      memoriesByType,
      decisionsByStatus,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
