import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { issueSsoTicket } from '@/lib/sso/oidc'
import { orderPair, ACCOUNT_SWITCH_ORG_SENTINEL } from '@/lib/auth/account-links'

// POST /api/auth/switch
// Body: { to: userId }
//
// Auth required. Issues a 60-second SSO ticket for the target user IF
// the current user is linked to them. Client trades the ticket via the
// existing 'sso-ticket' NextAuth credentials provider, which mints a real
// long-lived session cookie for the target user - same flow the sandbox
// launch uses.
//
// Why an SSO ticket instead of writing the cookie directly: NextAuth
// owns the session cookie format + signing, and hand-rolling
// Set-Cookie via next/headers in a Route Handler triggers a Chrome
// silent-drop bug we've documented. Going through the credentials
// provider is the only reliable way.
//
// Response: { ticket } - caller POSTs this to /api/auth/callback/sso-ticket
// (with form fields: csrfToken + ticket) to complete the switch. The
// topbar switcher does this transparently.

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { to } = await req.json() as { to?: string }
    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'to (target userId) is required' }, { status: 400 })
    }
    if (to === userId) {
      return NextResponse.json({ error: 'already signed in as that account' }, { status: 400 })
    }

    // Validate the link exists. Without this check, anyone with a valid
    // session could mint a ticket for any other user.
    const { a, b } = orderPair(userId, to)
    const link = await db
      .select()
      .from(schema.accountLinks)
      .where(and(eq(schema.accountLinks.userAId, a), eq(schema.accountLinks.userBId, b)))
      .limit(1)
    if (!link[0]) {
      return NextResponse.json({
        error: 'not_linked',
        message: 'These accounts are not linked. Send a link request first.',
      }, { status: 403 })
    }

    const [target] = await db
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, to))
      .limit(1)
    if (!target) {
      return NextResponse.json({ error: 'target user not found' }, { status: 404 })
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      console.error('[auth/switch] NEXTAUTH_SECRET missing')
      return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
    }

    const ticket = await issueSsoTicket({
      userId: target.id,
      email: target.email,
      organizationId: ACCOUNT_SWITCH_ORG_SENTINEL,
      secret,
    })

    return NextResponse.json({
      ok: true,
      ticket,
      // The endpoint the client should POST to with the ticket. Surfaced
      // in the response so clients don't have to hardcode it.
      callbackPath: '/api/auth/callback/sso-ticket',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[auth/switch]', error)
    return NextResponse.json({ error: error.message || 'failed' }, { status: 500 })
  }
}
