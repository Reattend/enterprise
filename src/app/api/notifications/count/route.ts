import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, sql, or, isNull, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

// Only types that are actually actionable by the user. System notifications
// (failed jobs, etc.) are surfaced elsewhere, not in the "flagged for review"
// banner — otherwise users see a banner about items they can't action from
// the inbox page.
// Typed as the column's literal union so drizzle's inArray() accepts it.
// A plain string[] gets rejected; `as const` gives a readonly tuple which
// drizzle also rejects — it wants a mutable array of the enum literals.
type NotificationType = 'needs_review' | 'todo' | 'decision_pending' | 'reminder'
const ACTIONABLE_TYPES: NotificationType[] = ['needs_review', 'todo', 'decision_pending', 'reminder']

export async function GET() {
  try {
    const { userId } = await requireAuth()

    const now = new Date().toISOString()

    // Count unread ACTIONABLE notifications across ALL workspaces for this user.
    // Must stay in sync with /api/notifications (the list the inbox page shows)
    // so the banner count matches what the user actually sees when they click.
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.inboxNotifications)
      .where(
        and(
          eq(schema.inboxNotifications.userId, userId),
          eq(schema.inboxNotifications.status, 'unread'),
          inArray(schema.inboxNotifications.type, ACTIONABLE_TYPES),
          or(
            isNull(schema.inboxNotifications.snoozedUntil),
            sql`${schema.inboxNotifications.snoozedUntil} <= ${now}`,
          ),
        )
      )

    const count = result[0]?.count ?? 0

    return NextResponse.json({ count })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
