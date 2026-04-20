import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { standupSlackPost, buildStandupDmBlocks } from '@/lib/slack-standup'

type StandupConfig = typeof schema.standupConfigs.$inferSelect
type StandupTeam = typeof schema.standupTeams.$inferSelect

/** Send DMs to all participants for a standup session */
export async function triggerStandupSession(
  config: StandupConfig,
  team: StandupTeam,
  dateStr: string,
) {
  // Check for existing session today (prevent duplicates)
  const existing = await db.query.standupSessions.findFirst({
    where: and(
      eq(schema.standupSessions.configId, config.id),
      eq(schema.standupSessions.date, dateStr),
    ),
  })
  if (existing) {
    console.log(`[Standup Cron] Session already exists for ${config.channelId} on ${dateStr}`)
    return
  }

  // Create session
  const sessionId = crypto.randomUUID()
  await db.insert(schema.standupSessions).values({
    id: sessionId,
    configId: config.id,
    date: dateStr,
  })

  const questions = JSON.parse(config.questions) as string[]
  const participants = config.participants ? JSON.parse(config.participants) as string[] : []

  // If no specific participants, get channel members
  let userIds = participants
  if (userIds.length === 0) {
    try {
      const membersRes = await standupSlackPost('conversations.members', team.botToken, {
        channel: config.channelId,
        limit: 200,
      })
      if (membersRes.ok && membersRes.members) {
        // Filter out bots by checking user info
        userIds = membersRes.members as string[]
      }
    } catch (e) {
      console.error(`[Standup Cron] Failed to get channel members for ${config.channelId}:`, e)
      return
    }
  }

  // DM each participant
  const dmBlocks = buildStandupDmBlocks(questions, config.id, sessionId, config.channelName || config.channelId)

  for (const userId of userIds) {
    try {
      // Open DM channel
      const dmRes = await standupSlackPost('conversations.open', team.botToken, {
        users: userId,
      })
      if (!dmRes.ok || !dmRes.channel?.id) continue

      // Send standup DM
      await standupSlackPost('chat.postMessage', team.botToken, {
        channel: dmRes.channel.id,
        ...dmBlocks,
      })
    } catch (e) {
      console.error(`[Standup Cron] Failed to DM ${userId}:`, e)
    }
  }

  console.log(`[Standup Cron] Sent DMs for ${config.channelName || config.channelId} (${userIds.length} users) session=${sessionId}`)
}

/** Post summary for sessions that are done collecting (auto-post after deadline) */
export async function autoPostSummaries(maxAgeHours: number = 4) {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString()

  // Find all sessions still collecting that are older than the deadline
  const sessions = await db.query.standupSessions.findMany({
    where: eq(schema.standupSessions.status, 'collecting'),
  })

  for (const session of sessions) {
    if (session.createdAt > cutoff) continue // Still within deadline

    const config = await db.query.standupConfigs.findFirst({
      where: eq(schema.standupConfigs.id, session.configId),
    })
    if (!config) continue

    const team = await db.query.standupTeams.findFirst({
      where: eq(schema.standupTeams.id, config.teamId),
    })
    if (!team) continue

    const responses = await db.query.standupResponses.findMany({
      where: eq(schema.standupResponses.sessionId, session.id),
    })

    if (responses.length === 0) {
      // No responses — just mark as posted
      await db.update(schema.standupSessions)
        .set({ status: 'posted' as any })
        .where(eq(schema.standupSessions.id, session.id))
      continue
    }

    // Post summary
    const { buildSummaryBlocks } = await import('@/lib/slack-standup')
    const questions = JSON.parse(config.questions) as string[]
    const blocks = buildSummaryBlocks(
      responses.map(r => ({ userId: r.userId, answers: JSON.parse(r.answers) as string[] })),
      questions,
      config.channelName || config.channelId,
      session.date,
    )

    const postRes = await standupSlackPost('chat.postMessage', team.botToken, {
      channel: config.channelId,
      text: `📋 Standup Summary — ${session.date}`,
      blocks,
    })

    await db.update(schema.standupSessions)
      .set({
        status: 'posted' as any,
        summaryTs: postRes.ok ? postRes.ts : null,
      })
      .where(eq(schema.standupSessions.id, session.id))

    console.log(`[Standup Cron] Auto-posted summary for session ${session.id}`)
  }
}
