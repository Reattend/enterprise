import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, lt } from 'drizzle-orm'
import { generateRoomCode } from '@/lib/game/room-code'

// POST — Create a new game room
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gameType, hostName, hostId, config } = body

    if (!gameType || !hostName || !hostId) {
      return NextResponse.json(
        { error: 'gameType, hostName, and hostId are required' },
        { status: 400 }
      )
    }

    // Generate a unique room code, retry on collision
    let code = generateRoomCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = db
        .select()
        .from(schema.gameRooms)
        .where(eq(schema.gameRooms.code, code))
        .get()
      if (!existing) break
      code = generateRoomCode()
      attempts++
    }
    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Failed to generate unique room code' },
        { status: 500 }
      )
    }

    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const roomId = crypto.randomUUID()
    const playerId = crypto.randomUUID()

    // Insert the room
    db.insert(schema.gameRooms).values({
      id: roomId,
      code,
      gameType,
      hostId,
      hostName,
      status: 'lobby',
      phase: 'lobby',
      state: '{}',
      config: config ? JSON.stringify(config) : null,
      maxPlayers: 50,
      version: 0,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }).run()

    // Insert the host as a player
    db.insert(schema.gamePlayers).values({
      id: playerId,
      roomId,
      playerId: hostId,
      name: hostName,
      isHost: true,
      lastSeenAt: now,
      createdAt: now,
    }).run()

    const room = {
      id: roomId,
      code,
      gameType,
      hostId,
      hostName,
      status: 'lobby' as const,
      phase: 'lobby',
      state: {},
      config: config || null,
      maxPlayers: 50,
      version: 0,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }

    const player = {
      id: playerId,
      roomId,
      playerId: hostId,
      name: hostName,
      isHost: true,
      lastSeenAt: now,
      createdAt: now,
    }

    return NextResponse.json({ room, player })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET — Poll room state
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const versionParam = searchParams.get('version')
    const playerId = searchParams.get('playerId')

    if (!code) {
      return NextResponse.json(
        { error: 'code query parameter is required' },
        { status: 400 }
      )
    }

    // Cleanup expired rooms
    db.delete(schema.gameRooms)
      .where(lt(schema.gameRooms.expiresAt, new Date().toISOString()))
      .run()

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

    // Update requesting player's lastSeenAt
    if (playerId) {
      db.update(schema.gamePlayers)
        .set({ lastSeenAt: new Date().toISOString() })
        .where(
          and(
            eq(schema.gamePlayers.roomId, room.id),
            eq(schema.gamePlayers.playerId, playerId)
          )
        )
        .run()
    }

    // If client version matches, no changes
    if (versionParam !== null && versionParam !== undefined) {
      const clientVersion = parseInt(versionParam, 10)
      if (clientVersion === room.version) {
        return NextResponse.json({ changed: false })
      }
    }

    // Fetch players and actions
    const players = db
      .select()
      .from(schema.gamePlayers)
      .where(eq(schema.gamePlayers.roomId, room.id))
      .all()

    const actions = db
      .select()
      .from(schema.gameActions)
      .where(eq(schema.gameActions.roomId, room.id))
      .all()

    // Parse JSON fields
    const parsedRoom = {
      ...room,
      state: JSON.parse(room.state || '{}'),
      config: room.config ? JSON.parse(room.config) : null,
    }

    const parsedActions = actions.map((a) => ({
      ...a,
      payload: JSON.parse(a.payload || '{}'),
    }))

    return NextResponse.json({
      room: parsedRoom,
      players,
      actions: parsedActions,
      changed: true,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT — Host updates room state
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, hostId, phase, status, state } = body

    if (!code || !hostId) {
      return NextResponse.json(
        { error: 'code and hostId are required' },
        { status: 400 }
      )
    }

    // Look up room
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

    // Verify host
    if (room.hostId !== hostId) {
      return NextResponse.json(
        { error: 'Only the host can update the room' },
        { status: 403 }
      )
    }

    // Build update payload
    const updates: Record<string, any> = {
      version: room.version + 1,
      updatedAt: new Date().toISOString(),
    }

    if (phase !== undefined) updates.phase = phase
    if (status !== undefined) updates.status = status
    if (state !== undefined) updates.state = JSON.stringify(state)

    db.update(schema.gameRooms)
      .set(updates)
      .where(eq(schema.gameRooms.code, code))
      .run()

    // Fetch updated room
    const updatedRoom = db
      .select()
      .from(schema.gameRooms)
      .where(eq(schema.gameRooms.code, code))
      .get()!

    const parsedRoom = {
      ...updatedRoom,
      state: JSON.parse(updatedRoom.state || '{}'),
      config: updatedRoom.config ? JSON.parse(updatedRoom.config) : null,
    }

    return NextResponse.json({ room: parsedRoom })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
