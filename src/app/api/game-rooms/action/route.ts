import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

// POST — Submit a game action
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, playerId, actionType, payload } = body

    if (!code || !playerId || !actionType) {
      return NextResponse.json(
        { error: 'code, playerId, and actionType are required' },
        { status: 400 }
      )
    }

    // Look up room by code
    const room = db
      .select()
      .from(schema.gameRooms)
      .where(eq(schema.gameRooms.code, code))
      .get()

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Reject if room is finished
    if (room.status === 'finished') {
      return NextResponse.json(
        { error: 'This game has already finished' },
        { status: 400 }
      )
    }

    // Insert the action
    const now = new Date().toISOString()
    const actionId = crypto.randomUUID()

    db.insert(schema.gameActions).values({
      id: actionId,
      roomId: room.id,
      playerId,
      actionType,
      payload: JSON.stringify(payload || {}),
      createdAt: now,
    }).run()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
