import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, gte, lte, asc } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/calendar/events?orgId=...&from=ISO&to=ISO
// Returns events in a time window. Members can read.
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const fromIso = req.nextUrl.searchParams.get('from') || new Date().toISOString()
    const toIso = req.nextUrl.searchParams.get('to') || new Date(Date.now() + 24 * 3600 * 1000).toISOString()

    const rows = await db.select()
      .from(schema.calendarEvents)
      .where(and(
        eq(schema.calendarEvents.organizationId, orgId),
        gte(schema.calendarEvents.startAt, fromIso),
        lte(schema.calendarEvents.startAt, toIso),
      ))
      .orderBy(asc(schema.calendarEvents.startAt))
      .limit(50)

    return NextResponse.json({
      events: rows.map((r) => ({
        ...r,
        attendeeEmails: (() => { try { return JSON.parse(r.attendeeEmails || '[]') } catch { return [] } })(),
      })),
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/calendar/events
// Body: { orgId, title, startAt, endAt?, attendeeEmails?, location?, description? }
// Any member can add a meeting. Admins can add on behalf of others.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId, title, startAt, endAt, attendeeEmails, location, description } = body as {
      orgId?: string
      title?: string
      startAt?: string
      endAt?: string
      attendeeEmails?: string[]
      location?: string
      description?: string
    }
    if (!orgId || !title || !startAt) {
      return NextResponse.json({ error: 'orgId, title, startAt required' }, { status: 400 })
    }
    if (isNaN(Date.parse(startAt))) {
      return NextResponse.json({ error: 'invalid startAt — must be ISO' }, { status: 400 })
    }
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    // Bind to first workspace linked to org so notifications / RBAC can reason
    const link = await db.select()
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
      .limit(1)
    const workspaceId = link[0]?.workspaceId ?? null

    const eventId = crypto.randomUUID()
    await db.insert(schema.calendarEvents).values({
      id: eventId,
      organizationId: orgId,
      workspaceId,
      title: title.trim(),
      startAt: new Date(startAt).toISOString(),
      endAt: endAt && !isNaN(Date.parse(endAt)) ? new Date(endAt).toISOString() : null,
      attendeeEmails: JSON.stringify(Array.isArray(attendeeEmails) ? attendeeEmails : []),
      location: location || null,
      description: description || null,
      source: 'manual',
      createdBy: auth.userId,
    })

    auditFromAuth(auth, 'create', {
      resourceType: 'calendar_event',
      resourceId: eventId,
      metadata: { title: title.trim(), startAt },
    })

    return NextResponse.json({ ok: true, eventId }, { status: 201 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
