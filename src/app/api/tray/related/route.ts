import { NextRequest, NextResponse } from 'next/server'
import { db, schema, searchFTS } from '@/lib/db'
import { eq, and, inArray, like, or } from 'drizzle-orm'
import { validateApiToken } from '@/lib/auth/token'
import {
  buildAccessContext,
  filterToAccessibleRecords,
  filterToAccessibleWorkspaces,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// POST /api/tray/related
// Body: { url?: string, title?: string, excerpt?: string, limit?: number }
//
// The Chrome extension's ambient-surface query. Given what the user is
// looking at in the browser, return up to N memories that reference this
// URL, mention this title, or share strong topical overlap. All RBAC-
// filtered — no leaks.
//
// Ranking:
//   1. Exact URL matches (record.content LIKE '%<url>%' OR record.meta has url)
//   2. Title-derived keyword matches via FTS
//   3. Cap at `limit` (default 3, max 10)

interface RelatedItem {
  id: string
  title: string
  type: string
  summary: string | null
  snippet: string | null
  match: 'url' | 'title' | 'keyword'
  createdAt: string
}

export async function POST(req: NextRequest) {
  const auth = await validateApiToken(req.headers.get('authorization'))
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim().slice(0, 800) : ''
  const limit = Math.max(1, Math.min(parseInt(String(body.limit || '3')), 10))

  if (!url && !title) {
    return NextResponse.json({ items: [] })
  }

  // Which workspaces can this user see?
  const orgMemberships = await db.select()
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.userId, auth.userId))

  const allOrgWs: string[] = []
  for (const m of orgMemberships) {
    const links = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, m.organizationId))
    for (const l of links) allOrgWs.push(l.workspaceId)
  }
  // Also fold in the personal workspace linked to the token
  if (auth.workspaceId) allOrgWs.push(auth.workspaceId)

  const accessibleWs = await filterToAccessibleWorkspaces(auth.userId, Array.from(new Set(allOrgWs)))
  if (accessibleWs.length === 0) return NextResponse.json({ items: [] })

  const accessCtx = await buildAccessContext(auth.userId)

  // ── Stage 1: URL match ─────────────────────────────────
  let urlMatches: (typeof schema.records.$inferSelect)[] = []
  if (url) {
    // Match records that mention the URL in content OR in meta (link captures)
    const likeParam = `%${url}%`
    urlMatches = await db.select()
      .from(schema.records)
      .where(and(
        inArray(schema.records.workspaceId, accessibleWs),
        or(
          like(schema.records.content, likeParam),
          like(schema.records.meta, likeParam),
        ),
      ))
      .limit(limit * 2)
  }

  // ── Stage 2: Title-driven FTS ──────────────────────────
  let ftsMatches: (typeof schema.records.$inferSelect)[] = []
  if (title || excerpt) {
    // Use title first, fall back to excerpt. Strip URL chars + stop-wordy bits.
    const query = (title + ' ' + excerpt).replace(/https?:\/\/\S+/g, '').trim()
    if (query.length >= 3) {
      const ids = searchFTS(query, accessibleWs, limit * 4)
      if (ids.length > 0) {
        const rows = await db.select().from(schema.records).where(inArray(schema.records.id, ids))
        const rank = new Map(ids.map((id, i) => [id, i]))
        ftsMatches = rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
      }
    }
  }

  // ── Merge + RBAC + dedupe ─────────────────────────────
  const seen = new Set<string>()
  const combined: Array<{ rec: typeof schema.records.$inferSelect; match: RelatedItem['match'] }> = []
  for (const r of urlMatches) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    combined.push({ rec: r, match: 'url' })
  }
  for (const r of ftsMatches) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    const titleLower = title.toLowerCase()
    const matchType: RelatedItem['match'] =
      titleLower && r.title.toLowerCase().includes(titleLower.slice(0, 40)) ? 'title' : 'keyword'
    combined.push({ rec: r, match: matchType })
  }

  const allowed = await filterToAccessibleRecords(accessCtx, combined.map((c) => c.rec.id))
  const items: RelatedItem[] = combined
    .filter((c) => allowed.has(c.rec.id))
    .slice(0, limit)
    .map(({ rec, match }) => ({
      id: rec.id,
      title: rec.title,
      type: rec.type,
      summary: rec.summary,
      snippet: snippetFor(rec.content, rec.summary, title || excerpt),
      match,
      createdAt: rec.createdAt,
    }))

  return NextResponse.json({ items })
}

function snippetFor(content: string | null, summary: string | null, needle: string): string | null {
  const src = content || summary || ''
  if (!src) return null
  const n = needle.trim().toLowerCase()
  if (n.length < 3) return src.slice(0, 160)
  const idx = src.toLowerCase().indexOf(n.split(/\s+/)[0] || n)
  if (idx < 0) return src.slice(0, 160)
  const start = Math.max(0, idx - 50)
  return (start > 0 ? '…' : '') + src.slice(start, start + 180).trim() + (start + 180 < src.length ? '…' : '')
}
