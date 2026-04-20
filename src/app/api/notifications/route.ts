import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc, sql, or, isNull, inArray, ne } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth()
    const params = req.nextUrl.searchParams
    const status = params.get('status') // 'unread' | 'read' | 'done' | null (all)
    const tab = params.get('tab') // 'inbox' | 'rejected' | null (all)
    const limit = parseInt(params.get('limit') || '50')
    const offset = parseInt(params.get('offset') || '0')

    const now = new Date().toISOString()
    const global = params.get('global') === 'true'

    const conditions = [
      eq(schema.inboxNotifications.userId, userId),
    ]

    // Only filter by workspace if not global
    if (!global) {
      conditions.push(eq(schema.inboxNotifications.workspaceId, workspaceId))
    }

    if (status) {
      conditions.push(eq(schema.inboxNotifications.status, status as any))
    }

    // Tab filtering
    if (tab === 'inbox') {
      // Inbox: actionable types only, exclude done
      conditions.push(inArray(schema.inboxNotifications.type, ['needs_review', 'todo', 'decision_pending', 'reminder']))
      conditions.push(ne(schema.inboxNotifications.status, 'done'))
    } else if (tab === 'rejected') {
      conditions.push(inArray(schema.inboxNotifications.type, ['rejected']))
    }

    // Exclude snoozed notifications (snoozedUntil is in the future) — but not for rejected tab
    if (tab !== 'rejected') {
      conditions.push(
        or(
          isNull(schema.inboxNotifications.snoozedUntil),
          sql`${schema.inboxNotifications.snoozedUntil} <= ${now}`,
        )!
      )
    }

    const notifications = await db.query.inboxNotifications.findMany({
      where: and(...conditions),
      orderBy: desc(schema.inboxNotifications.createdAt),
      limit,
      offset,
    })

    // If global, enrich with workspace name
    let enriched = notifications
    if (global && notifications.length > 0) {
      const wsIds = Array.from(new Set(notifications.map(n => n.workspaceId)))
      const workspaces = await Promise.all(
        wsIds.map(id => db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, id) }))
      )
      const wsMap = Object.fromEntries(workspaces.filter(Boolean).map(w => [w!.id, w!.name]))
      enriched = notifications.map(n => ({ ...n, workspaceName: wsMap[n.workspaceId] || 'Unknown' }))
    }

    return NextResponse.json({ notifications: enriched, total: enriched.length })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { id, ids, status, snoozedUntil } = await req.json()

    if (!status || !['unread', 'read', 'done'].includes(status)) {
      return NextResponse.json({ error: 'status must be "unread", "read" or "done"' }, { status: 400 })
    }

    // Support both single id and bulk ids
    const targetIds: string[] = ids || (id ? [id] : [])
    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'id or ids required' }, { status: 400 })
    }

    const updates: any = { status }
    if (snoozedUntil) {
      updates.snoozedUntil = snoozedUntil
    }

    for (const notifId of targetIds) {
      await db.update(schema.inboxNotifications)
        .set(updates)
        .where(
          and(
            eq(schema.inboxNotifications.id, notifId),
            eq(schema.inboxNotifications.userId, userId),
          )
        )
    }

    return NextResponse.json({ message: `${targetIds.length} notification(s) marked as ${status}` })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
