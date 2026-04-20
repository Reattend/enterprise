import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth, requireRole } from '@/lib/auth'

export async function GET() {
  try {
    const { workspaceId } = await requireAuth()

    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.workspaceId, workspaceId),
    })

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, m.userId),
        })
        return {
          id: m.id,
          userId: m.userId,
          name: user?.name ?? null,
          email: user?.email ?? null,
          avatarUrl: user?.avatarUrl ?? null,
          role: m.role,
          createdAt: m.createdAt,
        }
      })
    )

    return NextResponse.json({ members })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, workspaceId, role: callerRole } = await requireRole('admin')
    const { memberId, role } = await req.json()

    if (!memberId || !role) {
      return NextResponse.json({ error: 'memberId and role are required' }, { status: 400 })
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'role must be admin or member' }, { status: 400 })
    }

    const targetMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(schema.workspaceMembers.id, memberId),
        eq(schema.workspaceMembers.workspaceId, workspaceId),
      ),
    })

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 400 })
    }

    if (targetMember.userId === userId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change the workspace owner\'s role' }, { status: 403 })
    }

    // Admins can only promote members to admin, not demote other admins
    if (callerRole === 'admin' && targetMember.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot demote other admins' }, { status: 403 })
    }

    await db
      .update(schema.workspaceMembers)
      .set({ role })
      .where(eq(schema.workspaceMembers.id, memberId))

    await db.insert(schema.activityLog).values({
      workspaceId,
      actor: userId,
      action: 'member.role_changed',
      objectType: 'member',
      objectId: memberId,
      meta: JSON.stringify({ memberId, newRole: role }),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, workspaceId, role: callerRole } = await requireRole('admin')
    const { memberId } = await req.json()

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    }

    const targetMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(schema.workspaceMembers.id, memberId),
        eq(schema.workspaceMembers.workspaceId, workspaceId),
      ),
    })

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 400 })
    }

    if (targetMember.userId === userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the workspace owner' }, { status: 403 })
    }

    // Admins cannot remove other admins, only owner can
    if (callerRole === 'admin' && targetMember.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot remove other admins' }, { status: 403 })
    }

    await db
      .delete(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.id, memberId))

    await db.insert(schema.activityLog).values({
      workspaceId,
      actor: userId,
      action: 'member.removed',
      objectType: 'member',
      objectId: memberId,
      meta: JSON.stringify({ memberId }),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
