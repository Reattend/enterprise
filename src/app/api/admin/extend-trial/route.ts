import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireSuperAdmin } from '@/lib/admin/auth'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const { email, months } = await req.json()
    if (!email || !months || months < 1 || months > 24) {
      return NextResponse.json({ error: 'Valid email and months (1-24) required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate trial end date
    const trialEnd = new Date()
    trialEnd.setMonth(trialEnd.getMonth() + months)

    // Update subscription
    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.userId, user.id),
    })

    if (existingSub) {
      await db.update(schema.subscriptions)
        .set({
          planKey: 'smart',
          status: 'trialing',
          trialEndsAt: trialEnd.toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.subscriptions.userId, user.id))
    } else {
      await db.insert(schema.subscriptions).values({
        userId: user.id,
        planKey: 'smart',
        status: 'trialing',
        trialEndsAt: trialEnd.toISOString(),
      })
    }

    // Send notification email
    const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)
    if (resend) {
      await resend.emails.send({
        from: 'Reattend <noreply@reattend.com>',
        to: normalizedEmail,
        subject: 'You\'ve been granted free Smart Memories access!',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">Reattend</h2>
            <p>Great news! You've been granted <strong>free access to Smart Memories</strong> for <strong>${months} month${months > 1 ? 's' : ''}</strong>.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; font-size: 14px;"><strong>Plan:</strong> Smart Memories (Pro)</p>
              <p style="margin: 8px 0 0; font-size: 14px;"><strong>Valid until:</strong> ${trialEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="margin: 8px 0 0; font-size: 14px;"><strong>Days remaining:</strong> ${daysLeft} days</p>
            </div>
            <p style="font-size: 14px;">This includes AI-powered triage, automatic entity extraction, smart connections, semantic search, and more.</p>
            <p style="font-size: 14px;">Log in to <a href="https://reattend.com/app" style="color: #6366f1;">reattend.com</a> to start using Smart Memories.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">— The Reattend Team</p>
          </div>
        `,
      })
    }

    return NextResponse.json({
      ok: true,
      message: `Extended Smart Memories trial for ${normalizedEmail} by ${months} month(s). Expires ${trialEnd.toISOString().split('T')[0]}.`,
      trialEndsAt: trialEnd.toISOString(),
      daysLeft,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Extend trial error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
