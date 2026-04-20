import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

// POST /api/board/artifacts — create a record + optionally a recordLink from board
export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireAuth()
    const body = await req.json()
    const { action } = body

    if (action === 'create-node') {
      const { id, title, content, nodeType } = body
      if (!id || !title) {
        return NextResponse.json({ error: 'id and title required' }, { status: 400 })
      }

      // Map board node types to record types
      const typeMap: Record<string, string> = {
        sticky: 'note',
        text: 'note',
        rectangle: 'note',
        diamond: 'note',
        circle: 'note',
        image: 'note',
        link: 'note',
        embed: 'note',
        drawing: 'note',
      }

      await db.insert(schema.records).values({
        id,
        workspaceId,
        type: (typeMap[nodeType] || 'note') as any,
        title,
        summary: content || title,
        content: content || title,
        confidence: 0.8,
        tags: JSON.stringify([`board:${nodeType}`]),
        createdBy: userId,
      })

      return NextResponse.json({ ok: true, id })
    }

    if (action === 'create-link') {
      const { sourceId, targetId, kind, explanation } = body
      if (!sourceId || !targetId || !kind) {
        return NextResponse.json({ error: 'sourceId, targetId, kind required' }, { status: 400 })
      }

      // Verify both records exist
      const [source, target] = await Promise.all([
        db.query.records.findFirst({ where: and(eq(schema.records.id, sourceId), eq(schema.records.workspaceId, workspaceId)) }),
        db.query.records.findFirst({ where: and(eq(schema.records.id, targetId), eq(schema.records.workspaceId, workspaceId)) }),
      ])

      if (!source || !target) {
        return NextResponse.json({ error: 'One or both nodes not found as records' }, { status: 404 })
      }

      await db.insert(schema.recordLinks).values({
        workspaceId,
        fromRecordId: sourceId,
        toRecordId: targetId,
        kind: kind as any,
        weight: 0.8,
        explanation: explanation || kind.replace(/_/g, ' '),
        createdBy: userId,
      })

      return NextResponse.json({ ok: true })
    }

    if (action === 'update-node') {
      const { id, title, content } = body
      if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 })
      }

      const updates: any = { updatedAt: new Date().toISOString() }
      if (title !== undefined) updates.title = title
      if (content !== undefined) {
        updates.content = content
        updates.summary = content
      }

      await db.update(schema.records).set(updates).where(
        and(eq(schema.records.id, id), eq(schema.records.workspaceId, workspaceId))
      )

      return NextResponse.json({ ok: true })
    }

    if (action === 'delete-node') {
      const { id } = body
      if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 })
      }

      // Delete the record (cascades to recordLinks, recordEntities, embeddings, etc.)
      await db.delete(schema.records).where(
        and(eq(schema.records.id, id), eq(schema.records.workspaceId, workspaceId))
      )

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
