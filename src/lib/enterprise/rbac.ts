import { db } from '../db'
import {
  organizationMembers,
  departmentMembers,
  departments,
  workspaceOrgLinks,
} from '../db/schema'
import { and, eq, inArray } from 'drizzle-orm'

export type OrgRole = 'super_admin' | 'admin' | 'member' | 'guest'
export type DeptRole = 'dept_head' | 'manager' | 'member' | 'viewer'

export type OrgPermission =
  | 'org.manage' // edit org settings, SSO, plan
  | 'org.members.manage' // add/remove/change roles
  | 'org.audit.read'
  | 'org.departments.manage'
  | 'org.read' // view org-wide dashboards
  | 'policies.manage' // author/edit/publish policies
  | 'agents.manage' // create/edit/publish agents, mint API keys

export type DeptPermission =
  | 'dept.manage' // edit department settings
  | 'dept.members.manage'
  | 'dept.records.read'
  | 'dept.records.write'
  | 'dept.decisions.manage'

const ORG_ROLE_PERMS: Record<OrgRole, OrgPermission[]> = {
  super_admin: ['org.manage', 'org.members.manage', 'org.audit.read', 'org.departments.manage', 'org.read', 'policies.manage', 'agents.manage'],
  admin: ['org.members.manage', 'org.audit.read', 'org.departments.manage', 'org.read', 'policies.manage', 'agents.manage'],
  member: ['org.read'],
  guest: [],
}

const DEPT_ROLE_PERMS: Record<DeptRole, DeptPermission[]> = {
  dept_head: ['dept.manage', 'dept.members.manage', 'dept.records.read', 'dept.records.write', 'dept.decisions.manage'],
  manager: ['dept.members.manage', 'dept.records.read', 'dept.records.write', 'dept.decisions.manage'],
  member: ['dept.records.read', 'dept.records.write'],
  viewer: ['dept.records.read'],
}

export interface OrgContext {
  userId: string
  organizationId: string
  orgRole: OrgRole
  orgStatus: 'active' | 'suspended' | 'offboarded'
}

export interface DeptContext {
  userId: string
  organizationId: string
  departmentId: string
  deptRole: DeptRole
}

export async function getOrgContext(userId: string, organizationId: string): Promise<OrgContext | null> {
  const rows = await db
    .select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, organizationId),
    ))
    .limit(1)
  const m = rows[0]
  if (!m) return null
  return {
    userId,
    organizationId,
    orgRole: m.role as OrgRole,
    orgStatus: m.status as 'active' | 'suspended' | 'offboarded',
  }
}

export async function getDeptContext(userId: string, departmentId: string): Promise<DeptContext | null> {
  const rows = await db
    .select()
    .from(departmentMembers)
    .where(and(
      eq(departmentMembers.userId, userId),
      eq(departmentMembers.departmentId, departmentId),
    ))
    .limit(1)
  const m = rows[0]
  if (!m) return null
  return {
    userId,
    organizationId: m.organizationId,
    departmentId,
    deptRole: m.role as DeptRole,
  }
}

export function hasOrgPermission(ctx: OrgContext | null, perm: OrgPermission): boolean {
  if (!ctx || ctx.orgStatus !== 'active') return false
  return ORG_ROLE_PERMS[ctx.orgRole].includes(perm)
}

export function hasDeptPermission(ctx: DeptContext | null, perm: DeptPermission): boolean {
  if (!ctx) return false
  return DEPT_ROLE_PERMS[ctx.deptRole].includes(perm)
}

// Combined check: org super_admin/admin bypasses dept-level gates within their org.
export async function canAccessDepartment(userId: string, departmentId: string): Promise<boolean> {
  const dept = await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1)
  if (!dept[0]) return false
  const orgCtx = await getOrgContext(userId, dept[0].organizationId)
  if (orgCtx && orgCtx.orgStatus === 'active' && (orgCtx.orgRole === 'super_admin' || orgCtx.orgRole === 'admin')) {
    return true
  }
  const deptCtx = await getDeptContext(userId, departmentId)
  return deptCtx !== null
}

// Every department a user can see within an org (including descendants via parent chain).
// Super admins/admins see all departments in the org.
export async function listAccessibleDepartmentIds(userId: string, organizationId: string): Promise<string[]> {
  const orgCtx = await getOrgContext(userId, organizationId)
  if (!orgCtx || orgCtx.orgStatus !== 'active') return []

  if (orgCtx.orgRole === 'super_admin' || orgCtx.orgRole === 'admin') {
    const all = await db.select({ id: departments.id }).from(departments).where(eq(departments.organizationId, organizationId))
    return all.map((d) => d.id)
  }

  // Direct memberships
  const direct = await db
    .select({ id: departmentMembers.departmentId })
    .from(departmentMembers)
    .where(and(
      eq(departmentMembers.userId, userId),
      eq(departmentMembers.organizationId, organizationId),
    ))
  const directIds = new Set(direct.map((d) => d.id))
  if (directIds.size === 0) return []

  // Expand to descendants: a dept head/manager sees divisions/teams under their dept.
  const all = await db
    .select({ id: departments.id, parentId: departments.parentId })
    .from(departments)
    .where(eq(departments.organizationId, organizationId))
  const childrenByParent = new Map<string, string[]>()
  for (const d of all) {
    if (!d.parentId) continue
    const list = childrenByParent.get(d.parentId) ?? []
    list.push(d.id)
    childrenByParent.set(d.parentId, list)
  }
  const visited = new Set<string>(directIds)
  const queue: string[] = Array.from(directIds)
  while (queue.length) {
    const cur = queue.shift()!
    for (const child of childrenByParent.get(cur) ?? []) {
      if (!visited.has(child)) {
        visited.add(child)
        queue.push(child)
      }
    }
  }
  return Array.from(visited)
}

// Workspaces the user can access within an org, resolved via dept membership + visibility.
export async function listAccessibleWorkspaceIds(userId: string, organizationId: string): Promise<string[]> {
  const orgCtx = await getOrgContext(userId, organizationId)
  if (!orgCtx || orgCtx.orgStatus !== 'active') return []

  const links = await db
    .select()
    .from(workspaceOrgLinks)
    .where(eq(workspaceOrgLinks.organizationId, organizationId))

  if (orgCtx.orgRole === 'super_admin' || orgCtx.orgRole === 'admin') {
    return links.map((l) => l.workspaceId)
  }

  const orgWide = links.filter((l) => l.visibility === 'org_wide').map((l) => l.workspaceId)
  const deptIds = new Set(await listAccessibleDepartmentIds(userId, organizationId))
  const deptScoped = links
    .filter((l) => l.departmentId && deptIds.has(l.departmentId))
    .map((l) => l.workspaceId)

  return Array.from(new Set([...orgWide, ...deptScoped]))
}

// Throws with a standardized shape for API routes to catch and return 403.
export class ForbiddenError extends Error {
  constructor(public readonly reason: string) {
    super(`Forbidden: ${reason}`)
    this.name = 'ForbiddenError'
  }
}

export function assertOrgPermission(ctx: OrgContext | null, perm: OrgPermission): asserts ctx is OrgContext {
  if (!hasOrgPermission(ctx, perm)) throw new ForbiddenError(`missing org permission: ${perm}`)
}

export function assertDeptPermission(ctx: DeptContext | null, perm: DeptPermission): asserts ctx is DeptContext {
  if (!hasDeptPermission(ctx, perm)) throw new ForbiddenError(`missing dept permission: ${perm}`)
}

// Filter an arbitrary list of department ids down to ones the user can access.
export async function filterToAccessibleDepartments(
  userId: string,
  organizationId: string,
  departmentIds: string[],
): Promise<string[]> {
  if (departmentIds.length === 0) return []
  const accessible = await listAccessibleDepartmentIds(userId, organizationId)
  const accessibleSet = new Set(accessible)
  return departmentIds.filter((id) => accessibleSet.has(id))
}

// Lookup helper: given a workspace id, return the org + dept it belongs to (if any).
export async function resolveWorkspaceOrg(workspaceId: string): Promise<{ organizationId: string; departmentId: string | null } | null> {
  const rows = await db
    .select()
    .from(workspaceOrgLinks)
    .where(eq(workspaceOrgLinks.workspaceId, workspaceId))
    .limit(1)
  const link = rows[0]
  if (!link) return null
  return { organizationId: link.organizationId, departmentId: link.departmentId }
}

// Bulk access check: returns the subset of workspace ids the user can access.
// Useful for filtering search results, memory graph queries, etc.
export async function filterToAccessibleWorkspaces(userId: string, workspaceIds: string[]): Promise<string[]> {
  if (workspaceIds.length === 0) return []
  const links = await db
    .select()
    .from(workspaceOrgLinks)
    .where(inArray(workspaceOrgLinks.workspaceId, workspaceIds))

  // Non-enterprise workspaces (no link row) pass through — the existing
  // workspace_members table governs them. Enterprise-linked ones require org/dept access.
  const enterpriseIds = new Set(links.map((l) => l.workspaceId))
  const passthrough = workspaceIds.filter((id) => !enterpriseIds.has(id))

  const orgIds = Array.from(new Set(links.map((l) => l.organizationId)))
  const allowed: string[] = [...passthrough]
  for (const orgId of orgIds) {
    const accessible = await listAccessibleWorkspaceIds(userId, orgId)
    const accessibleSet = new Set(accessible)
    for (const id of workspaceIds) {
      if (accessibleSet.has(id)) allowed.push(id)
    }
  }
  return Array.from(new Set(allowed))
}
