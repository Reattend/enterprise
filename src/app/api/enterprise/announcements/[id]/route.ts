import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  getOrgContext,
  hasOrgPermission,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// PATCH /api/enterprise/announcements/[id]
// Body: { action: 'dismiss' } — any viewer
//      | { action: 'deactivate' } — admin
//      | { action: 'activate' } — admin
//      | { action: 'edit', title?, body?, tone?, endsAt? } — admin
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId } = await requireAuth()
    const body = await req.json()
    const row = await db.query.announcements.findFirst({ where: eq(schema.announcements.id, id) })
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

    if (body.action === 'dismiss') {
      try {
        await db.insert(schema.announcementDismissals).values({
          announcementId: id,
          userId,
        })
      } catch { /* already dismissed is fine */ }
      return NextResponse.json({ ok: true })
    }

    const ctx = await getOrgContext(userId, row.organizationId)
    const canManage = ctx && hasOrgPermission(ctx, 'org.members.manage')
    if (!canManage) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const patch: Record<string, any> = {}
    if (body.action === 'deactivate') patch.active = false
    else if (body.action === 'activate') patch.active = true
    else if (body.action === 'edit') {
      if (typeof body.title === 'string') patch.title = body.title.trim()
      if (typeof body.body === 'string') patch.body = body.body.trim()
      if (['info', 'warning', 'success'].includes(body.tone)) patch.tone = body.tone
      if (body.endsAt === null) patch.endsAt = null
      else if (typeof body.endsAt === 'string' && !isNaN(Date.parse(body.endsAt))) {
        patch.endsAt = new Date(body.endsAt).toISOString()
      }
    } else {
      return NextResponse.json({ error: 'unknown action' }, { status: 400 })
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
    }
    await db.update(schema.announcements).set(patch).where(eq(schema.announcements.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// DELETE /api/enterprise/announcements/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId } = await requireAuth()
    const row = await db.query.announcements.findFirst({ where: eq(schema.announcements.id, id) })
    if (!row) return NextResponse.json({ ok: true })
    const ctx = await getOrgContext(userId, row.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'org.members.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    await db.delete(schema.announcements).where(eq(schema.announcements.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
