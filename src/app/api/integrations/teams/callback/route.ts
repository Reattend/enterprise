import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { exchangeMsCodeForTokens } from '@/lib/microsoft'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const stateParam = req.nextUrl.searchParams.get('state')
    const error = req.nextUrl.searchParams.get('error')

    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'

    if (error) {
      return NextResponse.redirect(new URL('/app/integrations?teams_error=denied', appUrl))
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(new URL('/app/integrations?teams_error=missing_params', appUrl))
    }

    let userId: string, workspaceId: string
    try {
      const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
      userId = state.userId
      workspaceId = state.workspaceId
    } catch {
      return NextResponse.redirect(new URL('/app/integrations?teams_error=invalid_state', appUrl))
    }

    const tokens = await exchangeMsCodeForTokens(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Upsert connection
    const existing = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'microsoft-teams'),
      ),
    })

    if (existing) {
      await db.update(schema.integrationsConnections)
        .set({
          status: 'connected',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing.refreshToken,
          tokenExpiresAt: expiresAt,
          workspaceId,
          syncError: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.integrationsConnections.id, existing.id))
    } else {
      await db.insert(schema.integrationsConnections).values({
        userId,
        workspaceId,
        integrationKey: 'microsoft-teams',
        status: 'connected',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        settings: JSON.stringify({ syncEnabled: true }),
      })
    }

    return NextResponse.redirect(new URL('/app/integrations?teams=connected', appUrl))
  } catch (error: any) {
    console.error('[Teams Callback Error]', error)
    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(new URL('/app/integrations?teams_error=token_exchange', appUrl))
  }
}
