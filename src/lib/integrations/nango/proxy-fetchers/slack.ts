// Slack fetcher — uses nango.proxy() to call Slack Web API.
//
// Strategy: pull the connected user's accessible public channels, fetch the
// last N messages from each, normalize each message into a raw_item. Skips
// system messages (joins/leaves/bot announcements). Resolves user IDs to
// display names via a single users.list call up front so triage sees
// "Sarah Lee said:" instead of "U03ABC123 said:".
//
// Default ceiling per backfill: ~20 channels × 100 messages = 2k messages,
// scoped to last 30 days. Tunable via opts.

import type { Nango } from '@nangohq/node'
import type { NormalizedRawItem } from '../normalize'

interface SlackChannel {
  id: string
  name: string
  is_member?: boolean
  is_archived?: boolean
  is_private?: boolean
  num_members?: number
}

interface SlackMessage {
  type: string
  subtype?: string
  ts: string
  text?: string
  user?: string
  bot_id?: string
  thread_ts?: string
  reply_count?: number
  permalink?: string
}

interface SlackUser {
  id: string
  real_name?: string
  name?: string
  profile?: { display_name?: string; email?: string }
  is_bot?: boolean
  deleted?: boolean
}

export async function fetchSlackMessages(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
  opts: { maxChannels?: number; maxPerChannel?: number; daysPast?: number } = {},
): Promise<NormalizedRawItem[]> {
  const maxChannels = opts.maxChannels ?? 20
  const maxPerChannel = opts.maxPerChannel ?? 100
  const daysPast = opts.daysPast ?? 30
  const oldest = String(Math.floor(Date.now() / 1000 - daysPast * 86400))

  const slackBase = 'https://slack.com'

  // Step 1: list public channels (we only ingest channels the user is a
  // member of, to avoid pulling firehose-y org-wide channels they ignore).
  const chRes = await nango.proxy({
    method: 'GET',
    endpoint: '/api/conversations.list',
    providerConfigKey,
    connectionId,
    params: {
      types: 'public_channel',
      exclude_archived: 'true',
      limit: String(maxChannels),
    },
    baseUrlOverride: slackBase,
  })
  if (!(chRes.data as any)?.ok) {
    throw new Error(`slack conversations.list failed: ${(chRes.data as any)?.error || 'unknown'}`)
  }
  const channels: SlackChannel[] = ((chRes.data as any)?.channels || [])
    .filter((c: SlackChannel) => c.is_member && !c.is_archived)
    .slice(0, maxChannels)

  if (channels.length === 0) return []

  // Step 2: build a userId → display name map. Cheap (one call, paginated
  // if needed) and saves resolution per-message.
  const userById = new Map<string, string>()
  try {
    const usersRes = await nango.proxy({
      method: 'GET',
      endpoint: '/api/users.list',
      providerConfigKey,
      connectionId,
      params: { limit: '500' },
      baseUrlOverride: slackBase,
    })
    if ((usersRes.data as any)?.ok) {
      for (const u of (usersRes.data as any).members as SlackUser[]) {
        if (u.deleted) continue
        const name = u.profile?.display_name || u.real_name || u.name || u.id
        userById.set(u.id, name)
      }
    }
  } catch (err) {
    console.warn('[slack proxy] users.list failed (continuing with raw user IDs)', err)
  }

  // Step 3: for each channel, pull the last N messages.
  const out: NormalizedRawItem[] = []
  for (const ch of channels) {
    try {
      const histRes = await nango.proxy({
        method: 'GET',
        endpoint: '/api/conversations.history',
        providerConfigKey,
        connectionId,
        params: {
          channel: ch.id,
          limit: String(maxPerChannel),
          oldest,
        },
        baseUrlOverride: slackBase,
      })
      if (!(histRes.data as any)?.ok) {
        console.warn('[slack proxy] history failed for', ch.id, (histRes.data as any)?.error)
        continue
      }
      const messages: SlackMessage[] = (histRes.data as any).messages || []
      for (const m of messages) {
        // Skip system messages (joins/leaves/topic changes/bot frames).
        if (m.subtype) continue
        if (!m.text || m.text.trim().length < 3) continue
        if (m.bot_id) continue // skip pure-bot posts; user-via-app posts have a 'user' too

        const tsMs = Math.floor(parseFloat(m.ts) * 1000)
        const occurredAt = isFinite(tsMs) ? new Date(tsMs).toISOString() : null
        const userName = m.user ? (userById.get(m.user) || m.user) : 'unknown'

        out.push({
          externalId: `slack:${ch.id}:${m.ts}`,
          occurredAt,
          author: { source: 'slack', userId: m.user || null, name: userName },
          // Lead with channel + author so triage sees the conversational
          // context immediately. Slack's quirky `<@U123>` mentions are kept
          // verbatim — the LLM understands them.
          text: `[#${ch.name}] ${userName}: ${m.text}`,
          metadata: {
            source: 'slack',
            channel: ch.name,
            channelId: ch.id,
            ts: m.ts,
            threadTs: m.thread_ts || null,
            replyCount: m.reply_count || 0,
          },
        })
      }
    } catch (err) {
      console.error('[slack proxy] channel fetch failed', ch.id, err)
    }
  }
  return out
}
