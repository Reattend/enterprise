import { NextRequest, NextResponse } from 'next/server'
import { db, schema, searchFTS } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  filterToAccessibleWorkspaces,
  handleEnterpriseError,
  buildAccessContext,
  filterToAccessibleRecords,
} from '@/lib/enterprise'

// GET /api/enterprise/search?q=...&type=...&limit=50
// Hybrid FTS + (future) semantic search across every workspace the user can
// access. Returns ranked results with snippets, source, type, and date.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    const typeFilter = req.nextUrl.searchParams.get('type')
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 200)

    if (q.length < 2) return NextResponse.json({ results: [], total: 0 })

    // Build the user's accessible workspace set across all their orgs
    const memberships = await db
      .select({ organizationId: schema.organizationMembers.organizationId })
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.userId, userId),
        eq(schema.organizationMembers.status, 'active'),
      ))

    const allWs: string[] = []
    for (const m of memberships) {
      // listAccessibleWorkspaceIds needs org-scope; we combine via filter
      const links = await db
        .select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
        .from(schema.workspaceOrgLinks)
        .where(eq(schema.workspaceOrgLinks.organizationId, m.organizationId))
      for (const l of links) allWs.push(l.workspaceId)
    }
    const accessibleWs = await filterToAccessibleWorkspaces(userId, Array.from(new Set(allWs)))
    if (accessibleWs.length === 0) return NextResponse.json({ results: [], total: 0 })

    // FTS5 full-text ranking
    const ftsIds = searchFTS(q, accessibleWs, limit * 2)
    if (ftsIds.length === 0) return NextResponse.json({ results: [], total: 0 })

    const rows = await db
      .select()
      .from(schema.records)
      .where(and(
        inArray(schema.records.id, ftsIds),
        typeFilter ? eq(schema.records.type, typeFilter as 'decision' | 'insight' | 'meeting' | 'idea' | 'context' | 'tasklike' | 'note' | 'transcript') : undefined,
      ))

    // Record-level RBAC: even within accessible workspaces, some records are
    // private, some scoped to specific depts, some explicitly shared. Filter.
    const accessCtx = await buildAccessContext(userId)
    const allowedIds = await filterToAccessibleRecords(accessCtx, rows.map((r) => r.id))

    // Preserve FTS ranking order, but only keep records the user can actually see
    const rowById = new Map(rows.filter((r) => allowedIds.has(r.id)).map((r) => [r.id, r]))
    const ordered = ftsIds.map((id) => rowById.get(id)).filter((r): r is NonNullable<typeof rows[number]> => !!r)

    // Build a snippet for each result (first 200 chars around the match)
    const snippetFor = (content: string | null, summary: string | null) => {
      const source = content || summary || ''
      const idx = source.toLowerCase().indexOf(q.toLowerCase())
      if (idx < 0) return source.slice(0, 220)
      const start = Math.max(0, idx - 60)
      return (start > 0 ? '…' : '') + source.slice(start, start + 220).trim() + (source.length > start + 220 ? '…' : '')
    }

    // Look up workspace + dept for each result for display
    const wsIds = Array.from(new Set(ordered.map((r) => r.workspaceId)))
    const links = wsIds.length
      ? await db
          .select()
          .from(schema.workspaceOrgLinks)
          .where(inArray(schema.workspaceOrgLinks.workspaceId, wsIds))
      : []
    const deptIds = Array.from(new Set(links.map((l) => l.departmentId).filter((x): x is string => !!x)))
    const depts = deptIds.length
      ? await db.select().from(schema.departments).where(inArray(schema.departments.id, deptIds))
      : []
    const deptById = new Map(depts.map((d) => [d.id, d]))
    const linkByWs = new Map(links.map((l) => [l.workspaceId, l]))

    const results = ordered.slice(0, limit).map((r) => {
      const link = linkByWs.get(r.workspaceId)
      const dept = link?.departmentId ? deptById.get(link.departmentId) : null
      return {
        id: r.id,
        type: r.type,
        title: r.title,
        snippet: snippetFor(r.content, r.summary),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        source: r.source || 'manual',
        tags: r.tags ? JSON.parse(r.tags) : [],
        workspaceId: r.workspaceId,
        departmentName: dept?.name ?? null,
        departmentKind: dept?.kind ?? null,
      }
    })

    return NextResponse.json({ results, total: results.length, query: q })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}