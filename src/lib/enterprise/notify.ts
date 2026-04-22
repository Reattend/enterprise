import { db, schema } from '@/lib/db'
import { eq, and, ne, inArray } from 'drizzle-orm'

// Enterprise notification emission helpers.
//
// Existing cron jobs emit notifications one-by-one. These helpers centralise
// the "create a notification for every member that should care about this
// event" pattern so the decision/policy/transfer paths don't have to
// reimplement membership resolution.

type NotifyType = 'todo' | 'decision_pending' | 'suggestion' | 'mention' | 'system' | 'reminder' | 'needs_review' | 'rejected'

interface NotifyInput {
  type: NotifyType
  title: string
  body?: string | null
  objectType?: string | null
  objectId?: string | null
}

// Notify every member of a department (including dept ancestors so managers
// see decisions made in their sub-teams). Excludes the `excludeUserId` so the
// actor doesn't get notified of their own action.
export async function notifyDepartmentMembers(opts: {
  organizationId: string
  departmentId: string
  workspaceId: string
  excludeUserId?: string
  notification: NotifyInput
}) {
  const { organizationId, departmentId, workspaceId, excludeUserId, notification } = opts

  // Walk ancestor chain — a decision in Team-X is also relevant to Team-X's parent Division.
  const departmentIds = new Set<string>([departmentId])
  let cursorId: string | null = departmentId
  for (let hop = 0; hop < 10 && cursorId; hop++) {
    const row: typeof schema.departments.$inferSelect[] = await db.select()
      .from(schema.departments)
      .where(eq(schema.departments.id, cursorId))
      .limit(1)
    const parent: string | null = row[0]?.parentId ?? null
    if (parent && !departmentIds.has(parent)) {
      departmentIds.add(parent)
      cursorId = parent
    } else {
      cursorId = null
    }
  }

  const memberships = await db.select()
    .from(schema.departmentMembers)
    .where(inArray(schema.departmentMembers.departmentId, Array.from(departmentIds)))

  const recipients = Array.from(new Set(
    memberships
      .filter((m) => m.userId !== excludeUserId)
      .map((m) => m.userId)
  ))

  // Also include org-level admins/super_admins so they see big signals.
  const orgAdmins = await db.select()
    .from(schema.organizationMembers)
    .where(and(
      eq(schema.organizationMembers.organizationId, organizationId),
      eq(schema.organizationMembers.status, 'active'),
    ))
  for (const a of orgAdmins) {
    if ((a.role === 'super_admin' || a.role === 'admin') && a.userId !== excludeUserId) {
      if (!recipients.includes(a.userId)) recipients.push(a.userId)
    }
  }

  if (recipients.length === 0) return { emitted: 0 }

  // One row per recipient. Fire-and-forget — individual failures don't block
  // the caller (decisions + policies already committed to their own rows).
  let emitted = 0
  for (const userId of recipients) {
    try {
      await db.insert(schema.inboxNotifications).values({
        workspaceId,
        userId,
        type: notification.type,
        title: notification.title,
        body: notification.body ?? null,
        objectType: notification.objectType ?? null,
        objectId: notification.objectId ?? null,
      })
      emitted += 1
    } catch (err) {
      console.warn('[notify] insert failed', { userId, err })
    }
  }
  return { emitted }
}

// Notify every active member of an org. Used for things like "a new policy
// was published — please acknowledge."
export async function notifyOrgMembers(opts: {
  organizationId: string
  workspaceId: string
  excludeUserId?: string
  notification: NotifyInput
}) {
  const { organizationId, workspaceId, excludeUserId, notification } = opts

  const members = await db.select()
    .from(schema.organizationMembers)
    .where(and(
      eq(schema.organizationMembers.organizationId, organizationId),
      eq(schema.organizationMembers.status, 'active'),
      excludeUserId ? ne(schema.organizationMembers.userId, excludeUserId) : undefined,
    ))

  let emitted = 0
  for (const m of members) {
    try {
      await db.insert(schema.inboxNotifications).values({
        workspaceId,
        userId: m.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body ?? null,
        objectType: notification.objectType ?? null,
        objectId: notification.objectId ?? null,
      })
      emitted += 1
    } catch (err) {
      console.warn('[notify] insert failed', { userId: m.userId, err })
    }
  }
  return { emitted }
}
