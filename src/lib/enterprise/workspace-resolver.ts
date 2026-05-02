// Workspace resolver — picks the right workspace for a memory write.
//
// The trap this fixes: /api/records POST, /api/upload POST, and the
// brain-dump endpoint all default to `requireAuth().workspaceId` which
// is the user's *personal* workspace. When the user is working inside an
// enterprise org and clicks "New memory", they expect that record to be
// visible to their org / show up in admin metrics / surface on the wiki.
// But personal-workspace records are NEVER linked to an org via
// workspace_org_links, so org-scoped read paths (/timeline, /graph,
// /analytics/home, /wiki/*, admin overview) all return zero hits.
//
// resolveTargetWorkspace picks, in priority order:
//   1. An explicit `requestedWorkspaceId` the user has access to
//   2. The first team workspace in the requested org that the user is a
//      member of (via workspaceMembers)
//   3. Any workspace linked to the requested org that the user can see
//      (admin/super_admin auto-access)
//   4. Personal workspace fallback (`fallbackWorkspaceId`)
//
// Returns the resolved workspaceId AND a small reason string so callers
// can surface "saved to <Team> · default for this org" hints.

import { eq, and, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

export type ResolvedWorkspace = {
  workspaceId: string
  source: 'explicit' | 'org-team' | 'org-admin' | 'personal'
  reason: string
}

export async function resolveTargetWorkspace(opts: {
  userId: string
  requestedWorkspaceId?: string | null
  orgId?: string | null
  fallbackWorkspaceId: string
}): Promise<ResolvedWorkspace> {
  const { userId, requestedWorkspaceId, orgId, fallbackWorkspaceId } = opts

  // 1. Explicit request — verify membership before honoring it.
  if (requestedWorkspaceId) {
    const member = await db
      .select({ workspaceId: schema.workspaceMembers.workspaceId })
      .from(schema.workspaceMembers)
      .where(and(
        eq(schema.workspaceMembers.userId, userId),
        eq(schema.workspaceMembers.workspaceId, requestedWorkspaceId),
      ))
      .limit(1)
    if (member[0]) {
      return { workspaceId: requestedWorkspaceId, source: 'explicit', reason: 'requested' }
    }
    // If they asked for a workspace they don't belong to, ignore the
    // request silently and continue resolution. Better than 403'ing.
  }

  // 2. Org team workspace — pick the user's first accessible team in the org.
  if (orgId) {
    const teams = await db
      .select({
        workspaceId: schema.workspaceOrgLinks.workspaceId,
        departmentId: schema.workspaceOrgLinks.departmentId,
      })
      .from(schema.workspaceOrgLinks)
      .innerJoin(
        schema.workspaceMembers,
        eq(schema.workspaceMembers.workspaceId, schema.workspaceOrgLinks.workspaceId),
      )
      .where(and(
        eq(schema.workspaceOrgLinks.organizationId, orgId),
        eq(schema.workspaceMembers.userId, userId),
      ))
      .limit(1)
    if (teams[0]) {
      return {
        workspaceId: teams[0].workspaceId,
        source: 'org-team',
        reason: 'first team workspace in active org',
      }
    }

    // 3. Admin auto-access — super_admin / admin can write to any team
    // workspace in the org even if they're not on the team's member list.
    const role = await db
      .select({ role: schema.organizationMembers.role })
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.userId, userId),
        eq(schema.organizationMembers.organizationId, orgId),
      ))
      .limit(1)
    if (role[0] && (role[0].role === 'super_admin' || role[0].role === 'admin')) {
      const orgWs = await db
        .select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
        .from(schema.workspaceOrgLinks)
        .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
        .limit(1)
      if (orgWs[0]) {
        return {
          workspaceId: orgWs[0].workspaceId,
          source: 'org-admin',
          reason: 'admin auto-access to first org workspace',
        }
      }
    }
  }

  // 4. Personal fallback — the user always has at least their own.
  return { workspaceId: fallbackWorkspaceId, source: 'personal', reason: 'personal workspace' }
}

// Lightweight helper: list every workspace the user can write to in an
// org. Used by the New Memory dialog's team picker so we don't paginate
// or search — there are usually 1-10 teams per org.
export async function listWritableOrgWorkspaces(opts: {
  userId: string
  orgId: string
}): Promise<Array<{ workspaceId: string; departmentId: string | null; name: string; isMember: boolean }>> {
  const { userId, orgId } = opts

  // All workspaces linked to this org
  const orgLinks = await db
    .select({
      workspaceId: schema.workspaceOrgLinks.workspaceId,
      departmentId: schema.workspaceOrgLinks.departmentId,
    })
    .from(schema.workspaceOrgLinks)
    .where(eq(schema.workspaceOrgLinks.organizationId, orgId))

  if (orgLinks.length === 0) return []

  const wsIds = orgLinks.map((l) => l.workspaceId)
  const [memberships, workspaces, role] = await Promise.all([
    db.select({ workspaceId: schema.workspaceMembers.workspaceId })
      .from(schema.workspaceMembers)
      .where(and(
        eq(schema.workspaceMembers.userId, userId),
        inArray(schema.workspaceMembers.workspaceId, wsIds),
      )),
    db.select({ id: schema.workspaces.id, name: schema.workspaces.name })
      .from(schema.workspaces)
      .where(inArray(schema.workspaces.id, wsIds)),
    db.select({ role: schema.organizationMembers.role })
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.userId, userId),
        eq(schema.organizationMembers.organizationId, orgId),
      ))
      .limit(1),
  ])

  const memberSet = new Set(memberships.map((m) => m.workspaceId))
  const wsByName = new Map(workspaces.map((w) => [w.id, w.name]))
  const isAdmin = role[0]?.role === 'super_admin' || role[0]?.role === 'admin'

  return orgLinks
    .filter((l) => isAdmin || memberSet.has(l.workspaceId))
    .map((l) => ({
      workspaceId: l.workspaceId,
      departmentId: l.departmentId,
      name: wsByName.get(l.workspaceId) || 'Untitled team',
      isMember: memberSet.has(l.workspaceId),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
