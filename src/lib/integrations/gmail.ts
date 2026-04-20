import { db, schema } from '../db'
import { eq, and } from 'drizzle-orm'
import {
  getValidAccessToken,
  refreshAccessToken,
  listAllThreads,
  getThread,
  extractThreadContent,
} from '../google'

export async function runGmailSync(
  connection: typeof schema.integrationsConnections.$inferSelect,
  workspaceId: string,
): Promise<{ synced: number; errors: number; skipped: number }> {
  if (!connection.refreshToken) throw new Error('No refresh token')

  const settings = connection.settings ? JSON.parse(connection.settings) : {}
  const domainWhitelist: string[] = (settings.domainWhitelist || []).map((d: string) => d.toLowerCase())

  if (domainWhitelist.length === 0) throw new Error('No domains whitelisted')

  // Refresh token if needed
  let accessToken = await getValidAccessToken(connection.refreshToken, connection.accessToken, connection.tokenExpiresAt)
  if (accessToken !== connection.accessToken) {
    const refreshed = await refreshAccessToken(connection.refreshToken)
    await db.update(schema.integrationsConnections)
      .set({ accessToken: refreshed.access_token, tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(schema.integrationsConnections.id, connection.id))
    accessToken = refreshed.access_token
  }

  // Find or create Gmail source
  let gmailSource = await db.query.sources.findFirst({
    where: and(eq(schema.sources.workspaceId, workspaceId), eq(schema.sources.kind, 'email')),
  })
  if (!gmailSource) {
    const [inserted] = await db.insert(schema.sources)
      .values({ workspaceId, kind: 'email', label: 'Gmail' })
      .returning()
    gmailSource = inserted
  }

  // Build query
  const domainQueries = domainWhitelist.map(d => `from:${d}`).join(' ')
  let query = `{${domainQueries}}`
  if (connection.lastSyncedAt) {
    const afterTs = Math.floor(new Date(connection.lastSyncedAt).getTime() / 1000)
    query += ` after:${afterTs}`
  }

  const threads = await listAllThreads(accessToken, query)

  let synced = 0
  let errors = 0
  let skipped = 0

  for (const { id: threadId } of threads) {
    try {
      // Dedup by threadId
      const existing = await db.query.rawItems.findFirst({
        where: and(eq(schema.rawItems.workspaceId, workspaceId), eq(schema.rawItems.externalId, threadId)),
      })
      if (existing) { skipped++; continue }

      const thread = await getThread(accessToken, threadId)
      const extracted = extractThreadContent(thread, domainWhitelist)
      if (!extracted) { skipped++; continue }

      const { subject, from, date, content, senderDomain } = extracted

      await db.insert(schema.rawItems).values({
        workspaceId,
        sourceId: gmailSource!.id,
        externalId: threadId,
        author: JSON.stringify({ name: from, email: from }),
        occurredAt: date ? new Date(date).toISOString() : new Date().toISOString(),
        text: content,
        metadata: JSON.stringify({ threadId, from, subject, senderDomain }),
        status: 'new',
      })

      synced++
    } catch (e: any) {
      console.error(`[Gmail Sync] Thread ${threadId} error:`, e.message)
      errors++
    }
  }

  await db.update(schema.integrationsConnections)
    .set({ lastSyncedAt: new Date().toISOString(), syncError: errors > 0 ? `${errors} threads failed` : null, updatedAt: new Date().toISOString() })
    .where(eq(schema.integrationsConnections.id, connection.id))

  return { synced, errors, skipped }
}
