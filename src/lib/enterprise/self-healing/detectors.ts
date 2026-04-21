import { db } from '../../db'
import {
  records,
  recordRoleOwnership,
  roleAssignments,
  employeeRoles,
  workspaceOrgLinks,
  departments,
  departmentMembers,
  embeddings,
  recordEntities,
  decisions,
} from '../../db/schema'
import { and, eq, inArray, isNull, lt, gt, ne } from 'drizzle-orm'
import type { Finding } from './types'

// ─── Scan config ─────────────────────────────────────────────────────────────
// Type-specific "time-to-stale". Decisions + policies age fastest because they
// commonly reference world-state that drifts; notes/meetings are less sensitive.
const STALE_DAYS_BY_TYPE: Record<string, number> = {
  decision: 180,
  insight: 270,
  context: 365,
  idea: 365,
  note: 540,
  meeting: 365,
  tasklike: 120,
  transcript: 540,
}
const DEFAULT_STALE_DAYS = 365

// Department is "silent" if it has members but no new records in this window.
const GAP_DAYS = 90

// Contradiction detection: cosine similarity threshold + opposition keywords.
const CONTRADICTION_SIMILARITY = 0.82
const MAX_PAIRS_CHECKED = 400 // cap to keep per-org scan under a few seconds

const OPPOSITION_PAIRS: Array<[RegExp, RegExp]> = [
  [/\bapproved?\b/i, /\b(rejected|denied|declined)\b/i],
  [/\bshipped?\b/i, /\b(reverted|rolled back|pulled)\b/i],
  [/\bhiring\b/i, /\b(freeze|freezed|frozen|hiring freeze)\b/i],
  [/\bremote\b/i, /\b(in[-\s]office|return to office|RTO)\b/i],
  [/\bopen source\b/i, /\b(proprietary|closed source|closed-source)\b/i],
  [/\bgo\b/i, /\bno[-\s]?go\b/i],
  [/\b(yes|positive|greenlit)\b/i, /\b(no|negative|killed)\b/i],
  [/\bincrease(d|s)?\b/i, /\bdecrease(d|s)?\b/i],
  [/\bbuild\b/i, /\b(buy|outsource)\b/i],
  [/\bdeprecate(d)?\b/i, /\b(adopt|adopted|roll out|standard)\b/i],
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysBetween(iso: string, now = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

async function workspacesForOrg(organizationId: string): Promise<Array<{ workspaceId: string; departmentId: string | null }>> {
  return db
    .select({ workspaceId: workspaceOrgLinks.workspaceId, departmentId: workspaceOrgLinks.departmentId })
    .from(workspaceOrgLinks)
    .where(eq(workspaceOrgLinks.organizationId, organizationId))
}

async function orgRecords(organizationId: string) {
  const links = await workspacesForOrg(organizationId)
  if (links.length === 0) return []
  const workspaceIds = links.map((l) => l.workspaceId)
  const wsToDept = new Map(links.map((l) => [l.workspaceId, l.departmentId]))
  const rows = await db
    .select()
    .from(records)
    .where(inArray(records.workspaceId, workspaceIds))
  return rows.map((r) => ({ ...r, departmentId: wsToDept.get(r.workspaceId) ?? null }))
}

// ─── Stale detector ──────────────────────────────────────────────────────────
// A record is stale if it's older than its type's stale threshold AND hasn't
// been updated recently. We check updatedAt (not just createdAt) so re-confirmed
// records don't trigger. Locked records are skipped — they're explicitly fixed.
export async function detectStale(organizationId: string, restrictToDepartmentId?: string): Promise<Finding[]> {
  const all = await orgRecords(organizationId)
  const scoped = restrictToDepartmentId ? all.filter((r) => r.departmentId === restrictToDepartmentId) : all
  const findings: Finding[] = []
  const now = Date.now()

  for (const r of scoped) {
    if (r.locked) continue
    const threshold = STALE_DAYS_BY_TYPE[r.type] ?? DEFAULT_STALE_DAYS
    const lastTouchedIso = r.updatedAt || r.createdAt
    const age = daysBetween(lastTouchedIso, now)
    if (age <= threshold) continue

    const severity = age > threshold * 2 ? 'critical' : 'warning'
    findings.push({
      kind: 'stale',
      severity,
      title: `${r.title.slice(0, 80)}${r.title.length > 80 ? '…' : ''}`,
      detail: `${r.type} not updated in ${age} days (threshold: ${threshold})`,
      resourceType: 'record',
      resourceId: r.id,
      workspaceId: r.workspaceId,
      departmentId: r.departmentId,
      signal: age,
      meta: { recordType: r.type, threshold },
    })
  }

  return findings
}

// ─── Orphaned detector ───────────────────────────────────────────────────────
// A record is "orphaned" if it's owned by an employee role with no current
// assignee (role holder left, successor not named). This is the key signal
// for the transfer protocol: knowledge has no owner.
export async function detectOrphaned(organizationId: string): Promise<Finding[]> {
  const ownerships = await db
    .select({
      recordId: recordRoleOwnership.recordId,
      roleId: recordRoleOwnership.roleId,
    })
    .from(recordRoleOwnership)
    .where(eq(recordRoleOwnership.organizationId, organizationId))

  if (ownerships.length === 0) return []

  const roleIds = Array.from(new Set(ownerships.map((o) => o.roleId)))
  const roleRows = await db.select().from(employeeRoles).where(inArray(employeeRoles.id, roleIds))
  const roleById = new Map(roleRows.map((r) => [r.id, r]))

  // Current assignments = endedAt IS NULL
  const currentAssignments = await db
    .select({ roleId: roleAssignments.roleId })
    .from(roleAssignments)
    .where(and(inArray(roleAssignments.roleId, roleIds), isNull(roleAssignments.endedAt)))
  const rolesWithHolder = new Set(currentAssignments.map((a) => a.roleId))

  const orphanedRoleIds = roleIds.filter((rid) => {
    const role = roleById.get(rid)
    if (!role || role.status === 'archived') return false
    return !rolesWithHolder.has(rid)
  })
  if (orphanedRoleIds.length === 0) return []

  const orphanedOwnerships = ownerships.filter((o) => orphanedRoleIds.includes(o.roleId))
  const recordRows = await db
    .select()
    .from(records)
    .where(inArray(records.id, orphanedOwnerships.map((o) => o.recordId)))
  const recordById = new Map(recordRows.map((r) => [r.id, r]))

  const links = await workspacesForOrg(organizationId)
  const wsToDept = new Map(links.map((l) => [l.workspaceId, l.departmentId]))

  return orphanedOwnerships.map((o) => {
    const role = roleById.get(o.roleId)!
    const rec = recordById.get(o.recordId)
    return {
      kind: 'orphaned' as const,
      severity: 'critical' as const,
      title: rec ? rec.title.slice(0, 80) : `Orphaned record (${o.recordId.slice(0, 8)}…)`,
      detail: `Owned by role "${role.title}" — role has no current holder`,
      resourceType: 'record' as const,
      resourceId: o.recordId,
      workspaceId: rec?.workspaceId,
      departmentId: rec ? wsToDept.get(rec.workspaceId) ?? null : null,
      meta: { roleId: o.roleId, roleTitle: role.title },
    }
  })
}

// ─── Gap detector ────────────────────────────────────────────────────────────
// A department is "silent" if it has members but zero new records in the last
// GAP_DAYS days. Indicates knowledge isn't being captured — the main failure
// mode we're trying to fix.
export async function detectGaps(organizationId: string): Promise<Finding[]> {
  const depts = await db
    .select()
    .from(departments)
    .where(eq(departments.organizationId, organizationId))
  if (depts.length === 0) return []

  const links = await workspacesForOrg(organizationId)
  const deptToWorkspaces = new Map<string, string[]>()
  for (const l of links) {
    if (!l.departmentId) continue
    const list = deptToWorkspaces.get(l.departmentId) ?? []
    list.push(l.workspaceId)
    deptToWorkspaces.set(l.departmentId, list)
  }

  // Which depts have members?
  const memberRows = await db
    .select({ departmentId: departmentMembers.departmentId })
    .from(departmentMembers)
    .where(eq(departmentMembers.organizationId, organizationId))
  const deptsWithMembers = new Set(memberRows.map((m) => m.departmentId))

  const cutoffIso = new Date(Date.now() - GAP_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const findings: Finding[] = []

  for (const d of depts) {
    if (!deptsWithMembers.has(d.id)) continue
    const wsIds = deptToWorkspaces.get(d.id) ?? []
    if (wsIds.length === 0) {
      findings.push({
        kind: 'gap',
        severity: 'warning',
        title: `${d.name} has no linked workspaces`,
        detail: `Department "${d.name}" has members but no workspace captures their work.`,
        resourceType: 'department',
        resourceId: d.id,
        departmentId: d.id,
        meta: { kind: d.kind },
      })
      continue
    }
    const recent = await db
      .select({ id: records.id })
      .from(records)
      .where(and(inArray(records.workspaceId, wsIds), gt(records.createdAt, cutoffIso)))
      .limit(1)
    if (recent.length === 0) {
      findings.push({
        kind: 'gap',
        severity: 'warning',
        title: `${d.name} is silent`,
        detail: `No new records in ${GAP_DAYS} days despite having members.`,
        resourceType: 'department',
        resourceId: d.id,
        departmentId: d.id,
        signal: GAP_DAYS,
        meta: { kind: d.kind },
      })
    }
  }

  return findings
}

// ─── Contradiction detector ──────────────────────────────────────────────────
// V1: pair records that share entities, check cosine similarity on embeddings
// above CONTRADICTION_SIMILARITY, then scan for opposing keywords. This finds
// the most obvious contradictions without needing an LLM call. A future LLM
// confirmation pass can upgrade these from "candidates" to "confirmed".
function parseVector(json: string): number[] | null {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : null
  } catch {
    return null
  }
}
function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, aa = 0, bb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    aa += a[i] * a[i]
    bb += b[i] * b[i]
  }
  const denom = Math.sqrt(aa) * Math.sqrt(bb)
  return denom === 0 ? 0 : dot / denom
}
function hasOpposition(a: string, b: string): boolean {
  for (const [lhs, rhs] of OPPOSITION_PAIRS) {
    if ((lhs.test(a) && rhs.test(b)) || (lhs.test(b) && rhs.test(a))) return true
  }
  return false
}

export async function detectContradictions(organizationId: string): Promise<Finding[]> {
  const all = await orgRecords(organizationId)
  // Only authoritative types can "contradict"; notes / transcripts are too noisy.
  const candidates = all.filter((r) => ['decision', 'policy', 'insight', 'context'].includes(r.type))
  if (candidates.length < 2) return []
  const candidateIds = candidates.map((r) => r.id)

  // Group by shared entity — cheap pre-filter before embedding work.
  const entityLinks = await db
    .select()
    .from(recordEntities)
    .where(inArray(recordEntities.recordId, candidateIds))
  const entityToRecords = new Map<string, string[]>()
  for (const el of entityLinks) {
    const list = entityToRecords.get(el.entityId) ?? []
    list.push(el.recordId)
    entityToRecords.set(el.entityId, list)
  }

  const pairs: Array<[string, string]> = []
  const seenPair = new Set<string>()
  for (const ids of Array.from(entityToRecords.values())) {
    if (ids.length < 2) continue
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = ids[i] < ids[j] ? `${ids[i]}:${ids[j]}` : `${ids[j]}:${ids[i]}`
        if (seenPair.has(key)) continue
        seenPair.add(key)
        pairs.push([ids[i], ids[j]])
        if (pairs.length >= MAX_PAIRS_CHECKED) break
      }
      if (pairs.length >= MAX_PAIRS_CHECKED) break
    }
    if (pairs.length >= MAX_PAIRS_CHECKED) break
  }
  if (pairs.length === 0) return []

  // Load embeddings for all involved records (single query)
  const involved = Array.from(new Set(pairs.flatMap((p) => [p[0], p[1]])))
  const embedRows = await db.select().from(embeddings).where(inArray(embeddings.recordId, involved))
  const vecByRecord = new Map<string, number[]>()
  for (const e of embedRows) {
    const v = parseVector(e.vector)
    if (v) vecByRecord.set(e.recordId, v)
  }

  const byId = new Map(candidates.map((r) => [r.id, r]))
  const links = await workspacesForOrg(organizationId)
  const wsToDept = new Map(links.map((l) => [l.workspaceId, l.departmentId]))
  const findings: Finding[] = []

  for (const [aId, bId] of pairs) {
    const a = byId.get(aId)
    const b = byId.get(bId)
    if (!a || !b) continue

    // Require opposition in text — skip pure duplicates
    const aText = `${a.title}\n${a.summary ?? ''}\n${a.content ?? ''}`
    const bText = `${b.title}\n${b.summary ?? ''}\n${b.content ?? ''}`
    if (!hasOpposition(aText, bText)) continue

    const vA = vecByRecord.get(aId)
    const vB = vecByRecord.get(bId)
    // If embeddings exist, require high similarity; if missing, fall back on opposition-only
    const sim = vA && vB ? cosine(vA, vB) : null
    if (sim !== null && sim < CONTRADICTION_SIMILARITY) continue

    const severity = sim !== null && sim > 0.9 ? 'critical' : 'warning'
    findings.push({
      kind: 'contradiction',
      severity,
      title: `"${a.title.slice(0, 60)}" may contradict "${b.title.slice(0, 60)}"`,
      detail: sim !== null
        ? `Similarity ${(sim * 100).toFixed(0)}% with opposing terms`
        : 'Opposing terms on shared topic (no embedding)',
      resourceType: 'record_pair',
      resourceId: aId,
      secondaryResourceId: bId,
      workspaceId: a.workspaceId,
      departmentId: wsToDept.get(a.workspaceId) ?? null,
      signal: sim ?? undefined,
      meta: {
        aTitle: a.title,
        bTitle: b.title,
        aType: a.type,
        bType: b.type,
      },
    })
  }

  return findings
}

// ─── Rehashed decisions detector ─────────────────────────────────────────────
// Flags decisions with very similar titles that have each been reversed at
// least once. Signal: the organization keeps re-deciding the same thing and
// flipping. The flagged "contradiction" category covers this in the UI — we
// emit findings with kind='contradiction' + severity='warning' and a specific
// detail that says "rehashed N times".
//
// Heuristic title similarity: tokenize lowercase, keep words ≥4 chars,
// require ≥3 shared tokens (excluding stopwords).
const REHASH_STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'about',
  'over', 'under', 'before', 'after', 'between', 'through', 'should', 'must',
])
function titleTokens(title: string): Set<string> {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  return new Set(words.filter((w) => w.length >= 4 && !REHASH_STOP.has(w)))
}

export async function detectRehashedDecisions(organizationId: string): Promise<Finding[]> {
  const rows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.organizationId, organizationId))
  if (rows.length < 2) return []

  // Cluster by shared title tokens
  type Row = typeof rows[number]
  const tokensByRow = new Map<string, Set<string>>()
  for (const r of rows) tokensByRow.set(r.id, titleTokens(r.title))

  const visited = new Set<string>()
  const clusters: Row[][] = []
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i]
    if (visited.has(a.id)) continue
    const cluster: Row[] = [a]
    visited.add(a.id)
    const aTok = tokensByRow.get(a.id)!
    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j]
      if (visited.has(b.id)) continue
      const bTok = tokensByRow.get(b.id)!
      let shared = 0
      for (const t of Array.from(aTok)) if (bTok.has(t)) shared++
      if (shared >= 3) {
        cluster.push(b)
        visited.add(b.id)
      }
    }
    if (cluster.length >= 2) clusters.push(cluster)
  }

  const findings: Finding[] = []
  for (const cluster of clusters) {
    const reversedCount = cluster.filter((c) => c.status === 'reversed' || c.status === 'superseded').length
    // Require at least 2 reversals/supersedes in the cluster to flag
    if (reversedCount < 2) continue

    // Use the most recent active decision as the primary reference
    const sorted = [...cluster].sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
    const primary = sorted.find((d) => d.status === 'active') ?? sorted[0]
    const secondary = sorted.find((d) => d.id !== primary.id)!

    findings.push({
      kind: 'contradiction',
      severity: reversedCount >= 3 ? 'critical' : 'warning',
      title: `"${primary.title.slice(0, 60)}" has been re-decided ${cluster.length} times`,
      detail: `${cluster.length} decisions on the same topic · ${reversedCount} reversed or superseded. The org keeps flipping — root cause may be missing context.`,
      resourceType: 'record_pair',
      resourceId: primary.id,
      secondaryResourceId: secondary.id,
      departmentId: primary.departmentId,
      signal: reversedCount,
      meta: {
        clusterSize: cluster.length,
        reversedCount,
        titles: cluster.map((c) => c.title),
      },
    })
  }
  return findings
}

// Suppress TS unused-import warnings for stubs the runner imports.
export const _unused = { lt, ne }
