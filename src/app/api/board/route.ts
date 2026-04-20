import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

// GET /api/board — load the default board for the workspace (create if needed)
export async function GET() {
  try {
    const { workspaceId } = await requireAuth()

    let board = await db.query.boards.findFirst({
      where: eq(schema.boards.workspaceId, workspaceId),
    })

    if (!board) {
      const [created] = await db
        .insert(schema.boards)
        .values({ workspaceId, name: 'Default Board' })
        .returning()
      board = created
    }

    const state = board.state ? JSON.parse(board.state) : null

    return NextResponse.json({
      id: board.id,
      name: board.name,
      state,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/board — save the board state
export async function PUT(request: NextRequest) {
  try {
    const { workspaceId } = await requireAuth()
    const body = await request.json()
    const { state } = body

    if (!state) {
      return NextResponse.json({ error: 'state is required' }, { status: 400 })
    }

    let board = await db.query.boards.findFirst({
      where: eq(schema.boards.workspaceId, workspaceId),
    })

    if (!board) {
      const [created] = await db
        .insert(schema.boards)
        .values({
          workspaceId,
          name: 'Default Board',
          state: JSON.stringify(state),
        })
        .returning()
      board = created
    } else {
      await db
        .update(schema.boards)
        .set({
          state: JSON.stringify(state),
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(schema.boards.id, board.id), eq(schema.boards.workspaceId, workspaceId)))
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
