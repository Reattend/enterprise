import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { handleEnterpriseError } from '@/lib/enterprise'

// POST /api/enterprise/graph/links
// Creates a manual record_link (user-drawn on the graph).
// Body: { fromRecordId, toRecordId, kind?, explanation? }
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json()
    const { fromRecordId, toRecordId, kind, explanation } = body as {
      fromRecordId?: string
      toRecordId?: string
      kind?: string
      explanation?: string
    }
    if (!fromRecordId || !toRecordId) {
      return NextResponse.json({ error: 'fromRecordId + toRecordId required' }, { status: 400 })
    }
    if (fromRecordId === toRecordId) {
      return NextResponse.json({ error: 'self-link not allowed' }, { status: 400 })
    }

    const valid = new Set(['same_topic', 'depends_on', 'contradicts', 'continuation_of', 'same_people', 'causes', 'temporal', 'related_to', 'leads_to', 'supports', 'part_of', 'blocks'])
    const finalKind = (kind && valid.has(kind)) ? kind : 'related_to'

    // Validate both records exist and belong to a workspace the user is a member of
    const fromRec = await db.select().from(schema.records).where(eq(schema.records.id, fromRecordId)).limit(1)
    const toRec = await db.select().from(schema.records).where(eq(schema.records.id, toRecordId)).limit(1)
    if (!fromRec[0] || !toRec[0]) return NextResponse.json({ error: 'record not found' }, { status: 404 })

    const mem = await db
      .select()
      .from(schema.workspaceMembers)
      .where(and(
        eq(schema.workspaceMembers.userId, userId),
        eq(schema.workspaceMembers.workspaceId, fromRec[0].workspaceId),
      ))
      .limit(1)
    if (!mem[0]) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const id = crypto.randomUUID()
    await db.insert(schema.recordLinks).values({
      id,
      workspaceId: fromRec[0].workspaceId,
      fromRecordId,
      toRecordId,
      kind: finalKind as 'same_topic' | 'depends_on' | 'contradicts' | 'continuation_of' | 'same_people' | 'causes' | 'temporal' | 'related_to' | 'leads_to' | 'supports' | 'part_of' | 'blocks',
      weight: 0.7,
      explanation: explanation ?? null,
      createdBy: userId,
    })

    return NextResponse.json({ id, kind: finalKind })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// DELETE /api/enterprise/graph/links?id=...
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const rows = await db.select().from(schema.recordLinks).where(eq(schema.recordLinks.id, id)).limit(1)
    const link = rows[0]
    if (!link) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const mem = await db
      .select()
      .from(schema.workspaceMembers)
      .where(and(
        eq(schema.workspaceMembers.userId, userId),
        eq(schema.workspaceMembers.workspaceId, link.workspaceId),
      ))
      .limit(1)
    if (!mem[0]) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    await db.delete(schema.recordLinks).where(eq(schema.recordLinks.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
