export type FindingKind = 'stale' | 'orphaned' | 'gap' | 'contradiction'

export type FindingSeverity = 'info' | 'warning' | 'critical'

export interface Finding {
  kind: FindingKind
  severity: FindingSeverity
  title: string
  detail: string
  // Primary resource this finding is about — a record, a department, a role, etc.
  resourceType: 'record' | 'department' | 'role' | 'record_pair'
  resourceId: string
  // Optional secondary (used for record_pair contradictions)
  secondaryResourceId?: string
  // For UI deep-links
  workspaceId?: string
  departmentId?: string | null
  // Numeric signal the detector produced (e.g. days stale, similarity score)
  signal?: number
  // Anything extra the UI might want to render
  meta?: Record<string, unknown>
}

export interface ScanResult {
  findings: Finding[]
  byKind: Record<FindingKind, number>
  bySeverity: Record<FindingSeverity, number>
  totalRecordsScanned: number
  healthScore: number // 0-100
  scannedAt: string
}

// Weight used when aggregating findings into a 0-100 score.
// Critical findings hurt the score more than warnings; info items are visible
// in the UI but don't move the score.
export const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  info: 0,
  warning: 2,
  critical: 5,
}
