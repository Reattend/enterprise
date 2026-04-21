import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  buildAccessContext,
  canManageRecordAccess,
  auditForAllUserOrgs,
  extractRequestMeta,
  handleEnterpriseError,
} from '@/lib/enterprise'

const VALID = new Set(['private', 'team', 'department', 'org'])

// PATCH /api/enterprise/records/[recordId]/visibility
// Body: { visibility: 'private'|'team'|'department'|'org' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'
    const { recordId } = await params
    const body = await req.json()
    const { visibility } = body as { visibility?: string }

    if (!visibility || !VALID.has(visibility)) {
      return NextResponse.json({ error: 'invalid visibility' }, { status: 400 })
    }

    const ctx = await buildAccessContext(userId)
    if (!(await canManageRecordAccess(ctx, recordId))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    await db.update(schema.records)
      .set({ visibility: visibility as 'private' | 'team' | 'department' | 'org', updatedAt: new Date().toISOString() })
      .where(eq(schema.records.id, recordId))

    const meta = extractRequestMeta(req)
    auditForAllUserOrgs(userId, userEmail, 'permission_change', {
      resourceType: 'record',
      resourceId: recordId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { visibility },
    })

    return NextResponse.json({ ok: true, visibility })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
