import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth()
    const chat = await db.query.chatSessions.findFirst({
      where: and(
        eq(schema.chatSessions.id, params.id),
        eq(schema.chatSessions.userId, userId),
      ),
    })
    if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let messages = []
    try { messages = JSON.parse(chat.messages) } catch {}

    return NextResponse.json({ chat: { ...chat, messages } })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
