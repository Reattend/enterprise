import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { sql, eq, and, gte, inArray } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/analytics/home?orgId=...
// Lightweight at-a-glance aggregates for the home dashboard. Distinct from
// /analytics/overview which is admin-only and audit-rich; this one is gated
// on org.read so every active member can see their org's high-level stats:
//   totals (members, memories, decisions, policies, stale, recent ingestion)
//   memoriesByType — for the donut
//   decisionsByStatus — for the status bar
//   reachByDepartment — top 6 departments by record count
//   activityLast7Days — bar series of records ingested per day for the last week

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

    // Workspaces in this org
    const wsLinks = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId, departmentId: schema.workspaceOrgLinks.departmentId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const orgWsIds = wsLinks.map((l) => l.workspaceId)

    // Totals
    const activeMembers = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, orgId),
        eq(schema.organizationMembers.status, 'active'),
      ))

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
          gte(schema.records.createdAt, since30),
        ))
      recentMemoryCount = recent[0]?.count ?? 0
    }

    const decisionCount = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.decisions)
      .where(eq(schema.decisions.organizationId, orgId))

    const policyCount = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.policies)
      .where(eq(schema.policies.organizationId, orgId))

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

    // Memory mix (donut)
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

    // Decision status mix
    const decisionStatusRows = await db.select({
      status: schema.decisions.status,
      count: sql<number>`cast(count(*) as integer)`,
    })
      .from(schema.decisions)
      .where(eq(schema.decisions.organizationId, orgId))
      .groupBy(schema.decisions.status)
    const decisionsByStatus = decisionStatusRows.map((r) => ({ status: r.status, count: r.count }))

    // Reach by department — only the 6 most-active for compact rendering
    const deptRows = await db.select()
      .from(schema.departments)
      .where(eq(schema.departments.organizationId, orgId))
    const reachByDepartment: Array<{ deptId: string; name: string; recordCount: number }> = []
    for (const d of deptRows) {
      const dWs = wsLinks.filter((l) => l.departmentId === d.id).map((l) => l.workspaceId)
      if (dWs.length === 0) continue
      const c = await db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.records)
        .where(inArray(schema.records.workspaceId, dWs))
      const recordCount = c[0]?.count ?? 0
      if (recordCount > 0) reachByDepartment.push({ deptId: d.id, name: d.name, recordCount })
    }
    reachByDepartment.sort((a, b) => b.recordCount - a.recordCount)

    // Activity bars — records created per day for the last 7 days
    const activityLast7Days: Array<{ date: string; count: number }> = []
    if (orgWsIds.length > 0) {
      const dayRows = await db.select({
        day: sql<string>`substr(records.created_at, 1, 10)`,
        count: sql<number>`cast(count(*) as integer)`,
      })
        .from(schema.records)
        .where(and(
          inArray(schema.records.workspaceId, orgWsIds),
          gte(schema.records.createdAt, new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()),
        ))
        .groupBy(sql`substr(records.created_at, 1, 10)`)
      const counts = new Map(dayRows.map((r) => [r.day, r.count]))
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10)
        activityLast7Days.push({ date: d, count: counts.get(d) ?? 0 })
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10)
        activityLast7Days.push({ date: d, count: 0 })
      }
    }

    return NextResponse.json({
      totals: {
        activeMembers: activeMembers[0]?.count ?? 0,
        memories: memoryCount,
        recentMemories: recentMemoryCount,
        decisions: decisionCount[0]?.count ?? 0,
        policies: policyCount[0]?.count ?? 0,
        staleMemories: staleCount,
      },
      memoriesByType,
      decisionsByStatus,
      reachByDepartment: reachByDepartment.slice(0, 6),
      activityLast7Days,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
