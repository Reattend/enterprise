import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, gte, lte, asc } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/meeting-prep?orgId=...&hours=8
//
// The next meeting on deck, for the Home "meeting prep" block. That block
// has called this path since the dashboard was built, but only the
// per-event route (/meeting-prep/[eventId]) existed - so every org home
// load 404'd here and silently fell back to "No meetings on deck".
//
// Shape is exactly what the card consumes: { next: { id, title, startsAt,
// attendees } | null }. Null is a normal answer, not an error - most days
// there is nothing in the window.
//
// Read-only and permission-checked the same way the calendar list is
// (org.read), so a member sees their org's next event and nobody else's.

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const hoursRaw = parseInt(req.nextUrl.searchParams.get('hours') || '8', 10)
    const hours = Number.isFinite(hoursRaw) ? Math.min(Math.max(hoursRaw, 1), 168) : 8

    const nowIso = new Date().toISOString()
    const untilIso = new Date(Date.now() + hours * 3600 * 1000).toISOString()

    const rows = await db.select({
      id: schema.calendarEvents.id,
      title: schema.calendarEvents.title,
      startAt: schema.calendarEvents.startAt,
      attendeeEmails: schema.calendarEvents.attendeeEmails,
    })
      .from(schema.calendarEvents)
      .where(and(
        eq(schema.calendarEvents.organizationId, orgId),
        gte(schema.calendarEvents.startAt, nowIso),
        lte(schema.calendarEvents.startAt, untilIso),
      ))
      .orderBy(asc(schema.calendarEvents.startAt))
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ next: null, windowHours: hours })

    let attendees = 0
    try {
      const parsed = JSON.parse(row.attendeeEmails || '[]')
      if (Array.isArray(parsed)) attendees = parsed.length
    } catch { /* malformed JSON in an optional field must not 500 the home page */ }

    return NextResponse.json({
      next: {
        id: row.id,
        title: row.title,
        startsAt: row.startAt,
        attendees,
      },
      windowHours: hours,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
