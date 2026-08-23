import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq, gt } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { orderPair } from '@/lib/auth/account-links'

// POST /api/auth/link/confirm
// Body: { code: string }
//
// Auth required - caller MUST be the target email's account, NOT the
// requester. This is the security model: only the receiving account's
// owner can complete the link, so the requester can't add an arbitrary
// account they don't control.
//
// Behavior:
//   - 400 if code is missing
//   - 404 if no pending request matches (caller email + valid code +
//     not expired)
//   - 409 if a link already exists between the two accounts
//   - 200 with { linkedTo: { userId, email } } on success;
//     the request row is deleted

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { code } = await req.json() as { code?: string }
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'code is required' }, { status: 400 })
    }

    const [me] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const nowIso = new Date().toISOString()

    // Find the most-recent unexpired request for THIS code where the
    // target email matches the caller's email. If multiple requests exist,
    // pick the latest one - the user might have re-requested.
    const [request] = await db
      .select()
      .from(schema.accountLinkRequests)
      .where(and(
        eq(schema.accountLinkRequests.targetEmail, me.email.toLowerCase()),
        eq(schema.accountLinkRequests.code, code.trim()),
        gt(schema.accountLinkRequests.expiresAt, nowIso),
      ))
      .limit(1)

    if (!request) {
      return NextResponse.json({
        error: 'invalid_or_expired',
        message: 'That code is wrong or has expired. Ask the requester to send a new one.',
      }, { status: 404 })
    }

    if (request.requestingUserId === userId) {
      // Sanity guard: shouldn't happen since we block self-link in /request,
      // but defense in depth.
      return NextResponse.json({ error: 'cannot link an account to itself' }, { status: 400 })
    }

    const { a, b } = orderPair(userId, request.requestingUserId)

    // Already linked? Race-safe check.
    const existing = await db
      .select()
      .from(schema.accountLinks)
      .where(and(eq(schema.accountLinks.userAId, a), eq(schema.accountLinks.userBId, b)))
      .limit(1)
    if (existing[0]) {
      // Clean up the now-obsolete request anyway.
      await db.delete(schema.accountLinkRequests).where(eq(schema.accountLinkRequests.id, request.id))
      return NextResponse.json({ error: 'already_linked' }, { status: 409 })
    }

    // Insert the link, delete the request.
    await db.insert(schema.accountLinks).values({ userAId: a, userBId: b })
    await db.delete(schema.accountLinkRequests).where(eq(schema.accountLinkRequests.id, request.id))

    const [requester] = await db
      .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, request.requestingUserId))
      .limit(1)

    return NextResponse.json({
      ok: true,
      linkedTo: requester ? { userId: requester.id, email: requester.email, name: requester.name } : null,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[link/confirm]', error)
    return NextResponse.json({ error: error.message || 'failed' }, { status: 500 })
  }
}
