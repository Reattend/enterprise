import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray, gte, lte, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  filterToAccessibleWorkspaces,
  buildAccessContext,
  filterToAccessibleRecords,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/resurface?orgId=...
//
// "1 year ago today" for org memory. Returns records created on this calendar
// day (±1 day) N years ago, where N ∈ {1, 2, 3, 5}. The effect compounds
// across years — each new year adds a new "this day" cohort automatically.
//
// Only returns records the caller can actually read (RBAC). Skips anything
// older than the user's earliest access; falls back silently to empty if
// the org is too young.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const wsLinkRows = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const allWs = Array.from(new Set(wsLinkRows.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)
    if (accessibleWs.length === 0) return NextResponse.json({ groups: [] })

    const now = new Date()
    const yearsBack = [1, 2, 3, 5]
    const groups: Array<{
      yearsAgo: number
      label: string
      records: Array<{ id: string; title: string; type: string; summary: string | null; createdAt: string }>
    }> = []

    for (const n of yearsBack) {
      // Window: ±36 hours around the same calendar moment N years ago
      const target = new Date(now)
      target.setFullYear(now.getFullYear() - n)
      const windowStart = new Date(target.getTime() - 36 * 60 * 60 * 1000).toISOString()
      const windowEnd = new Date(target.getTime() + 36 * 60 * 60 * 1000).toISOString()

      const rows = await db.select({
        id: schema.records.id,
        title: schema.records.title,
        type: schema.records.type,
        summary: schema.records.summary,
        createdAt: schema.records.createdAt,
      }).from(schema.records)
        .where(and(
          inArray(schema.records.workspaceId, accessibleWs),
          gte(schema.records.createdAt, windowStart),
          lte(schema.records.createdAt, windowEnd),
        ))
        .orderBy(desc(schema.records.createdAt))
        .limit(20)

      if (rows.length === 0) continue

      const ctx = await buildAccessContext(userId)
      const allowed = await filterToAccessibleRecords(ctx, rows.map((r) => r.id))
      const visible = rows.filter((r) => allowed.has(r.id)).slice(0, 3)
      if (visible.length === 0) continue

      groups.push({
        yearsAgo: n,
        label: n === 1 ? '1 year ago' : `${n} years ago`,
        records: visible,
      })
    }

    return NextResponse.json({ groups })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
