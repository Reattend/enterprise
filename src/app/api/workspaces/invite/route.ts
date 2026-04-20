import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth, requireRole } from '@/lib/auth'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// GET: List pending invites for the current workspace
export async function GET() {
  try {
    const { workspaceId } = await requireAuth()

    const pendingInvites = await db.query.workspaceInvites.findMany({
      where: and(
        eq(schema.workspaceInvites.workspaceId, workspaceId),
        eq(schema.workspaceInvites.status, 'pending'),
      ),
    })

    const invites = await Promise.all(
      pendingInvites.map(async (invite) => {
        const inviter = await db.query.users.findFirst({
          where: eq(schema.users.id, invite.invitedBy),
        })
        return {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          invitedBy: inviter?.name ?? 'Unknown',
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
        }
      })
    )

    return NextResponse.json({ invites })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Send a new invitation
export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireRole('admin')

    const body = await req.json()
    const email = body.email?.toLowerCase().trim()
    const role = body.role || 'member'

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user is already a member of this workspace
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    })

    if (existingUser) {
      const existingMembership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, existingUser.id),
        ),
      })

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace' },
          { status: 400 }
        )
      }
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await db.query.workspaceInvites.findFirst({
      where: and(
        eq(schema.workspaceInvites.workspaceId, workspaceId),
        eq(schema.workspaceInvites.email, email),
        eq(schema.workspaceInvites.status, 'pending'),
      ),
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: 'A pending invite already exists for this email' },
        { status: 400 }
      )
    }

    // Create the invite
    const inviteId = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await db.insert(schema.workspaceInvites).values({
      id: inviteId,
      workspaceId,
      email,
      role,
      status: 'pending',
      invitedBy: userId,
      expiresAt: expiresAt.toISOString(),
    })

    // Log activity
    await db.insert(schema.activityLog).values({
      workspaceId,
      actor: userId,
      action: 'invite.sent',
      objectType: 'invite',
      objectId: inviteId,
      meta: JSON.stringify({ email, role }),
    })

    // Send email via Resend
    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    })
    const workspaceName = workspace?.name || 'a workspace'
    const origin = req.headers.get('origin') || req.headers.get('x-forwarded-proto')?.split(',')[0] + '://' + req.headers.get('x-forwarded-host') || process.env.APP_URL || 'https://www.reattend.com'
    const inviteLink = `${origin}/invite/${inviteId}`

    if (resend) {
      await resend.emails.send({
        from: 'Reattend <noreply@reattend.com>',
        to: email,
        subject: `You've been invited to join ${workspaceName} on Reattend`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #111827;">You're invited!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              You've been invited to join <strong>${workspaceName}</strong> on Reattend.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Click the button below to accept the invitation and join the workspace.
            </p>
            <a href="${inviteLink}"
               style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
              Join ${workspaceName}
            </a>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
              This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
          </div>
        `,
      })
    } else {
      console.log(`[Invite] No RESEND_API_KEY set. Invite link for ${email}: ${inviteLink}`)
    }

    const invite = await db.query.workspaceInvites.findFirst({
      where: eq(schema.workspaceInvites.id, inviteId),
    })

    return NextResponse.json({ invite })
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

// DELETE: Cancel/revoke an invite
export async function DELETE(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireRole('admin')

    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Invite id is required' }, { status: 400 })
    }

    await db.update(schema.workspaceInvites)
      .set({ status: 'expired' })
      .where(
        and(
          eq(schema.workspaceInvites.id, id),
          eq(schema.workspaceInvites.workspaceId, workspaceId),
        )
      )

    // Log activity
    await db.insert(schema.activityLog).values({
      workspaceId,
      actor: userId,
      action: 'invite.revoked',
      objectType: 'invite',
      objectId: id,
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
