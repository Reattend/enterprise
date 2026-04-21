// Gmail normalizer.
//
// Expected Nango sync output (per record), based on Nango's standard
// google-mail templates. Exact field names can vary by sync-script version,
// so we pick the first defined field of each logical concept.

import { asIso, asText, type NangoNormalizer, type NormalizedRawItem } from '../normalize'

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k] as T
  }
  return undefined
}

export const normalizeGmail: NangoNormalizer = (r): NormalizedRawItem | null => {
  const externalId = asText(pick(r, ['id', 'message_id', 'messageId', 'thread_id', 'threadId']))
  if (!externalId) return null

  const subject = asText(pick(r, ['subject', 'Subject']))
  const from = asText(pick(r, ['from', 'From', 'sender']))
  const snippet = asText(pick(r, ['snippet', 'preview']))
  const body = asText(pick(r, ['body', 'text', 'plain_body', 'plainBody', 'plainTextBody']))
  const occurredAt = asIso(pick(r, ['date', 'internalDate', 'sent_at', 'sentAt']))

  // Compose the text triage will read: subject on top, then body. Subject
  // alone often carries the decision signal ("Approved: 2026 comp plan").
  const text = [subject && `Subject: ${subject}`, from && `From: ${from}`, body || snippet]
    .filter(Boolean)
    .join('\n\n')
    .trim()
  if (!text) return null

  return {
    externalId: `gmail:${externalId}`,
    occurredAt,
    author: from ? { source: 'gmail', from } : null,
    text,
    metadata: {
      source: 'gmail',
      subject: subject || null,
      threadId: asText(pick(r, ['thread_id', 'threadId'])) || null,
      url: asText(pick(r, ['url', 'permalink'])) || null,
    },
  }
}
