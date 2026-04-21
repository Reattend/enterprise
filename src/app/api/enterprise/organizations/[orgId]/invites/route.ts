import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/invites
// Returns all invites (pending + recently accepted/canceled/expired) for the
// org. Used by the admin Members page to render the "pending" section.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const rows = await db
      .select({
        id: schema.enterpriseInvites.id,
        email: schema.enterpriseInvites.email,
        role: schema.enterpriseInvites.role,
        title: schema.enterpriseInvites.title,
        departmentId: schema.enterpriseInvites.departmentId,
        status: schema.enterpriseInvites.status,
        expiresAt: schema.enterpriseInvites.expiresAt,
        createdAt: schema.enterpriseInvites.createdAt,
        acceptedAt: schema.enterpriseInvites.acceptedAt,
        invitedByUserId: schema.enterpriseInvites.invitedByUserId,
        inviterName: schema.users.name,
        inviterEmail: schema.users.email,
      })
      .from(schema.enterpriseInvites)
      .leftJoin(schema.users, eq(schema.users.id, schema.enterpriseInvites.invitedByUserId))
      .where(eq(schema.enterpriseInvites.organizationId, orgId))
      .orderBy(desc(schema.enterpriseInvites.createdAt))

    // Derive expired status on the fly so the UI doesn't show stale "pending"
    const now = Date.now()
    const enriched = rows.map((r) => ({
      ...r,
      status: r.status === 'pending' && new Date(r.expiresAt).getTime() < now ? 'expired' : r.status,
    }))

    return NextResponse.json({ invites: enriched })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// DELETE /api/enterprise/organizations/[orgId]/invites?inviteId=...
// Cancels a pending invite. Accepted/expired invites become tombstones.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const inviteId = req.nextUrl.searchParams.get('inviteId')
    if (!inviteId) return NextResponse.json({ error: 'inviteId is required' }, { status: 400 })

    const invite = await db
      .select()
      .from(schema.enterpriseInvites)
      .where(and(
        eq(schema.enterpriseInvites.id, inviteId),
        eq(schema.enterpriseInvites.organizationId, orgId),
      ))
      .limit(1)
    if (!invite[0]) return NextResponse.json({ error: 'invite not found' }, { status: 404 })
    if (invite[0].status !== 'pending') {
      return NextResponse.json({ error: `invite is ${invite[0].status}` }, { status: 409 })
    }

    await db
      .update(schema.enterpriseInvites)
      .set({ status: 'canceled', updatedAt: new Date().toISOString() })
      .where(eq(schema.enterpriseInvites.id, inviteId))

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
