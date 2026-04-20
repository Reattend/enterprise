import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

/**
 * POST /api/records/share
 * Creates a public share link for a record.
 * Body: { recordId }
 * Returns: { shareUrl, shareToken }
 */
export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireAuth()
    const { recordId } = await req.json()
    if (!recordId) return NextResponse.json({ error: 'recordId required' }, { status: 400 })

    const record = await db.query.records.findFirst({
      where: and(eq(schema.records.id, recordId), eq(schema.records.workspaceId, workspaceId)),
    })
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch linked entities via join table
    const recordEntityRows = await db
      .select({ entityId: schema.recordEntities.entityId })
      .from(schema.recordEntities)
      .where(eq(schema.recordEntities.recordId, recordId))
    const entityIds = recordEntityRows.map((r) => r.entityId)
    const entityRows = entityIds.length > 0
      ? await db.select({ kind: schema.entities.kind, name: schema.entities.name })
          .from(schema.entities)
          .where(inArray(schema.entities.id, entityIds))
      : []
    const entities = entityRows

    const meta = record.meta ? JSON.parse(record.meta) : {}
    const tags = record.tags ? JSON.parse(record.tags) : []

    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()

    const [row] = await db.insert(schema.sharedLinks).values({
      title: record.title,
      summary: record.summary,
      content: record.content,
      recordType: record.type,
      tags: JSON.stringify(tags),
      meta: JSON.stringify(meta),
      entities: JSON.stringify(entities),
      userId,
      expiresAt,
    }).returning()

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://reattend.com'
    return NextResponse.json({
      shareUrl: `${baseUrl}/share/${row.shareToken}`,
      shareToken: row.shareToken,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
