import { db } from '../../db'
import {
  knowledgeHealth,
  records,
  workspaceOrgLinks,
  departments,
} from '../../db/schema'
import { eq, inArray, and, isNull } from 'drizzle-orm'
import { detectStale, detectOrphaned, detectGaps, detectContradictions, detectRehashedDecisions } from './detectors'
import type { Finding, FindingKind, FindingSeverity, ScanResult } from './types'
import { SEVERITY_WEIGHT } from './types'

// Run every enabled detector, aggregate findings, write per-department rows
// into knowledge_health plus one roll-up row for the org (departmentId=null).
// Returns the combined result for the caller to render immediately.
export async function runHealthScan(organizationId: string): Promise<ScanResult> {
  const [stale, orphaned, gaps, contradictions, rehashed] = await Promise.all([
    detectStale(organizationId),
    detectOrphaned(organizationId),
    detectGaps(organizationId),
    detectContradictions(organizationId),
    detectRehashedDecisions(organizationId),
  ])

  const allFindings: Finding[] = [...stale, ...orphaned, ...gaps, ...contradictions, ...rehashed]

  // Total records — denominator for the health score + rendered in the UI.
  const wsLinks = await db
    .select()
    .from(workspaceOrgLinks)
    .where(eq(workspaceOrgLinks.organizationId, organizationId))
  const workspaceIds = wsLinks.map((l) => l.workspaceId)
  let totalRecords = 0
  if (workspaceIds.length > 0) {
    const rows = await db
      .select({ id: records.id })
      .from(records)
      .where(inArray(records.workspaceId, workspaceIds))
    totalRecords = rows.length
  }

  const byKind = aggregateByKind(allFindings)
  const bySeverity = aggregateBySeverity(allFindings)
  const healthScore = computeScore(totalRecords, allFindings)
  const scannedAt = new Date().toISOString()

  // Roll-up row for the org (departmentId = null)
  await db.insert(knowledgeHealth).values({
    organizationId,
    departmentId: null,
    totalRecords,
    staleCount: byKind.stale,
    contradictionsCount: byKind.contradiction,
    gapsCount: byKind.gap,
    orphanedCount: byKind.orphaned,
    healthScore,
    findings: JSON.stringify(allFindings.slice(0, 500)), // cap to keep row small
    computedAt: scannedAt,
  })

  // Per-department breakdown — groups findings by their departmentId (skips
  // findings that aren't department-scoped like some contradictions).
  const deptRows = await db.select().from(departments).where(eq(departments.organizationId, organizationId))
  for (const d of deptRows) {
    const deptFindings = allFindings.filter((f) => f.departmentId === d.id)
    const deptTotal = wsLinks.filter((l) => l.departmentId === d.id).length > 0
      ? (await db
          .select({ id: records.id })
          .from(records)
          .where(inArray(records.workspaceId, wsLinks.filter((l) => l.departmentId === d.id).map((l) => l.workspaceId)))
        ).length
      : 0
    const dk = aggregateByKind(deptFindings)
    const dScore = computeScore(deptTotal, deptFindings)

    await db.insert(knowledgeHealth).values({
      organizationId,
      departmentId: d.id,
      totalRecords: deptTotal,
      staleCount: dk.stale,
      contradictionsCount: dk.contradiction,
      gapsCount: dk.gap,
      orphanedCount: dk.orphaned,
      healthScore: dScore,
      findings: JSON.stringify(deptFindings.slice(0, 200)),
      computedAt: scannedAt,
    })
  }

  return {
    findings: allFindings,
    byKind,
    bySeverity,
    totalRecordsScanned: totalRecords,
    healthScore,
    scannedAt,
  }
}

export async function getLatestHealth(
  organizationId: string,
  departmentId: string | null = null,
): Promise<
  | {
      totalRecords: number
      staleCount: number
      contradictionsCount: number
      gapsCount: number
      orphanedCount: number
      healthScore: number
      findings: Finding[]
      computedAt: string
    }
  | null
> {
  const rows = await db
    .select()
    .from(knowledgeHealth)
    .where(and(
      eq(knowledgeHealth.organizationId, organizationId),
      departmentId === null ? isNull(knowledgeHealth.departmentId) : eq(knowledgeHealth.departmentId, departmentId),
    ))
    .orderBy(knowledgeHealth.computedAt)

  if (rows.length === 0) return null
  const latest = rows[rows.length - 1]
  let findings: Finding[] = []
  try {
    findings = latest.findings ? JSON.parse(latest.findings) : []
  } catch {
    findings = []
  }
  return {
    totalRecords: latest.totalRecords,
    staleCount: latest.staleCount,
    contradictionsCount: latest.contradictionsCount,
    gapsCount: latest.gapsCount,
    orphanedCount: latest.orphanedCount,
    healthScore: latest.healthScore,
    findings,
    computedAt: latest.computedAt,
  }
}

// ─── Aggregation helpers ─────────────────────────────────────────────────────
function aggregateByKind(findings: Finding[]): Record<FindingKind, number> {
  const out: Record<FindingKind, number> = { stale: 0, orphaned: 0, gap: 0, contradiction: 0 }
  for (const f of findings) out[f.kind]++
  return out
}

function aggregateBySeverity(findings: Finding[]): Record<FindingSeverity, number> {
  const out: Record<FindingSeverity, number> = { info: 0, warning: 0, critical: 0 }
  for (const f of findings) out[f.severity]++
  return out
}

// Score = 100 - weighted deductions, normalized against a baseline per record.
// An org with 0 records gets a neutral 100 (nothing to be wrong about yet).
function computeScore(totalRecords: number, findings: Finding[]): number {
  if (findings.length === 0) return 100
  const deductions = findings.reduce((acc, f) => acc + SEVERITY_WEIGHT[f.severity], 0)
  // Normalize: more records means each finding matters less. Floor at 10 records
  // so a single critical finding in a 2-record org doesn't tank the score to 0.
  const denom = Math.max(totalRecords, 10)
  const score = 100 - (deductions * 100) / denom
  return Math.max(0, Math.min(100, Math.round(score)))
}
