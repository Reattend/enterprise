import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/notifications/bulk
// Body: { ids: string[], action: 'accept' | 'reject' | 'rescue' | 'dismiss' }
//
// One request for a whole selection. The inbox used to fire two requests per
// item, so approving a screenful meant dozens of round trips and approving a
// filtered set of 500 was simply not practical.
//
// Every action ends with the notification marked done. Ownership is enforced
// per notification - a caller can only act on rows addressed to them, and the
// underlying record/raw-item work is scoped to the notifications that
// survived that check.

const ACTIONS = new Set(['accept', 'reject', 'rescue', 'dismiss'])
const MAX = 1000

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '')
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : []

    if (!ACTIONS.has(action)) {
      return NextResponse.json({ error: 'action must be accept, reject, rescue or dismiss' }, { status: 400 })
    }
    if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })
    if (ids.length > MAX) return NextResponse.json({ error: `at most ${MAX} ids per call` }, { status: 400 })

    // Only rows that belong to the caller. Anything else is silently skipped
    // rather than 403'ing the whole batch, so one stale id cannot block a
    // legitimate bulk action.
    const owned = await db
      .select({
        id: schema.inboxNotifications.id,
        objectType: schema.inboxNotifications.objectType,
        objectId: schema.inboxNotifications.objectId,
      })
      .from(schema.inboxNotifications)
      .where(and(
        eq(schema.inboxNotifications.userId, userId),
        inArray(schema.inboxNotifications.id, ids),
      ))

    if (owned.length === 0) return NextResponse.json({ affected: 0, skipped: ids.length })

    const recordIds = owned.filter((n) => n.objectType === 'record' && n.objectId).map((n) => n.objectId as string)
    const rawItemIds = owned.filter((n) => n.objectType === 'raw_item' && n.objectId).map((n) => n.objectId as string)

    if (action === 'accept' && recordIds.length > 0) {
      // needs_review -> auto_accepted makes them visible in Memories.
      await db.update(schema.records)
        .set({ triageStatus: 'auto_accepted', updatedAt: new Date().toISOString() })
        .where(inArray(schema.records.id, recordIds))
    }

    if (action === 'reject' && recordIds.length > 0) {
      await db.delete(schema.records).where(inArray(schema.records.id, recordIds))
    }

    if (action === 'rescue' && rawItemIds.length > 0) {
      // Back to 'new' so the triage pass picks them up again.
      await db.update(schema.rawItems)
        .set({ status: 'new' })
        .where(inArray(schema.rawItems.id, rawItemIds))
    }

    await db.update(schema.inboxNotifications)
      .set({ status: 'done' })
      .where(and(
        eq(schema.inboxNotifications.userId, userId),
        inArray(schema.inboxNotifications.id, owned.map((n) => n.id)),
      ))

    return NextResponse.json({
      affected: owned.length,
      skipped: ids.length - owned.length,
      records: action === 'accept' || action === 'reject' ? recordIds.length : 0,
      rawItems: action === 'rescue' ? rawItemIds.length : 0,
    })
  } catch (error: unknown) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
