import { db, schema } from '../db'
import { eq, and, gte, like, inArray } from 'drizzle-orm'
import { getLLM } from './llm'

// Memory gap detection — fires Friday 08:00–09:00 UTC.
// Finds topics/people the user has recurring activity around but sparse memory coverage.
// Creates actionable inbox prompts: "You've been in 4 meetings with X but have no notes about them."
export async function runMemoryGapDetection(): Promise<{ sent: number }> {
  const now = new Date()

  // Only fire on Friday (5)
  if (now.getUTCDay() !== 5) return { sent: 0 }
  if (now.getUTCHours() !== 8) return { sent: 0 }

  const workspaces = await db.query.workspaces.findMany()
  let sent = 0

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()

  for (const ws of workspaces) {
    try {
      // Dedup: only one gap report per workspace per week
      const existing = await db.query.inboxNotifications.findFirst({
        where: and(
          eq(schema.inboxNotifications.workspaceId, ws.id),
          eq(schema.inboxNotifications.objectType, 'memory_gap'),
          gte(schema.inboxNotifications.createdAt, sixDaysAgo),
        ),
      })
      if (existing) continue

      const gaps: Array<{ description: string; severity: 'high' | 'medium' }> = []

      // ── Gap 1: Frequent meeting attendees with no entity profile depth ────────
      // Find people who appear in ≥3 meeting records but have thin entity profiles
      const meetingRecords = await db.query.records.findMany({
        where: and(
          eq(schema.records.workspaceId, ws.id),
          eq(schema.records.type, 'meeting'),
          gte(schema.records.createdAt, thirtyDaysAgo),
        ),
        columns: { id: true, title: true, content: true },
        limit: 50,
      })

      if (meetingRecords.length >= 3) {
        // Count entity appearances across meetings
        const entityCounts: Record<string, number> = {}
        for (const rec of meetingRecords) {
          const recEntities = await db.query.recordEntities.findMany({
            where: eq(schema.recordEntities.recordId, rec.id),
          })
          const entityIds = recEntities.map(re => re.entityId)
          if (entityIds.length === 0) continue
          const entities = await db.query.entities.findMany({
            where: and(
              inArray(schema.entities.id, entityIds),
              eq(schema.entities.kind, 'person'),
            ),
            columns: { id: true, name: true, normalized: true },
          })
          for (const e of entities) {
            entityCounts[e.normalized] = (entityCounts[e.normalized] || 0) + 1
          }
        }

        // People appearing in ≥3 meetings
        const frequentPeople = Object.entries(entityCounts)
          .filter(([, count]) => count >= 3)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)

        for (const [name, count] of frequentPeople) {
          // Check if they have a rich entity profile
          const profile = await db.query.entityProfiles.findFirst({
            where: and(
              eq(schema.entityProfiles.workspaceId, ws.id),
              eq(schema.entityProfiles.entityName, name),
            ),
            columns: { summary: true, rawFacts: true },
          })
          const factCount = profile ? JSON.parse(profile.rawFacts || '[]').length : 0
          if (factCount < 3) {
            gaps.push({
              description: `You've been in ${count} meetings with "${name}" in the last 30 days but have very few notes about them (${factCount} facts captured)`,
              severity: count >= 5 ? 'high' : 'medium',
            })
          }
        }
      }

      // ── Gap 2: Decisions without rationale ────────────────────────────────────
      const decisions = await db.query.records.findMany({
        where: and(
          eq(schema.records.workspaceId, ws.id),
          eq(schema.records.type, 'decision'),
          gte(schema.records.createdAt, thirtyDaysAgo),
        ),
        columns: { id: true, title: true, summary: true },
        limit: 20,
      })

      const thinDecisions = decisions.filter(d => {
        const text = (d.summary || '').toLowerCase()
        // Heuristic: thin decisions lack "because", "since", "reason", "due to"
        return !text.includes('because') && !text.includes('reason') &&
          !text.includes('since ') && !text.includes('due to') &&
          (d.summary || '').length < 100
      })

      if (thinDecisions.length >= 2) {
        gaps.push({
          description: `${thinDecisions.length} recent decisions have no recorded rationale (e.g. "${thinDecisions[0].title}")`,
          severity: thinDecisions.length >= 4 ? 'high' : 'medium',
        })
      }

      // ── Gap 3: Active projects with no recent updates ─────────────────────────
      const projects = await db.query.projects.findMany({
        where: eq(schema.projects.workspaceId, ws.id),
        columns: { id: true, name: true, updatedAt: true },
      })

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const staleProjects = projects.filter(p => p.updatedAt && p.updatedAt < sevenDaysAgo)

      if (staleProjects.length > 0) {
        for (const project of staleProjects.slice(0, 3)) {
          // Check if any records were added to this project recently
          const recentProjectRecord = await db.query.projectRecords.findFirst({
            where: eq(schema.projectRecords.projectId, project.id),
          })
          if (!recentProjectRecord) {
            gaps.push({
              description: `Project "${project.name}" has no memories linked to it`,
              severity: 'medium',
            })
          }
        }
      }

      // ── Gap 4: Recurring email threads with no follow-up capture ─────────────
      const emailRecords = await db.query.records.findMany({
        where: and(
          eq(schema.records.workspaceId, ws.id),
          eq(schema.records.source, 'gmail'),
          gte(schema.records.createdAt, thirtyDaysAgo),
        ),
        columns: { id: true, title: true },
        limit: 30,
      })

      // Find email subjects that appear ≥3 times (recurring threads)
      const subjectCounts: Record<string, number> = {}
      for (const rec of emailRecords) {
        // Normalize: strip Re:/Fwd: prefixes
        const subject = rec.title.replace(/^(Re|Fwd|RE|FW):\s*/i, '').trim().toLowerCase().slice(0, 60)
        if (subject.length > 5) {
          subjectCounts[subject] = (subjectCounts[subject] || 0) + 1
        }
      }
      const recurringThreads = Object.entries(subjectCounts)
        .filter(([, c]) => c >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      for (const [subject, count] of recurringThreads) {
        // Check if there are any decision/insight records about this topic
        const hasInsight = await db.query.records.findFirst({
          where: and(
            eq(schema.records.workspaceId, ws.id),
            inArray(schema.records.type, ['decision', 'insight', 'note']),
            like(schema.records.title, `%${subject.slice(0, 30)}%`),
          ),
        })
        if (!hasInsight) {
          gaps.push({
            description: `Email thread "${subject}" has appeared ${count} times with no decision or insight captured from it`,
            severity: 'medium',
          })
        }
      }

      if (gaps.length === 0) continue

      // Sort by severity, take top 5
      const topGaps = gaps
        .sort((a, b) => (a.severity === 'high' ? -1 : 1))
        .slice(0, 5)

      const llm = getLLM()
      const gapPrompt = `You are generating a "memory gap" report to help a knowledge worker capture important context they're missing.

DETECTED GAPS:
${topGaps.map((g, i) => `${i + 1}. [${g.severity.toUpperCase()}] ${g.description}`).join('\n')}

Write 2-3 sentences summarizing these gaps and what the user should prioritize capturing. Be direct and actionable. Frame it as an opportunity, not a criticism.`

      const summary = await llm.generateText(gapPrompt, 200)

      // Create notification for all members
      const members = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.workspaceId, ws.id),
      })

      for (const member of members) {
        await db.insert(schema.inboxNotifications).values({
          workspaceId: ws.id,
          userId: member.userId,
          type: 'system',
          title: `Memory gaps detected — ${topGaps.length} areas to capture`,
          body: summary.slice(0, 500),
          objectType: 'memory_gap',
          objectId: ws.id,
        })
      }

      console.log(`[MemoryGap] Sent for workspace "${ws.name}": ${topGaps.length} gaps`)
      sent++
    } catch (e: any) {
      console.error(`[MemoryGap] error for ${ws.id}:`, e.message)
    }
  }

  return { sent }
}
