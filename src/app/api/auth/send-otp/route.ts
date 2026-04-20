import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { Resend } from 'resend'

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

    // Send email via Resend (or log in dev)
    if (resend) {
      await resend.emails.send({
        from: 'Reattend <noreply@reattend.com>',
        to: normalizedEmail,
        subject: `Your Reattend login code: ${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">Reattend</h2>
            <p>Your one-time login code is:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
          </div>
        `,
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
