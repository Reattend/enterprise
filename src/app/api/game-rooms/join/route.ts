import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

// POST — Player joins a room
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, playerName, playerId } = body

    if (!code || !playerName || !playerId) {
      return NextResponse.json(
        { error: 'code, playerName, and playerId are required' },
        { status: 400 }
      )
    }

    // Look up room by code
    const room = db
      .select()
      .from(schema.gameRooms)
      .where(eq(schema.gameRooms.code, code.toUpperCase()))
      .get()

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check if room is expired
    if (new Date(room.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Room has expired' },
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

    // Check if player already joined
    const existingPlayer = db
      .select()
      .from(schema.gamePlayers)
      .where(
        and(
          eq(schema.gamePlayers.roomId, room.id),
          eq(schema.gamePlayers.playerId, playerId)
        )
      )
      .get()

    if (existingPlayer) {
      // Update name and lastSeenAt, return existing
      const now = new Date().toISOString()
      db.update(schema.gamePlayers)
        .set({ name: playerName, lastSeenAt: now })
        .where(eq(schema.gamePlayers.id, existingPlayer.id))
        .run()

      const parsedRoom = {
        ...room,
        state: JSON.parse(room.state || '{}'),
        config: room.config ? JSON.parse(room.config) : null,
      }

      return NextResponse.json({
        room: parsedRoom,
        player: { ...existingPlayer, name: playerName, lastSeenAt: now },
      })
    }

    // Check player count against maxPlayers
    const currentPlayers = db
      .select()
      .from(schema.gamePlayers)
      .where(eq(schema.gamePlayers.roomId, room.id))
      .all()

    if (currentPlayers.length >= (room.maxPlayers || 50)) {
      return NextResponse.json(
        { error: 'Room is full' },
        { status: 400 }
      )
    }

    // Insert new player
    const now = new Date().toISOString()
    const newPlayerId = crypto.randomUUID()

    db.insert(schema.gamePlayers).values({
      id: newPlayerId,
      roomId: room.id,
      playerId,
      name: playerName,
      isHost: false,
      lastSeenAt: now,
      createdAt: now,
    }).run()

    const player = {
      id: newPlayerId,
      roomId: room.id,
      playerId,
      name: playerName,
      isHost: false,
      lastSeenAt: now,
      createdAt: now,
    }

    const parsedRoom = {
      ...room,
      state: JSON.parse(room.state || '{}'),
      config: room.config ? JSON.parse(room.config) : null,
    }

    return NextResponse.json({ room: parsedRoom, player })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
