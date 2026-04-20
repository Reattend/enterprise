import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check admin exists
    const admin = await db.query.adminUsers.findFirst({
      where: eq(schema.adminUsers.email, normalizedEmail),
    })

    if (!admin) {
      // Don't reveal whether the email exists
      return NextResponse.json({ ok: true })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

    // Store code in otp_codes table (reuse existing table)
    await db.insert(schema.otpCodes).values({
      email: `admin:${normalizedEmail}`,
      code,
      expiresAt,
    })

    if (resend) {
      await resend.emails.send({
        from: 'Reattend <noreply@reattend.com>',
        to: normalizedEmail,
        subject: `Admin password reset code: ${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #111;">Reattend Admin</h2>
            <p>Your password reset code is:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
          </div>
        `,
      })
    } else {
      console.log(`\nAdmin reset code for ${normalizedEmail}: ${code}\n`)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to send reset code' }, { status: 500 })
  }
}
