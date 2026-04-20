import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

const ADMIN_COOKIE = 'admin-session'
const SUPER_ADMIN_EMAIL = 'pb@reattend.ai'

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!secret) throw new Error('No secret configured')
  return new TextEncoder().encode(secret)
}

export async function createAdminToken(admin: { id: string; email: string; role: string }) {
  const token = await new SignJWT({ id: admin.id, email: admin.email, role: admin.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NEXTAUTH_URL?.startsWith('https://') || false,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  return token
}

export async function getAdminFromToken(): Promise<{ id: string; email: string; role: string } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(ADMIN_COOKIE)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, getSecret())
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

export async function requireAdminAuth() {
  const admin = await getAdminFromToken()
  if (!admin) throw new Error('Unauthorized')

  // Verify admin still exists in DB
  const dbAdmin = await db.query.adminUsers.findFirst({
    where: eq(schema.adminUsers.id, admin.id),
  })
  if (!dbAdmin) throw new Error('Unauthorized')

  return { id: dbAdmin.id, email: dbAdmin.email, role: dbAdmin.role, name: dbAdmin.name }
}

export async function requireSuperAdmin() {
  const admin = await requireAdminAuth()
  if (admin.role !== 'super_admin') {
    throw new Error('Forbidden')
  }
  return admin
}

export function isSuperAdminEmail(email: string): boolean {
  return email.toLowerCase().trim() === SUPER_ADMIN_EMAIL
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
}

export { ADMIN_COOKIE, SUPER_ADMIN_EMAIL }
