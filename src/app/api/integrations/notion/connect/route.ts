import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const { userId, workspaceId } = await requireAuth()
    const clientId = process.env.NOTION_CLIENT_ID
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (!clientId) {
      return NextResponse.json({ error: 'Notion integration not configured' }, { status: 500 })
    }

    const state = Buffer.from(JSON.stringify({ userId, workspaceId })).toString('base64url')
    const redirectUri = `${appUrl}/api/integrations/notion/callback`

    const url = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    return NextResponse.redirect(url)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
