import { NextRequest, NextResponse } from 'next/server'
import { validateApiToken } from '@/lib/auth/token'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { encode } from 'next-auth/jwt'

/**
 * GET /api/tray/session?token=rat_xxx&redirect=/app
 *
 * Exchanges a desktop app bearer token for a NextAuth session cookie,
 * then redirects to the specified path. This allows the Tauri webview
 * to load the full web app with proper authentication.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const redirect = req.nextUrl.searchParams.get('redirect') || '/app'

  if (!token) {
    return NextResponse.json({ error: 'token parameter required' }, { status: 400 })
  }

  // Validate the desktop app token
  const auth = await validateApiToken(`Bearer ${token}`)
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  // Look up user
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, auth.userId),
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Create JWT — same pattern as verify-otp
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const useSecure = process.env.NEXTAUTH_URL?.startsWith('https://') || process.env.AUTH_URL?.startsWith('https://')
  const cookieName = useSecure ? '__Secure-authjs.session-token' : 'authjs.session-token'

  const jwt = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.avatarUrl,
      sub: user.id,
    } as any,
    secret,
    salt: cookieName,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  } as any)

  // Set cookie on the redirect response
  const redirectUrl = new URL(redirect, req.url)
  const response = NextResponse.redirect(redirectUrl)

  response.cookies.set(cookieName, jwt, {
    httpOnly: true,
    secure: useSecure || false,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })

  // Also set workspace cookie so the app knows which workspace to load
  response.cookies.set('workspace_id', auth.workspaceId, {
    httpOnly: false,
    secure: useSecure || false,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  return response
}
