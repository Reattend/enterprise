import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

const MAX_CHATS = 30

export async function GET() {
  try {
    const { userId } = await requireAuth()
    const chats = await db.query.chatSessions.findMany({
      where: eq(schema.chatSessions.userId, userId),
      orderBy: desc(schema.chatSessions.updatedAt),
      limit: MAX_CHATS,
      columns: { id: true, title: true, updatedAt: true, createdAt: true },
    })
    return NextResponse.json({ chats })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth()
    const { title, messages } = await req.json()

    const id = crypto.randomUUID()
    await db.insert(schema.chatSessions).values({
      id, userId, workspaceId,
      title: title || 'New chat',
      messages: JSON.stringify(messages || []),
    })

    // Enforce rolling 30 limit — delete oldest beyond MAX_CHATS
    const all = await db.query.chatSessions.findMany({
      where: eq(schema.chatSessions.userId, userId),
      orderBy: desc(schema.chatSessions.updatedAt),
      columns: { id: true },
    })
    if (all.length > MAX_CHATS) {
      const toDelete = all.slice(MAX_CHATS).map(c => c.id)
      for (const oldId of toDelete) {
        await db.delete(schema.chatSessions).where(
          and(eq(schema.chatSessions.id, oldId), eq(schema.chatSessions.userId, userId))
        )
      }
    }

    return NextResponse.json({ chat: { id, title, updatedAt: new Date().toISOString() } })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { id, messages, title } = await req.json()

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: any = { updatedAt: new Date().toISOString() }
    if (messages !== undefined) updates.messages = JSON.stringify(messages)
    if (title !== undefined) updates.title = title

    await db.update(schema.chatSessions)
      .set(updates)
      .where(and(eq(schema.chatSessions.id, id), eq(schema.chatSessions.userId, userId)))

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json()

    if (body.all) {
      await db.delete(schema.chatSessions).where(eq(schema.chatSessions.userId, userId))
      return NextResponse.json({ ok: true })
    }

    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await db.delete(schema.chatSessions).where(
      and(eq(schema.chatSessions.id, body.id), eq(schema.chatSessions.userId, userId))
    )
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
