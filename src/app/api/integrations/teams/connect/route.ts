import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getMicrosoftAuthUrl } from '@/lib/microsoft'

export async function GET() {
  try {
    const { userId, workspaceId } = await requireAuth()

    const state = Buffer.from(JSON.stringify({ userId, workspaceId })).toString('base64url')
    const url = getMicrosoftAuthUrl(state)

    return NextResponse.redirect(url)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
