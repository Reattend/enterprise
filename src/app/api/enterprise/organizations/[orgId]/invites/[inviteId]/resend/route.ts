import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { sendEnterpriseInviteEmail } from '@/lib/email'

const INVITE_TTL_DAYS = 14

// POST /api/enterprise/organizations/[orgId]/invites/[inviteId]/resend
// Extends expiry by 14 days and re-sends the invite email.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; inviteId: string }> },
) {
  try {
    const { orgId, inviteId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const rows = await db
      .select()
      .from(schema.enterpriseInvites)
      .where(and(
        eq(schema.enterpriseInvites.id, inviteId),
        eq(schema.enterpriseInvites.organizationId, orgId),
      ))
      .limit(1)
    const invite = rows[0]
    if (!invite) return NextResponse.json({ error: 'invite not found' }, { status: 404 })
    if (invite.status === 'accepted' || invite.status === 'canceled') {
      return NextResponse.json({ error: `invite is ${invite.status}` }, { status: 409 })
    }

    const newExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString()
    await db
      .update(schema.enterpriseInvites)
      .set({ status: 'pending', expiresAt: newExpiresAt, updatedAt: new Date().toISOString() })
      .where(eq(schema.enterpriseInvites.id, inviteId))

    const orgRow = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1)
    const inviter = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, auth.userId)).limit(1)
    let departmentName: string | null = null
    if (invite.departmentId) {
      const d = await db.select({ name: schema.departments.name }).from(schema.departments).where(eq(schema.departments.id, invite.departmentId)).limit(1)
      departmentName = d[0]?.name ?? null
    }

    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const acceptUrl = `${appUrl}/enterprise-invite/${invite.token}`

    let emailError: string | null = null
    try {
      await sendEnterpriseInviteEmail({
        toEmail: invite.email,
        orgName: orgRow[0]?.name ?? 'your organization',
        inviterName: inviter[0]?.name ?? 'An admin',
        inviterEmail: auth.userEmail,
        role: invite.role,
        acceptUrl,
        expiresAt: newExpiresAt,
        departmentName,
      })
    } catch (e) {
      emailError = (e as Error).message
    }

    auditFromAuth(auth, 'member_invite', {
      resourceType: 'enterprise_invite',
      resourceId: inviteId,
      departmentId: invite.departmentId,
      metadata: { resent: true, emailError },
    })

    return NextResponse.json({ ok: true, expiresAt: newExpiresAt, emailDelivered: !emailError, emailError, acceptUrl })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
