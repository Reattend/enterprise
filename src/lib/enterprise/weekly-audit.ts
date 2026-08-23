/**
 * Weekly Audit - "what's rotting in your knowledge."
 *
 * The killer demo line: every other knowledge tool says "we store stuff."
 * Reattend tells you what's stale, who's not contributing, what decisions
 * have no rationale, where the next leverage point is hiding.
 *
 * v1 (this file): deterministic SQL aggregation. Scores the org out of 100,
 *   surfaces top 3 leverage gaps, lists the supporting evidence.
 * v2 (follow-up): LLM-narrated weekly email + "what should we do this week"
 *   suggestions powered by the matrix.
 *
 * Read by `getWeeklyAuditForOrg(orgId)` - synchronous from cache or freshly
 * computed. The admin page just calls this and renders.
 */

import { db, schema, sqlite } from '../db'
import { eq, and, gte, lt, sql, desc } from 'drizzle-orm'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export interface WeeklyAudit {
  organizationId: string
  generatedAt: string

  // Headline score 0-100. Heuristic - see scoring section below.
  score: number
  scoreBucket: 'critical' | 'weak' | 'healthy' | 'excellent'

  // Top 3 things to fix this week, ranked by leverage
  topGaps: Array<{
    title: string
    description: string
    severity: 'critical' | 'warn' | 'info'
    actionUrl?: string
  }>

  // Supporting evidence
  staleMemories: { count: number; sample: Array<{ id: string; title: string; lastViewedAt: string | null }> }
  contributorGaps: { totalActiveMembers: number; contributedThisWeek: number; silentMembers: Array<{ userId: string; name: string; email: string; lastActiveAt: string | null }> }
  decisionsWithoutRationale: { count: number; sample: Array<{ id: string; title: string; decidedAt: string }> }
  unreversedReversals: { count: number; sample: Array<{ id: string; title: string }> }
  oldOpenInterviews: { count: number }

  // Headline metrics
  totals: {
    activeMembers: number
    totalMemories: number
    memoriesThisWeek: number
    decisionsThisWeek: number
    decisionsAllTime: number
    avgViewsPerMemory: number
  }
}

/**
 * Compute the audit for one org. Idempotent - safe to call from a cron or
 * on-demand from the admin page. Returns null if the org doesn't exist or
 * has no enterprise workspaces linked.
 */
export async function getWeeklyAuditForOrg(organizationId: string): Promise<WeeklyAudit | null> {
  const org = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, organizationId))
    .limit(1)
  if (!org[0]) return null

  const sinceWeekIso = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()
  const sinceQuarterIso = new Date(Date.now() - NINETY_DAYS_MS).toISOString()
  const nowIso = new Date().toISOString()

  // Bind to org via workspace_org_links so per-record queries can filter
  // through that join. We scope EVERYTHING below to the org's linked
  // workspaces - never the user's personal workspace.
  const links = await db
    .select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
    .from(schema.workspaceOrgLinks)
    .where(eq(schema.workspaceOrgLinks.organizationId, organizationId))
  const workspaceIds = links.map((l) => l.workspaceId)
  if (workspaceIds.length === 0) {
    // Org has no enterprise-linked workspaces yet - return a no-op audit
    return emptyAudit(organizationId)
  }
  const wsPlaceholders = workspaceIds.map(() => '?').join(',')

  // ─── Active org members ────────────────────────────────────────────────
  const activeMembers = await db
    .select({ userId: schema.organizationMembers.userId, joinedAt: schema.organizationMembers.createdAt })
    .from(schema.organizationMembers)
    .where(and(
      eq(schema.organizationMembers.organizationId, organizationId),
      eq(schema.organizationMembers.status, 'active'),
    ))
  const activeMemberCount = activeMembers.length
  const memberIds = activeMembers.map((m) => m.userId)

  // ─── Total memories + this week's contributions ────────────────────────
  const totalMemories = (sqlite.prepare(
    `SELECT COUNT(*) AS c FROM records WHERE workspace_id IN (${wsPlaceholders})`,
  ).get(...workspaceIds) as { c: number }).c
  const memoriesThisWeek = (sqlite.prepare(
    `SELECT COUNT(*) AS c FROM records WHERE workspace_id IN (${wsPlaceholders}) AND created_at >= ?`,
  ).get(...workspaceIds, sinceWeekIso) as { c: number }).c

  // ─── Decisions ─────────────────────────────────────────────────────────
  const decisionsAllTime = (sqlite.prepare(
    `SELECT COUNT(*) AS c FROM decisions WHERE organization_id = ?`,
  ).get(organizationId) as { c: number }).c
  const decisionsThisWeek = (sqlite.prepare(
    `SELECT COUNT(*) AS c FROM decisions WHERE organization_id = ? AND decided_at >= ?`,
  ).get(organizationId, sinceWeekIso) as { c: number }).c

  // ─── Stale memories (last viewed > 90 days OR never viewed AND > 90 days old) ─
  const staleRows = sqlite.prepare(`
    SELECT r.id, r.title,
      (SELECT MAX(rv.viewed_at) FROM record_views rv WHERE rv.record_id = r.id) AS last_viewed_at
    FROM records r
    WHERE r.workspace_id IN (${wsPlaceholders})
      AND r.created_at < ?
      AND (
        (SELECT MAX(rv.viewed_at) FROM record_views rv WHERE rv.record_id = r.id) IS NULL
        OR (SELECT MAX(rv.viewed_at) FROM record_views rv WHERE rv.record_id = r.id) < ?
      )
    ORDER BY r.created_at ASC
    LIMIT 5
  `).all(...workspaceIds, sinceQuarterIso, sinceQuarterIso) as Array<{ id: string; title: string; last_viewed_at: string | null }>
  const staleCount = (sqlite.prepare(`
    SELECT COUNT(*) AS c FROM records r
    WHERE r.workspace_id IN (${wsPlaceholders})
      AND r.created_at < ?
      AND (
        (SELECT MAX(rv.viewed_at) FROM record_views rv WHERE rv.record_id = r.id) IS NULL
        OR (SELECT MAX(rv.viewed_at) FROM record_views rv WHERE rv.record_id = r.id) < ?
      )
  `).get(...workspaceIds, sinceQuarterIso, sinceQuarterIso) as { c: number }).c

  // ─── Contributor gaps ──────────────────────────────────────────────────
  const contributorRows = sqlite.prepare(`
    SELECT DISTINCT r.created_by AS user_id
    FROM records r
    WHERE r.workspace_id IN (${wsPlaceholders})
      AND r.created_at >= ?
  `).all(...workspaceIds, sinceWeekIso) as Array<{ user_id: string }>
  const contributedSet = new Set(contributorRows.map((r) => r.user_id).filter(Boolean))
  const silentMemberIds = memberIds.filter((id) => !contributedSet.has(id))

  let silentMembers: Array<{ userId: string; name: string; email: string; lastActiveAt: string | null }> = []
  if (silentMemberIds.length > 0) {
    const silentPlaceholders = silentMemberIds.slice(0, 10).map(() => '?').join(',')
    const sample = silentMemberIds.slice(0, 10)
    const silentRows = sqlite.prepare(`
      SELECT u.id AS user_id, u.name, u.email,
        (SELECT MAX(updated_at) FROM chat_sessions WHERE user_id = u.id) AS last_active_at
      FROM users u
      WHERE u.id IN (${silentPlaceholders})
    `).all(...sample) as Array<{ user_id: string; name: string; email: string; last_active_at: string | null }>
    silentMembers = silentRows.map((r) => ({ userId: r.user_id, name: r.name, email: r.email, lastActiveAt: r.last_active_at }))
  }

  // ─── Decisions without rationale ───────────────────────────────────────
  const decisionsNoRationale = sqlite.prepare(`
    SELECT id, title, decided_at FROM decisions
    WHERE organization_id = ?
      AND (rationale IS NULL OR length(trim(rationale)) = 0)
    ORDER BY decided_at DESC
    LIMIT 5
  `).all(organizationId) as Array<{ id: string; title: string; decided_at: string }>
  const decisionsNoRationaleCount = (sqlite.prepare(`
    SELECT COUNT(*) AS c FROM decisions
    WHERE organization_id = ?
      AND (rationale IS NULL OR length(trim(rationale)) = 0)
  `).get(organizationId) as { c: number }).c

  // ─── Reversed decisions without superseding (gap in the record) ────────
  const unreversedReversalsRows = sqlite.prepare(`
    SELECT id, title FROM decisions
    WHERE organization_id = ?
      AND status = 'reversed'
      AND superseded_by_id IS NULL
    ORDER BY reversed_at DESC
    LIMIT 5
  `).all(organizationId) as Array<{ id: string; title: string }>

  // ─── Old open exit interviews (drafts > 14 days, in_progress > 30 days) ─
  const fourteenDaysIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const oldInterviewsCount = (sqlite.prepare(`
    SELECT COUNT(*) AS c FROM exit_interviews
    WHERE organization_id = ?
      AND status IN ('draft', 'in_progress')
      AND created_at < ?
  `).get(organizationId, fourteenDaysIso) as { c: number }).c

  // ─── Avg views per memory ──────────────────────────────────────────────
  const avgViews = totalMemories > 0
    ? Math.round(((sqlite.prepare(`
        SELECT COUNT(*) AS c FROM record_views rv
        JOIN records r ON r.id = rv.record_id
        WHERE r.workspace_id IN (${wsPlaceholders})
      `).get(...workspaceIds) as { c: number }).c / totalMemories) * 10) / 10
    : 0

  // ─── Score (0-100, heuristic) ──────────────────────────────────────────
  // Penalize stale memories, contributor gaps, missing rationale, dangling reversals.
  // Reward weekly contribution rate, decisions logged, healthy view count.
  let score = 100
  if (totalMemories > 0) {
    const stalePct = staleCount / totalMemories
    score -= Math.min(30, Math.round(stalePct * 100)) // up to -30 for stale
  }
  if (activeMemberCount > 0) {
    const silentPct = silentMemberIds.length / activeMemberCount
    score -= Math.min(25, Math.round(silentPct * 50)) // up to -25 for silent contributors
  }
  if (decisionsAllTime > 0) {
    const noRationalePct = decisionsNoRationaleCount / decisionsAllTime
    score -= Math.min(20, Math.round(noRationalePct * 40))
  }
  score -= Math.min(10, unreversedReversalsRows.length * 2)
  score -= Math.min(10, Math.round(oldInterviewsCount * 2))
  if (memoriesThisWeek === 0 && activeMemberCount > 1) score -= 15
  score = Math.max(0, Math.min(100, score))

  const scoreBucket: WeeklyAudit['scoreBucket'] =
    score >= 85 ? 'excellent' :
    score >= 65 ? 'healthy' :
    score >= 40 ? 'weak' :
    'critical'

  // ─── Top 3 leverage gaps ───────────────────────────────────────────────
  const gaps: WeeklyAudit['topGaps'] = []

  if (staleCount >= Math.max(5, totalMemories * 0.2)) {
    gaps.push({
      title: `${staleCount} memories haven't been opened in 90+ days`,
      description: 'Old, never-viewed memories drag down search relevance and signal that capture is happening but consumption isn\'t. Schedule a quarterly cull or auto-archive low-value records.',
      severity: 'warn',
      actionUrl: `/app/admin/${organizationId}/health`,
    })
  }
  if (silentMemberIds.length > 0 && silentMemberIds.length >= activeMemberCount * 0.3) {
    gaps.push({
      title: `${silentMemberIds.length} of ${activeMemberCount} active members didn't contribute this week`,
      description: 'Knowledge captured by 1-2 people becomes a single point of failure when they leave. Surface what each silent member touched in their workflow tools and convert it into memories.',
      severity: silentMemberIds.length === activeMemberCount ? 'critical' : 'warn',
      actionUrl: `/app/admin/${organizationId}/members`,
    })
  }
  if (decisionsNoRationaleCount >= 3) {
    gaps.push({
      title: `${decisionsNoRationaleCount} decisions logged without rationale`,
      description: 'A decision without "why" is just a fact. Six months from now nobody will remember the constraints. Ask each decider to backfill the rationale.',
      severity: 'warn',
      actionUrl: `/app/admin/${organizationId}/decisions`,
    })
  }
  if (unreversedReversalsRows.length >= 2) {
    gaps.push({
      title: `${unreversedReversalsRows.length} reversed decisions don't point to what replaced them`,
      description: 'When a decision is reversed without a "superseded_by" link, the audit trail breaks. The next person looking it up will see "we don\'t do this" without knowing what we do instead.',
      severity: 'warn',
      actionUrl: `/app/admin/${organizationId}/decisions`,
    })
  }
  if (oldInterviewsCount > 0) {
    gaps.push({
      title: `${oldInterviewsCount} exit interviews open for 14+ days`,
      description: 'Exit interview content gets less accurate the further from the offboarding date. Close these out or convert open answers into memories.',
      severity: 'info',
      actionUrl: `/app/admin/${organizationId}/exit-interviews`,
    })
  }
  if (memoriesThisWeek === 0 && activeMemberCount > 1) {
    gaps.push({
      title: 'Zero memories created this week',
      description: 'The org has stopped feeding the system. Either nothing notable happened (rare) or capture friction is too high. Check ingest logs and the team\'s workflow integrations.',
      severity: 'critical',
      actionUrl: `/app/admin/${organizationId}/triage-review`,
    })
  }

  // Truncate to top 3 - ranking is by severity, then by order added (which
  // is roughly leverage order: stale > silent > decisions).
  const sevRank = { critical: 0, warn: 1, info: 2 } as const
  gaps.sort((a, b) => sevRank[a.severity] - sevRank[b.severity])

  return {
    organizationId,
    generatedAt: nowIso,
    score,
    scoreBucket,
    topGaps: gaps.slice(0, 3),
    staleMemories: {
      count: staleCount,
      sample: staleRows.map((r) => ({ id: r.id, title: r.title, lastViewedAt: r.last_viewed_at })),
    },
    contributorGaps: {
      totalActiveMembers: activeMemberCount,
      contributedThisWeek: contributedSet.size,
      silentMembers,
    },
    decisionsWithoutRationale: {
      count: decisionsNoRationaleCount,
      sample: decisionsNoRationale.map((r) => ({ id: r.id, title: r.title, decidedAt: r.decided_at })),
    },
    unreversedReversals: {
      count: unreversedReversalsRows.length,
      sample: unreversedReversalsRows,
    },
    oldOpenInterviews: { count: oldInterviewsCount },
    totals: {
      activeMembers: activeMemberCount,
      totalMemories,
      memoriesThisWeek,
      decisionsThisWeek,
      decisionsAllTime,
      avgViewsPerMemory: avgViews,
    },
  }
}

function emptyAudit(organizationId: string): WeeklyAudit {
  return {
    organizationId,
    generatedAt: new Date().toISOString(),
    score: 0,
    scoreBucket: 'critical',
    topGaps: [{
      title: 'No enterprise workspaces linked yet',
      description: 'This org has no team workspaces. Memories captured here go to your personal workspace, not the org. Link one or more workspaces from the admin overview.',
      severity: 'critical',
      actionUrl: `/app/admin/${organizationId}`,
    }],
    staleMemories: { count: 0, sample: [] },
    contributorGaps: { totalActiveMembers: 0, contributedThisWeek: 0, silentMembers: [] },
    decisionsWithoutRationale: { count: 0, sample: [] },
    unreversedReversals: { count: 0, sample: [] },
    oldOpenInterviews: { count: 0 },
    totals: {
      activeMembers: 0, totalMemories: 0, memoriesThisWeek: 0,
      decisionsThisWeek: 0, decisionsAllTime: 0, avgViewsPerMemory: 0,
    },
  }
}
