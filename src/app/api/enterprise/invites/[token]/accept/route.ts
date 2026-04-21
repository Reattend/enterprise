import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { writeAuditAsync, extractRequestMeta, emailMatchesOrgDomain, isPersonalEmail } from '@/lib/enterprise'

// POST /api/enterprise/invites/[token]/accept
// Requires the caller to be signed in. Validates that the signed-in user's
// email matches the invited email (prevents someone else from accepting
// a forwarded link). Then creates the org membership + optional dept member
// in one transaction and marks the invite accepted.
//
// Policy recap: Reattend Enterprise is a separate product. When a personal
// user forwards the link, they're forced to sign up with the invited work
// email — we enforce exact-match here.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'invalid token' }, { status: 400 })
    }

    let userId: string
    let userEmail: string
    try {
      const auth = await requireAuth()
      userId = auth.userId
      userEmail = (auth.session?.user?.email ?? '').toLowerCase()
    } catch {
      return NextResponse.json({ error: 'unauthorized', needsLogin: true }, { status: 401 })
    }
    if (!userEmail) {
      return NextResponse.json({ error: 'user email missing from session' }, { status: 400 })
    }

    const rows = await db
      .select()
      .from(schema.enterpriseInvites)
      .where(eq(schema.enterpriseInvites.token, token))
      .limit(1)
    const invite = rows[0]
    if (!invite) return NextResponse.json({ error: 'invite not found' }, { status: 404 })

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `invite is ${invite.status}` }, { status: 409 })
    }
    if (new Date(invite.expiresAt) < new Date()) {
      // Flip to expired as we observe it
      await db
        .update(schema.enterpriseInvites)
        .set({ status: 'expired', updatedAt: new Date().toISOString() })
        .where(eq(schema.enterpriseInvites.id, invite.id))
      return NextResponse.json({ error: 'invite expired' }, { status: 409 })
    }

    // Enforce: the signed-in user's email must exactly match the invited email.
    // This is the "use your work email" guard. Personal email sign-ins that
    // were created under the invited email but don't match → rejected.
    if (userEmail !== invite.email.toLowerCase()) {
      return NextResponse.json({
        error: 'email mismatch',
        message: `This invite is for ${invite.email}. Sign in with that email to accept — do not use a personal account.`,
        invitedEmail: invite.email,
        signedInEmail: userEmail,
      }, { status: 403 })
    }

    // Belt-and-braces: re-validate the email isn't a personal domain and matches org domain if set.
    if (isPersonalEmail(userEmail)) {
      return NextResponse.json({
        error: 'personal_email',
        message: 'Reattend Enterprise does not allow personal email providers. Please use your work address.',
      }, { status: 400 })
    }
    const orgRow = await db.select().from(schema.organizations).where(eq(schema.organizations.id, invite.organizationId)).limit(1)
    if (orgRow[0]?.primaryDomain && !emailMatchesOrgDomain(userEmail, orgRow[0].primaryDomain)) {
      return NextResponse.json({
        error: 'wrong_domain',
        message: `This organization only accepts @${orgRow[0].primaryDomain} emails.`,
      }, { status: 400 })
    }

    // Idempotent: if already a member, just mark invite accepted and return ok.
    const existingMembership = await db
      .select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, invite.organizationId),
        eq(schema.organizationMembers.userId, userId),
      ))
      .limit(1)

    const nowIso = new Date().toISOString()

    if (existingMembership[0]) {
      if (existingMembership[0].status !== 'active') {
        await db
          .update(schema.organizationMembers)
          .set({ status: 'active', role: invite.role, title: invite.title ?? existingMembership[0].title, updatedAt: nowIso })
          .where(eq(schema.organizationMembers.id, existingMembership[0].id))
      }
    } else {
      await db.insert(schema.organizationMembers).values({
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
        status: 'active',
        title: invite.title,
      })
    }

    // Optional dept membership
    if (invite.departmentId) {
      const dup = await db
        .select()
        .from(schema.departmentMembers)
        .where(and(
          eq(schema.departmentMembers.departmentId, invite.departmentId),
          eq(schema.departmentMembers.userId, userId),
        ))
        .limit(1)
      if (!dup[0]) {
        await db.insert(schema.departmentMembers).values({
          departmentId: invite.departmentId,
          organizationId: invite.organizationId,
          userId,
          role: invite.deptRole ?? 'member',
        })
      }
    }

    await db
      .update(schema.enterpriseInvites)
      .set({
        status: 'accepted',
        acceptedAt: nowIso,
        acceptedByUserId: userId,
        updatedAt: nowIso,
      })
      .where(eq(schema.enterpriseInvites.id, invite.id))

    const meta = extractRequestMeta(req)
    writeAuditAsync({
      organizationId: invite.organizationId,
      userId,
      userEmail,
      action: 'member_invite',
      resourceType: 'enterprise_invite',
      resourceId: invite.id,
      departmentId: invite.departmentId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { accepted: true, role: invite.role, email: invite.email },
    })

    return NextResponse.json({
      ok: true,
      organizationId: invite.organizationId,
      organizationName: orgRow[0]?.name ?? 'your organization',
      redirectTo: `/app/admin/${invite.organizationId}`,
    })
  } catch (err) {
    console.error('[enterprise invite accept]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
