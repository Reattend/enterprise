import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { Resend } from 'resend'
import { renderOtpEmail } from '@/lib/email'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const code = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    // Store OTP
    await db.insert(schema.otpCodes).values({
      email: normalizedEmail,
      code,
      expiresAt,
    })

    // Send email via Resend (or log in dev). Layout lives in lib/email.ts
    // so OTP, welcome, invite, and trial emails all share the same shell.
    if (resend) {
      await resend.emails.send({
        from: 'Reattend <noreply@reattend.com>',
        to: normalizedEmail,
        subject: `Your Reattend login code: ${code}`,
        html: renderOtpEmail(code),
      })
    } else {
      // Dev mode: log OTP to console
      console.log(`\n🔑 OTP for ${normalizedEmail}: ${code}\n`)
    }

    return NextResponse.json({ message: 'OTP sent', dev: !resend ? code : undefined })
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
