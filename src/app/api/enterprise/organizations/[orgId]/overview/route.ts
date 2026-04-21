import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray, gte, isNull, desc } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { getLatestHealth } from '@/lib/enterprise/self-healing'

interface OverviewDept {
  id: string
  name: string
  kind: string
  recordCount: number
  decisionCount: number
  memberCount: number
}

interface TurnoverImpact {
  userId: string
  name: string
  email: string
  offboardedAt: string
  recordsAuthored: number
  decisionsAuthored: number
  rolesVacatedCount: number
}

interface PendingHandover {
  roleId: string
  roleTitle: string
  departmentName: string | null
  ownedRecordsCount: number
  vacantSinceIso: string | null
}

interface WeeklyBucket {
  weekStart: string // ISO start of week
  decisions: number
  reversed: number
  records: number
}

function startOfIsoWeek(d: Date): Date {
  const n = new Date(d)
  n.setUTCHours(0, 0, 0, 0)
  const day = n.getUTCDay() || 7
  if (day !== 1) n.setUTCDate(n.getUTCDate() - (day - 1))
  return n
}

// GET /api/enterprise/organizations/[orgId]/overview
// Aggregates every signal the memory-health cockpit renders.
// Heavy query — we cache nothing yet. At enterprise scale we'll memoize or
// precompute via a job. For now, all in one pass.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const now = new Date()
    const monthAgoIso = new Date(now.getTime() - 30 * 86400_000).toISOString()
    const weeksBackIso = new Date(now.getTime() - 12 * 7 * 86400_000).toISOString()

    // ── Workspaces linked to this org ────────────────────────────────────────
    const wsLinks = await db
      .select()
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const workspaceIds = wsLinks.map((l) => l.workspaceId)
    const wsToDept = new Map(wsLinks.map((l) => [l.workspaceId, l.departmentId] as const))

    // ── Members ──────────────────────────────────────────────────────────────
    const allMembers = await db
      .select()
      .from(schema.organizationMembers)
      .where(eq(schema.organizationMembers.organizationId, orgId))
    const activeMembers = allMembers.filter((m) => m.status === 'active').length
    const offboardedMembers = allMembers.filter((m) => m.status === 'offboarded')

    // ── Records ──────────────────────────────────────────────────────────────
    const allRecords = workspaceIds.length > 0
      ? await db.select().from(schema.records).where(inArray(schema.records.workspaceId, workspaceIds))
      : []
    const totalRecords = allRecords.length
    const recordsLast30d = allRecords.filter((r) => r.createdAt > monthAgoIso).length

    const recordsByDept = new Map<string | null, number>()
    for (const r of allRecords) {
      const d = wsToDept.get(r.workspaceId) ?? null
      recordsByDept.set(d, (recordsByDept.get(d) ?? 0) + 1)
    }

    // ── Decisions ────────────────────────────────────────────────────────────
    const allDecisions = await db
      .select()
      .from(schema.decisions)
      .where(eq(schema.decisions.organizationId, orgId))
    const decisionsThisMonth = allDecisions.filter((d) => d.decidedAt > monthAgoIso).length
    const reversedEver = allDecisions.filter((d) => d.status === 'reversed' || d.status === 'superseded').length
    const reversedRate = allDecisions.length > 0 ? reversedEver / allDecisions.length : 0

    const decisionsByDept = new Map<string | null, number>()
    for (const d of allDecisions) {
      decisionsByDept.set(d.departmentId ?? null, (decisionsByDept.get(d.departmentId ?? null) ?? 0) + 1)
    }

    // ── Departments ──────────────────────────────────────────────────────────
    const allDepts = await db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.organizationId, orgId))

    const deptMembers = await db
      .select({ departmentId: schema.departmentMembers.departmentId })
      .from(schema.departmentMembers)
      .where(eq(schema.departmentMembers.organizationId, orgId))
    const membersByDept = new Map<string, number>()
    for (const m of deptMembers) {
      membersByDept.set(m.departmentId, (membersByDept.get(m.departmentId) ?? 0) + 1)
    }

    const enrichedDepts: OverviewDept[] = allDepts.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      recordCount: recordsByDept.get(d.id) ?? 0,
      decisionCount: decisionsByDept.get(d.id) ?? 0,
      memberCount: membersByDept.get(d.id) ?? 0,
    }))

    // ── Sources (ingestion pipes) ────────────────────────────────────────────
    const allSources = workspaceIds.length > 0
      ? await db.select().from(schema.sources).where(inArray(schema.sources.workspaceId, workspaceIds))
      : []
    const silentCutoffIso = new Date(now.getTime() - 14 * 86400_000).toISOString()
    const recentRawBySource = workspaceIds.length > 0
      ? await db
          .select({ sourceId: schema.rawItems.sourceId })
          .from(schema.rawItems)
          .where(and(
            inArray(schema.rawItems.workspaceId, workspaceIds),
            gte(schema.rawItems.createdAt, silentCutoffIso),
          ))
      : []
    const activeSources = new Set(recentRawBySource.map((r) => r.sourceId).filter((x): x is string => !!x))
    const sourcesTotal = allSources.length
    const sourcesActive = allSources.filter((s) => activeSources.has(s.id)).length

    // ── Turnover impact (recent offboardings) ────────────────────────────────
    const recentOffboarded = offboardedMembers
      .filter((m) => m.offboardedAt)
      .sort((a, b) => (b.offboardedAt ?? '').localeCompare(a.offboardedAt ?? ''))
      .slice(0, 5)

    const turnoverImpacts: TurnoverImpact[] = []
    if (recentOffboarded.length > 0) {
      const userIds = recentOffboarded.map((m) => m.userId)
      const userRows = await db
        .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
        .from(schema.users)
        .where(inArray(schema.users.id, userIds))
      const userById = new Map(userRows.map((u) => [u.id, u]))

      // Records authored — we approximate via createdBy on records
      const recordsByUser = new Map<string, number>()
      for (const r of allRecords) {
        if (userIds.includes(r.createdBy)) {
          recordsByUser.set(r.createdBy, (recordsByUser.get(r.createdBy) ?? 0) + 1)
        }
      }

      // Decisions authored
      const decisionsByUser = new Map<string, number>()
      for (const d of allDecisions) {
        if (d.decidedByUserId && userIds.includes(d.decidedByUserId)) {
          decisionsByUser.set(d.decidedByUserId, (decisionsByUser.get(d.decidedByUserId) ?? 0) + 1)
        }
      }

      // Roles vacated — assignments that ended when they were offboarded
      // Approximation: count assignments for the user with endedAt set where the
      // current state is still vacant (no new active assignment on the same role)
      const endedAssignments = await db
        .select()
        .from(schema.roleAssignments)
        .where(and(
          eq(schema.roleAssignments.organizationId, orgId),
          inArray(schema.roleAssignments.userId, userIds),
        ))
      const rolesWithActive = await db
        .select({ roleId: schema.roleAssignments.roleId })
        .from(schema.roleAssignments)
        .where(and(
          eq(schema.roleAssignments.organizationId, orgId),
          isNull(schema.roleAssignments.endedAt),
        ))
      const currentlyHeld = new Set(rolesWithActive.map((r) => r.roleId))
      const vacantByUser = new Map<string, Set<string>>()
      for (const a of endedAssignments) {
        if (!a.endedAt) continue
        if (currentlyHeld.has(a.roleId)) continue
        const s = vacantByUser.get(a.userId) ?? new Set()
        s.add(a.roleId)
        vacantByUser.set(a.userId, s)
      }

      for (const m of recentOffboarded) {
        const u = userById.get(m.userId)
        turnoverImpacts.push({
          userId: m.userId,
          name: u?.name ?? 'unknown',
          email: u?.email ?? 'unknown',
          offboardedAt: m.offboardedAt!,
          recordsAuthored: recordsByUser.get(m.userId) ?? 0,
          decisionsAuthored: decisionsByUser.get(m.userId) ?? 0,
          rolesVacatedCount: vacantByUser.get(m.userId)?.size ?? 0,
        })
      }
    }

    // ── Pending handovers (vacant roles with owned records) ──────────────────
    const allRoles = await db.select().from(schema.employeeRoles).where(eq(schema.employeeRoles.organizationId, orgId))
    const activeAssignments = await db
      .select({ roleId: schema.roleAssignments.roleId })
      .from(schema.roleAssignments)
      .where(and(
        eq(schema.roleAssignments.organizationId, orgId),
        isNull(schema.roleAssignments.endedAt),
      ))
    const heldRoleIds = new Set(activeAssignments.map((a) => a.roleId))
    const vacantRoles = allRoles.filter((r) => r.status !== 'archived' && !heldRoleIds.has(r.id))

    const ownership = vacantRoles.length > 0
      ? await db
          .select({ roleId: schema.recordRoleOwnership.roleId })
          .from(schema.recordRoleOwnership)
          .where(inArray(schema.recordRoleOwnership.roleId, vacantRoles.map((r) => r.id)))
      : []
    const ownedByRole = new Map<string, number>()
    for (const o of ownership) ownedByRole.set(o.roleId, (ownedByRole.get(o.roleId) ?? 0) + 1)

    // Most recent "endedAt" for each vacant role — when did it go vacant
    const lastEnded = vacantRoles.length > 0
      ? await db
          .select()
          .from(schema.roleAssignments)
          .where(inArray(schema.roleAssignments.roleId, vacantRoles.map((r) => r.id)))
          .orderBy(desc(schema.roleAssignments.endedAt))
      : []
    const lastEndedByRole = new Map<string, string>()
    for (const a of lastEnded) {
      if (!a.endedAt) continue
      if (!lastEndedByRole.has(a.roleId)) lastEndedByRole.set(a.roleId, a.endedAt)
    }

    const deptNameById = new Map(allDepts.map((d) => [d.id, d.name]))
    const pendingHandovers: PendingHandover[] = vacantRoles
      .map((r) => ({
        roleId: r.id,
        roleTitle: r.title,
        departmentName: r.departmentId ? deptNameById.get(r.departmentId) ?? null : null,
        ownedRecordsCount: ownedByRole.get(r.id) ?? 0,
        vacantSinceIso: lastEndedByRole.get(r.id) ?? null,
      }))
      .sort((a, b) => b.ownedRecordsCount - a.ownedRecordsCount)
      .slice(0, 10)

    // ── Decision velocity — weekly buckets, last 12 weeks ────────────────────
    const buckets = new Map<string, WeeklyBucket>()
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfIsoWeek(new Date(now.getTime() - i * 7 * 86400_000)).toISOString()
      buckets.set(weekStart, { weekStart, decisions: 0, reversed: 0, records: 0 })
    }
    for (const d of allDecisions) {
      if (d.decidedAt < weeksBackIso) continue
      const wk = startOfIsoWeek(new Date(d.decidedAt)).toISOString()
      const b = buckets.get(wk)
      if (b) {
        b.decisions++
        if (d.status === 'reversed' || d.status === 'superseded') b.reversed++
      }
    }
    for (const r of allRecords) {
      if (r.createdAt < weeksBackIso) continue
      const wk = startOfIsoWeek(new Date(r.createdAt)).toISOString()
      const b = buckets.get(wk)
      if (b) b.records++
    }
    const velocity: WeeklyBucket[] = Array.from(buckets.values())

    // ── Latest self-healing snapshot ─────────────────────────────────────────
    const health = await getLatestHealth(orgId, null)

    // ── Critical findings teaser (top 5 criticals) ───────────────────────────
    const criticalFindings = (health?.findings ?? [])
      .filter((f) => f.severity === 'critical')
      .slice(0, 5)

    // ── Ask-AI activity (audit log queries in last 30d) ──────────────────────
    const queryAudits = await db
      .select()
      .from(schema.auditLog)
      .where(and(
        eq(schema.auditLog.organizationId, orgId),
        eq(schema.auditLog.action, 'query'),
        gte(schema.auditLog.createdAt, monthAgoIso),
      ))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(500)
    const askVolume = queryAudits.length

    return NextResponse.json({
      overview: {
        scannedAt: now.toISOString(),
        hero: {
          healthScore: health?.healthScore ?? null,
          totalRecords,
          recordsLast30d,
          decisionsThisMonth,
          totalDecisions: allDecisions.length,
          reversedRate: Math.round(reversedRate * 100) / 100,
          activeMembers,
          totalMembers: allMembers.length,
          offboardedCount: offboardedMembers.length,
          sourcesActive,
          sourcesTotal,
          askVolume30d: askVolume,
        },
        amnesiaSignals: {
          stale: health?.staleCount ?? 0,
          orphaned: health?.orphanedCount ?? 0,
          contradictions: health?.contradictionsCount ?? 0,
          gaps: health?.gapsCount ?? 0,
          lastScanAt: health?.computedAt ?? null,
        },
        knowledgeGravity: enrichedDepts
          .sort((a, b) => b.recordCount - a.recordCount)
          .slice(0, 10),
        decisionVelocity: velocity,
        turnoverImpact: turnoverImpacts,
        pendingHandovers,
        criticalFindings,
      },
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}