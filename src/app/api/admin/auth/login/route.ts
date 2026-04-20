import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { isSuperAdminEmail } from '@/lib/admin/auth'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST: Send OTP to admin email (replaces password login)
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // First-time setup: if no admins exist and this is the super admin email, create the record
    const anyAdmin = await db.query.adminUsers.findFirst()
    if (!anyAdmin && isSuperAdminEmail(normalizedEmail)) {
      await db.insert(schema.adminUsers).values({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        name: 'Partha',
        passwordHash: '',
        role: 'super_admin',
      })
    } else {
      // For all other cases, check the email is an existing admin
      const admin = await db.query.adminUsers.findFirst({
        where: eq(schema.adminUsers.email, normalizedEmail),
      })
      // Return ok even if not found — don't reveal whether email exists
      if (!admin) return NextResponse.json({ ok: true })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await db.insert(schema.otpCodes).values({
      email: `admin:${normalizedEmail}`,
      code,
      expiresAt,
    })

    if (resend) {
      await resend.emails.send({
        from: 'Reattend <noreply@reattend.com>',
        to: normalizedEmail,
        subject: `Admin login code: ${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #111;">Reattend Admin</h2>
            <p>Your login code is:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Expires in 15 minutes. If you didn't request this, ignore this email.</p>
          </div>
        `,
      })
    } else {
      console.log(`\nAdmin OTP for ${normalizedEmail}: ${code}\n`)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Admin send-otp error:', error)
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}
