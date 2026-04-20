import { NextResponse } from 'next/server'
import { SLACK_GAME_CLIENT_ID } from '@/lib/slack-game'

export async function GET() {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/slack-game/callback`
  const scopes = 'chat:write,commands'
  const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_GAME_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`
  return NextResponse.redirect(url)
}
