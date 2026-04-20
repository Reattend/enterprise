import { db, schema } from '../db'
import { eq, and } from 'drizzle-orm'
import {
  getValidSlackToken,
  refreshSlackToken,
  listConversations,
  getConversationHistory,
  createUserResolver,
} from '../slack'

export async function runSlackSync(
  connection: typeof schema.integrationsConnections.$inferSelect,
  workspaceId: string,
): Promise<{ synced: number; errors: number; total: number }> {
  if (!connection.accessToken) throw new Error('No access token — please reconnect Slack')

  // Get valid access token (refresh if needed)
  let accessToken: string
  try {
    accessToken = await getValidSlackToken(
      connection.refreshToken,
      connection.accessToken,
      connection.tokenExpiresAt,
    )

    // If token was refreshed, persist new tokens
    if (connection.refreshToken && accessToken !== connection.accessToken) {
      const refreshResult = await refreshSlackToken(connection.refreshToken)
      await db.update(schema.integrationsConnections)
        .set({
          accessToken: refreshResult.access_token,
          refreshToken: refreshResult.refresh_token || connection.refreshToken,
          tokenExpiresAt: new Date(Date.now() + refreshResult.expires_in * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.integrationsConnections.id, connection.id))
      accessToken = refreshResult.access_token
    }
  } catch (tokenError: any) {
    await db.update(schema.integrationsConnections)
      .set({ status: 'error', syncError: `Token error: ${tokenError.message}`, updatedAt: new Date().toISOString() })
      .where(eq(schema.integrationsConnections.id, connection.id))
    throw new Error(`Token error: ${tokenError.message}`)
  }

  // Find or create Slack source record
  const existingSource = await db.query.sources.findFirst({
    where: and(
      eq(schema.sources.workspaceId, workspaceId),
      eq(schema.sources.kind, 'chat'),
      eq(schema.sources.label, 'Slack'),
    ),
  })

  let slackSourceId: string
  if (existingSource) {
    slackSourceId = existingSource.id
  } else {
    slackSourceId = crypto.randomUUID()
    await db.insert(schema.sources).values({
      id: slackSourceId,
      workspaceId,
      kind: 'chat',
      label: 'Slack',
    })
  }

  const settings = connection.settings ? JSON.parse(connection.settings) : {}
  const channelFilter: string[] = settings.channels || []

  // Fetch channels user is a member of
  let channels = await listConversations(accessToken, 100)

  // Filter to selected channels if any are configured
  if (channelFilter.length > 0) {
    channels = channels.filter(c => channelFilter.includes(c.id))
  }

  const sinceDate = connection.lastSyncedAt || undefined
  const resolveUser = createUserResolver(accessToken)

  let synced = 0
  let errors = 0

  for (const channel of channels) {
    try {
      const messages = await getConversationHistory(accessToken, channel.id, 50, sinceDate)

      for (const msg of messages) {
        // Skip bot messages, system messages, empty messages
        if (msg.subtype) continue
        if (!msg.text?.trim()) continue
        if (!msg.user) continue

        const externalId = `slack-${channel.id}-${msg.ts}`

        // Dedup
        const existing = await db.query.rawItems.findFirst({
          where: and(
            eq(schema.rawItems.workspaceId, workspaceId),
            eq(schema.rawItems.externalId, externalId),
          ),
        })
        if (existing) continue

        const senderName = await resolveUser(msg.user)
        const truncated = msg.text.length > 5000 ? msg.text.substring(0, 5000) + '...' : msg.text
        const content = `Channel: #${channel.name}\nFrom: ${senderName}\nDate: ${new Date(parseFloat(msg.ts) * 1000).toISOString()}\n\n${truncated}`

        await db.insert(schema.rawItems).values({
          workspaceId,
          sourceId: slackSourceId,
          externalId,
          author: JSON.stringify({ name: senderName, id: msg.user }),
          occurredAt: new Date(parseFloat(msg.ts) * 1000).toISOString(),
          text: content,
          metadata: JSON.stringify({
            slackMessageTs: msg.ts,
            channelId: channel.id,
            channelName: channel.name,
            senderName,
            senderId: msg.user,
            threadTs: msg.thread_ts || null,
          }),
          status: 'new',
        })

        synced++
      }
    } catch (channelError: any) {
      console.error(`[Slack Sync] Channel ${channel.name} failed:`, channelError.message)
      errors++
    }
  }

  // Update connection sync state
  await db.update(schema.integrationsConnections)
    .set({
      lastSyncedAt: new Date().toISOString(),
      syncError: errors > 0 ? `${errors} channel(s) failed to sync` : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.integrationsConnections.id, connection.id))

  return { synced, errors, total: channels.length }
}
