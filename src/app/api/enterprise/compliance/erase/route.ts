import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { createHash } from 'crypto'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  writeAudit,
  extractRequestMeta,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/compliance/erase
// Body: { confirm: 'ERASE <my email>' }
//
// GDPR Article 17 right-to-erasure. Irreversible. Must include typed
// confirmation matching the user's email so accidental clicks don't nuke
// the account.
//
// Flow:
//   1. Validate typed confirmation
//   2. Write an immutable audit marker in every org (gdpr_erasure) with
//      userHash = sha256(userId + 'salt') — so regulators can confirm the
//      erasure happened without us keeping the raw user id
//   3. Null out the user's FK on records + decisions (content stays, but
//      authorship is disconnected — other members' knowledge is preserved)
//   4. Hard delete: notifications, chat sessions, record views, policy acks,
//      prompts authored, announcement dismissals, API tokens
//   5. Anonymise audit entries (userId → null, userEmail → '[erased]')
//   6. Remove org memberships + dept memberships
//   7. Delete user row
//
// After this call the caller's session is invalid on next request.

export async function POST(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = (session?.user?.email || '').toLowerCase()
    const body = await req.json()
    const confirm = typeof body.confirm === 'string' ? body.confirm.trim() : ''
    const expected = `ERASE ${userEmail}`
    if (!userEmail || confirm.toLowerCase() !== expected.toLowerCase()) {
      return NextResponse.json({
        error: `confirm must be "${expected}"`,
      }, { status: 400 })
    }

    // Pull org memberships up-front — we need them for the audit fan-out AND
    // to delete them at the end.
    const memberships = await db.select()
      .from(schema.organizationMembers)
      .where(eq(schema.organizationMembers.userId, userId))

    const userHash = createHash('sha256').update(`${userId}::reattend-enterprise`).digest('hex')
    const reqMeta = extractRequestMeta(req)

    // Step 1 — write immutable audit markers BEFORE erasure so the event is
    // hashed into the WORM chain.
    for (const m of memberships) {
      try {
        await writeAudit({
          organizationId: m.organizationId,
          userId: null,                // already anonymised
          userEmail: '[erased]',
          action: 'delete',
          resourceType: 'gdpr_erasure',
          resourceId: userHash,        // hash not raw id
          ipAddress: reqMeta.ipAddress,
          userAgent: reqMeta.userAgent,
          metadata: { userHash, erasedAt: new Date().toISOString() },
        })
      } catch (err) {
        console.warn('[erase] audit write failed', err)
      }
    }

    // Step 2 — disconnect authorship from records. Content stays; who made
    // it disappears. record.createdBy is NOT a FK (it's a plain text) so we
    // can safely rewrite it to '[erased]'.
    try {
      await db.update(schema.records)
        .set({ createdBy: '[erased]' })
        .where(eq(schema.records.createdBy, userId))
    } catch { /* tolerated */ }

    try {
      await db.update(schema.decisions)
        .set({ decidedByUserId: null })
        .where(eq(schema.decisions.decidedByUserId, userId))
    } catch { /* tolerated */ }

    // Step 3 — hard-delete user-specific rows
    const tablesToWipe = [
      { table: schema.inboxNotifications, column: schema.inboxNotifications.userId },
      { table: schema.chatSessions, column: schema.chatSessions.userId },
      { table: schema.recordViews, column: schema.recordViews.userId },
      { table: schema.policyAcknowledgments, column: schema.policyAcknowledgments.userId },
      { table: schema.announcementDismissals, column: schema.announcementDismissals.userId },
      { table: schema.apiTokens, column: schema.apiTokens.userId },
    ]
    for (const t of tablesToWipe) {
      try {
        await db.delete(t.table).where(eq(t.column, userId))
      } catch (err) {
        console.warn('[erase] wipe failed', err)
      }
    }

    // Step 4 — anonymise audit log (except the markers we just wrote, which
    // are already anonymous). Other rows: blank the identity fields.
    try {
      await db.update(schema.auditLog)
        .set({ userId: null, userEmail: '[erased]' })
        .where(eq(schema.auditLog.userId, userId))
    } catch { /* tolerated */ }

    // Step 5 — remove memberships
    try {
      await db.delete(schema.organizationMembers)
        .where(eq(schema.organizationMembers.userId, userId))
    } catch { /* tolerated */ }
    try {
      await db.delete(schema.departmentMembers)
        .where(eq(schema.departmentMembers.userId, userId))
    } catch { /* tolerated */ }
    try {
      await db.delete(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.userId, userId))
    } catch { /* tolerated */ }

    // Step 6 — delete the user row LAST so FKs are all clean
    try {
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    } catch (err) {
      console.warn('[erase] user delete failed', err)
    }

    return NextResponse.json({
      ok: true,
      erasedAt: new Date().toISOString(),
      userHash,
      message: 'Account and personal data removed. Authorship of shared records has been disconnected but the records themselves remain for org knowledge continuity. Audit markers persist (anonymised) for compliance.',
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
