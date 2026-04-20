import { NextRequest } from 'next/server'
import { validateApiToken } from '@/lib/auth/token'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

/**
 * GET /api/tray/me
 * Returns the authenticated user's basic info (name, email).
 * Used by the Chrome extension to display account details.
 */
export async function GET(req: NextRequest) {
  const auth = await validateApiToken(req.headers.get('authorization'))
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, auth.userId),
  })

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  return Response.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  })
}
