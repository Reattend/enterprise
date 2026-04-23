import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, or, gte, lte, desc, isNull } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  getOrgContext,
  hasOrgPermission,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/announcements?orgId=...&includeDismissed=0
// Returns active announcements for the org, with a 'dismissed' flag per
// viewer. Banner component filters to !dismissed by default.
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const includeDismissed = req.nextUrl.searchParams.get('includeDismissed') === '1'
    const { userId } = await requireAuth()
    const ctx = await getOrgContext(userId, orgId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const now = new Date().toISOString()
    const rows = await db.select()
      .from(schema.announcements)
      .where(and(
        eq(schema.announcements.organizationId, orgId),
        eq(schema.announcements.active, true),
        lte(schema.announcements.startsAt, now),
        or(isNull(schema.announcements.endsAt), gte(schema.announcements.endsAt, now)),
      ))
      .orderBy(desc(schema.announcements.createdAt))
      .limit(20)

    const dismissals = rows.length > 0
      ? await db.select()
          .from(schema.announcementDismissals)
          .where(and(
            eq(schema.announcementDismissals.userId, userId),
          ))
      : []
    const dismissedIds = new Set(dismissals.map((d) => d.announcementId))

    return NextResponse.json({
      announcements: rows
        .map((r) => ({ ...r, dismissed: dismissedIds.has(r.id) }))
        .filter((r) => includeDismissed || !r.dismissed),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/announcements
// Body: { orgId, title, body, tone?, endsAt? }
// Admin-only. Creates + activates.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId, title, body: text, tone, endsAt } = body as {
      orgId?: string
      title?: string
      body?: string
      tone?: 'info' | 'warning' | 'success'
      endsAt?: string
    }
    if (!orgId || !title || !text) {
      return NextResponse.json({ error: 'orgId + title + body required' }, { status: 400 })
    }
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const id = crypto.randomUUID()
    await db.insert(schema.announcements).values({
      id,
      organizationId: orgId,
      createdByUserId: auth.userId,
      title: title.trim(),
      body: text.trim(),
      tone: ['info', 'warning', 'success'].includes(tone || '') ? (tone as any) : 'info',
      endsAt: endsAt && !isNaN(Date.parse(endsAt)) ? new Date(endsAt).toISOString() : null,
    })

    auditFromAuth(auth, 'create', {
      resourceType: 'announcement',
      resourceId: id,
      metadata: { title: title.trim(), tone },
    })

    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
