import { db, schema } from '../db'
import { eq, and, or, like } from 'drizzle-orm'
import { getLLM } from './llm'

// Run 15-minute pre-meeting briefs for all workspaces.
// Called from the jobs cron every 2 minutes.
// A brief is generated once per event (dedup via inbox notification objectId).
export async function runMeetingBriefs(): Promise<{ sent: number }> {
  const now = new Date()
  const windowStart = now.toISOString()
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000).toISOString() // +30 min

  // Find all upcoming calendar rawItems across all workspaces
  const allRaw = await db.query.rawItems.findMany({
    columns: { id: true, workspaceId: true, externalId: true, occurredAt: true, text: true, metadata: true },
  })

  const upcomingEvents = allRaw.filter(r =>
    r.externalId?.startsWith('gcal:') &&
    r.occurredAt &&
    r.occurredAt >= windowStart &&
    r.occurredAt <= windowEnd,
  )

  if (upcomingEvents.length === 0) return { sent: 0 }

  let sent = 0

  for (const event of upcomingEvents) {
    try {
      // Check if brief already sent for this event
      const existing = await db.query.inboxNotifications.findFirst({
        where: and(
          eq(schema.inboxNotifications.objectType, 'meeting_brief'),
          eq(schema.inboxNotifications.objectId, event.id),
        ),
      })
      if (existing) continue

      // Parse attendees + title from metadata
      const meta = event.metadata ? JSON.parse(event.metadata) : {}
      const attendees: Array<{ name?: string; email?: string; self?: boolean }> = meta.attendees || []
      const otherAttendees = attendees.filter(a => !a.self)

      // Extract title from the text field ("Meeting: <title>")
      const titleMatch = event.text.match(/^Meeting:\s*(.+)$/m)
      const meetingTitle = titleMatch ? titleMatch[1].trim() : event.text.slice(0, 80)

      // Build search terms: attendee names + title keywords
      const stopWords = new Set(['the', 'and', 'for', 'with', 'about', 'meeting', 'call', 'sync', 'discussion'])
      const titleKeywords = meetingTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w))
        .slice(0, 4)

      const attendeeNames = otherAttendees
        .map(a => (a.name || a.email || '').split('@')[0].split('.').join(' '))
        .filter(n => n.length > 2)
        .slice(0, 5)

      const allTerms = Array.from(new Set([...attendeeNames, ...titleKeywords]))
      if (allTerms.length === 0) continue

      // Search for relevant memories
      const conditions = allTerms.flatMap(term => [
        like(schema.records.title, `%${term}%`),
        like(schema.records.summary, `%${term}%`),
      ])

      const relevantRecords = await db.query.records.findMany({
        where: and(
          eq(schema.records.workspaceId, event.workspaceId),
          or(...conditions),
        ),
        columns: { id: true, title: true, summary: true, type: true, createdAt: true },
        limit: 10,
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      })

      if (relevantRecords.length === 0) {
        // Nothing relevant — skip, not worth generating an empty brief
        continue
      }

      // Calculate time until meeting
      const minutesUntil = Math.round((new Date(event.occurredAt!).getTime() - now.getTime()) / 60000)
      const timeLabel = minutesUntil <= 5 ? 'starting soon' : `in ${minutesUntil} minutes`

      const attendeeLabel = attendeeNames.length > 0
        ? `with ${attendeeNames.slice(0, 3).join(', ')}`
        : ''

      const contextSnippets = relevantRecords.slice(0, 8).map(r =>
        `- [${r.type}] ${r.title}: ${(r.summary || '').slice(0, 200)}`
      ).join('\n')

      const llm = getLLM()
      const briefPrompt = `You are generating a concise pre-meeting brief for a user.

MEETING: "${meetingTitle}" ${attendeeLabel} — ${timeLabel}

RELEVANT MEMORIES FROM THEIR KNOWLEDGE BASE:
${contextSnippets}

Write a 3-4 sentence brief that surfaces the most useful context for this meeting.
Focus on: recent decisions, open items, relationship context, relevant projects.
Be direct and specific. No filler. Start with the most important thing.`

      const brief = await llm.generateText(briefPrompt, 250)

      // Find all members of this workspace to notify
      const members = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.workspaceId, event.workspaceId),
      })

      for (const member of members) {
        await db.insert(schema.inboxNotifications).values({
          workspaceId: event.workspaceId,
          userId: member.userId,
          type: 'system',
          title: `Meeting brief: ${meetingTitle} ${timeLabel}`,
          body: brief.slice(0, 500),
          objectType: 'meeting_brief',
          objectId: event.id,
        })
      }

      console.log(`[MeetingBrief] Generated brief for "${meetingTitle}" (${minutesUntil}min away, ${relevantRecords.length} memories)`)
      sent++
    } catch (e: any) {
      console.error('[MeetingBrief] error:', e.message)
    }
  }

  return { sent }
}
