import { asIso, asText, type NangoNormalizer, type NormalizedRawItem } from '../normalize'

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k] as T
  }
  return undefined
}

export const normalizeConfluence: NangoNormalizer = (r): NormalizedRawItem | null => {
  const externalId = asText(pick(r, ['id', 'page_id', 'pageId']))
  if (!externalId) return null

  const title = asText(pick(r, ['title']))
  const body = asText(pick(r, ['body', 'content', 'text', 'plain_text', 'plainText']))
  const occurredAt = asIso(pick(r, ['updated_at', 'updatedAt', 'lastModified', 'last_modified']))
  const spaceKey = asText(pick(r, ['space_key', 'spaceKey', 'space']))
  const editor = asText(pick(r, ['last_editor', 'updatedBy', 'updated_by']))

  const text = [title && `# ${title}`, spaceKey && `Space: ${spaceKey}`, body].filter(Boolean).join('\n\n').trim()
  if (!text) return null

  return {
    externalId: `confluence:${externalId}`,
    occurredAt,
    author: editor ? { source: 'confluence', editor } : null,
    text,
    metadata: {
      source: 'confluence',
      title: title || null,
      spaceKey: spaceKey || null,
      url: asText(pick(r, ['url', 'webui', 'link'])) || null,
    },
  }
}
