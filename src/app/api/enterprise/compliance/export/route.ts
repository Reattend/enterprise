import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, or } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  writeAudit,
  extractRequestMeta,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/compliance/export
// GDPR / personal-data export. Any authenticated user can pull THEIR OWN
// data — everything we hold that ties back to them. Returns a JSON bundle.
//
// Contents:
//   - user row (email, name, created_at, org memberships)
//   - organizations + roles (what orgs they're in and as what)
//   - authored records (all memories they created)
//   - authored decisions
//   - chat threads (from /api/chats — id, title, messages)
//   - inbox notifications sent to them
//   - policy acknowledgments
//   - audit log entries they appear in
//   - record views they've emitted
//   - exit interviews (theirs)
//   - prompt library entries they authored
//
// Logs an audit event 'export' against every org the user belongs to.

export async function GET(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'

    const me = await db.query.users.findFirst({ where: eq(schema.users.id, userId) })
    const orgMemberships = await db.select()
      .from(schema.organizationMembers)
      .where(eq(schema.organizationMembers.userId, userId))

    const orgs = orgMemberships.length > 0
      ? await db.select().from(schema.organizations).where(
          // OR across all the user's org ids
          or(...orgMemberships.map((m) => eq(schema.organizations.id, m.organizationId))),
        )
      : []

    const authoredRecords = await db.select()
      .from(schema.records)
      .where(eq(schema.records.createdBy, userId))

    const authoredDecisions = await db.select()
      .from(schema.decisions)
      .where(eq(schema.decisions.decidedByUserId, userId))

    const chats = await db.select()
      .from(schema.chatSessions)
      .where(eq(schema.chatSessions.userId, userId))
      .catch(() => [])

    const notifications = await db.select()
      .from(schema.inboxNotifications)
      .where(eq(schema.inboxNotifications.userId, userId))

    const policyAcks = await db.select()
      .from(schema.policyAcknowledgments)
      .where(eq(schema.policyAcknowledgments.userId, userId))
      .catch(() => [])

    const audit = await db.select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.userId, userId))

    const views = await db.select()
      .from(schema.recordViews)
      .where(eq(schema.recordViews.userId, userId))

    const exitInterviews = await db.select()
      .from(schema.exitInterviews)
      .where(eq(schema.exitInterviews.departingUserId, userId))

    const prompts = await db.select()
      .from(schema.promptLibrary)
      .where(eq(schema.promptLibrary.createdByUserId, userId))

    // Audit the export once per org
    const reqMeta = extractRequestMeta(req)
    for (const m of orgMemberships) {
      try {
        await writeAudit({
          organizationId: m.organizationId,
          userId,
          userEmail,
          action: 'export',
          resourceType: 'gdpr_self_export',
          ipAddress: reqMeta.ipAddress,
          userAgent: reqMeta.userAgent,
          metadata: { recordCount: authoredRecords.length, decisionCount: authoredDecisions.length },
        })
      } catch { /* non-fatal */ }
    }

    const bundle = {
      exportedAt: new Date().toISOString(),
      format: 'reattend-enterprise-gdpr-v1',
      user: me,
      orgMemberships,
      organizations: orgs,
      counts: {
        authoredRecords: authoredRecords.length,
        authoredDecisions: authoredDecisions.length,
        chats: chats.length,
        notifications: notifications.length,
        policyAcknowledgments: policyAcks.length,
        auditEntries: audit.length,
        recordViews: views.length,
        exitInterviews: exitInterviews.length,
        promptsAuthored: prompts.length,
      },
      authoredRecords,
      authoredDecisions,
      chats,
      notifications,
      policyAcknowledgments: policyAcks,
      auditLog: audit,
      recordViews: views,
      exitInterviews,
      promptsAuthored: prompts,
    }

    const fileName = `reattend-data-export-${userId.slice(0, 8)}-${Date.now()}.json`
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
