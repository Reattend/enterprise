import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, desc, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/prompts?orgId=...
// List org's shared prompts. Any member can read.
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const { userId } = await requireAuth()
    const ctx = await getOrgContext(userId, orgId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const rows = await db.select()
      .from(schema.promptLibrary)
      .where(eq(schema.promptLibrary.organizationId, orgId))
      .orderBy(desc(schema.promptLibrary.usageCount), desc(schema.promptLibrary.createdAt))
      .limit(100)

    return NextResponse.json({
      prompts: rows.map((r) => ({
        ...r,
        tags: (() => { try { return JSON.parse(r.tags || '[]') } catch { return [] } })(),
      })),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/prompts
// Body: { orgId, title, body, tags?: string[] }
// Any org member can add. Admin can delete (via DELETE /[id]).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId, title, body: promptBody, tags } = body as {
      orgId?: string
      title?: string
      body?: string
      tags?: string[]
    }
    if (!orgId || !title || !promptBody) {
      return NextResponse.json({ error: 'orgId + title + body required' }, { status: 400 })
    }
    const { userId } = await requireAuth()
    const ctx = await getOrgContext(userId, orgId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const id = crypto.randomUUID()
    await db.insert(schema.promptLibrary).values({
      id,
      organizationId: orgId,
      createdByUserId: userId,
      title: title.trim(),
      body: promptBody.trim(),
      tags: JSON.stringify(Array.isArray(tags) ? tags.slice(0, 10) : []),
    })
    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
