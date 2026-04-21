// Tamper-evident audit export.
//
// Every audit row is hashed together with the previous row's hash, forming
// a chain where any modification (insert, edit, delete) invalidates every
// subsequent hash. The export includes per-row hashes plus the final
// "chain tip" — auditors can re-hash the file to verify nothing was altered.
//
// We keep this deterministic and format-stable: the hash input is a pinned
// subset of columns in a pinned order. Changing the column list or order
// breaks verification for old exports, so callers must not rewrite these
// functions without a migration plan for any live auditors holding old tips.

import { db, schema } from '../db'
import { and, eq, gte, lte, asc } from 'drizzle-orm'
import crypto from 'crypto'

export interface HashedAuditRow {
  id: string
  organizationId: string
  userId: string | null
  userEmail: string
  action: string
  resourceType: string | null
  resourceId: string | null
  departmentId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: string | null
  createdAt: string
  prevHash: string // hash of the previous row (or GENESIS for the first)
  rowHash: string  // sha256 of [prevHash, canonicalRow]
}

export interface AuditExportBundle {
  organizationId: string
  generatedAt: string
  windowStart: string | null
  windowEnd: string | null
  rowCount: number
  chainAlgorithm: 'sha256-chain-v1'
  chainTip: string // last rowHash in the chain — the "signature" to store
  rows: HashedAuditRow[]
}

// The canonical string representation used for hashing. Fixed column order
// is critical — verification depends on byte-equality.
function canonicalizeRow(row: {
  id: string
  organizationId: string
  userId: string | null
  userEmail: string
  action: string
  resourceType: string | null
  resourceId: string | null
  departmentId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: string | null
  createdAt: string
}): string {
  const parts = [
    row.id,
    row.organizationId,
    row.userId ?? '',
    row.userEmail,
    row.action,
    row.resourceType ?? '',
    row.resourceId ?? '',
    row.departmentId ?? '',
    row.ipAddress ?? '',
    row.userAgent ?? '',
    row.metadata ?? '',
    row.createdAt,
  ]
  // Tab separator — matches no characters users can inject into any of the
  // above fields if they respect DB constraints. A newline terminator makes
  // per-row hashes unambiguous when chained with the tab-containing body.
  return parts.join('\t') + '\n'
}

const GENESIS = 'GENESIS_SHA256_HASH_0000000000000000000000000000000000000000000000'

export async function buildAuditExport(opts: {
  organizationId: string
  fromIso?: string | null
  toIso?: string | null
}): Promise<AuditExportBundle> {
  const where = [eq(schema.auditLog.organizationId, opts.organizationId)]
  if (opts.fromIso) where.push(gte(schema.auditLog.createdAt, opts.fromIso))
  if (opts.toIso) where.push(lte(schema.auditLog.createdAt, opts.toIso))

  const rows = await db
    .select()
    .from(schema.auditLog)
    .where(and(...where))
    .orderBy(asc(schema.auditLog.createdAt), asc(schema.auditLog.id))

  const hashed: HashedAuditRow[] = []
  let prevHash = GENESIS
  for (const r of rows) {
    const canonical = canonicalizeRow({
      id: r.id,
      organizationId: r.organizationId,
      userId: r.userId,
      userEmail: r.userEmail,
      action: r.action,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      departmentId: r.departmentId,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      metadata: r.metadata,
      createdAt: r.createdAt,
    })
    const rowHash = crypto.createHash('sha256').update(prevHash + canonical).digest('hex')
    hashed.push({
      id: r.id,
      organizationId: r.organizationId,
      userId: r.userId,
      userEmail: r.userEmail,
      action: r.action,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      departmentId: r.departmentId,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      metadata: r.metadata,
      createdAt: r.createdAt,
      prevHash,
      rowHash,
    })
    prevHash = rowHash
  }

  return {
    organizationId: opts.organizationId,
    generatedAt: new Date().toISOString(),
    windowStart: opts.fromIso || null,
    windowEnd: opts.toIso || null,
    rowCount: hashed.length,
    chainAlgorithm: 'sha256-chain-v1',
    chainTip: prevHash === GENESIS ? '' : prevHash,
    rows: hashed,
  }
}

// Verify an exported bundle by recomputing the chain. Returns the index of
// the first row whose hash fails, or -1 if everything matches.
export function verifyAuditExport(bundle: AuditExportBundle): number {
  let prev = GENESIS
  for (let i = 0; i < bundle.rows.length; i++) {
    const r = bundle.rows[i]
    const canonical = canonicalizeRow(r)
    const expected = crypto.createHash('sha256').update(prev + canonical).digest('hex')
    if (expected !== r.rowHash) return i
    if (r.prevHash !== prev) return i
    prev = expected
  }
  if (bundle.rows.length > 0 && prev !== bundle.chainTip) return bundle.rows.length - 1
  return -1
}

// CSV serialization — RFC 4180-ish. Quoted, escaped, stable column order.
export function bundleToCsv(bundle: AuditExportBundle): string {
  const header = [
    'id', 'created_at', 'user_email', 'user_id', 'action',
    'resource_type', 'resource_id', 'department_id',
    'ip_address', 'user_agent', 'metadata',
    'prev_hash', 'row_hash',
  ].join(',')
  const esc = (v: string | null | undefined) => {
    const s = v ?? ''
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const body = bundle.rows.map((r) => [
    r.id, r.createdAt, r.userEmail, r.userId ?? '', r.action,
    r.resourceType ?? '', r.resourceId ?? '', r.departmentId ?? '',
    r.ipAddress ?? '', r.userAgent ?? '', r.metadata ?? '',
    r.prevHash, r.rowHash,
  ].map(esc).join(','))
  const preamble = [
    `# Reattend Enterprise audit export`,
    `# Organization: ${bundle.organizationId}`,
    `# Generated: ${bundle.generatedAt}`,
    `# Window: ${bundle.windowStart ?? 'all time'} → ${bundle.windowEnd ?? 'now'}`,
    `# Rows: ${bundle.rowCount}`,
    `# Chain algorithm: ${bundle.chainAlgorithm}`,
    `# Chain tip (verify this signature): ${bundle.chainTip || '(empty export)'}`,
    `#`,
  ].join('\n')
  return preamble + '\n' + header + '\n' + body.join('\n') + (body.length ? '\n' : '')
}
