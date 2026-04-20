import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { SLACK_GAME_CLIENT_ID, SLACK_GAME_CLIENT_SECRET } from '@/lib/slack-game'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const error = req.nextUrl.searchParams.get('error')

    if (error || !code) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/tool/slack-memory-match?error=${error || 'no_code'}`)
    }

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/slack-game/callback`

    // Exchange code for token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SLACK_GAME_CLIENT_ID,
        client_secret: SLACK_GAME_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.ok) {
      console.error('[Slack Game Callback] Token exchange failed:', tokenData.error)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/tool/slack-memory-match?error=${tokenData.error}`)
    }

    const teamId = tokenData.team?.id
    const teamName = tokenData.team?.name || ''
    const botToken = tokenData.access_token

    if (!teamId || !botToken) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/tool/slack-memory-match?error=missing_data`)
    }

    // Upsert team
    const existing = await db.query.slackGameTeams.findFirst({
      where: eq(schema.slackGameTeams.teamId, teamId),
    })

    if (existing) {
      await db.update(schema.slackGameTeams)
        .set({ botToken, teamName })
        .where(eq(schema.slackGameTeams.teamId, teamId))
    } else {
      await db.insert(schema.slackGameTeams).values({
        teamId,
        teamName,
        botToken,
      })
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/tool/slack-memory-match?installed=true`)
  } catch (error: any) {
    console.error('[Slack Game Callback Error]', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/tool/slack-memory-match?error=server_error`)
  }
}
