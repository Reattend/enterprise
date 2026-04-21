import { asIso, asText, type NangoNormalizer, type NormalizedRawItem } from '../normalize'

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k] as T
  }
  return undefined
}

export const normalizeNotion: NangoNormalizer = (r): NormalizedRawItem | null => {
  const externalId = asText(pick(r, ['id', 'page_id', 'pageId']))
  if (!externalId) return null

  const title = asText(pick(r, ['title', 'name']))
  const body = asText(pick(r, ['content', 'text', 'plain_text', 'plainText', 'markdown']))
  const occurredAt = asIso(pick(r, ['last_edited_time', 'lastEditedTime', 'updatedAt', 'modifiedAt']))
  const editor = asText(pick(r, ['last_edited_by', 'lastEditedBy', 'owner']))

  const text = [title && `# ${title}`, body].filter(Boolean).join('\n\n').trim()
  if (!text) return null

  return {
    externalId: `notion:${externalId}`,
    occurredAt,
    author: editor ? { source: 'notion', editor } : null,
    text,
    metadata: {
      source: 'notion',
      title: title || null,
      url: asText(pick(r, ['url', 'public_url', 'publicUrl'])) || null,
    },
  }
}
