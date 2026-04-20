import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  getValidMsAccessToken,
  refreshMsAccessToken,
  listChats,
  getChatMessages,
  stripHtml,
} from '@/lib/microsoft'

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'microsoft-teams'),
      ),
    })

    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'Teams not connected' }, { status: 400 })
    }

    if (!connection.refreshToken) {
      return NextResponse.json({ error: 'No refresh token — please reconnect Teams' }, { status: 400 })
    }

    // Find or create Teams source
    let teamsSource = await db.query.sources.findFirst({
      where: and(
        eq(schema.sources.workspaceId, workspaceId),
        eq(schema.sources.kind, 'chat'),
        eq(schema.sources.label, 'Microsoft Teams'),
      ),
    })

    if (!teamsSource) {
      const sourceId = crypto.randomUUID()
      await db.insert(schema.sources).values({
        id: sourceId,
        workspaceId,
        kind: 'chat',
        label: 'Microsoft Teams',
      })
      teamsSource = { id: sourceId } as any
    }

    // Get valid access token
    let accessToken: string
    try {
      accessToken = await getValidMsAccessToken(connection.refreshToken, connection.accessToken, connection.tokenExpiresAt)

      if (accessToken !== connection.accessToken) {
        const refreshResult = await refreshMsAccessToken(connection.refreshToken)
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
      return NextResponse.json({ error: 'Failed to refresh token. Please reconnect Teams.' }, { status: 401 })
    }

    // Fetch recent chats
    let chats
    try {
      chats = await listChats(accessToken, 20)
    } catch (e: any) {
      return NextResponse.json({ error: `Failed to fetch chats: ${e.message}` }, { status: 500 })
    }

    // Only process chats updated after last sync
    const sinceDate = connection.lastSyncedAt || undefined

    let synced = 0
    let errors = 0

    for (const chat of chats) {
      try {
        const messages = await getChatMessages(accessToken, chat.id, 25, sinceDate)

        for (const msg of messages) {
          // Skip system messages and empty messages
          if (msg.messageType !== 'message') continue
          if (!msg.body?.content?.trim()) continue

          const externalId = `teams-${msg.chatId}-${msg.id}`

          // Dedup
          const existing = await db.query.rawItems.findFirst({
            where: and(
              eq(schema.rawItems.workspaceId, workspaceId),
              eq(schema.rawItems.externalId, externalId),
            ),
          })
          if (existing) continue

          const plainText = msg.body.contentType === 'html'
            ? stripHtml(msg.body.content)
            : msg.body.content

          if (!plainText.trim()) continue

          // Truncate to 5000 chars
          const truncated = plainText.length > 5000 ? plainText.substring(0, 5000) + '...' : plainText

          const senderName = msg.from?.user?.displayName || 'Unknown'
          const chatTopic = chat.topic || (chat.chatType === 'oneOnOne' ? '1:1 Chat' : 'Group Chat')

          const content = `Chat: ${chatTopic}\nFrom: ${senderName}\nDate: ${msg.createdDateTime}\n\n${truncated}`

          await db.insert(schema.rawItems).values({
            workspaceId,
            sourceId: teamsSource!.id,
            externalId,
            author: JSON.stringify({ name: senderName }),
            occurredAt: msg.createdDateTime,
            text: content,
            metadata: JSON.stringify({
              teamsMessageId: msg.id,
              chatId: msg.chatId,
              chatType: chat.chatType,
              chatTopic,
              senderName,
              senderId: msg.from?.user?.id,
            }),
            status: 'new',
          })

          synced++
        }
      } catch (chatError: any) {
        console.error(`[Teams Sync] Error processing chat ${chat.id}:`, chatError.message)
        errors++
      }
    }

    // Update last synced
    await db.update(schema.integrationsConnections)
      .set({
        lastSyncedAt: new Date().toISOString(),
        syncError: errors > 0 ? `${errors} chats failed to process` : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.integrationsConnections.id, connection.id))

    return NextResponse.json({
      synced,
      errors,
      total: chats.length,
      inboxUrl: '/app/inbox?source=teams',
    })
  } catch (error: any) {
    console.error('[Teams Sync Error]', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
