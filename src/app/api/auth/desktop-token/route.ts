import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateApiToken } from '@/lib/auth/token'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

/**
 * POST /api/auth/desktop-token
 * Requires authenticated session. Generates a rat_ API token
 * for the desktop app and returns it.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's workspace
    const membership = await db.query.workspaceMembers.findFirst({
      where: eq(schema.workspaceMembers.userId, userId),
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    // Generate API token
    const { token } = await generateApiToken(userId, membership.workspaceId, 'Desktop App')

    // Get user info
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    })

    return NextResponse.json({
      token,
      email: user?.email || session.user.email,
      name: user?.name || session.user.name || '',
      avatar: user?.avatarUrl || session.user.image || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
