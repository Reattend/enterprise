// Gmail fetcher — uses nango.proxy() to call Gmail API directly.
//
// Self-hosted Nango ships with sync scripts disabled (features.scripts: false),
// so listRecords always returns empty. We use Nango as an OAuth token broker:
// it stores + auto-refreshes the access token, we make the actual API calls.

import type { Nango } from '@nangohq/node'
import type { NormalizedRawItem } from '../normalize'

interface GmailMessageFull {
  id: string
  threadId?: string
  internalDate?: string
  snippet?: string
  payload?: {
    headers?: Array<{ name: string; value: string }>
    parts?: Array<{ mimeType: string; body?: { data?: string }; parts?: any[] }>
    body?: { data?: string }
    mimeType?: string
  }
  labelIds?: string[]
}

function header(headers: Array<{ name: string; value: string }> | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value
}

// Walk a Gmail message payload and extract the first text/plain (or fallback
// to text/html stripped) body. Multipart messages need recursive walking.
function extractBody(payload: GmailMessageFull['payload']): string {
  if (!payload) return ''
  const decode = (data: string) => {
    try { return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8') }
    catch { return '' }
  }
  // Direct body
  if (payload.body?.data && (payload.mimeType === 'text/plain' || payload.mimeType === 'text/html')) {
    const txt = decode(payload.body.data)
    return payload.mimeType === 'text/html' ? txt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : txt
  }
  // Multipart — prefer text/plain
  const parts = payload.parts || []
  for (const p of parts) {
    if (p.mimeType === 'text/plain' && p.body?.data) return decode(p.body.data)
  }
  for (const p of parts) {
    if (p.mimeType === 'text/html' && p.body?.data) {
      return decode(p.body.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
  }
  // Recurse into nested multipart
  for (const p of parts) {
    if (p.parts) {
      const nested = extractBody({ parts: p.parts, headers: payload.headers })
      if (nested) return nested
    }
  }
  return ''
}

export async function fetchGmailMessages(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
  opts: { maxResults?: number; query?: string } = {},
): Promise<NormalizedRawItem[]> {
  const maxResults = opts.maxResults ?? 50
  // Default to last 90 days, skip Drafts/Spam/Trash. Caller can override.
  const query = opts.query ?? 'newer_than:90d -in:spam -in:trash -in:drafts'

  // Step 1: list message IDs.
  const listRes = await nango.proxy({
    method: 'GET',
    endpoint: `/gmail/v1/users/me/messages`,
    providerConfigKey,
    connectionId,
    params: { maxResults: String(maxResults), q: query },
    baseUrlOverride: 'https://gmail.googleapis.com',
  })
  const messages: Array<{ id: string }> = (listRes.data as any)?.messages ?? []
  if (messages.length === 0) return []

  // Step 2: fetch full message for each (Gmail forces this — list returns IDs only).
  // We do them sequentially to avoid hammering the rate limit on a single token.
  const out: NormalizedRawItem[] = []
  for (const m of messages) {
    try {
      const msgRes = await nango.proxy({
        method: 'GET',
        endpoint: `/gmail/v1/users/me/messages/${m.id}`,
        providerConfigKey,
        connectionId,
        params: { format: 'full' },
        baseUrlOverride: 'https://gmail.googleapis.com',
      })
      const msg = msgRes.data as GmailMessageFull
      const subject = header(msg.payload?.headers, 'Subject') || ''
      const from = header(msg.payload?.headers, 'From') || ''
      const dateHeader = header(msg.payload?.headers, 'Date')
      const occurredAt = msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : (dateHeader ? new Date(dateHeader).toISOString() : null)
      const body = extractBody(msg.payload)
      const text = [subject && `Subject: ${subject}`, from && `From: ${from}`, body || msg.snippet || '']
        .filter(Boolean).join('\n\n').trim()
      if (!text) continue

      out.push({
        externalId: `gmail:${msg.id}`,
        occurredAt,
        author: from ? { source: 'gmail', from } : null,
        text,
        metadata: {
          source: 'gmail',
          subject: subject || null,
          threadId: msg.threadId || null,
          messageId: msg.id,
          labels: msg.labelIds || [],
          url: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId || msg.id}`,
        },
      })
    } catch (err) {
      console.error('[gmail proxy] fetch message failed', m.id, err)
    }
  }
  return out
}
