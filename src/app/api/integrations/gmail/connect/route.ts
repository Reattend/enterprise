import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getGoogleAuthUrl } from '@/lib/google'

export async function GET() {
  try {
    const { userId, workspaceId } = await requireAuth()

    // Encode user + workspace in state for the callback
    const state = Buffer.from(JSON.stringify({ userId, workspaceId })).toString('base64url')
    const url = getGoogleAuthUrl(state)

    return NextResponse.redirect(url)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
