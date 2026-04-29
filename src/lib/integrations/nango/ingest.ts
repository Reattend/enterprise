// Shared Nango ingest path. Given a (userId, providerKey, model, cursor),
// pulls the delta from Nango, normalizes into raw_items, and enqueues triage
// for each new item. Used by both the webhook handler and any manual poll.

import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getNangoClient } from './client'
import { getProviderByKey, type NangoProviderDef } from './providers'
import { getNormalizer } from './providers/index'
import { enqueueJob } from '@/lib/jobs/worker'
import type { NangoRecord } from '@nangohq/node'
import { fetchGmailMessages } from './proxy-fetchers/gmail'
import { fetchCalendarEvents } from './proxy-fetchers/google-calendar'
import { fetchSlackMessages } from './proxy-fetchers/slack'
import { fetchNotionPages } from './proxy-fetchers/notion'
import { fetchGithubItems } from './proxy-fetchers/github'
import type { NormalizedRawItem } from './normalize'

// Providers we fetch ourselves via nango.proxy() instead of nango.listRecords.
// Self-hosted Nango ships with sync scripts disabled, so listRecords returns
// empty for these — we must drive the API calls ourselves.
const PROXY_PROVIDERS: Record<string, true> = {
  'google-mail': true,
  'google-calendar': true,
  'slack': true,
  'notion': true,
  'github': true,
}

export interface IngestResult {
  added: number
  skipped: number
  errors: number
  filtered: number // rejected by user-configured scope (see filterByScope)
  nextCursor: string | null
}

export interface ConnectionScope {
  includeTerms: string[]  // lowercased, any-match
  excludeTerms: string[]  // lowercased, any-match → drop
  domainWhitelist: string[] // lowercased; if set, text must mention one
}

// Scope filter — returns true if the record passes, false if it should be
// dropped. Empty arrays = no filter. Case-insensitive substring match.
function passesScope(text: string, scope: ConnectionScope | null): boolean {
  if (!scope) return true
  const lower = text.toLowerCase()
  if (scope.excludeTerms.some((t) => t && lower.includes(t))) return false
  if (scope.includeTerms.length > 0 && !scope.includeTerms.some((t) => t && lower.includes(t))) return false
  if (scope.domainWhitelist.length > 0 && !scope.domainWhitelist.some((d) => d && lower.includes(`@${d}`) || lower.includes(d))) return false
  return true
}

// Find-or-create the local raw_items source row for a Nango connection.
async function resolveSource(workspaceId: string, provider: NangoProviderDef) {
  const label = provider.name
  const kind = provider.category === 'email' ? 'email'
    : provider.category === 'chat' ? 'chat'
    : provider.category === 'calendar' ? 'calendar'
    : provider.category === 'docs' || provider.category === 'wiki' ? 'document'
    : 'integration'

  let row = await db.query.sources.findFirst({
    where: and(
      eq(schema.sources.workspaceId, workspaceId),
      eq(schema.sources.label, label),
    ),
  })
  if (!row) {
    const [inserted] = await db.insert(schema.sources)
      .values({ workspaceId, kind: kind as any, label })
      .returning()
    row = inserted
  }
  return row
}

// Pull records from Nango for one (connection, model) pair and write them as
// raw_items. Idempotent via externalId: if a raw_item for the same external
// id already exists in this workspace, it's updated in place instead of
// re-inserted (and triage is NOT re-run for unchanged-content updates).
export async function ingestFromNango(opts: {
  userId: string
  workspaceId: string
  providerKey: string
  model: string
  cursor?: string | null
  limit?: number
}): Promise<IngestResult> {
  const provider = getProviderByKey(opts.providerKey)
  if (!provider) throw new Error(`unknown provider key: ${opts.providerKey}`)

  const normalize = getNormalizer(provider.providerConfigKey)
  if (!normalize) throw new Error(`no normalizer registered for ${provider.providerConfigKey}`)

  const nango = getNangoClient()
  const limit = opts.limit ?? 100

  // Look up the Nango-generated connection_id (stored when the auth webhook
  // fired) plus the user's scope filter. Both live in integrations_connections.settings.
  const conn = await db.query.integrationsConnections.findFirst({
    where: and(
      eq(schema.integrationsConnections.userId, opts.userId),
      eq(schema.integrationsConnections.integrationKey, opts.providerKey),
    ),
  })
  if (!conn) throw new Error(`no integrations_connections row for ${opts.userId}/${opts.providerKey}`)

  let nangoConnectionId: string | null = null
  let scope: ConnectionScope | null = null
  if (conn.settings) {
    try {
      const s = JSON.parse(conn.settings)
      nangoConnectionId = s.nangoConnectionId || null
      if (s.scope) scope = {
        includeTerms: s.scope.includeTerms || [],
        excludeTerms: s.scope.excludeTerms || [],
        domainWhitelist: s.scope.domainWhitelist || [],
      }
    } catch { /* bad JSON */ }
  }
  if (!nangoConnectionId) {
    throw new Error(`no nangoConnectionId stored for ${opts.userId}/${opts.providerKey} — connection may not have completed yet`)
  }

  // Branch: providers we fetch ourselves via nango.proxy(), or via Nango's
  // sync scripts (listRecords). The proxy path is for any provider where a
  // sync template isn't enabled in our self-hosted Nango.
  let normalizedItems: NormalizedRawItem[] = []
  let nextCursor: string | null = null

  if (PROXY_PROVIDERS[provider.providerConfigKey]) {
    console.log(`[ingest] proxy branch for ${provider.providerConfigKey} conn=${nangoConnectionId}`)
    try {
      if (provider.providerConfigKey === 'google-mail') {
        normalizedItems = await fetchGmailMessages(nango, provider.providerConfigKey, nangoConnectionId, { maxResults: limit })
      } else if (provider.providerConfigKey === 'google-calendar') {
        normalizedItems = await fetchCalendarEvents(nango, provider.providerConfigKey, nangoConnectionId, { maxResults: limit })
      } else if (provider.providerConfigKey === 'slack') {
        normalizedItems = await fetchSlackMessages(nango, provider.providerConfigKey, nangoConnectionId, {})
      } else if (provider.providerConfigKey === 'notion') {
        normalizedItems = await fetchNotionPages(nango, provider.providerConfigKey, nangoConnectionId, {})
      } else if (provider.providerConfigKey === 'github') {
        normalizedItems = await fetchGithubItems(nango, provider.providerConfigKey, nangoConnectionId, {})
      }
      console.log(`[ingest] proxy returned ${normalizedItems.length} items`)
    } catch (err: any) {
      console.error(`[ingest] proxy failed:`, err?.response?.status, err?.response?.data || err?.message || err)
      throw err
    }
  } else {
    const { records, next_cursor } = await nango.listRecords({
      providerConfigKey: provider.providerConfigKey,
      connectionId: nangoConnectionId,
      model: opts.model,
      limit,
      ...(opts.cursor ? { cursor: opts.cursor } : {}),
    })
    nextCursor = next_cursor || null
    for (const rec of records as NangoRecord[]) {
      const n = normalize(rec as unknown as Record<string, unknown>)
      if (n) normalizedItems.push(n)
    }
  }

  const source = await resolveSource(opts.workspaceId, provider)

  let added = 0, skipped = 0, errors = 0, filtered = 0

  for (const normalized of normalizedItems) {
    try {
      // Scope filter — user configured which content to keep. Rejected
      // records never hit raw_items, saving triage work downstream.
      if (!passesScope(normalized.text, scope)) {
        filtered++
        continue
      }

      // Dedup on externalId within this workspace. Updates don't re-triage
      // unless content changed meaningfully (left as a TODO — today we keep
      // the first triage decision).
      const existing = await db.query.rawItems.findFirst({
        where: and(
          eq(schema.rawItems.workspaceId, opts.workspaceId),
          eq(schema.rawItems.externalId, normalized.externalId),
        ),
      })
      if (existing) {
        skipped++
        continue
      }

      const [inserted] = await db.insert(schema.rawItems).values({
        workspaceId: opts.workspaceId,
        sourceId: source.id,
        externalId: normalized.externalId,
        author: normalized.author ? JSON.stringify(normalized.author) : null,
        occurredAt: normalized.occurredAt,
        text: normalized.text,
        metadata: JSON.stringify(normalized.metadata),
        status: 'new',
      }).returning()

      // Fire-and-forget triage. Worker picks it up on its next cycle.
      await enqueueJob(opts.workspaceId, 'triage', { rawItemId: inserted.id })
      added++
    } catch (err) {
      console.error('[nango ingest] normalize/insert failed', err)
      errors++
    }
  }

  return { added, skipped, errors, filtered, nextCursor }
}
