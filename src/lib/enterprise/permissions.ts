/**
 * Permission matrix - single source of truth for "what can a role do."
 *
 * Read docs/permissions.md before changing anything in this file. Every API
 * route and every UI button reads from here. The matrix below is the
 * contract between roles and capabilities; if you change a default, also
 * change the doc and the test suite in the same PR.
 *
 * Model: role-default + per-user override (Slack/Notion/Linear shape).
 * - Roles ship with sensible defaults (ROLE_DEFAULTS below).
 * - Per-user overrides live in `organization_member_permission_overrides`
 *   and let an admin grant/revoke individual perms without inventing new roles.
 * - Some permissions are dept-scoped: "own dept only" means the user is
 *   dept_head/manager of that department or one of its ancestors.
 *
 * The `hasPermission()` function below combines these three sources.
 */

import { db } from '../db'
import {
  organizationMembers,
  departmentMembers,
  organizationMemberPermissionOverrides,
  departments,
} from '../db/schema'
import { and, eq } from 'drizzle-orm'

// ─── Role unions ────────────────────────────────────────────────────────

export type OrgRole = 'super_admin' | 'admin' | 'member' | 'guest'
export type DeptRole = 'dept_head' | 'manager' | 'member' | 'viewer'

// ─── Permission keys ────────────────────────────────────────────────────

export type Permission =
  // Org-level management
  | 'org.manage'                     // settings, billing, SSO
  | 'org.members.manage'             // org-wide invite, remove, role change
  | 'org.audit.read'
  | 'org.departments.manage'
  | 'org.read'                       // basic dashboards - every active member
  | 'policies.manage'
  | 'agents.manage'
  | 'decisions.manage'
  | 'records.share.manage'
  | 'records.visibility.change'
  | 'records.verify'
  | 'graph.links.manage'
  | 'wiki.manage'
  | 'integrations.manage'
  | 'analytics.read'
  | 'compose.use'
  | 'calendar.write'

// Scope of a permission grant for a given role:
//   'always'     - granted unconditionally for the role
//   'own_dept'   - granted only for resources in a dept the user manages
//                   (dept_head or manager - for org-level roles, "always" wins)
//   'own_record' - granted only for resources the user created
//   'never'      - not granted by this role
type RoleGrant = 'always' | 'own_dept' | 'own_record' | 'never'

// ─── Role defaults (the matrix) ─────────────────────────────────────────
// Mirrors docs/permissions.md verbatim. Keep in sync.

export const ROLE_DEFAULTS: Record<OrgRole, Partial<Record<Permission, RoleGrant>>> = {
  super_admin: {
    'org.manage': 'always',
    'org.members.manage': 'always',
    'org.audit.read': 'always',
    'org.departments.manage': 'always',
    'org.read': 'always',
    'policies.manage': 'always',
    'agents.manage': 'always',
    'decisions.manage': 'always',
    'records.share.manage': 'always',
    'records.visibility.change': 'always',
    'records.verify': 'always',
    'graph.links.manage': 'always',
    'wiki.manage': 'always',
    'integrations.manage': 'always',
    'analytics.read': 'always',
    'compose.use': 'always',
    'calendar.write': 'always',
  },
  admin: {
    // Same as super_admin EXCEPT org.manage (billing/SSO live with the owner).
    'org.members.manage': 'always',
    'org.audit.read': 'always',
    'org.departments.manage': 'always',
    'org.read': 'always',
    'policies.manage': 'always',
    'agents.manage': 'always',
    'decisions.manage': 'always',
    'records.share.manage': 'always',
    'records.visibility.change': 'always',
    'records.verify': 'always',
    'graph.links.manage': 'always',
    'wiki.manage': 'always',
    'integrations.manage': 'always',
    'analytics.read': 'always',
    'compose.use': 'always',
    'calendar.write': 'always',
  },
  member: {
    'org.read': 'always',
    'records.share.manage': 'own_record',
    'records.visibility.change': 'own_record',
    'records.verify': 'own_record',
    'graph.links.manage': 'own_record',
    'compose.use': 'always',
    'calendar.write': 'always',
  },
  guest: {
    'org.read': 'always',
  },
}

// Dept-role overlay. If the user is a dept_head/manager of the relevant dept
// (or an ancestor), these grants apply on top of their org-role defaults.
// Used only when a permission is checked with a `departmentId` scope.
export const DEPT_ROLE_DEFAULTS: Record<DeptRole, Permission[]> = {
  dept_head: [
    'org.audit.read',           // audit/reports for own dept
    'agents.manage',
    'decisions.manage',
    'records.share.manage',
    'records.visibility.change',
    'records.verify',
    'graph.links.manage',
    'wiki.manage',
    'integrations.manage',
    'analytics.read',
  ],
  manager: [
    'agents.manage',            // managers can manage agents in own dept
    'decisions.manage',
    'records.share.manage',
    'records.visibility.change',
    'records.verify',
    'graph.links.manage',
  ],
  member: [], // dept member has no extra grants beyond org-role defaults
  viewer: [], // viewer is read-only
}

// ─── Public API ─────────────────────────────────────────────────────────

export interface PermissionContext {
  userId: string
  organizationId: string
  /** Optional dept scope - required for dept-scoped checks (own_dept) */
  departmentId?: string | null
  /** Optional record creator id - required for own_record checks */
  recordCreatorUserId?: string | null
}

/**
 * Single source of truth for permission checks. Combines:
 *   1. The user's org role default
 *   2. Their dept role default (if they're in the relevant dept tree)
 *   3. Per-user overrides (org-wide or dept-scoped)
 *
 * Returns true if any source grants the permission AND no override revokes it.
 *
 * For dept-scoped permissions ('own_dept' grants), pass `ctx.departmentId`.
 * For 'own_record' grants, pass `ctx.recordCreatorUserId`.
 */
export async function hasPermission(
  ctx: PermissionContext,
  permission: Permission,
): Promise<boolean> {
  // 1. Org membership must be active
  const memberRows = await db
    .select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, ctx.userId),
      eq(organizationMembers.organizationId, ctx.organizationId),
    ))
    .limit(1)
  const member = memberRows[0]
  if (!member || member.status !== 'active') return false

  // 2. Per-user revoke wins over everything
  const overrides = await db
    .select()
    .from(organizationMemberPermissionOverrides)
    .where(and(
      eq(organizationMemberPermissionOverrides.userId, ctx.userId),
      eq(organizationMemberPermissionOverrides.organizationId, ctx.organizationId),
      eq(organizationMemberPermissionOverrides.permissionKey, permission),
    ))

  // Match overrides whose scope matches what we're checking.
  const matchesScope = (overrideScope: string | null) => {
    if (overrideScope === null) return true // org-wide override always applies
    if (ctx.departmentId && overrideScope === ctx.departmentId) return true
    return false
  }
  const matched = overrides.filter((o) => matchesScope(o.scope))
  if (matched.some((o) => !o.granted)) return false // revoke wins

  // 3. Org-role default
  const orgRole = member.role as OrgRole
  const orgGrant = ROLE_DEFAULTS[orgRole]?.[permission]
  if (orgGrant === 'always') return true
  if (orgGrant === 'own_record' && ctx.recordCreatorUserId === ctx.userId) return true
  if (orgGrant === 'own_dept' && ctx.departmentId) {
    if (await isUserInDeptOrAncestor(ctx.userId, ctx.departmentId)) return true
  }

  // 4. Dept-role grant - only checked if a dept scope was passed
  if (ctx.departmentId) {
    const deptIds = await accessibleDeptIdsForLeadership(ctx.userId, ctx.organizationId)
    if (deptIds.has(ctx.departmentId)) {
      const deptRole = await getDeptLeadershipRole(ctx.userId, ctx.departmentId)
      if (deptRole && DEPT_ROLE_DEFAULTS[deptRole].includes(permission)) return true
    }
  }

  // 5. Per-user grant override
  if (matched.some((o) => o.granted)) return true

  return false
}

/**
 * Synchronous variant - accepts a pre-loaded role + override set so route
 * handlers can avoid a DB roundtrip per check. Use when you already loaded
 * org membership via requireOrgAuth().
 */
export function hasPermissionSync(
  orgRole: OrgRole,
  permission: Permission,
  opts: {
    departmentLeadershipRole?: DeptRole | null  // user's role in the relevant dept (or undefined)
    isInDeptOrAncestor?: boolean                  // user is a dept_head/manager of the dept or an ancestor
    recordCreatorUserId?: string | null
    userId?: string
    overrides?: Array<{ permissionKey: string; scope: string | null; granted: boolean }>
    departmentId?: string | null
  } = {},
): boolean {
  const overrides = (opts.overrides || []).filter((o) => o.permissionKey === permission)
  const matchesScope = (s: string | null) => s === null || (opts.departmentId && s === opts.departmentId)
  const matched = overrides.filter((o) => matchesScope(o.scope))
  if (matched.some((o) => !o.granted)) return false

  const grant = ROLE_DEFAULTS[orgRole]?.[permission]
  if (grant === 'always') return true
  if (grant === 'own_record' && opts.recordCreatorUserId && opts.userId && opts.recordCreatorUserId === opts.userId) return true
  if (grant === 'own_dept' && opts.isInDeptOrAncestor) return true

  if (opts.departmentLeadershipRole && DEPT_ROLE_DEFAULTS[opts.departmentLeadershipRole].includes(permission)) return true

  if (matched.some((o) => o.granted)) return true
  return false
}

// ─── Internal helpers ───────────────────────────────────────────────────

async function getDeptLeadershipRole(userId: string, departmentId: string): Promise<DeptRole | null> {
  // Check if user is a dept_head/manager of THIS dept directly
  const direct = await db
    .select()
    .from(departmentMembers)
    .where(and(
      eq(departmentMembers.userId, userId),
      eq(departmentMembers.departmentId, departmentId),
    ))
    .limit(1)
  if (direct[0]) return direct[0].role as DeptRole

  // Else walk up the parent chain - leadership of an ancestor cascades down
  const dept = await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1)
  if (!dept[0] || !dept[0].parentId) return null
  return getDeptLeadershipRole(userId, dept[0].parentId)
}

/**
 * Set of department IDs where this user is a dept_head/manager either
 * directly or via an ancestor. Used for "own_dept" grants.
 */
async function accessibleDeptIdsForLeadership(userId: string, organizationId: string): Promise<Set<string>> {
  const myMemberships = await db
    .select()
    .from(departmentMembers)
    .where(and(
      eq(departmentMembers.userId, userId),
      eq(departmentMembers.organizationId, organizationId),
    ))
  const leadershipDeptIds = new Set(
    myMemberships
      .filter((m) => m.role === 'dept_head' || m.role === 'manager')
      .map((m) => m.departmentId),
  )
  if (leadershipDeptIds.size === 0) return new Set()

  // Expand to descendants
  const allDepts = await db
    .select({ id: departments.id, parentId: departments.parentId })
    .from(departments)
    .where(eq(departments.organizationId, organizationId))
  const childrenByParent = new Map<string, string[]>()
  for (const d of allDepts) {
    if (!d.parentId) continue
    const list = childrenByParent.get(d.parentId) ?? []
    list.push(d.id)
    childrenByParent.set(d.parentId, list)
  }
  const visited = new Set<string>(Array.from(leadershipDeptIds))
  const queue: string[] = Array.from(leadershipDeptIds)
  while (queue.length) {
    const cur = queue.shift()!
    for (const child of childrenByParent.get(cur) ?? []) {
      if (!visited.has(child)) {
        visited.add(child)
        queue.push(child)
      }
    }
  }
  return visited
}

async function isUserInDeptOrAncestor(userId: string, departmentId: string): Promise<boolean> {
  const role = await getDeptLeadershipRole(userId, departmentId)
  return role === 'dept_head' || role === 'manager'
}

// ─── Convenience: list all permissions a user has (for UI hook + admin UI) ─

export interface PermissionSnapshot {
  orgRole: OrgRole
  /** Permissions granted org-wide (no dept scope needed) */
  orgWide: Permission[]
  /** Permissions granted per-dept (the user's leadership departments) */
  byDepartment: Record<string, Permission[]>
}

/**
 * Compute every permission this user has in this org. Returned as a
 * snapshot the UI can cache for the session - usePermission() reads it
 * synchronously after one fetch.
 */
export async function getPermissionSnapshot(
  userId: string,
  organizationId: string,
): Promise<PermissionSnapshot | null> {
  const memberRows = await db
    .select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, organizationId),
    ))
    .limit(1)
  const member = memberRows[0]
  if (!member || member.status !== 'active') return null
  const orgRole = member.role as OrgRole

  const overrides = await db
    .select()
    .from(organizationMemberPermissionOverrides)
    .where(and(
      eq(organizationMemberPermissionOverrides.userId, userId),
      eq(organizationMemberPermissionOverrides.organizationId, organizationId),
    ))

  const orgWideRevoked = new Set(
    overrides.filter((o) => o.scope === null && !o.granted).map((o) => o.permissionKey as Permission),
  )
  const orgWideGranted = new Set<Permission>()
  for (const [perm, grant] of Object.entries(ROLE_DEFAULTS[orgRole]) as Array<[Permission, RoleGrant]>) {
    if (grant === 'always') orgWideGranted.add(perm)
  }
  for (const o of overrides) {
    if (o.scope === null && o.granted) orgWideGranted.add(o.permissionKey as Permission)
  }
  for (const r of Array.from(orgWideRevoked)) orgWideGranted.delete(r)

  // Department-level grants
  const leadershipDeptIds = await accessibleDeptIdsForLeadership(userId, organizationId)
  const byDepartment: Record<string, Permission[]> = {}
  for (const deptId of Array.from(leadershipDeptIds)) {
    const deptRole = await getDeptLeadershipRole(userId, deptId)
    const deptPerms = new Set<Permission>()
    if (deptRole) for (const p of DEPT_ROLE_DEFAULTS[deptRole]) deptPerms.add(p)
    // Add own_dept grants from org role (e.g. dept_head with org_role=admin already gets these via orgWide)
    for (const [perm, grant] of Object.entries(ROLE_DEFAULTS[orgRole]) as Array<[Permission, RoleGrant]>) {
      if (grant === 'own_dept') deptPerms.add(perm)
    }
    // Apply dept-scoped overrides
    for (const o of overrides) {
      if (o.scope === deptId && o.granted) deptPerms.add(o.permissionKey as Permission)
      if (o.scope === deptId && !o.granted) deptPerms.delete(o.permissionKey as Permission)
    }
    byDepartment[deptId] = Array.from(deptPerms)
  }

  return { orgRole, orgWide: Array.from(orgWideGranted), byDepartment }
}
