import { asIso, asText, type NangoNormalizer, type NormalizedRawItem } from '../normalize'

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k] as T
  }
  return undefined
}

export const normalizeSlack: NangoNormalizer = (r): NormalizedRawItem | null => {
  const externalId = asText(pick(r, ['id', 'ts', 'client_msg_id', 'clientMsgId']))
  if (!externalId) return null

  const text = asText(pick(r, ['text', 'message', 'body']))
  if (!text) return null

  const user = asText(pick(r, ['user', 'username', 'user_name', 'bot_profile']))
  const channel = asText(pick(r, ['channel', 'channel_name', 'channelName']))
  const occurredAt = asIso(pick(r, ['ts', 'timestamp', 'event_ts']))

  const labeled = [channel && `#${channel}`, user && `@${user}`, text].filter(Boolean).join(' — ').trim()

  return {
    externalId: `slack:${externalId}`,
    occurredAt,
    author: user ? { source: 'slack', user, channel: channel || null } : null,
    text: labeled,
    metadata: {
      source: 'slack',
      channel: channel || null,
      threadTs: asText(pick(r, ['thread_ts', 'threadTs'])) || null,
      permalink: asText(pick(r, ['permalink', 'url'])) || null,
    },
  }
}
