import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { handleEnterpriseError } from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/records/[id]/verify
// Body: { cadenceDays?: 30 | 60 | 90 | null, action?: 'verify' | 'setCadence' }
//
// Owner of the record (or an admin in the org) marks it verified. Optionally
// sets/updates the verification cadence. Only the record owner or an admin
// can verify — we want owner accountability, not group verification.

export async function POST(req: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  try {
    const { recordId: id } = await params
    const { userId } = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const cadenceDays = typeof body.cadenceDays === 'number' && [30, 60, 90].includes(body.cadenceDays)
      ? body.cadenceDays
      : body.cadenceDays === null ? null : undefined
    const action = body.action === 'setCadence' ? 'setCadence' : 'verify'

    const row = await db.query.records.findFirst({ where: eq(schema.records.id, id) })
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Owner-or-admin check. We trust the RBAC already running on /memories
    // for read; this endpoint adds a stricter write check.
    if (row.createdBy !== userId) {
      // Not owner — fall through to admin check. If caller isn't an admin,
      // return 403. We don't have organizationId on records directly here;
      // resolve via workspace_org_links.
      const link = await db.query.workspaceOrgLinks.findFirst({
        where: eq(schema.workspaceOrgLinks.workspaceId, row.workspaceId),
      })
      if (!link) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      const memb = await db.query.organizationMembers.findFirst({
        where: eq(schema.organizationMembers.userId, userId),
      })
      const isAdmin = memb && (memb.role === 'super_admin' || memb.role === 'admin') && memb.organizationId === link.organizationId
      if (!isAdmin) return NextResponse.json({ error: 'only owner or admin can verify' }, { status: 403 })
    }

    const patch: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (action === 'verify') {
      patch.lastVerifiedAt = new Date().toISOString()
      patch.verifiedByUserId = userId
    }
    if (cadenceDays !== undefined) {
      patch.verifyEveryDays = cadenceDays
    }

    await db.update(schema.records).set(patch).where(eq(schema.records.id, id))
    const updated = await db.query.records.findFirst({ where: eq(schema.records.id, id) })
    return NextResponse.json({ ok: true, record: updated })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
