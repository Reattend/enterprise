import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray, desc, lte, isNull, or, count, like } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  filterToAccessibleWorkspaces,
  buildAccessContext,
  filterToAccessibleRecords,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/timeline
// ?orgId=...                          (required)
// &at=<ISO>                           (required — the instant to compute state at)
// &anchor=all|topic|person|dept       (optional, default 'all')
// &value=<tag/name|userId|deptId>     (required if anchor != 'all')
//
// Returns the org's state as of that instant:
//   - counts: records existing, active decisions, policies published, etc.
//   - monthlyCounts: [{ month, records }] for the last 24 months up to `at`
//   - topRecords: 8 most-recently-updated records that existed at `at`
//   - activeDecisions: 6 decisions that were active (not reversed/superseded) at `at`
//   - headline: one-sentence synthesis (future: Claude-generated)
//
// Why this exists: this is the "Time Machine" — scrub a slider and see what
// the org looked like then. The computation is strictly historical — a
// decision superseded last week but live at `at=3-months-ago` shows as active.

interface TimelineState {
  at: string
  anchor: string
  value: string | null
  counts: {
    recordsExisting: number
    activeDecisions: number
    reversedByThen: number
    supersededByThen: number
    publishedPolicies: number
  }
  monthlyCounts: Array<{ month: string; records: number }>
  topRecords: Array<{ id: string; title: string; type: string; summary: string | null; createdAt: string }>
  activeDecisions: Array<{ id: string; title: string; decidedAt: string; decidedByUserId: string | null }>
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    const atParam = req.nextUrl.searchParams.get('at')
    const anchor = (req.nextUrl.searchParams.get('anchor') || 'all') as 'all' | 'topic' | 'person' | 'dept'
    const value = req.nextUrl.searchParams.get('value') || null

    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const at = atParam ? new Date(atParam) : new Date()
    if (isNaN(at.getTime())) return NextResponse.json({ error: 'invalid at' }, { status: 400 })
    const atIso = at.toISOString()

    // ── Workspaces the user can see, in this org ──────────
    const wsLinkRows = await db.select().from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const allWs = Array.from(new Set(wsLinkRows.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)
    if (accessibleWs.length === 0) {
      return NextResponse.json(emptyState(atIso, anchor, value))
    }

    // If the anchor is a dept, narrow the workspaces further
    let scopeWs = accessibleWs
    if (anchor === 'dept' && value) {
      const linkedToDept = wsLinkRows.filter((l) => l.departmentId === value).map((l) => l.workspaceId)
      scopeWs = accessibleWs.filter((id) => linkedToDept.includes(id))
      if (scopeWs.length === 0) return NextResponse.json(emptyState(atIso, anchor, value))
    }

    // ── Base record filter: records that EXISTED at `at` ──
    const baseRecordConds = [
      inArray(schema.records.workspaceId, scopeWs),
      lte(schema.records.createdAt, atIso),
    ]

    // Anchor-specific narrowing
    if (anchor === 'topic' && value) {
      // Topic: match tags array containing the value OR title/content substring.
      // Cheap implementation: LIKE on tags + title.
      const v = value.toLowerCase()
      baseRecordConds.push(or(
        like(schema.records.tags, `%${v}%`),
        like(schema.records.title, `%${v}%`),
      )!)
    } else if (anchor === 'person' && value) {
      baseRecordConds.push(eq(schema.records.createdBy, value))
    }

    // ── Count records existing ─────────────────────────────
    const existingRows = await db.select({
      id: schema.records.id,
      title: schema.records.title,
      type: schema.records.type,
      summary: schema.records.summary,
      createdAt: schema.records.createdAt,
    }).from(schema.records).where(and(...baseRecordConds))
      .orderBy(desc(schema.records.createdAt))
      .limit(500)

    // RBAC pass
    const ctx = await buildAccessContext(userId)
    const allowed = await filterToAccessibleRecords(ctx, existingRows.map((r) => r.id))
    const visible = existingRows.filter((r) => allowed.has(r.id))

    // ── Monthly counts for the sparkline (24 months up to `at`) ────
    const monthlyCounts = buildMonthlyCounts(visible, at, 24)

    // ── Active decisions at `at` ───────────────────────────
    // Active = decidedAt <= at AND (reversedAt is null or reversedAt > at) AND
    // not superseded by a decision that was already active at `at`.
    const allDecisions = await db.select().from(schema.decisions)
      .where(and(
        eq(schema.decisions.organizationId, orgId),
        lte(schema.decisions.decidedAt, atIso),
      ))
    const decisionById = new Map(allDecisions.map((d) => [d.id, d]))

    const wasActiveAt = (d: typeof allDecisions[number]): boolean => {
      // Reversed before `at`?
      if (d.reversedAt && d.reversedAt <= atIso) return false
      // Superseded by a decision that was already active at `at`?
      if (d.supersededById) {
        const s = decisionById.get(d.supersededById)
        if (s && s.decidedAt <= atIso) return false
      }
      return true
    }

    let relevantDecisions = allDecisions
    if (anchor === 'dept' && value) {
      relevantDecisions = relevantDecisions.filter((d) => d.departmentId === value)
    } else if (anchor === 'person' && value) {
      relevantDecisions = relevantDecisions.filter((d) => d.decidedByUserId === value)
    } else if (anchor === 'topic' && value) {
      const v = value.toLowerCase()
      relevantDecisions = relevantDecisions.filter((d) =>
        (d.title || '').toLowerCase().includes(v) ||
        (d.tags || '').toLowerCase().includes(v),
      )
    }

    const activeDecisions = relevantDecisions.filter(wasActiveAt)
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
      .slice(0, 6)
      .map((d) => ({
        id: d.id, title: d.title, decidedAt: d.decidedAt, decidedByUserId: d.decidedByUserId,
      }))

    const reversedByThen = relevantDecisions.filter((d) => d.reversedAt && d.reversedAt <= atIso).length
    const supersededByThen = relevantDecisions.filter((d) => {
      if (!d.supersededById) return false
      const s = decisionById.get(d.supersededById)
      return !!(s && s.decidedAt <= atIso)
    }).length

    // ── Published policies as of `at` ─────────────────────
    const [polCount] = await db.select({ value: count() }).from(schema.policies)
      .where(and(
        eq(schema.policies.organizationId, orgId),
        eq(schema.policies.status, 'published'),
        // effectiveDate null = always-on at publish time; count if effectiveDate <= at OR null
        or(
          isNull(schema.policies.effectiveDate),
          lte(schema.policies.effectiveDate, atIso),
        ),
        lte(schema.policies.createdAt, atIso),
      ))

    return NextResponse.json({
      at: atIso,
      anchor,
      value,
      counts: {
        recordsExisting: visible.length,
        activeDecisions: activeDecisions.length,
        reversedByThen,
        supersededByThen,
        publishedPolicies: Number(polCount.value ?? 0),
      },
      monthlyCounts,
      topRecords: visible.slice(0, 8).map((r) => ({
        id: r.id, title: r.title, type: r.type, summary: r.summary, createdAt: r.createdAt,
      })),
      activeDecisions,
    } as TimelineState)
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

function emptyState(at: string, anchor: string, value: string | null): TimelineState {
  return {
    at, anchor, value,
    counts: { recordsExisting: 0, activeDecisions: 0, reversedByThen: 0, supersededByThen: 0, publishedPolicies: 0 },
    monthlyCounts: [],
    topRecords: [],
    activeDecisions: [],
  }
}

function buildMonthlyCounts(records: { createdAt: string }[], at: Date, months: number) {
  const out: Array<{ month: string; records: number }> = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(at.getFullYear(), at.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const startIso = d.toISOString()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
    const count = records.filter((r) => r.createdAt >= startIso && r.createdAt < end).length
    out.push({ month: monthKey, records: count })
  }
  return out
}

