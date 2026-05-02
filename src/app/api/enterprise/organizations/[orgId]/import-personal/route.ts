// One-time migration: move records from the calling user's personal
// workspace into a team workspace inside this org.
//
// Why this exists: before src/lib/enterprise/workspace-resolver.ts was
// wired, /api/records and /api/upload defaulted every new memory to the
// user's personal workspace. Org-scoped read paths (/timeline, /graph,
// /analytics/home, /wiki/*, admin overview) only query workspaces that
// have a workspace_org_links row, so personal-workspace records were
// invisible to org views — even though the user could see them on the
// Memories page (Rule 8 of RBAC: workspace_members).
//
// GET → preview: { eligibleCount, targetWorkspace: { id, name } | null }
// POST → execute: { moved, targetWorkspace: { id, name } }

import { NextRequest, NextResponse } from 'next/server'
import { eq, and, isNotNull } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { resolveTargetWorkspace } from '@/lib/enterprise/workspace-resolver'
import { writeAuditAsync } from '@/lib/enterprise/audit'

async function findEligibleAndTarget(opts: { userId: string; orgId: string }) {
  const { userId, orgId } = opts

  // The user's personal workspace = the one they were created with. We
  // recover it via requireAuth in the routes; pass it in instead.
  // Here we resolve it from workspace_members where role = 'owner' and
  // the workspace has no org-link rows.
  const ownedRows = await db
    .select({ workspaceId: schema.workspaceMembers.workspaceId })
    .from(schema.workspaceMembers)
    .where(and(
      eq(schema.workspaceMembers.userId, userId),
      eq(schema.workspaceMembers.role, 'owner'),
    ))
  const ownedIds = ownedRows.map((r) => r.workspaceId)
  if (ownedIds.length === 0) {
    return { personalWorkspaceIds: [], eligibleCount: 0, target: null as { id: string; name: string } | null }
  }

  // Of those owned workspaces, drop any that are linked to ANY org —
  // those aren't "personal" anymore, they're team-backing workspaces.
  const links = await db
    .select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
    .from(schema.workspaceOrgLinks)
    .where(isNotNull(schema.workspaceOrgLinks.workspaceId))
  const linkedSet = new Set(links.map((l) => l.workspaceId))
  const personalIds = ownedIds.filter((id) => !linkedSet.has(id))
  if (personalIds.length === 0) {
    return { personalWorkspaceIds: [], eligibleCount: 0, target: null as { id: string; name: string } | null }
  }

  // Resolve the target team workspace inside the org.
  const resolved = await resolveTargetWorkspace({
    userId,
    orgId,
    fallbackWorkspaceId: personalIds[0], // dummy fallback — we ignore it if 'personal' is the source
  })
  if (resolved.source === 'personal') {
    // No team workspace available in this org for this user.
    return { personalWorkspaceIds: personalIds, eligibleCount: 0, target: null as { id: string; name: string } | null }
  }

  // Count records authored by this user in their personal workspaces.
  let count = 0
  for (const wsId of personalIds) {
    const rows = await db
      .select({ id: schema.records.id })
      .from(schema.records)
      .where(and(
        eq(schema.records.workspaceId, wsId),
        eq(schema.records.createdBy, userId),
      ))
    count += rows.length
  }

  // Resolve the target workspace name for the banner copy.
  const targetWs = await db
    .select({ id: schema.workspaces.id, name: schema.workspaces.name })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, resolved.workspaceId))
    .limit(1)

  return {
    personalWorkspaceIds: personalIds,
    eligibleCount: count,
    target: targetWs[0] ? { id: targetWs[0].id, name: targetWs[0].name } : null,
  }
}

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    const { userId } = await requireAuth()
    const { eligibleCount, target } = await findEligibleAndTarget({ userId, orgId: params.orgId })
    return NextResponse.json({ eligibleCount, targetWorkspace: target })
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    const { userId } = await requireAuth()
    const { personalWorkspaceIds, eligibleCount, target } =
      await findEligibleAndTarget({ userId, orgId: params.orgId })

    if (eligibleCount === 0 || !target) {
      return NextResponse.json({ moved: 0, targetWorkspace: target })
    }

    // Bulk-update each personal workspace's user-authored records to point
    // at the team workspace. Only the user's own records are moved — never
    // touch records authored by anyone else who happens to share the
    // workspace (which shouldn't happen for personal, but defense in depth).
    let moved = 0
    for (const wsId of personalWorkspaceIds) {
      const result = await db
        .update(schema.records)
        .set({ workspaceId: target.id })
        .where(and(
          eq(schema.records.workspaceId, wsId),
          eq(schema.records.createdBy, userId),
        ))
      // drizzle-better-sqlite3 returns { changes }
      const changes = (result as { changes?: number }).changes ?? 0
      moved += changes
    }

    // Audit-log the bulk move so the action is traceable. Best-effort.
    writeAuditAsync({
      organizationId: params.orgId,
      userId,
      userEmail: req.headers.get('x-user-email') || 'unknown',
      action: 'admin_action',
      resourceType: 'record',
      metadata: {
        kind: 'import-personal-memories',
        moved,
        targetWorkspaceId: target.id,
      },
    })

    return NextResponse.json({ moved, targetWorkspace: target })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
