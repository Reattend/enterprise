import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { SLACK_STANDUP_CLIENT_ID, SLACK_STANDUP_CLIENT_SECRET } from '@/lib/slack-standup'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const error = req.nextUrl.searchParams.get('error')

    if (error || !code) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/free-standup-bot?error=${error || 'no_code'}`)
    }

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/standup/callback`

    // Exchange code for token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SLACK_STANDUP_CLIENT_ID,
        client_secret: SLACK_STANDUP_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.ok) {
      console.error('[Standup Callback] Token exchange failed:', tokenData.error)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/free-standup-bot?error=${tokenData.error}`)
    }

    const slackTeamId = tokenData.team?.id
    const slackTeamName = tokenData.team?.name || ''
    const botToken = tokenData.access_token
    const installedBy = tokenData.authed_user?.id || ''

    if (!slackTeamId || !botToken) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/free-standup-bot?error=missing_data`)
    }

    // Upsert team
    const existing = await db.query.standupTeams.findFirst({
      where: eq(schema.standupTeams.slackTeamId, slackTeamId),
    })

    if (existing) {
      await db.update(schema.standupTeams)
        .set({ botToken, slackTeamName, installedBy })
        .where(eq(schema.standupTeams.slackTeamId, slackTeamId))
    } else {
      await db.insert(schema.standupTeams).values({
        slackTeamId,
        slackTeamName,
        botToken,
        installedBy,
      })
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/free-standup-bot?installed=true`)
  } catch (error: any) {
    console.error('[Standup Callback Error]', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/free-standup-bot?error=server_error`)
  }
}
