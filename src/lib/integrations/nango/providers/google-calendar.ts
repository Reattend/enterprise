// Google Calendar normalizer.
//
// Nango's standard google-calendar sync templates publish events with the
// usual Google Calendar Event shape. We normalize to a single "this happened
// at X with these people, here's what was discussed" raw_item that triage
// can then promote to a memory or feed into Meeting Prep.

import { asIso, asText, type NangoNormalizer, type NormalizedRawItem } from '../normalize'

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k] as T
  }
  return undefined
}

export const normalizeGoogleCalendar: NangoNormalizer = (r): NormalizedRawItem | null => {
  const externalId = asText(pick(r, ['id', 'event_id', 'eventId']))
  if (!externalId) return null

  const summary = asText(pick(r, ['summary', 'title']))
  const description = asText(pick(r, ['description', 'notes']))
  const location = asText(pick(r, ['location']))

  // start/end can be { date } (all-day) or { dateTime } (timed).
  const startObj = (r['start'] || r['startTime']) as Record<string, unknown> | undefined
  const endObj = (r['end'] || r['endTime']) as Record<string, unknown> | undefined
  const startStr = asText(startObj?.['dateTime']) || asText(startObj?.['date']) || asText(pick(r, ['start']))
  const endStr = asText(endObj?.['dateTime']) || asText(endObj?.['date']) || asText(pick(r, ['end']))
  const occurredAt = asIso(startStr) || asIso(pick(r, ['created', 'updated']))

  const organizerObj = (r['organizer'] || r['creator']) as Record<string, unknown> | undefined
  const organizerEmail = asText(organizerObj?.['email'])
  const organizerName = asText(organizerObj?.['displayName'] || organizerObj?.['name'])

  const attendeesRaw = (r['attendees'] || []) as Array<Record<string, unknown>>
  const attendees = Array.isArray(attendeesRaw)
    ? attendeesRaw.map((a) => ({
        email: asText(a['email']) || '',
        name: asText(a['displayName'] || a['name']) || null,
        response: asText(a['responseStatus']) || null,
      })).filter((a) => a.email)
    : []

  // Compose the text triage will read. Lead with title (most important
  // signal) then context. Skipping events with no title — they're usually
  // private blocks ("personal"), not team meetings worth capturing.
  if (!summary) return null

  const lines: string[] = [`Meeting: ${summary}`]
  if (organizerName || organizerEmail) {
    lines.push(`Organizer: ${organizerName || organizerEmail}${organizerName && organizerEmail ? ` <${organizerEmail}>` : ''}`)
  }
  if (attendees.length > 0) {
    lines.push(`Attendees: ${attendees.map((a) => a.name || a.email).join(', ')}`)
  }
  if (location) lines.push(`Location: ${location}`)
  if (description) lines.push('', description)

  const text = lines.join('\n').trim()

  return {
    externalId: `gcal:${externalId}`,
    occurredAt,
    author: organizerEmail
      ? { source: 'google-calendar', email: organizerEmail, name: organizerName || null }
      : null,
    text,
    metadata: {
      source: 'google-calendar',
      summary,
      start: startStr || null,
      end: endStr || null,
      attendees,
      organizer: organizerEmail ? { email: organizerEmail, name: organizerName || null } : null,
      htmlLink: asText(pick(r, ['htmlLink', 'url'])) || null,
    },
  }
}
