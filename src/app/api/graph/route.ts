import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const { workspaceId } = await requireAuth()

    const [allRecords, allLinks] = await Promise.all([
      db.query.records.findMany({
        where: eq(schema.records.workspaceId, workspaceId),
      }),
      db.query.recordLinks.findMany({
        where: eq(schema.recordLinks.workspaceId, workspaceId),
      }),
    ])

    const nodes = allRecords.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      summary: r.summary,
      confidence: r.confidence ?? 0.5,
      tags: r.tags,
      createdAt: r.createdAt,
    }))

    const recordIdSet = new Set(allRecords.map((r) => r.id))

    const edges = allLinks
      .filter((l) => recordIdSet.has(l.fromRecordId) && recordIdSet.has(l.toRecordId))
      .map((l) => ({
        id: l.id,
        from: l.fromRecordId,
        to: l.toRecordId,
        kind: l.kind,
        weight: l.weight ?? 0.5,
        explanation: l.explanation,
      }))

    return NextResponse.json({ nodes, edges })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
