import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

// GET /api/enterprise/invites/[token]
// Public route — used by the accept page to render the org + role. No auth.
// We deliberately keep the response minimal — token leakage shouldn't reveal
// membership details beyond what the invited person already needs to see.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'invalid token' }, { status: 400 })
    }

    const rows = await db
      .select()
      .from(schema.enterpriseInvites)
      .where(eq(schema.enterpriseInvites.token, token))
      .limit(1)
    const invite = rows[0]
    if (!invite) return NextResponse.json({ error: 'invite not found' }, { status: 404 })

    // Derived status: flip pending→expired if past expiry
    let derivedStatus = invite.status
    if (invite.status === 'pending' && new Date(invite.expiresAt) < new Date()) {
      derivedStatus = 'expired'
    }

    const org = await db
      .select({
        name: schema.organizations.name,
        slug: schema.organizations.slug,
        plan: schema.organizations.plan,
        primaryDomain: schema.organizations.primaryDomain,
      })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, invite.organizationId))
      .limit(1)

    let departmentName: string | null = null
    if (invite.departmentId) {
      const d = await db
        .select({ name: schema.departments.name, kind: schema.departments.kind })
        .from(schema.departments)
        .where(eq(schema.departments.id, invite.departmentId))
        .limit(1)
      departmentName = d[0]?.name ?? null
    }

    const inviter = await db
      .select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, invite.invitedByUserId))
      .limit(1)

    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        title: invite.title,
        status: derivedStatus,
        expiresAt: invite.expiresAt,
        organizationName: org[0]?.name ?? 'Organization',
        organizationSlug: org[0]?.slug ?? '',
        organizationPlan: org[0]?.plan ?? 'starter',
        organizationPrimaryDomain: org[0]?.primaryDomain ?? null,
        departmentName,
        inviterName: inviter[0]?.name ?? 'An admin',
        inviterEmail: inviter[0]?.email ?? '',
      },
    })
  } catch (err) {
    console.error('[enterprise invite GET]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
