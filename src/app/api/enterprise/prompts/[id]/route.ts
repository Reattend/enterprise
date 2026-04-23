import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/prompts/[id] — bump usage counter
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId } = await requireAuth()
    const row = await db.query.promptLibrary.findFirst({ where: eq(schema.promptLibrary.id, id) })
    if (!row) return NextResponse.json({ ok: false }, { status: 200 })
    // Viewer must be in the org
    const ctx = await getOrgContext(userId, row.organizationId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    await db.update(schema.promptLibrary)
      .set({ usageCount: sql`${schema.promptLibrary.usageCount} + 1` })
      .where(eq(schema.promptLibrary.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// DELETE /api/enterprise/prompts/[id] — creator or admin
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId } = await requireAuth()
    const row = await db.query.promptLibrary.findFirst({ where: eq(schema.promptLibrary.id, id) })
    if (!row) return NextResponse.json({ ok: true })
    const ctx = await getOrgContext(userId, row.organizationId)
    const isAdmin = ctx && hasOrgPermission(ctx, 'org.members.manage')
    if (row.createdByUserId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    await db.delete(schema.promptLibrary).where(eq(schema.promptLibrary.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
