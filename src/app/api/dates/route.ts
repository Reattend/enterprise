import { NextRequest } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, gte, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await requireAuth()

    // Get all workspaces this user belongs to
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)
    if (allWorkspaceIds.length === 0) {
      return Response.json([])
    }

    const today = new Date().toISOString().split('T')[0]

    // Fetch upcoming dates (not done, from today onward)
    const dates = await db.query.recordDates.findMany({
      where: and(
        inArray(schema.recordDates.workspaceId, allWorkspaceIds),
        gte(schema.recordDates.date, today),
        eq(schema.recordDates.done, false),
      ),
      orderBy: schema.recordDates.date,
    })

    // Fetch the associated records for titles
    const recordIds = Array.from(new Set(dates.map(d => d.recordId)))
    const records = recordIds.length > 0
      ? await db.query.records.findMany({
          where: inArray(schema.records.id, recordIds),
        })
      : []
    const recordMap = new Map(records.map(r => [r.id, r]))

    // Fetch workspace names
    const workspaces = await db.query.workspaces.findMany({
      where: inArray(schema.workspaces.id, allWorkspaceIds),
    })
    const wsMap = new Map(workspaces.map(w => [w.id, w.name]))

    const result = dates.map(d => {
      const record = recordMap.get(d.recordId)
      return {
        id: d.id,
        date: d.date,
        label: d.label,
        type: d.type,
        recordId: d.recordId,
        recordTitle: record?.title || 'Unknown',
        recordType: record?.type || 'note',
        workspace: wsMap.get(d.workspaceId) || 'Personal',
      }
    })

    return Response.json(result)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { id, done } = await req.json() as { id: string; done: boolean }

    // Verify ownership via workspace membership
    const dateEntry = await db.query.recordDates.findFirst({
      where: eq(schema.recordDates.id, id),
    })
    if (!dateEntry) return Response.json({ error: 'Not found' }, { status: 404 })

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(schema.workspaceMembers.workspaceId, dateEntry.workspaceId),
        eq(schema.workspaceMembers.userId, userId),
      ),
    })
    if (!membership) return Response.json({ error: 'Forbidden' }, { status: 403 })

    await db.update(schema.recordDates)
      .set({ done })
      .where(eq(schema.recordDates.id, id))

    return Response.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }
}
