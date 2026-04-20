import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { encode } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find valid OTP
    const otp = await db.query.otpCodes.findFirst({
      where: and(
        eq(schema.otpCodes.email, normalizedEmail),
        eq(schema.otpCodes.code, code),
        eq(schema.otpCodes.used, false),
      ),
    })

    if (!otp) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    }
    if (new Date(otp.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 401 })
    }

    // Mark OTP as used
    await db.update(schema.otpCodes)
      .set({ used: true })
      .where(eq(schema.otpCodes.id, otp.id))

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    })

    if (!user) {
      const userId = crypto.randomUUID()
      const workspaceId = crypto.randomUUID()

      await db.insert(schema.users).values({
        id: userId,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
      })

      await db.insert(schema.workspaces).values({
        id: workspaceId,
        name: 'Personal',
        type: 'personal',
        createdBy: userId,
      })

      await db.insert(schema.workspaceMembers).values({
        workspaceId,
        userId,
        role: 'owner',
      })

      await db.insert(schema.projects).values({
        workspaceId,
        name: 'Unassigned',
        description: 'Memories not yet assigned to a project',
        isDefault: true,
        color: '#94a3b8',
      })

      await db.insert(schema.subscriptions).values({
        userId,
        planKey: 'normal',
        status: 'active',
      })

      user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      })

      // Fire-and-forget welcome email
      sendWelcomeEmail(normalizedEmail, normalizedEmail.split('@')[0])
    }

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create JWT token manually
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Determine cookie name based on env
    const useSecure = process.env.NEXTAUTH_URL?.startsWith('https://') || process.env.AUTH_URL?.startsWith('https://')
    const cookieName = useSecure ? '__Secure-authjs.session-token' : 'authjs.session-token'

    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.avatarUrl,
        sub: user.id,
      } as any,
      secret,
      salt: cookieName,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    } as any)

    const cookieStore = await cookies()
    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: useSecure || false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error: any) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
