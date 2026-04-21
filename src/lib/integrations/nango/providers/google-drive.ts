import { asIso, asText, type NangoNormalizer, type NormalizedRawItem } from '../normalize'

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k] as T
  }
  return undefined
}

export const normalizeGoogleDrive: NangoNormalizer = (r): NormalizedRawItem | null => {
  const externalId = asText(pick(r, ['id', 'file_id', 'fileId']))
  if (!externalId) return null

  const title = asText(pick(r, ['name', 'title']))
  const body = asText(pick(r, ['content', 'text', 'plain_text', 'plainText']))
  const occurredAt = asIso(pick(r, ['modifiedTime', 'modified_time', 'modifiedAt', 'updatedAt']))
  const mimeType = asText(pick(r, ['mimeType', 'mime_type']))
  const owner = asText(pick(r, ['owner', 'lastModifyingUser']))

  const text = [title && `Title: ${title}`, body].filter(Boolean).join('\n\n').trim()
  if (!text) return null

  return {
    externalId: `gdrive:${externalId}`,
    occurredAt,
    author: owner ? { source: 'google-drive', owner } : null,
    text,
    metadata: {
      source: 'google-drive',
      title: title || null,
      mimeType: mimeType || null,
      url: asText(pick(r, ['webViewLink', 'url', 'link'])) || null,
    },
  }
}
