import { NextResponse } from 'next/server'
import { SLACK_STANDUP_CLIENT_ID } from '@/lib/slack-standup'

export async function GET() {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/standup/callback`
  const scopes = 'chat:write,commands,im:write,users:read,channels:read'
  const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_STANDUP_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`
  return NextResponse.redirect(url)
}
