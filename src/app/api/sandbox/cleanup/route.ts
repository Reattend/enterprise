import { NextRequest, NextResponse } from 'next/server'
import { db, schema, sqlite } from '@/lib/db'
import { and, eq, lt, like, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// GET /api/sandbox/cleanup
// Deletes sandbox orgs (slug LIKE 'sandbox-%') older than 1 hour along with
// everything they own: workspaces, records, decisions, policies, users, etc.
//
// Auth: optional bearer token via SANDBOX_CLEANUP_SECRET. If unset, the route
// runs open — which is fine because the operation is scoped strictly to
// sandbox-prefixed orgs. Wire this to a 10-minute cron on the droplet.

const ONE_HOUR_MS = 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.SANDBOX_CLEANUP_SECRET
    if (secret) {
      const auth = req.headers.get('authorization') || ''
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }
    }

    const cutoff = new Date(Date.now() - ONE_HOUR_MS).toISOString()

    // Find sandbox orgs older than cutoff
    const expiredOrgs = await db.select({ id: schema.organizations.id, slug: schema.organizations.slug })
      .from(schema.organizations)
      .where(and(
        like(schema.organizations.slug, 'sandbox-%'),
        lt(schema.organizations.createdAt, cutoff),
      ))

    if (expiredOrgs.length === 0) {
      return NextResponse.json({ deleted: 0, note: 'no expired sandbox orgs' })
    }

    const orgIds = expiredOrgs.map((o) => o.id)

    // Collect sandbox user ids (those whose only membership is to these orgs)
    const memberships = await db.select({
      userId: schema.organizationMembers.userId,
    }).from(schema.organizationMembers)
      .where(inArray(schema.organizationMembers.organizationId, orgIds))
    const candidateUserIds = Array.from(new Set(memberships.map((m) => m.userId)))

    // Collect workspace ids owned by these orgs (via workspace_org_links)
    const linkRows = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(inArray(schema.workspaceOrgLinks.organizationId, orgIds))
    const workspaceIds = Array.from(new Set(linkRows.map((l) => l.workspaceId)))

    // Use a transaction to keep the cascade atomic. Delete leaves first,
    // then the org row. Table cascades help where present but we're explicit.
    const tx = sqlite.transaction(() => {
      if (workspaceIds.length) {
        // records + everything records-scoped cascade via workspace deletion
        // but we nuke known org-scoped tables explicitly too.
        const wsList = workspaceIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')
        sqlite.prepare(`DELETE FROM records WHERE workspace_id IN (${wsList})`).run()
        sqlite.prepare(`DELETE FROM workspace_org_links WHERE workspace_id IN (${wsList})`).run()
        sqlite.prepare(`DELETE FROM workspace_members WHERE workspace_id IN (${wsList})`).run()
        sqlite.prepare(`DELETE FROM workspaces WHERE id IN (${wsList})`).run()
      }

      const orgList = orgIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')
      // Org-scoped tables
      const orgTables = [
        'decisions', 'policies', 'policy_versions', 'policy_acks',
        'agents', 'agent_queries', 'announcements', 'announcement_acks',
        'prompt_library', 'calendar_events', 'exit_interviews', 'ocr_jobs',
        'departments', 'department_members', 'organization_members',
        'audit_log', 'record_views', 'transfer_tasks',
      ]
      for (const t of orgTables) {
        try {
          sqlite.prepare(`DELETE FROM ${t} WHERE organization_id IN (${orgList})`).run()
        } catch { /* table may not exist in this deployment */ }
      }
      // policy_versions sometimes joined via policy_id — safe no-op if
      // policies were cleared first via cascade

      sqlite.prepare(`DELETE FROM organizations WHERE id IN (${orgList})`).run()

      // Finally, sandbox users — only those with no remaining org memberships
      if (candidateUserIds.length) {
        const userList = candidateUserIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')
        sqlite.prepare(`
          DELETE FROM users
          WHERE id IN (${userList})
            AND email LIKE '%@sandbox.reattend.local'
            AND id NOT IN (SELECT user_id FROM organization_members)
        `).run()
      }
    })
    tx()

    return NextResponse.json({
      deleted: expiredOrgs.length,
      orgIds,
      cutoff,
      workspacesRemoved: workspaceIds.length,
      usersRemoved: candidateUserIds.length,
    })
  } catch (err) {
    console.error('[sandbox cleanup]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
