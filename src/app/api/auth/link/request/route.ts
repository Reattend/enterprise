import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq, gt } from 'drizzle-orm'
import { Resend } from 'resend'
import { requireAuth } from '@/lib/auth'
import { renderAccountLinkEmail } from '@/lib/email'
import { orderPair } from '@/lib/auth/account-links'

// POST /api/auth/link/request
// Body: { targetEmail: string }
//
// Auth required. Initiates a link request from the current user to the
// account that owns targetEmail. Sends a 6-digit OTP to targetEmail; the
// target user must sign in to that account and call /api/auth/link/confirm
// with the code to actually create the link.
//
// Behavior:
//   - 400 if targetEmail is missing or matches caller's email
//   - 404 if no Reattend account exists at targetEmail (we don't auto-create
//     here — the receiving account must already exist)
//   - 409 if the two accounts are already linked
//   - 200 with { message } on success (idempotent: replaces any prior
//     pending request for the same target_email + requester)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { targetEmail } = await req.json() as { targetEmail?: string }
    if (!targetEmail || typeof targetEmail !== 'string') {
      return NextResponse.json({ error: 'targetEmail is required' }, { status: 400 })
    }
    const normalizedTarget = targetEmail.toLowerCase().trim()

    const [requester] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (requester.email.toLowerCase() === normalizedTarget) {
      return NextResponse.json({ error: 'cannot link an account to itself' }, { status: 400 })
    }

    const [target] = await db.select().from(schema.users).where(eq(schema.users.email, normalizedTarget)).limit(1)
    if (!target) {
      return NextResponse.json({
        error: 'no_account_found',
        message: `No Reattend account exists at ${normalizedTarget}. Ask the owner to sign up first, then try again.`,
      }, { status: 404 })
    }

    // Already linked?
    const { a, b } = orderPair(userId, target.id)
    const existingLink = await db
      .select()
      .from(schema.accountLinks)
      .where(and(eq(schema.accountLinks.userAId, a), eq(schema.accountLinks.userBId, b)))
      .limit(1)
    if (existingLink[0]) {
      return NextResponse.json({ error: 'already_linked' }, { status: 409 })
    }

    // Replace any prior pending request from the same requester to the
    // same target — keeps the table clean and lets a user re-send the code.
    await db
      .delete(schema.accountLinkRequests)
      .where(and(
        eq(schema.accountLinkRequests.requestingUserId, userId),
        eq(schema.accountLinkRequests.targetEmail, normalizedTarget),
      ))

    const code = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await db.insert(schema.accountLinkRequests).values({
      requestingUserId: userId,
      targetEmail: normalizedTarget,
      code,
      expiresAt,
    })

    if (resend) {
      try {
        await resend.emails.send({
          from: 'Reattend <noreply@reattend.com>',
          to: normalizedTarget,
          subject: `Confirm linking your Reattend account with ${requester.email}`,
          html: renderAccountLinkEmail({
            code,
            requesterEmail: requester.email,
            requesterName: requester.name,
          }),
        })
      } catch (err) {
        console.error('[link/request] email send failed:', err)
        // Don't fail the request — the OTP is still valid; user can retry
      }
    } else {
      // Dev mode: log the OTP for testing
      console.log(`\n🔗 Account link OTP for ${normalizedTarget}: ${code}\n`)
    }

    return NextResponse.json({
      ok: true,
      message: `Verification code sent to ${normalizedTarget}. The owner of that account needs to sign in there and enter the code.`,
      // Surface the code in dev so it's testable without an email server
      dev: !resend ? code : undefined,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[link/request]', error)
    return NextResponse.json({ error: error.message || 'failed' }, { status: 500 })
  }
}
