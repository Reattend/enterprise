import { db, schema } from '../db'
import { eq, and } from 'drizzle-orm'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

async function notionFetch(path: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json()
}

function extractPlainText(richText: any[]): string {
  if (!Array.isArray(richText)) return ''
  return richText.map(t => t.plain_text || '').join('')
}

function extractBlockText(block: any): string {
  const type = block.type
  if (!type) return ''
  const data = block[type]
  if (!data) return ''

  if (data.rich_text) return extractPlainText(data.rich_text)
  if (data.text) return extractPlainText(data.text)
  if (type === 'child_page') return `[Page: ${data.title || ''}]`
  if (type === 'child_database') return `[Database: ${data.title || ''}]`
  return ''
}

export async function runNotionSync(
  connection: typeof schema.integrationsConnections.$inferSelect,
  workspaceId: string,
): Promise<{ synced: number; errors: number }> {
  if (!connection.accessToken) throw new Error('No access token — please reconnect Notion')

  const token = connection.accessToken

  const existingSource = await db.query.sources.findFirst({
    where: and(
      eq(schema.sources.workspaceId, workspaceId),
      eq(schema.sources.kind, 'document'),
      eq(schema.sources.label, 'Notion'),
    ),
  })

  let notionSourceId: string
  if (existingSource) {
    notionSourceId = existingSource.id
  } else {
    notionSourceId = crypto.randomUUID()
    await db.insert(schema.sources).values({
      id: notionSourceId,
      workspaceId,
      kind: 'document',
      label: 'Notion',
    })
  }

  let synced = 0
  let errors = 0
  let hasMore = true
  let startCursor: string | undefined

  // Fetch all pages the integration has access to
  while (hasMore) {
    try {
      const searchBody: any = {
        filter: { property: 'object', value: 'page' },
        page_size: 50,
      }
      if (startCursor) searchBody.start_cursor = startCursor

      const results = await notionFetch('/search', token, 'POST', searchBody)
      hasMore = results.has_more
      startCursor = results.next_cursor

      for (const page of results.results || []) {
        try {
          const pageId = page.id
          const externalId = `notion-${pageId}`

          // Dedup
          const existing = await db.query.rawItems.findFirst({
            where: and(
              eq(schema.rawItems.workspaceId, workspaceId),
              eq(schema.rawItems.externalId, externalId),
            ),
          })

          // Skip if already synced and page hasn't been edited since
          if (existing) {
            const lastEdited = page.last_edited_time
            if (existing.occurredAt && lastEdited && new Date(lastEdited) <= new Date(existing.occurredAt)) {
              continue
            }
          }

          // Extract page title
          const titleProp = Object.values(page.properties || {}).find((p: any) => p.type === 'title') as any
          const title = titleProp ? extractPlainText(titleProp.title) : 'Untitled'

          // Fetch page content (blocks)
          let content = ''
          try {
            const blocks = await notionFetch(`/blocks/${pageId}/children?page_size=100`, token)
            const lines: string[] = []
            for (const block of blocks.results || []) {
              const text = extractBlockText(block)
              if (text) lines.push(text)
            }
            content = lines.join('\n')
          } catch {
            content = title
          }

          const fullText = `Notion page: ${title}\n\n${content}`.slice(0, 10000)
          const occurredAt = page.last_edited_time || page.created_time || new Date().toISOString()

          if (existing) {
            await db.update(schema.rawItems).set({
              text: fullText,
              occurredAt,
              status: 'new',
            }).where(eq(schema.rawItems.id, existing.id))
          } else {
            await db.insert(schema.rawItems).values({
              workspaceId,
              sourceId: notionSourceId,
              externalId,
              text: fullText,
              occurredAt,
              metadata: JSON.stringify({
                notionPageId: pageId,
                notionUrl: page.url,
                title,
              }),
              status: 'new',
            })
          }

          synced++
        } catch (pageErr: any) {
          console.error(`[Notion Sync] Page ${page.id} failed:`, pageErr.message)
          errors++
        }
      }
    } catch (searchErr: any) {
      console.error('[Notion Sync] Search failed:', searchErr.message)
      hasMore = false
      errors++
    }
  }

  await db.update(schema.integrationsConnections).set({
    lastSyncedAt: new Date().toISOString(),
    syncError: errors > 0 ? `${errors} page(s) failed to sync` : null,
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.integrationsConnections.id, connection.id))

  return { synced, errors }
}
