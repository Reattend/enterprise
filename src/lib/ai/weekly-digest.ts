import { db, schema } from '../db'
import { eq, and, gte, like } from 'drizzle-orm'
import { getLLM } from './llm'

// Send a weekly digest every Monday 08:00–09:00 UTC.
// Called from the jobs cron every 2 minutes; the dedup guard ensures
// exactly one digest per workspace per week.
export async function runWeeklyDigest(): Promise<{ sent: number }> {
  const now = new Date()

  // Only fire on Monday (0=Sun, 1=Mon)
  if (now.getUTCDay() !== 1) return { sent: 0 }
  // Only fire between 08:00 and 09:00 UTC
  if (now.getUTCHours() !== 8) return { sent: 0 }

  const workspaces = await db.query.workspaces.findMany()
  let sent = 0

  for (const ws of workspaces) {
    try {
      // Dedup: skip if a digest was already sent in the last 6 days
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
      const existing = await db.query.inboxNotifications.findFirst({
        where: and(
          eq(schema.inboxNotifications.workspaceId, ws.id),
          eq(schema.inboxNotifications.objectType, 'weekly_digest'),
          gte(schema.inboxNotifications.createdAt, sixDaysAgo),
        ),
      })
      if (existing) continue

      // Fetch records from the past 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const recentRecords = await db.query.records.findMany({
        where: and(
          eq(schema.records.workspaceId, ws.id),
          gte(schema.records.createdAt, sevenDaysAgo),
        ),
        columns: { id: true, title: true, summary: true, type: true, createdAt: true, tags: true },
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      })

      // Skip workspaces with no activity this week
      const meaningfulTypes = ['decision', 'insight', 'meeting', 'idea', 'tasklike', 'context', 'note']
      const meaningful = recentRecords.filter(r =>
        meaningfulTypes.includes(r.type) &&
        !JSON.parse(r.tags || '[]').includes('auto-compressed'),
      )

      if (meaningful.length < 3) continue  // not enough to digest

      // Group by type for the prompt
      const byType: Record<string, typeof meaningful> = {}
      for (const r of meaningful) {
        if (!byType[r.type]) byType[r.type] = []
        byType[r.type].push(r)
      }

      const typeLabels: Record<string, string> = {
        decision: 'Decisions', insight: 'Insights', meeting: 'Meetings',
        idea: 'Ideas', tasklike: 'Tasks / Action Items', context: 'Context', note: 'Notes',
      }

      const recordsText = Object.entries(byType)
        .map(([type, recs]) =>
          `${typeLabels[type] || type} (${recs.length}):\n` +
          recs.slice(0, 6).map(r => `  • ${r.title}: ${(r.summary || '').slice(0, 150)}`).join('\n')
        )
        .join('\n\n')

      const weekLabel = `week of ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`

      const llm = getLLM()
      const digestPrompt = `You are generating a weekly memory digest for a knowledge worker.

WEEK: ${weekLabel}
TOTAL NEW MEMORIES: ${meaningful.length}

${recordsText}

Write a concise weekly digest (4-6 sentences) covering:
1. Key decisions made
2. Main themes or projects that had activity
3. Any action items or follow-ups worth surfacing
4. One notable insight or idea

Be specific, reference actual content. No filler. Write in second person ("You...").`

      const digest = await llm.generateText(digestPrompt, 350)

      // Notify all members
      const members = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.workspaceId, ws.id),
      })

      for (const member of members) {
        await db.insert(schema.inboxNotifications).values({
          workspaceId: ws.id,
          userId: member.userId,
          type: 'system',
          title: `Weekly digest — ${weekLabel} (${meaningful.length} memories)`,
          body: digest.slice(0, 500),
          objectType: 'weekly_digest',
          objectId: ws.id,
        })
      }

      console.log(`[WeeklyDigest] Sent for workspace ${ws.name} (${meaningful.length} records)`)
      sent++
    } catch (e: any) {
      console.error(`[WeeklyDigest] error for ${ws.id}:`, e.message)
    }
  }

  return { sent }
}
