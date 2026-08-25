import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireSuperAdmin } from '@/lib/admin/auth'

/**
 * DELETE /api/admin/delete-user
 * Body: { email, confirm: '<email>' }
 *
 * Superadmin-only hard delete, mainly for freeing up an email during
 * testing (registration now always creates an org, so there's no
 * lightweight "just wipe the account" path left otherwise).
 *
 * Every table with a FK to users.id or workspaces.id has foreign_keys=ON
 * and mostly onDelete:'cascade' (see schema.ts) - but organizations.createdBy
 * and workspaces.createdBy are NOT cascaded (deliberately - deleting a
 * person shouldn't silently vanish an org's data). So the order that
 * actually works:
 *   1. Delete every workspace this user created - cascades all
 *      workspace-scoped rows (records, embeddings, chats, etc.) AND the
 *      workspace_org_links row for it.
 *   2. Delete every organization this user created - cascades everything
 *      still org-scoped (departments, decisions, policies, ai_provider_keys,
 *      audit log, etc.) that step 1 didn't already remove.
 *   3. Same cleanup as the self-service /api/enterprise/compliance/erase
 *      route for anything left: anonymise authorship on records/decisions
 *      NOT already deleted (created in someone else's org), wipe personal
 *      rows, drop memberships.
 *   4. Delete the user row - and actually check whether it worked, unlike
 *      the self-service route which swallows this error.
 *
 * This is a blunt admin tool, not the GDPR erasure flow - it deletes
 * organizations wholesale rather than preserving them for other members.
 * Fine for a test account nobody else is in; would be wrong for a real
 * customer's admin account with a live team. Confirm before using on
 * anything that isn't obviously a throwaway test signup.
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    const confirm = typeof body.confirm === 'string' ? body.confirm.toLowerCase().trim() : ''
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    if (confirm !== email) {
      return NextResponse.json({ error: `confirm must exactly match the email: "${email}"` }, { status: 400 })
    }

    const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const userId = user.id

    const deletedWorkspaces: string[] = []
    const deletedOrgs: string[] = []

    // Step 1 - workspaces this user created (personal or team, org-linked
    // or not). Cascades records/embeddings/chats/etc. for each.
    const ownedWorkspaces = await db.select({ id: schema.workspaces.id })
      .from(schema.workspaces).where(eq(schema.workspaces.createdBy, userId))
    for (const ws of ownedWorkspaces) {
      try {
        await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws.id))
        deletedWorkspaces.push(ws.id)
      } catch (err) {
        console.warn('[admin.delete-user] workspace delete failed', ws.id, err)
      }
    }

    // Step 2 - organizations this user created. Cascades whatever's still
    // org-scoped that step 1 didn't reach.
    const ownedOrgs = await db.select({ id: schema.organizations.id })
      .from(schema.organizations).where(eq(schema.organizations.createdBy, userId))
    for (const org of ownedOrgs) {
      try {
        await db.delete(schema.organizations).where(eq(schema.organizations.id, org.id))
        deletedOrgs.push(org.id)
      } catch (err) {
        console.warn('[admin.delete-user] org delete failed', org.id, err)
      }
    }

    // Step 3 - same shape as compliance/erase: disconnect authorship on
    // anything left (content in orgs/workspaces this user didn't own),
    // then wipe personal rows and memberships.
    try {
      await db.update(schema.records).set({ createdBy: '[deleted]' }).where(eq(schema.records.createdBy, userId))
    } catch { /* tolerated */ }
    try {
      await db.update(schema.decisions).set({ decidedByUserId: null }).where(eq(schema.decisions.decidedByUserId, userId))
    } catch { /* tolerated */ }

    const tablesToWipe = [
      { table: schema.inboxNotifications, column: schema.inboxNotifications.userId },
      { table: schema.chatSessions, column: schema.chatSessions.userId },
      { table: schema.recordViews, column: schema.recordViews.userId },
      { table: schema.policyAcknowledgments, column: schema.policyAcknowledgments.userId },
      { table: schema.announcementDismissals, column: schema.announcementDismissals.userId },
      { table: schema.apiTokens, column: schema.apiTokens.userId },
    ]
    for (const t of tablesToWipe) {
      try { await db.delete(t.table).where(eq(t.column, userId)) } catch (err) { console.warn('[admin.delete-user] wipe failed', err) }
    }

    try {
      await db.update(schema.auditLog).set({ userId: null, userEmail: '[deleted]' }).where(eq(schema.auditLog.userId, userId))
    } catch { /* tolerated */ }

    try { await db.delete(schema.organizationMembers).where(eq(schema.organizationMembers.userId, userId)) } catch { /* tolerated */ }
    try { await db.delete(schema.departmentMembers).where(eq(schema.departmentMembers.userId, userId)) } catch { /* tolerated */ }
    try { await db.delete(schema.workspaceMembers).where(eq(schema.workspaceMembers.userId, userId)) } catch { /* tolerated */ }
    try { await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, userId)) } catch { /* tolerated */ }

    // Step 4 - delete the user row. Unlike compliance/erase, actually
    // verify it worked - if some FK we didn't anticipate still points at
    // this user, the admin needs to know the email isn't actually free yet.
    await db.delete(schema.users).where(eq(schema.users.id, userId))
    const stillExists = await db.query.users.findFirst({ where: eq(schema.users.id, userId) })

    if (stillExists) {
      return NextResponse.json({
        ok: false,
        error: 'delete_incomplete',
        message: `Deleted ${deletedWorkspaces.length} workspace(s) and ${deletedOrgs.length} org(s), but the user row itself is still referenced by something and could not be removed. Check server logs.`,
      }, { status: 409 })
    }

    return NextResponse.json({
      ok: true,
      message: `${email} deleted - ${deletedOrgs.length} org(s) and ${deletedWorkspaces.length} workspace(s) removed with it. Email is free to sign up again.`,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
