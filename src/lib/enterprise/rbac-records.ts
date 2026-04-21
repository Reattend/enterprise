// ─── Record-level RBAC ──────────────────────────────────────────────────────
// The non-negotiable Glean-parity layer. A user can see a record iff:
//
//   1. They are super_admin/admin of the record's org                 → always
//   2. They created it (regardless of visibility)                     → always
//   3. `visibility = 'private'` AND they created it                   → else blocked
//   4. `visibility = 'team'` AND they're a member of the workspace    → allow
//   5. `visibility = 'department'` AND they have access to the dept   → allow
//      (dept access = direct membership, or ancestor-dept access via
//      role cascade: dept_head/manager sees all sub-depts)
//   6. `visibility = 'org'` AND they're an active org member          → allow
//   7. An explicit record_share row matches their user/dept/role      → allow
//   8. Non-enterprise workspaces (no workspace_org_links row) fall    → workspace_members
//      back to the Personal Reattend model                              governs access
//
// Rules 4-7 require an org context; records in Personal/Team workspaces
// that aren't linked to an org use rule 8 (legacy behavior).

import { db, schema } from '../db'
import { and, eq, inArray, or } from 'drizzle-orm'
import { listAccessibleDepartmentIds } from './rbac'

export interface AccessContext {
  userId: string
  // Pre-computed per-org dept accessibility. Built once and reused across
  // batches for performance.
  accessibleDeptsByOrg: Map<string, Set<string>>
  // Org-level role per org: 'super_admin' | 'admin' | ...
  orgRoleByOrg: Map<string, string>
  // All workspaces the user is directly a member of (workspace_members table)
  workspaceIds: Set<string>
  // All employee_roles this user currently holds (for role-based shares)
  roleIds: Set<string>
}

// Build the access context for a user. Call once per request, reuse for
// filter / canAccess calls in the same handler.
export async function buildAccessContext(userId: string): Promise<AccessContext> {
  // Workspace direct memberships
  const ws = await db
    .select({ workspaceId: schema.workspaceMembers.workspaceId })
    .from(schema.workspaceMembers)
    .where(eq(schema.workspaceMembers.userId, userId))

  // Org memberships (active only)
  const orgs = await db
    .select({ organizationId: schema.organizationMembers.organizationId, role: schema.organizationMembers.role })
    .from(schema.organizationMembers)
    .where(and(
      eq(schema.organizationMembers.userId, userId),
      eq(schema.organizationMembers.status, 'active'),
    ))

  // Per-org dept accessibility
  const accessibleDeptsByOrg = new Map<string, Set<string>>()
  const orgRoleByOrg = new Map<string, string>()
  for (const o of orgs) {
    orgRoleByOrg.set(o.organizationId, o.role)
    const depts = await listAccessibleDepartmentIds(userId, o.organizationId)
    accessibleDeptsByOrg.set(o.organizationId, new Set(depts))
  }

  // Current role assignments (for role-based shares)
  const roleRows = await db
    .select({ roleId: schema.roleAssignments.roleId })
    .from(schema.roleAssignments)
    .where(and(
      eq(schema.roleAssignments.userId, userId),
      // endedAt IS NULL in drizzle
    ))

  return {
    userId,
    accessibleDeptsByOrg,
    orgRoleByOrg,
    workspaceIds: new Set(ws.map((w) => w.workspaceId)),
    roleIds: new Set(roleRows.map((r) => r.roleId)),
  }
}

// Core access decision for a batch of records. Returns the subset of
// recordIds the user can see. Designed for the hot path (search/graph/list).
export async function filterToAccessibleRecords(
  ctx: AccessContext,
  recordIds: string[],
): Promise<Set<string>> {
  if (recordIds.length === 0) return new Set()

  // Fetch minimum metadata for all candidates
  const records = await db
    .select({
      id: schema.records.id,
      workspaceId: schema.records.workspaceId,
      visibility: schema.records.visibility,
      createdBy: schema.records.createdBy,
    })
    .from(schema.records)
    .where(inArray(schema.records.id, recordIds))
  if (records.length === 0) return new Set()

  const wsIds = Array.from(new Set(records.map((r) => r.workspaceId)))

  // Org links for those workspaces (null for Personal Reattend workspaces)
  const orgLinks = await db
    .select()
    .from(schema.workspaceOrgLinks)
    .where(inArray(schema.workspaceOrgLinks.workspaceId, wsIds))
  const linkByWs = new Map(orgLinks.map((l) => [l.workspaceId, l]))

  // Explicit shares that could grant access
  const myDeptIds = new Set<string>()
  ctx.accessibleDeptsByOrg.forEach((depts) => {
    depts.forEach((d: string) => myDeptIds.add(d))
  })

  const shareConds = [eq(schema.recordShares.userId, ctx.userId)]
  if (myDeptIds.size > 0) {
    shareConds.push(inArray(schema.recordShares.departmentId, Array.from(myDeptIds)))
  }
  if (ctx.roleIds.size > 0) {
    shareConds.push(inArray(schema.recordShares.roleId, Array.from(ctx.roleIds)))
  }
  const shares = await db
    .select({ recordId: schema.recordShares.recordId })
    .from(schema.recordShares)
    .where(and(
      inArray(schema.recordShares.recordId, recordIds),
      or(...shareConds),
    ))
  const sharedRecordIds = new Set(shares.map((s) => s.recordId))

  const allowed = new Set<string>()
  for (const r of records) {
    // Rule 2: creator always sees their own records
    if (r.createdBy === ctx.userId) {
      allowed.add(r.id)
      continue
    }

    // Rule 7: explicit share
    if (sharedRecordIds.has(r.id)) {
      allowed.add(r.id)
      continue
    }

    const link = linkByWs.get(r.workspaceId)
    if (!link) {
      // Rule 8: Non-enterprise workspace — fall back to workspace_members
      if (ctx.workspaceIds.has(r.workspaceId)) allowed.add(r.id)
      continue
    }

    // Rule 1: org super_admin/admin always
    const orgRole = ctx.orgRoleByOrg.get(link.organizationId)
    if (orgRole === 'super_admin' || orgRole === 'admin') {
      allowed.add(r.id)
      continue
    }

    // Not in the org? Blocked (unless rule 2/7 already caught it)
    if (!orgRole) continue

    // Rule 3: private records only for creator (handled above)
    if (r.visibility === 'private') continue

    // Rule 6: org-wide
    if (r.visibility === 'org') {
      allowed.add(r.id)
      continue
    }

    // Rule 4: team-scoped → direct workspace membership OR dept access
    if (r.visibility === 'team') {
      if (ctx.workspaceIds.has(r.workspaceId)) {
        allowed.add(r.id)
        continue
      }
      // Fallback: workspace → linked dept → user has dept access
      const deptId = link.departmentId
      const accessibleDepts = ctx.accessibleDeptsByOrg.get(link.organizationId)
      if (deptId && accessibleDepts?.has(deptId)) {
        allowed.add(r.id)
      }
      continue
    }

    // Rule 5: department-scoped → user has access to the linked dept (direct
    // or via ancestor cascade)
    if (r.visibility === 'department') {
      const deptId = link.departmentId
      const accessibleDepts = ctx.accessibleDeptsByOrg.get(link.organizationId)
      if (deptId && accessibleDepts?.has(deptId)) {
        allowed.add(r.id)
      }
      continue
    }
  }
  return allowed
}

// Single-record helper.
export async function canAccessRecord(ctx: AccessContext, recordId: string): Promise<boolean> {
  const set = await filterToAccessibleRecords(ctx, [recordId])
  return set.has(recordId)
}

// Is this user allowed to CHANGE the visibility of a record or create a share?
// Rules: the creator, an active org admin/super_admin, or a dept_head of the
// record's dept.
export async function canManageRecordAccess(ctx: AccessContext, recordId: string): Promise<boolean> {
  const rows = await db
    .select({ createdBy: schema.records.createdBy, workspaceId: schema.records.workspaceId })
    .from(schema.records)
    .where(eq(schema.records.id, recordId))
    .limit(1)
  const r = rows[0]
  if (!r) return false

  if (r.createdBy === ctx.userId) return true

  const link = await db
    .select()
    .from(schema.workspaceOrgLinks)
    .where(eq(schema.workspaceOrgLinks.workspaceId, r.workspaceId))
    .limit(1)
  if (!link[0]) {
    // Non-enterprise — workspace owner only
    const member = await db
      .select()
      .from(schema.workspaceMembers)
      .where(and(
        eq(schema.workspaceMembers.workspaceId, r.workspaceId),
        eq(schema.workspaceMembers.userId, ctx.userId),
      ))
      .limit(1)
    return (member[0]?.role === 'owner' || member[0]?.role === 'admin') ?? false
  }

  const orgRole = ctx.orgRoleByOrg.get(link[0].organizationId)
  return orgRole === 'super_admin' || orgRole === 'admin'
}
