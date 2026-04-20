import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { createAdminToken } from '@/lib/admin/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find unused, unexpired OTP
    const otp = await db.query.otpCodes.findFirst({
      where: and(
        eq(schema.otpCodes.email, `admin:${normalizedEmail}`),
        eq(schema.otpCodes.code, code),
        eq(schema.otpCodes.used, false),
      ),
    })

    if (!otp) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    if (new Date(otp.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Code has expired' }, { status: 401 })
    }

    // Mark OTP as used
    await db.update(schema.otpCodes)
      .set({ used: true })
      .where(eq(schema.otpCodes.id, otp.id))

    // Get admin record
    const admin = await db.query.adminUsers.findFirst({
      where: eq(schema.adminUsers.email, normalizedEmail),
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 })
    }

    await createAdminToken({ id: admin.id, email: admin.email, role: admin.role })

    return NextResponse.json({
      ok: true,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    })
  } catch (error: any) {
    console.error('Admin verify-otp error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
