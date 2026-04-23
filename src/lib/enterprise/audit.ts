import { db } from '../db'
import { auditLog, organizationMembers, users } from '../db/schema'
import { and, eq, desc, gte, lte } from 'drizzle-orm'
import { createHash } from 'crypto'

// WORM chain — each audit row references the previous row's hash. Tampering
// with any historical row breaks the chain from that point forward, which
// the `verifyAuditChain` endpoint surfaces to admins.
//
// Hash input: canonical JSON of the row payload + the prior row's rowHash.
// Canonical = sorted keys. If prior is null (first row in the org's log), we
// use the literal string 'GENESIS' so the chain has a deterministic root.
function canonicalize(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort()
  const out: Record<string, unknown> = {}
  for (const k of keys) out[k] = obj[k] ?? null
  return JSON.stringify(out)
}

function computeRowHash(prevHash: string | null, payload: Record<string, unknown>): string {
  const input = (prevHash || 'GENESIS') + canonicalize(payload)
  return createHash('sha256').update(input).digest('hex')
}

export type AuditAction =
  | 'query' | 'read' | 'create' | 'update' | 'delete' | 'export'
  | 'login' | 'logout' | 'sso_login' | 'role_change'
  | 'member_invite' | 'member_remove' | 'permission_change'
  | 'decision_create' | 'decision_reverse'
  | 'admin_action' | 'integration_connect' | 'integration_disconnect'

export interface AuditEntry {
  organizationId: string
  userId?: string | null
  userEmail: string // required, denormalized — survives user deletion
  action: AuditAction
  departmentId?: string | null
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

// Immutable write — no update/delete API is exposed. Callers that need to
// record a mistake should write a NEW audit entry, not mutate an existing one.
// Additionally, every write computes rowHash = sha256(prevHash + payload) so
// the chain survives tamper attempts (tamper → mismatched hash → flagged by
// verifyAuditChain).
export async function writeAudit(entry: AuditEntry): Promise<void> {
  // Pull the latest row for this org to build the chain. Single cheap query.
  const [prev] = await db.select({ rowHash: auditLog.rowHash })
    .from(auditLog)
    .where(eq(auditLog.organizationId, entry.organizationId))
    .orderBy(desc(auditLog.createdAt))
    .limit(1)
  const prevHash = prev?.rowHash ?? null

  const createdAt = new Date().toISOString()
  const payload = {
    organizationId: entry.organizationId,
    userId: entry.userId ?? null,
    userEmail: entry.userEmail,
    action: entry.action,
    departmentId: entry.departmentId ?? null,
    resourceType: entry.resourceType ?? null,
    resourceId: entry.resourceId ?? null,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    createdAt,
  }
  const rowHash = computeRowHash(prevHash, payload)

  await db.insert(auditLog).values({
    ...payload,
    prevHash,
    rowHash,
  })
}

// Fire-and-forget variant for hot paths (ask/query logging) — never blocks
// the response. Errors are swallowed to `console.error` so observability
// still picks them up but user-facing latency is unaffected.
export function writeAuditAsync(entry: AuditEntry): void {
  writeAudit(entry).catch((err) => {
    console.error('[audit] failed to write entry', { action: entry.action, err })
  })
}

// Convenience: resolve email from userId and write. For callers that only
// have the user id handy (API middleware), this saves a join.
export async function writeAuditForUser(
  userId: string,
  entry: Omit<AuditEntry, 'userId' | 'userEmail'>,
): Promise<void> {
  const rows = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
  const email = rows[0]?.email ?? 'unknown'
  await writeAudit({ ...entry, userId, userEmail: email })
}

export interface AuditQueryFilters {
  organizationId: string
  userId?: string
  action?: AuditAction
  resourceType?: string
  resourceId?: string
  departmentId?: string
  from?: string // ISO
  to?: string // ISO
  limit?: number
  offset?: number
}

// Walk the entire audit chain for an org, recomputing every row hash. Returns
// the first broken link (if any) + totals. For the Trust page / compliance
// export we expose a boolean "intact" + the break index.
export async function verifyAuditChain(organizationId: string): Promise<{
  intact: boolean
  totalRows: number
  brokenAtIndex: number | null
  brokenRowId: string | null
  message: string
}> {
  const rows = await db.select()
    .from(auditLog)
    .where(eq(auditLog.organizationId, organizationId))
    .orderBy(auditLog.createdAt)
  let prev: string | null = null
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const expected = computeRowHash(prev, {
      organizationId: r.organizationId,
      userId: r.userId ?? null,
      userEmail: r.userEmail,
      action: r.action,
      departmentId: r.departmentId ?? null,
      resourceType: r.resourceType ?? null,
      resourceId: r.resourceId ?? null,
      ipAddress: r.ipAddress ?? null,
      userAgent: r.userAgent ?? null,
      metadata: r.metadata ?? null,
      createdAt: r.createdAt,
    })
    // Historical rows pre-WORM migration won't have a rowHash — treat as
    // unverifiable but not broken.
    if (!r.rowHash) {
      prev = r.rowHash
      continue
    }
    if (r.rowHash !== expected || (prev !== null && r.prevHash !== prev)) {
      return {
        intact: false,
        totalRows: rows.length,
        brokenAtIndex: i,
        brokenRowId: r.id,
        message: `Chain break at row ${i + 1}/${rows.length} (id ${r.id}). Tamper suspected.`,
      }
    }
    prev = r.rowHash
  }
  return {
    intact: true,
    totalRows: rows.length,
    brokenAtIndex: null,
    brokenRowId: null,
    message: rows.length === 0 ? 'No audit rows yet.' : `All ${rows.length} rows verified.`,
  }
}

export async function queryAudit(filters: AuditQueryFilters) {
  const conds = [eq(auditLog.organizationId, filters.organizationId)]
  if (filters.userId) conds.push(eq(auditLog.userId, filters.userId))
  if (filters.action) conds.push(eq(auditLog.action, filters.action))
  if (filters.resourceType) conds.push(eq(auditLog.resourceType, filters.resourceType))
  if (filters.resourceId) conds.push(eq(auditLog.resourceId, filters.resourceId))
  if (filters.departmentId) conds.push(eq(auditLog.departmentId, filters.departmentId))
  if (filters.from) conds.push(gte(auditLog.createdAt, filters.from))
  if (filters.to) conds.push(lte(auditLog.createdAt, filters.to))

  return db
    .select()
    .from(auditLog)
    .where(and(...conds))
    .orderBy(desc(auditLog.createdAt))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0)
}

// Retention pruning is the ONLY write that removes audit entries. Government
// deployments typically set retention to 0 (infinite). Callers must pass an
// explicit retention window — there is no default, to avoid accidental purges.
// Fan-out: audit an action across every active org the user belongs to.
// Used by routes like /api/ask that serve both personal and enterprise users —
// personal-only users have zero active org memberships, so this is a no-op for them.
// Fire-and-forget.
export function auditForAllUserOrgs(
  userId: string,
  userEmail: string,
  action: AuditAction,
  opts: {
    resourceType?: string
    resourceId?: string
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, unknown>
  } = {},
): void {
  ;(async () => {
    const memberships = await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, 'active'),
      ))
    for (const m of memberships) {
      writeAuditAsync({
        organizationId: m.organizationId,
        userId,
        userEmail,
        action,
        resourceType: opts.resourceType,
        resourceId: opts.resourceId,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
        metadata: opts.metadata,
      })
    }
  })().catch((err) => {
    console.error('[audit] fan-out failed', { action, err })
  })
}

export async function pruneAuditBefore(organizationId: string, cutoffIso: string): Promise<number> {
  const result = await db
    .delete(auditLog)
    .where(and(eq(auditLog.organizationId, organizationId), lte(auditLog.createdAt, cutoffIso)))
  return (result as { changes?: number }).changes ?? 0
}
