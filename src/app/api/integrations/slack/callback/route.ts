import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { exchangeSlackCodeForTokens } from '@/lib/slack'

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    const code = req.nextUrl.searchParams.get('code')
    const stateParam = req.nextUrl.searchParams.get('state')
    const error = req.nextUrl.searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL(`/app?slack_error=${encodeURIComponent(error)}`, baseUrl))
    }

    if (!code || !stateParam) {
      // User installed from Slack App Directory directly (no state param).
      // Redirect to a friendly error page — they must connect from within Reattend.
      return NextResponse.redirect(new URL('/slack-connect-required', baseUrl))
    }

    const { userId, workspaceId } = JSON.parse(Buffer.from(stateParam, 'base64url').toString())

    const data = await exchangeSlackCodeForTokens(code)
    const authedUser = data.authed_user

    // Upsert connection
    const existing = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'slack'),
      ),
    })

    const connectionData = {
      userId,
      workspaceId,
      integrationKey: 'slack' as const,
      status: 'connected' as const,
      accessToken: authedUser.access_token,
      refreshToken: authedUser.refresh_token || null,
      tokenExpiresAt: authedUser.expires_in
        ? new Date(Date.now() + authedUser.expires_in * 1000).toISOString()
        : null,
      settings: JSON.stringify({
        syncEnabled: true,
        channels: [],
        teamId: data.team.id,
        teamName: data.team.name,
        slackUserId: authedUser.id,
        botToken: data.access_token || null,
        botUserId: data.bot_user_id || null,
      }),
      syncError: null,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await db.update(schema.integrationsConnections)
        .set(connectionData)
        .where(eq(schema.integrationsConnections.id, existing.id))
    } else {
      await db.insert(schema.integrationsConnections).values(connectionData)
    }

    return NextResponse.redirect(new URL('/app?slack=connected', baseUrl))
  } catch (error: any) {
    console.error('[Slack Callback Error]', error)
    return NextResponse.redirect(new URL(`/app?slack_error=${encodeURIComponent(error.message)}`, baseUrl))
  }
}
