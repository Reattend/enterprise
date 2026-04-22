import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { exchangeCodeForTokens, getCalendarCallbackUrl } from '@/lib/google'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'

  try {
    const code = req.nextUrl.searchParams.get('code')
    const stateParam = req.nextUrl.searchParams.get('state')
    const error = req.nextUrl.searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL('/app/integrations?calendar_error=denied', appUrl))
    }
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL('/app/integrations?calendar_error=missing_params', appUrl))
    }

    let userId: string, workspaceId: string
    try {
      const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
      userId = state.userId
      workspaceId = state.workspaceId
    } catch {
      return NextResponse.redirect(new URL('/app/integrations?calendar_error=invalid_state', appUrl))
    }

    const tokens = await exchangeCodeForTokens(code, getCalendarCallbackUrl())
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Fetch connected Google account email
    let connectedEmail: string | undefined
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json()
        connectedEmail = userInfo.email
      }
    } catch { /* non-fatal */ }

    const existing = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'google-calendar'),
      ),
    })

    if (existing) {
      const existingSettings = existing.settings ? JSON.parse(existing.settings) : {}
      await db.update(schema.integrationsConnections)
        .set({
          status: 'connected',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing.refreshToken,
          tokenExpiresAt: expiresAt,
          workspaceId,
          syncError: null,
          settings: JSON.stringify({ ...existingSettings, ...(connectedEmail ? { connectedEmail } : {}) }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.integrationsConnections.id, existing.id))
    } else {
      await db.insert(schema.integrationsConnections).values({
        userId,
        workspaceId,
        integrationKey: 'google-calendar',
        status: 'connected',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        settings: JSON.stringify({ syncEnabled: true, syncDays: 30, ...(connectedEmail ? { connectedEmail } : {}) }),
      })
    }

    return NextResponse.redirect(new URL('/app/integrations?calendar=connected', appUrl))
  } catch (error: any) {
    console.error('[Calendar Callback Error]', error)
    return NextResponse.redirect(new URL('/app/integrations?calendar_error=token_exchange', appUrl))
  }
}
