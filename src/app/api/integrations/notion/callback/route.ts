import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const stateParam = req.nextUrl.searchParams.get('state')
    const error = req.nextUrl.searchParams.get('error')

    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const clientId = process.env.NOTION_CLIENT_ID
    const clientSecret = process.env.NOTION_CLIENT_SECRET

    if (error) {
      return NextResponse.redirect(new URL('/app?notion_error=denied', appUrl))
    }
    if (!code || !stateParam || !clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/app?notion_error=missing_params', appUrl))
    }

    let userId: string, workspaceId: string
    try {
      const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
      userId = state.userId
      workspaceId = state.workspaceId
    } catch {
      return NextResponse.redirect(new URL('/app?notion_error=invalid_state', appUrl))
    }

    const redirectUri = `${appUrl}/api/integrations/notion/callback`
    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[Notion OAuth] Token exchange failed:', err)
      return NextResponse.redirect(new URL('/app?notion_error=token_failed', appUrl))
    }

    const tokens = await tokenRes.json()
    const notionWorkspaceName = tokens.workspace_name || 'Notion'
    const botId = tokens.bot_id || ''

    const existing = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.workspaceId, workspaceId),
        eq(schema.integrationsConnections.integrationKey, 'notion'),
      ),
    })

    if (existing) {
      await db.update(schema.integrationsConnections).set({
        accessToken: tokens.access_token,
        status: 'connected',
        syncError: null,
        settings: JSON.stringify({ workspaceName: notionWorkspaceName, botId }),
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.integrationsConnections.id, existing.id))
    } else {
      await db.insert(schema.integrationsConnections).values({
        userId,
        workspaceId,
        integrationKey: 'notion',
        accessToken: tokens.access_token,
        status: 'connected',
        settings: JSON.stringify({ workspaceName: notionWorkspaceName, botId }),
      })
    }

    return NextResponse.redirect(new URL('/app?notion=connected', appUrl))
  } catch (error: any) {
    console.error('[Notion OAuth] Callback error:', error)
    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(new URL('/app?notion_error=unknown', appUrl))
  }
}
