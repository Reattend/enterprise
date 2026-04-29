// Google Calendar fetcher — uses nango.proxy() to call Calendar API directly.
// Same reasoning as the Gmail fetcher: self-hosted Nango doesn't run sync
// scripts by default, so we hit the API ourselves with Nango's stored token.

import type { Nango } from '@nangohq/node'
import type { NormalizedRawItem } from '../normalize'

interface CalEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  organizer?: { email?: string; displayName?: string; self?: boolean }
  creator?: { email?: string; displayName?: string }
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>
  htmlLink?: string
  status?: string // 'confirmed' | 'tentative' | 'cancelled'
}

export async function fetchCalendarEvents(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
  opts: { maxResults?: number; daysPast?: number; daysFuture?: number } = {},
): Promise<NormalizedRawItem[]> {
  const maxResults = opts.maxResults ?? 50
  const daysPast = opts.daysPast ?? 60
  const daysFuture = opts.daysFuture ?? 30

  const now = Date.now()
  const timeMin = new Date(now - daysPast * 86_400_000).toISOString()
  const timeMax = new Date(now + daysFuture * 86_400_000).toISOString()

  const res = await nango.proxy({
    method: 'GET',
    endpoint: `/calendar/v3/calendars/primary/events`,
    providerConfigKey,
    connectionId,
    params: {
      maxResults: String(maxResults),
      timeMin,
      timeMax,
      singleEvents: 'true',     // expand recurring events
      orderBy: 'startTime',
      showDeleted: 'false',
    },
    baseUrlOverride: 'https://www.googleapis.com',
  })
  const events: CalEvent[] = (res.data as any)?.items ?? []

  const out: NormalizedRawItem[] = []
  for (const ev of events) {
    if (!ev.summary) continue              // skip untitled blocks (likely personal)
    if (ev.status === 'cancelled') continue

    const startStr = ev.start?.dateTime || ev.start?.date || null
    const endStr = ev.end?.dateTime || ev.end?.date || null
    const occurredAt = startStr ? new Date(startStr).toISOString() : null
    const organizer = ev.organizer || ev.creator || {}
    const attendees = (ev.attendees || []).map((a) => ({
      email: a.email || '',
      name: a.displayName || null,
      response: a.responseStatus || null,
    })).filter((a) => a.email)

    const lines: string[] = [`Meeting: ${ev.summary}`]
    if (organizer.displayName || organizer.email) {
      lines.push(`Organizer: ${organizer.displayName || organizer.email}${organizer.displayName && organizer.email ? ` <${organizer.email}>` : ''}`)
    }
    if (attendees.length > 0) {
      lines.push(`Attendees: ${attendees.map((a) => a.name || a.email).join(', ')}`)
    }
    if (ev.location) lines.push(`Location: ${ev.location}`)
    if (ev.description) lines.push('', ev.description)

    out.push({
      externalId: `gcal:${ev.id}`,
      occurredAt,
      author: organizer.email
        ? { source: 'google-calendar', email: organizer.email, name: organizer.displayName || null }
        : null,
      text: lines.join('\n').trim(),
      metadata: {
        source: 'google-calendar',
        summary: ev.summary,
        start: startStr,
        end: endStr,
        attendees,
        organizer: organizer.email ? { email: organizer.email, name: organizer.displayName || null } : null,
        htmlLink: ev.htmlLink || null,
      },
    })
  }
  return out
}
