import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireSuperAdmin, requireAdminAuth } from '@/lib/admin/auth'

// GET: List all admin users (any admin can view)
export async function GET() {
  try {
    await requireAdminAuth()

    const admins = await db.select({
      id: schema.adminUsers.id,
      email: schema.adminUsers.email,
      name: schema.adminUsers.name,
      role: schema.adminUsers.role,
      createdAt: schema.adminUsers.createdAt,
    }).from(schema.adminUsers)

    return NextResponse.json({ admins })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Add a new admin (super_admin only, new admins are always 'viewer')
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const { email, name } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if already exists
    const existing = await db.query.adminUsers.findFirst({
      where: eq(schema.adminUsers.email, normalizedEmail),
    })
    if (existing) {
      return NextResponse.json({ error: 'Admin with this email already exists' }, { status: 400 })
    }

    const id = crypto.randomUUID()

    await db.insert(schema.adminUsers).values({
      id,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      passwordHash: '',
      role: 'viewer',
    })

    return NextResponse.json({
      ok: true,
      admin: { id, email: normalizedEmail, name: name || normalizedEmail.split('@')[0], role: 'viewer' },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Only super admin can add admins' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Remove an admin (super_admin only, can't delete self)
export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin()

    const { adminId } = await req.json()
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID required' }, { status: 400 })
    }

    if (adminId === admin.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, adminId))

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Only super admin can remove admins' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
