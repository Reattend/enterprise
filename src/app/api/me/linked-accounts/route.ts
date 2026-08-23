import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq, or, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { orderPair } from '@/lib/auth/account-links'

// GET /api/me/linked-accounts
// Auth required. Returns the list of accounts linked to the current user
// (either direction). Used by the topbar switcher and the settings page.
//
// Response: { accounts: [{ userId, email, name, linkedAt }] }
export async function GET() {
  try {
    const { userId } = await requireAuth()

    const links = await db
      .select()
      .from(schema.accountLinks)
      .where(or(
        eq(schema.accountLinks.userAId, userId),
        eq(schema.accountLinks.userBId, userId),
      ))

    if (links.length === 0) {
      return NextResponse.json({ accounts: [] })
    }

    const otherIds = links.map((l) => (l.userAId === userId ? l.userBId : l.userAId))
    const linkedAtById = new Map(
      links.map((l) => [l.userAId === userId ? l.userBId : l.userAId, l.createdAt]),
    )

    const others = await db
      .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
      .from(schema.users)
      .where(inArray(schema.users.id, otherIds))

    return NextResponse.json({
      accounts: others.map((u) => ({
        userId: u.id,
        email: u.email,
        name: u.name,
        linkedAt: linkedAtById.get(u.id) ?? null,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[linked-accounts GET]', error)
    return NextResponse.json({ error: error.message || 'failed' }, { status: 500 })
  }
}

// DELETE /api/me/linked-accounts
// Body: { userId: string } - the account to unlink from
//
// Auth required. Removes the link in both directions (it's stored as one
// row so a single delete suffices). Either side of the link can unlink.
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { userId: targetId } = await req.json() as { userId?: string }
    if (!targetId || typeof targetId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    if (targetId === userId) {
      return NextResponse.json({ error: 'cannot unlink yourself' }, { status: 400 })
    }

    const { a, b } = orderPair(userId, targetId)
    const result = await db
      .delete(schema.accountLinks)
      .where(and(eq(schema.accountLinks.userAId, a), eq(schema.accountLinks.userBId, b)))

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[linked-accounts DELETE]', error)
    return NextResponse.json({ error: error.message || 'failed' }, { status: 500 })
  }
}
