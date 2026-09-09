import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { issueSsoTicket } from '@/lib/sso/oidc'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// POST /api/sandbox/exit
//
// Ends an Enterprise demo and hands the visitor their own account back.
//
// /api/sandbox/launch wrote a `demo_return` cookie (httpOnly, signed with
// NEXTAUTH_SECRET, 12h) naming the real user who started the demo. That
// cookie is the only thing trusted here: it was written server-side from a
// verified session, so it cannot be forged into a login for someone else.
// We trade it for a 60-second SSO ticket, exactly like the sandbox launch
// does, and the browser exchanges that for its normal session.
//
// Anonymous visitors never got the cookie, so they get 204 and the client
// simply sends them to the marketing site instead.

export async function POST() {
  try {
    const jar = await cookies()
    const token = jar.get('demo_return')?.value
    if (!token) return NextResponse.json({ returned: false }, { status: 200 })

    const secret = process.env.NEXTAUTH_SECRET || 'dev-fallback-do-not-use'
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: 'reattend-demo-return',
    })

    const userId = payload.sub
    const email = typeof payload.email === 'string' ? payload.email : null
    if (!userId || !email) return NextResponse.json({ returned: false }, { status: 200 })

    // The account must still exist - a deleted user should not be revivable
    // by an old cookie.
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) })
    if (!user) {
      const gone = NextResponse.json({ returned: false }, { status: 200 })
      gone.cookies.delete('demo_return')
      return gone
    }

    // organizationId is required by the ticket shape but unused for a
    // personal return - the session's own org context is resolved on login.
    const ticket = await issueSsoTicket({
      userId: user.id,
      email: user.email,
      organizationId: '',
      secret,
    })

    const res = NextResponse.json({ returned: true, ticket }, { status: 200 })
    res.cookies.delete('demo_return')
    return res
  } catch (err) {
    console.error('[sandbox exit]', err)
    return NextResponse.json({ returned: false }, { status: 200 })
  }
}
