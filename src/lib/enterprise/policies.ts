// Shared policy helpers — applicability matching, pending-ack computation,
// and a small diff helper used by the version compare UI.

import { db, schema } from '@/lib/db'
import { and, eq, inArray } from 'drizzle-orm'
import { listAccessibleDepartmentIds } from './rbac'

export interface PolicyApplicability {
  allOrg: boolean
  departments: string[]
  roles: string[]
  users: string[]
}

export function parseApplicability(raw: string | null | undefined): PolicyApplicability {
  if (!raw) return { allOrg: true, departments: [], roles: [], users: [] }
  try {
    const parsed = JSON.parse(raw)
    return {
      allOrg: !!parsed.allOrg,
      departments: Array.isArray(parsed.departments) ? parsed.departments : [],
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
    }
  } catch {
    return { allOrg: true, departments: [], roles: [], users: [] }
  }
}

// Does a given user fall within a policy's applicability?
// Union semantics: allOrg OR dept match OR role match OR explicit user.
export async function userIsSubjectToPolicy(opts: {
  userId: string
  organizationId: string
  applicability: PolicyApplicability
}): Promise<boolean> {
  const a = opts.applicability
  if (a.allOrg) return true
  if (a.users.includes(opts.userId)) return true

  if (a.departments.length) {
    // User has access to any of those depts (direct or via role cascade)
    const accessible = await listAccessibleDepartmentIds(opts.userId, opts.organizationId)
    const set = new Set(accessible)
    if (a.departments.some((d) => set.has(d))) return true
  }

  if (a.roles.length) {
    const roleRows = await db
      .select({ roleId: schema.roleAssignments.roleId })
      .from(schema.roleAssignments)
      .where(and(
        eq(schema.roleAssignments.userId, opts.userId),
        eq(schema.roleAssignments.organizationId, opts.organizationId),
      ))
    const mySet = new Set(roleRows.map((r) => r.roleId))
    if (a.roles.some((r) => mySet.has(r))) return true
  }

  return false
}

// Compute pending-ack policies for a user in a single org. "Pending" means:
//   - policy is published
//   - user is subject to it (applicability match)
//   - user has no ack row for the current version
export async function pendingPoliciesForUser(opts: {
  userId: string
  organizationId: string
}): Promise<Array<{ policyId: string; versionId: string; title: string; effectiveDate: string | null; category: string | null }>> {
  const published = await db.query.policies.findMany({
    where: and(
      eq(schema.policies.organizationId, opts.organizationId),
      eq(schema.policies.status, 'published'),
    ),
  })
  if (published.length === 0) return []

  // Pull the user's ack rows for these policies
  const versionIds = published.map((p) => p.currentVersionId).filter((v): v is string => !!v)
  const acks = versionIds.length
    ? await db
        .select()
        .from(schema.policyAcknowledgments)
        .where(and(
          eq(schema.policyAcknowledgments.userId, opts.userId),
          inArray(schema.policyAcknowledgments.policyVersionId, versionIds),
        ))
    : []
  const ackedVersions = new Set(acks.map((a) => a.policyVersionId))

  const pending: Array<{ policyId: string; versionId: string; title: string; effectiveDate: string | null; category: string | null }> = []
  for (const p of published) {
    if (!p.currentVersionId) continue
    if (ackedVersions.has(p.currentVersionId)) continue
    const subject = await userIsSubjectToPolicy({
      userId: opts.userId,
      organizationId: opts.organizationId,
      applicability: parseApplicability(p.applicability),
    })
    if (!subject) continue
    pending.push({
      policyId: p.id,
      versionId: p.currentVersionId,
      title: p.title,
      effectiveDate: p.effectiveDate,
      category: p.category,
    })
  }
  return pending
}

// Line-level diff for the version compare UI. Returns an array of
// {kind: 'same' | 'add' | 'del', text}. Good enough for policy diffing —
// we're not rendering Git-level quality here.
export function diffLines(before: string, after: string): Array<{ kind: 'same' | 'add' | 'del'; text: string }> {
  const a = before.split('\n')
  const b = after.split('\n')
  // Longest common subsequence table
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1]
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: Array<{ kind: 'same' | 'add' | 'del'; text: string }> = []
  let i = 0, j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push({ kind: 'same', text: a[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ kind: 'del', text: a[i] }); i++ }
    else { out.push({ kind: 'add', text: b[j] }); j++ }
  }
  while (i < a.length) { out.push({ kind: 'del', text: a[i++] }) }
  while (j < b.length) { out.push({ kind: 'add', text: b[j++] }) }
  return out
}
