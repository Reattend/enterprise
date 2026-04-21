import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
  validateEnterpriseInviteEmail,
} from '@/lib/enterprise'
import { sendEnterpriseInviteEmail } from '@/lib/email'
import crypto from 'crypto'

const INVITE_TOKEN_BYTES = 24
const INVITE_TTL_DAYS = 14

// GET /api/enterprise/organizations/[orgId]/members — list org members
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const members = await db
      .select({
        membershipId: schema.organizationMembers.id,
        userId: schema.organizationMembers.userId,
        role: schema.organizationMembers.role,
        status: schema.organizationMembers.status,
        title: schema.organizationMembers.title,
        offboardedAt: schema.organizationMembers.offboardedAt,
        joinedAt: schema.organizationMembers.createdAt,
        email: schema.users.email,
        name: schema.users.name,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.organizationMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMembers.userId))
      .where(eq(schema.organizationMembers.organizationId, orgId))

    return NextResponse.json({ members })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/organizations/[orgId]/members
// Invite (or add, if user exists) — requires org.members.manage.
// This uses the existing users table: if the invited email has an account,
// they're added directly; otherwise we write a workspace_invites-style row
// keyed to the org (we use organization_members with a status we'll check
// at signup). For simplicity in this phase, we require the user to already
// exist — full invite email flow is a follow-up.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const { email, role, title, departmentId, deptRole } = body as {
      email?: string
      role?: 'super_admin' | 'admin' | 'member' | 'guest'
      title?: string
      departmentId?: string
      deptRole?: 'dept_head' | 'manager' | 'member' | 'viewer'
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }
    const normalizedEmail = email.toLowerCase().trim()
    const validRoles = ['super_admin', 'admin', 'member', 'guest']
    const finalRole = role && validRoles.includes(role) ? role : 'member'

    // Only super_admins can mint super_admins
    if (finalRole === 'super_admin' && auth.orgCtx.orgRole !== 'super_admin') {
      return NextResponse.json({ error: 'only super_admin can create super_admin' }, { status: 403 })
    }

    // Enforce work-email policy. Reattend Enterprise invites must go to
    // organization-provided email addresses — never personal email providers.
    // If the org has a primaryDomain set, the invitee must also match it.
    const orgRow = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1)
    const primaryDomain = orgRow[0]?.primaryDomain ?? null
    const validation = validateEnterpriseInviteEmail(normalizedEmail, primaryDomain)
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message, reason: validation.reason },
        { status: 400 },
      )
    }

    const userRow = await db.select().from(schema.users).where(eq(schema.users.email, normalizedEmail)).limit(1)
    const targetUser = userRow[0]

    // If user doesn't exist, create a pending invite + email. They'll sign up
    // via the magic link and land in the org automatically on accept.
    if (!targetUser) {
      // Dedupe: if there's already a pending invite for this email/org, reuse token
      const existingInvite = await db
        .select()
        .from(schema.enterpriseInvites)
        .where(and(
          eq(schema.enterpriseInvites.organizationId, orgId),
          eq(schema.enterpriseInvites.email, normalizedEmail),
          eq(schema.enterpriseInvites.status, 'pending'),
        ))
        .limit(1)

      let inviteId: string
      let token: string
      let expiresAt: string
      if (existingInvite[0]) {
        inviteId = existingInvite[0].id
        token = existingInvite[0].token
        // Extend expiry on re-invite
        expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString()
        await db
          .update(schema.enterpriseInvites)
          .set({
            role: finalRole,
            title: title ?? existingInvite[0].title,
            departmentId: departmentId ?? existingInvite[0].departmentId,
            deptRole: (deptRole as 'dept_head' | 'manager' | 'member' | 'viewer' | undefined) ?? existingInvite[0].deptRole,
            invitedByUserId: auth.userId,
            expiresAt,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.enterpriseInvites.id, inviteId))
      } else {
        inviteId = crypto.randomUUID()
        token = crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex')
        expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString()
        await db.insert(schema.enterpriseInvites).values({
          id: inviteId,
          organizationId: orgId,
          email: normalizedEmail,
          role: finalRole,
          title: title ?? null,
          departmentId: departmentId ?? null,
          deptRole: (deptRole as 'dept_head' | 'manager' | 'member' | 'viewer' | undefined) ?? null,
          token,
          status: 'pending',
          invitedByUserId: auth.userId,
          expiresAt,
        })
      }

      // Look up department name for the email
      let departmentName: string | null = null
      if (departmentId) {
        const d = await db.select({ name: schema.departments.name }).from(schema.departments).where(eq(schema.departments.id, departmentId)).limit(1)
        departmentName = d[0]?.name ?? null
      }

      // Best-effort: don't fail the invite if email send fails; we'll surface
      // "email delivery failed — share the link manually" in the admin UI.
      const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const acceptUrl = `${appUrl}/enterprise-invite/${token}`
      let emailError: string | null = null
      try {
        await sendEnterpriseInviteEmail({
          toEmail: normalizedEmail,
          orgName: orgRow[0]?.name ?? 'your organization',
          inviterName: (await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, auth.userId)).limit(1))[0]?.name ?? 'An admin',
          inviterEmail: auth.userEmail,
          role: finalRole,
          acceptUrl,
          expiresAt,
          departmentName,
        })
      } catch (e) {
        emailError = (e as Error).message
      }

      auditFromAuth(auth, 'member_invite', {
        resourceType: 'enterprise_invite',
        resourceId: inviteId,
        departmentId: departmentId ?? null,
        metadata: {
          email: normalizedEmail,
          role: finalRole,
          reused: !!existingInvite[0],
          emailError,
        },
      })

      return NextResponse.json({
        ok: true,
        invited: true,
        inviteId,
        email: normalizedEmail,
        role: finalRole,
        expiresAt,
        acceptUrl,
        emailDelivered: !emailError,
        emailError,
      }, { status: 201 })
    }

    // Idempotent: if already a member, update role/title instead of erroring
    const existing = await db
      .select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, orgId),
        eq(schema.organizationMembers.userId, targetUser.id),
      ))
      .limit(1)

    if (existing[0]) {
      await db
        .update(schema.organizationMembers)
        .set({
          role: finalRole,
          status: 'active',
          title: title ?? existing[0].title,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.organizationMembers.id, existing[0].id))

      auditFromAuth(auth, 'role_change', {
        resourceType: 'organization_member',
        resourceId: existing[0].id,
        metadata: {
          targetUserId: targetUser.id,
          targetEmail: normalizedEmail,
          oldRole: existing[0].role,
          newRole: finalRole,
        },
      })
    } else {
      await db.insert(schema.organizationMembers).values({
        organizationId: orgId,
        userId: targetUser.id,
        role: finalRole,
        status: 'active',
        title: title || null,
      })

      auditFromAuth(auth, 'member_invite', {
        resourceType: 'organization_member',
        resourceId: targetUser.id,
        metadata: {
          targetUserId: targetUser.id,
          targetEmail: normalizedEmail,
          role: finalRole,
        },
      })
    }

    // Optional: add to a department in the same call
    if (departmentId) {
      const dept = await db.select().from(schema.departments).where(eq(schema.departments.id, departmentId)).limit(1)
      if (!dept[0] || dept[0].organizationId !== orgId) {
        return NextResponse.json({ error: 'invalid departmentId' }, { status: 400 })
      }
      const dm = await db
        .select()
        .from(schema.departmentMembers)
        .where(and(
          eq(schema.departmentMembers.departmentId, departmentId),
          eq(schema.departmentMembers.userId, targetUser.id),
        ))
        .limit(1)
      const finalDeptRole = deptRole || 'member'
      if (dm[0]) {
        await db
          .update(schema.departmentMembers)
          .set({ role: finalDeptRole })
          .where(eq(schema.departmentMembers.id, dm[0].id))
      } else {
        await db.insert(schema.departmentMembers).values({
          departmentId,
          organizationId: orgId,
          userId: targetUser.id,
          role: finalDeptRole,
        })
      }

      auditFromAuth(auth, 'permission_change', {
        resourceType: 'department_member',
        resourceId: targetUser.id,
        departmentId,
        metadata: { targetUserId: targetUser.id, deptRole: finalDeptRole },
      })
    }

    return NextResponse.json({
      ok: true,
      userId: targetUser.id,
      email: normalizedEmail,
      role: finalRole,
    }, { status: existing[0] ? 200 : 201 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
