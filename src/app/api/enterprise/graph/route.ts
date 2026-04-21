import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  filterToAccessibleWorkspaces,
  handleEnterpriseError,
  buildAccessContext,
  filterToAccessibleRecords,
} from '@/lib/enterprise'

// GET /api/enterprise/graph
// Returns nodes (records) + edges (record_links) scoped to the user's access.
// Capped at 300 nodes for performance — UI can filter down further.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const typeFilter = req.nextUrl.searchParams.get('type')
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '300'), 500)

    // Accessible workspaces across all orgs
    const links = await db
      .select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
    const allWs = Array.from(new Set(links.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)
    if (accessibleWs.length === 0) return NextResponse.json({ nodes: [], edges: [] })

    // Records (most recent first)
    const candidates = await db
      .select()
      .from(schema.records)
      .where(and(
        inArray(schema.records.workspaceId, accessibleWs),
        typeFilter ? eq(schema.records.type, typeFilter as 'decision' | 'insight' | 'meeting' | 'idea' | 'context' | 'tasklike' | 'note' | 'transcript') : undefined,
      ))
      .orderBy(desc(schema.records.updatedAt))
      .limit(limit * 2)

    // Record-level RBAC filter
    const accessCtx = await buildAccessContext(userId)
    const allowedIds = await filterToAccessibleRecords(accessCtx, candidates.map((r) => r.id))
    const rows = candidates.filter((r) => allowedIds.has(r.id)).slice(0, limit)

    const recordIds = rows.map((r) => r.id)
    if (recordIds.length === 0) return NextResponse.json({ nodes: [], edges: [] })

    // Edges between records in the visible set ONLY
    const rawLinks = await db
      .select()
      .from(schema.recordLinks)
      .where(and(
        inArray(schema.recordLinks.fromRecordId, recordIds),
        inArray(schema.recordLinks.toRecordId, recordIds),
      ))
      .limit(1500)

    return NextResponse.json({
      nodes: rows.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        workspaceId: r.workspaceId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        tags: r.tags ? JSON.parse(r.tags) : [],
      })),
      edges: rawLinks.map((l) => ({
        id: l.id,
        from: l.fromRecordId,
        to: l.toRecordId,
        kind: l.kind,
        weight: l.weight,
      })),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
