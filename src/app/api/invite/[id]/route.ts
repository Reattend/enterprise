import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

// GET /api/invite/:id — get invite details (public, no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invite = await db.query.workspaceInvites.findFirst({
      where: eq(schema.workspaceInvites.id, id),
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, invite.workspaceId),
    })

    const inviter = await db.query.users.findFirst({
      where: eq(schema.users.id, invite.invitedBy),
    })

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        workspaceName: workspace?.name ?? null,
        inviterName: inviter?.name ?? null,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/invite/:id — accept the invitation (auth required)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Please sign in to accept this invitation' },
        { status: 401 }
      )
    }

    const { id } = await params

    const invite = await db.query.workspaceInvites.findFirst({
      where: eq(schema.workspaceInvites.id, id),
    })

    if (!invite || invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invite not found or already used' },
        { status: 404 }
      )
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      )
    }

    // Verify the logged-in user's email matches the invite email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
    })

    if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      )
    }

    // Create workspace membership
    const memberId = crypto.randomUUID()
    await db.insert(schema.workspaceMembers).values({
      id: memberId,
      workspaceId: invite.workspaceId,
      userId: session.user.id,
      role: invite.role,
    })

    // Mark invite as accepted
    await db.update(schema.workspaceInvites)
      .set({ status: 'accepted' })
      .where(eq(schema.workspaceInvites.id, invite.id))

    // Log activity
    await db.insert(schema.activityLog).values({
      workspaceId: invite.workspaceId,
      actor: session.user.id,
      action: 'invite.accepted',
      objectType: 'member',
      objectId: memberId,
    })

    // Set workspace cookie and return success
    const response = NextResponse.json({
      success: true,
      workspaceId: invite.workspaceId,
    })

    response.cookies.set('workspace_id', invite.workspaceId, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    })

    return response
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
