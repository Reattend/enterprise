/**
 * Hot Cache - per-org "what's actively hot this week" digest.
 *
 * Inspired by Karpathy's `_hot.md` pattern: a small (~500-token) markdown
 * blurb pinned at the top of every Ask query so the model has top-of-mind
 * grounding without burning RAG tokens on known-hot context.
 *
 * v1 (this file): deterministic generator that pulls last-7-days activity
 *   - top decisions
 *   - top contributors
 *   - top entities
 *   - open thread count
 *   - recently-verified records
 * v2 (follow-up): LLM-synthesized via Llama for narrative quality
 * v3 (follow-up): per-user and per-dept variants
 *
 * Read by `getHotCacheForOrg()` (cheap: single indexed lookup).
 * Written by `regenerateHotCache()` (~few queries; intended for hourly cron).
 */

import { db, schema, sqlite } from '../db'
import { eq, and, gte, sql, desc } from 'drizzle-orm'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const HOT_CACHE_MAX_CHARS = 2400 // ~600 tokens; we keep some headroom under the 500 target

/**
 * Cheap read used by the Ask path. Returns the markdown content if a fresh
 * cache exists for this org, or null if no cache yet (worker hasn't run, or
 * the org is brand new). Always non-throwing - if anything goes sideways,
 * Ask should still work without the hot cache.
 */
export async function getHotCacheForOrg(organizationId: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ content: schema.hotCache.content })
      .from(schema.hotCache)
      .where(and(
        eq(schema.hotCache.organizationId, organizationId),
        eq(schema.hotCache.scope, 'org'),
      ))
      .limit(1)
    return rows[0]?.content ?? null
  } catch (e) {
    console.warn('[hot-cache] read failed:', (e as Error).message)
    return null
  }
}

/**
 * Build + upsert the org-wide hot cache. Deterministic SQL aggregation -
 * no LLM call, so cheap to run hourly. Returns the new content for testing.
 */
export async function regenerateHotCache(organizationId: string): Promise<string> {
  const sinceIso = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()
  const sections: string[] = []
  let recordCount = 0

  // ─── Section 1: top decisions in last 7 days ───────────────────────────
  const recentDecisions = await db
    .select({
      title: schema.decisions.title,
      status: schema.decisions.status,
      decidedAt: schema.decisions.decidedAt,
      decidedBy: schema.users.name,
      rationale: schema.decisions.rationale,
    })
    .from(schema.decisions)
    .leftJoin(schema.users, eq(schema.users.id, schema.decisions.decidedByUserId))
    .where(and(
      eq(schema.decisions.organizationId, organizationId),
      gte(schema.decisions.decidedAt, sinceIso),
    ))
    .orderBy(desc(schema.decisions.decidedAt))
    .limit(5)

  if (recentDecisions.length > 0) {
    sections.push('## Recent decisions (last 7 days)')
    for (const d of recentDecisions) {
      const statusTag = d.status === 'reversed' ? ' [REVERSED]'
        : d.status === 'superseded' ? ' [SUPERSEDED]'
        : ''
      const who = d.decidedBy ? ` (by ${d.decidedBy})` : ''
      const reason = d.rationale ? ` - ${d.rationale.slice(0, 120).replace(/\s+/g, ' ').trim()}` : ''
      sections.push(`- **${d.title}**${statusTag}${who}${reason}`)
    }
  }

  // ─── Section 2: top contributors ───────────────────────────────────────
  // Who's been writing memories this week? Surface top 5 so the AI can
  // attribute "X has been heavily contributing to Y" without re-counting.
  const contribRows = sqlite.prepare(`
    SELECT u.name, COUNT(DISTINCT r.id) AS cnt
    FROM records r
    JOIN workspace_org_links l ON l.workspace_id = r.workspace_id
    JOIN users u ON u.id = r.created_by
    WHERE l.organization_id = ?
      AND r.created_at >= ?
    GROUP BY u.id, u.name
    ORDER BY cnt DESC
    LIMIT 5
  `).all(organizationId, sinceIso) as Array<{ name: string; cnt: number }>

  if (contribRows.length > 0) {
    sections.push('\n## Active contributors this week')
    for (const c of contribRows) {
      sections.push(`- ${c.name}: ${c.cnt} memor${c.cnt === 1 ? 'y' : 'ies'}`)
      recordCount += c.cnt
    }
  }

  // ─── Section 3: top entities mentioned ─────────────────────────────────
  const entityRows = sqlite.prepare(`
    SELECT e.name, e.kind, COUNT(re.record_id) AS cnt
    FROM entities e
    JOIN record_entities re ON re.entity_id = e.id
    JOIN records r ON r.id = re.record_id
    JOIN workspace_org_links l ON l.workspace_id = r.workspace_id
    WHERE l.organization_id = ?
      AND r.created_at >= ?
    GROUP BY e.id, e.name, e.kind
    ORDER BY cnt DESC
    LIMIT 8
  `).all(organizationId, sinceIso) as Array<{ name: string; kind: string; cnt: number }>

  if (entityRows.length > 0) {
    sections.push('\n## Top entities mentioned this week')
    for (const e of entityRows) {
      sections.push(`- **${e.name}** (${e.kind}) - ${e.cnt} mention${e.cnt === 1 ? '' : 's'}`)
    }
  }

  // ─── Section 4: recently verified records ──────────────────────────────
  // What's been freshly trusted? The AI can lean on these as more reliable.
  const verifiedRows = sqlite.prepare(`
    SELECT r.title, r.last_verified_at, u.name AS verified_by
    FROM records r
    JOIN workspace_org_links l ON l.workspace_id = r.workspace_id
    LEFT JOIN users u ON u.id = r.verified_by_user_id
    WHERE l.organization_id = ?
      AND r.last_verified_at IS NOT NULL
      AND r.last_verified_at >= ?
    ORDER BY r.last_verified_at DESC
    LIMIT 5
  `).all(organizationId, sinceIso) as Array<{ title: string; last_verified_at: string; verified_by: string | null }>

  if (verifiedRows.length > 0) {
    sections.push('\n## Recently verified (high-trust)')
    for (const v of verifiedRows) {
      const who = v.verified_by ? ` - verified by ${v.verified_by}` : ''
      sections.push(`- ${v.title}${who}`)
    }
  }

  // ─── Section 5: open threads (recent ask sessions without resolution) ──
  const openThreadRows = sqlite.prepare(`
    SELECT cs.title, cs.updated_at
    FROM chat_sessions cs
    JOIN workspace_org_links l ON l.workspace_id = cs.workspace_id
    WHERE l.organization_id = ?
      AND cs.updated_at >= ?
    ORDER BY cs.updated_at DESC
    LIMIT 5
  `).all(organizationId, sinceIso) as Array<{ title: string; updated_at: string }>

  if (openThreadRows.length > 0) {
    sections.push('\n## Recent question threads')
    for (const t of openThreadRows) {
      sections.push(`- ${t.title || 'untitled thread'}`)
    }
  }

  // ─── Compose + truncate ────────────────────────────────────────────────
  let content = sections.join('\n').trim()
  if (!content) {
    content = '_No recent activity in this org yet - Hot Cache will populate as memories, decisions, and threads accumulate._'
  }
  if (content.length > HOT_CACHE_MAX_CHARS) {
    content = content.slice(0, HOT_CACHE_MAX_CHARS) + '\n_(truncated)_'
  }

  // ─── Upsert ────────────────────────────────────────────────────────────
  // SQLite has no convenient ON CONFLICT for our index, so delete-then-insert.
  await db
    .delete(schema.hotCache)
    .where(and(
      eq(schema.hotCache.organizationId, organizationId),
      eq(schema.hotCache.scope, 'org'),
      sql`scope_id IS NULL`,
    ))

  await db.insert(schema.hotCache).values({
    organizationId,
    scope: 'org',
    scopeId: null,
    content,
    generatedFromRecordCount: recordCount,
    source: 'deterministic',
  })

  return content
}

/**
 * Regenerate hot cache for every active org. Called by the hourly worker
 * cron in src/lib/jobs/worker.ts. Failures on individual orgs don't stop
 * the whole sweep - bad orgs get logged and skipped.
 */
export async function regenerateAllHotCaches(): Promise<{ ok: number; failed: number }> {
  const orgs = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.status, 'active'))

  let ok = 0
  let failed = 0
  for (const org of orgs) {
    try {
      await regenerateHotCache(org.id)
      ok++
    } catch (e) {
      console.warn(`[hot-cache] regenerate failed for org ${org.id}:`, (e as Error).message)
      failed++
    }
  }
  console.log(`[hot-cache] sweep complete: ${ok} ok, ${failed} failed`)
  return { ok, failed }
}
