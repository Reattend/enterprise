import { db, schema } from '../db'
import { eq, and } from 'drizzle-orm'
import { getValidAccessToken, refreshAccessToken, listAllCalendarEvents } from '../google'

export async function runCalendarSync(
  connection: typeof schema.integrationsConnections.$inferSelect,
  workspaceId: string,
): Promise<{ synced: number; errors: number }> {
  if (!connection.refreshToken) throw new Error('No refresh token')

  const settings = connection.settings ? JSON.parse(connection.settings) : {}
  const syncDays: number = settings.syncDays ?? 30
  const selectedCalendars: string[] = settings.selectedCalendars || []

  // Refresh token if needed
  let accessToken = await getValidAccessToken(connection.refreshToken, connection.accessToken, connection.tokenExpiresAt)
  if (accessToken !== connection.accessToken) {
    const refreshed = await refreshAccessToken(connection.refreshToken)
    await db.update(schema.integrationsConnections)
      .set({ accessToken: refreshed.access_token, tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(schema.integrationsConnections.id, connection.id))
    accessToken = refreshed.access_token
  }

  // Find or create Calendar source
  let calendarSource = await db.query.sources.findFirst({
    where: and(eq(schema.sources.workspaceId, workspaceId), eq(schema.sources.kind, 'calendar')),
  })
  if (!calendarSource) {
    const [inserted] = await db.insert(schema.sources)
      .values({ workspaceId, kind: 'calendar', label: 'Google Calendar' })
      .returning()
    calendarSource = inserted
  }

  // Time window: past syncDays + 60 days future
  const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
  const timeMin = connection.lastSyncedAt
    ? new Date(new Date(connection.lastSyncedAt).getTime() - 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() - syncDays * 24 * 60 * 60 * 1000).toISOString()

  const calendarIds = selectedCalendars.length > 0 ? selectedCalendars : ['primary']

  let synced = 0
  let errors = 0

  for (const calendarId of calendarIds) {
    try {
      const events = await listAllCalendarEvents(accessToken, calendarId, timeMin, timeMax)

      for (const event of events) {
        if (!event.summary) continue
        if (event.status === 'cancelled') continue
        const selfAttendee = event.attendees?.find(a => a.self)
        if (selfAttendee?.responseStatus === 'declined') continue

        const externalId = `gcal:${event.id}`
        const existing = await db.query.rawItems.findFirst({
          where: and(eq(schema.rawItems.workspaceId, workspaceId), eq(schema.rawItems.externalId, externalId)),
        })
        if (existing) continue

        const start = event.start.dateTime || event.start.date || ''
        const end = event.end.dateTime || event.end.date || ''
        const attendeeNames = (event.attendees || [])
          .filter(a => !a.self)
          .map(a => a.displayName || a.email)
          .slice(0, 10)
          .join(', ')

        const text = [
          `Meeting: ${event.summary}`,
          start ? `When: ${new Date(start).toLocaleString()}` : '',
          attendeeNames ? `Attendees: ${attendeeNames}` : '',
          event.location ? `Location: ${event.location}` : '',
          event.description ? `Description: ${event.description.slice(0, 1000)}` : '',
        ].filter(Boolean).join('\n')

        await db.insert(schema.rawItems).values({
          workspaceId,
          sourceId: calendarSource!.id,
          externalId,
          occurredAt: start,
          text,
          metadata: JSON.stringify({ source: 'google-calendar', calendarId, eventId: event.id, start, end, attendees: event.attendees?.map(a => ({ email: a.email, name: a.displayName, self: a.self })) || [], organizer: event.organizer, htmlLink: event.htmlLink }),
          status: 'new',
        })
        synced++
      }
    } catch (e: any) {
      console.error(`[Calendar Sync] Calendar ${calendarId} error:`, e.message)
      errors++
    }
  }

  await db.update(schema.integrationsConnections)
    .set({ lastSyncedAt: new Date().toISOString(), syncError: errors > 0 ? `${errors} calendar(s) had errors` : null, updatedAt: new Date().toISOString() })
    .where(eq(schema.integrationsConnections.id, connection.id))

  return { synced, errors }
}
