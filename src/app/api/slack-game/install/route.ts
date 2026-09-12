import { NextResponse } from 'next/server'
import { SLACK_GAME_CLIENT_ID } from '@/lib/slack-game'

export async function GET() {
  // Without a configured Slack app this used to redirect to Slack's authorize
  // page with client_id= empty, which only shows Slack's error screen.
  if (!SLACK_GAME_CLIENT_ID) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL || 'https://reattend.com'}/tool/slack-memory-match`)
  }
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/slack-game/callback`
  const scopes = 'chat:write,commands'
  const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_GAME_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`
  return NextResponse.redirect(url)
}
