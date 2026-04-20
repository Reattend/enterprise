import { db, schema } from '../db'
import { eq, and, gte, inArray } from 'drizzle-orm'
import { getLLM } from './llm'

// Cross-workspace team synthesis — fires Wednesday 08:00–09:00 UTC.
// For each team workspace, finds entities/topics that multiple members
// independently discussed in their personal workspaces this week, then
// surfaces them as a synthesis notification in the team workspace.
export async function runCrossWorkspaceSynthesis(): Promise<{ sent: number }> {
  const now = new Date()

  // Only fire on Wednesday (3)
  if (now.getUTCDay() !== 3) return { sent: 0 }
  if (now.getUTCHours() !== 8) return { sent: 0 }

  // Find team workspaces
  const teamWorkspaces = await db.query.workspaces.findMany({
    where: eq(schema.workspaces.type, 'team'),
  })

  if (teamWorkspaces.length === 0) return { sent: 0 }

  let sent = 0
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()

  for (const teamWs of teamWorkspaces) {
    try {
      // Dedup guard
      const existing = await db.query.inboxNotifications.findFirst({
        where: and(
          eq(schema.inboxNotifications.workspaceId, teamWs.id),
          eq(schema.inboxNotifications.objectType, 'cross_workspace_synthesis'),
          gte(schema.inboxNotifications.createdAt, sixDaysAgo),
        ),
      })
      if (existing) continue

      // Get all members of this team workspace
      const members = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.workspaceId, teamWs.id),
      })
      if (members.length < 2) continue  // need ≥2 members for cross-workspace patterns

      const memberUserIds = members.map(m => m.userId)

      // For each member, find their personal workspace(s)
      const allMemberMemberships = await db.query.workspaceMembers.findMany({
        where: inArray(schema.workspaceMembers.userId, memberUserIds),
      })

      // Map userId → personal workspaceIds (exclude the team workspace itself)
      const userPersonalWorkspaces: Record<string, string[]> = {}
      for (const m of allMemberMemberships) {
        if (m.workspaceId === teamWs.id) continue
        if (!userPersonalWorkspaces[m.userId]) userPersonalWorkspaces[m.userId] = []
        userPersonalWorkspaces[m.userId].push(m.workspaceId)
      }

      const usersWithPersonalWs = Object.keys(userPersonalWorkspaces)
      if (usersWithPersonalWs.length < 2) continue

      // For each user's personal workspaces, find entities mentioned in recent records
      // entity normalized name → set of userIds that mentioned it
      const entityToUsers: Record<string, Set<string>> = {}
      const entityToSamples: Record<string, Array<{ title: string; type: string }>> = {}

      for (const userId of usersWithPersonalWs) {
        const personalWsIds = userPersonalWorkspaces[userId]
        if (personalWsIds.length === 0) continue

        // Get recent record IDs from personal workspaces
        const recentRecords = await db.query.records.findMany({
          where: and(
            inArray(schema.records.workspaceId, personalWsIds),
            gte(schema.records.createdAt, sevenDaysAgo),
          ),
          columns: { id: true, title: true, type: true },
          limit: 100,
        })
        if (recentRecords.length === 0) continue

        const recentRecordIds = recentRecords.map(r => r.id)
        const recordTitleMap = Object.fromEntries(recentRecords.map(r => [r.id, { title: r.title, type: r.type }]))

        // Find entities linked to those records
        const recordEntityLinks = await db.query.recordEntities.findMany({
          where: inArray(schema.recordEntities.recordId, recentRecordIds),
        })

        const entityIds = Array.from(new Set(recordEntityLinks.map(re => re.entityId)))
        if (entityIds.length === 0) continue

        const entities = await db.query.entities.findMany({
          where: inArray(schema.entities.id, entityIds),
          columns: { id: true, normalized: true, kind: true },
        })

        for (const entity of entities) {
          // Only care about people, orgs, projects, topics (skip generic)
          if (!['person', 'org', 'project', 'topic'].includes(entity.kind)) continue
          const key = entity.normalized

          if (!entityToUsers[key]) entityToUsers[key] = new Set()
          entityToUsers[key].add(userId)

          // Collect sample record titles for this entity
          if (!entityToSamples[key]) entityToSamples[key] = []
          const linkedRecordId = recordEntityLinks.find(re =>
            entities.find(e => e.id === re.entityId && e.normalized === key) && recentRecordIds.includes(re.recordId)
          )?.recordId
          if (linkedRecordId && recordTitleMap[linkedRecordId]) {
            const sample = recordTitleMap[linkedRecordId]
            if (!entityToSamples[key].some(s => s.title === sample.title)) {
              entityToSamples[key].push(sample)
            }
          }
        }
      }

      // Find entities mentioned by ≥2 different users
      const sharedEntities = Object.entries(entityToUsers)
        .filter(([, users]) => users.size >= 2)
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 10)

      if (sharedEntities.length === 0) continue

      // Build context for LLM
      const entityContext = sharedEntities.map(([name, users]) => {
        const samples = (entityToSamples[name] || []).slice(0, 3)
        const sampleText = samples.map(s => `"${s.title}" (${s.type})`).join(', ')
        return `- "${name}" — mentioned by ${users.size} team members${sampleText ? `, e.g. ${sampleText}` : ''}`
      }).join('\n')

      const weekLabel = `week of ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
      const llm = getLLM()

      const synthPrompt = `Your team has been independently discussing the same topics this week. Write a brief 3-4 sentence synthesis for the team.

WEEK: ${weekLabel}
TEAM SIZE: ${usersWithPersonalWs.length} active members

TOPICS MULTIPLE TEAM MEMBERS DISCUSSED:
${entityContext}

Summarize what themes the team is converging on, why these might be worth a team discussion, and any patterns worth noting. Be specific, reference the topics. No filler.`

      const synthesis = await llm.generateText(synthPrompt, 300)

      const topNames = sharedEntities.slice(0, 3).map(([name]) => name).join(', ')

      // Notify all team workspace members
      for (const member of members) {
        await db.insert(schema.inboxNotifications).values({
          workspaceId: teamWs.id,
          userId: member.userId,
          type: 'system',
          title: `Team synthesis — ${sharedEntities.length} shared topics this week`,
          body: synthesis.slice(0, 500),
          objectType: 'cross_workspace_synthesis',
          objectId: teamWs.id,
        })
      }

      console.log(`[CrossWorkspace] Synthesis for team "${teamWs.name}": ${sharedEntities.length} shared entities (${topNames})`)
      sent++
    } catch (e: any) {
      console.error(`[CrossWorkspace] error for ${teamWs.id}:`, e.message)
    }
  }

  return { sent }
}
