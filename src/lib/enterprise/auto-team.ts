// Auto-team provisioning — every org needs at least one team-kind
// department so that workspace-scoped memory has somewhere to land.
//
// Without this, the Capture flow falls back to the user's personal
// workspace (RBAC rule 8) and org-scoped views (home, landscape,
// cockpit) read zero records.
//
// `provisionDefaultTeam` is idempotent at the slug level — call it
// during org creation and again as part of a backfill. If a team
// with the same slug already exists, it returns the existing one.

import crypto from 'crypto'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

export type ProvisionedTeam = {
  departmentId: string
  workspaceId: string
  alreadyExisted: boolean
}

export async function provisionDefaultTeam(opts: {
  organizationId: string
  ownerUserId: string
  name?: string   // defaults to "General"
  slug?: string   // defaults to "general"
}): Promise<ProvisionedTeam> {
  const { organizationId, ownerUserId } = opts
  const name = (opts.name || 'General').trim()
  const slug = (opts.slug || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // Idempotency — if a team-slug already exists in this org, reuse it.
  const existingDept = await db
    .select()
    .from(schema.departments)
    .where(and(
      eq(schema.departments.organizationId, organizationId),
      eq(schema.departments.slug, slug),
    ))
    .limit(1)
  if (existingDept[0]) {
    const existingLink = await db
      .select()
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.departmentId, existingDept[0].id))
      .limit(1)
    if (existingLink[0]) {
      return {
        departmentId: existingDept[0].id,
        workspaceId: existingLink[0].workspaceId,
        alreadyExisted: true,
      }
    }
    // Edge case: dept exists but no workspace link. Heal it by creating
    // the missing pieces in the same flow below, reusing the dept id.
  }

  const departmentId = existingDept[0]?.id ?? crypto.randomUUID()
  const workspaceId = crypto.randomUUID()

  if (!existingDept[0]) {
    await db.insert(schema.departments).values({
      id: departmentId,
      organizationId,
      parentId: null,
      kind: 'team',
      name,
      slug,
      headUserId: ownerUserId,
      description: 'Default team auto-created so memories have a home in this org.',
    })
    // Founding head record
    await db.insert(schema.departmentMembers).values({
      departmentId,
      organizationId,
      userId: ownerUserId,
      role: 'dept_head',
    })
  }

  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name,
    type: 'team',
    createdBy: ownerUserId,
  })
  await db.insert(schema.workspaceMembers).values({
    workspaceId,
    userId: ownerUserId,
    role: 'owner',
  })
  await db.insert(schema.projects).values({
    workspaceId,
    name: 'Unassigned',
    description: 'Memories not yet assigned to a project',
    isDefault: true,
    color: '#94a3b8',
  })
  await db.insert(schema.workspaceOrgLinks).values({
    workspaceId,
    organizationId,
    departmentId,
    visibility: 'department_only',
  })

  return { departmentId, workspaceId, alreadyExisted: false }
}

// One-shot backfill — for every org that currently has zero
// workspace_org_links, provision a "General" team owned by the org's
// founding super_admin. Returns a summary so the caller can log/audit it.
export async function backfillOrgsMissingTeams(): Promise<Array<{ organizationId: string; orgName: string; result: ProvisionedTeam | { error: string } }>> {
  const orgs = await db
    .select({ id: schema.organizations.id, name: schema.organizations.name })
    .from(schema.organizations)
  const links = await db
    .select({ organizationId: schema.workspaceOrgLinks.organizationId })
    .from(schema.workspaceOrgLinks)
  const orgsWithLinks = new Set(links.map((l) => l.organizationId))

  const results: Array<{ organizationId: string; orgName: string; result: ProvisionedTeam | { error: string } }> = []

  for (const org of orgs) {
    if (orgsWithLinks.has(org.id)) continue
    // Pick the founding super_admin as owner. Fall back to any admin.
    const owner = await db
      .select({ userId: schema.organizationMembers.userId })
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, org.id),
        eq(schema.organizationMembers.role, 'super_admin'),
      ))
      .limit(1)
    const ownerId = owner[0]?.userId
    if (!ownerId) {
      results.push({ organizationId: org.id, orgName: org.name, result: { error: 'no super_admin to own the team' } })
      continue
    }
    try {
      const result = await provisionDefaultTeam({ organizationId: org.id, ownerUserId: ownerId })
      results.push({ organizationId: org.id, orgName: org.name, result })
    } catch (e) {
      results.push({ organizationId: org.id, orgName: org.name, result: { error: (e as Error).message } })
    }
  }
  return results
}
