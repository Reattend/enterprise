// Claude-powered wiki summary generator.
//
// Strategy:
//   1. Collect the top ~30 most-recent records for the target (dept/topic/person)
//   2. Sort + truncate to stay under ~10k input chars
//   3. Ask Claude for a 100-word summary in our voice (neutral, factual)
//   4. Cache in wiki_summaries for 7 days or until dirty=true
//
// All callers should prefer getOrGenerateSummary() — it handles caching.
// Direct regenerateSummary() exists for manual "refresh" buttons.

import { db, schema } from '@/lib/db'
import { and, eq } from 'drizzle-orm'
import { getAskLLM } from '@/lib/ai/llm'

export type WikiPageType = 'dept' | 'topic' | 'person'

const MAX_INPUT_CHARS = 10000
const MAX_RECORDS = 30
const CACHE_TTL_DAYS = 7

interface RecordLite {
  id: string
  title: string
  summary: string | null
  content: string | null
  type: string
  createdAt: string
}

// Build the prompt for Claude. We keep it opinionated: neutral tone, no
// marketing, focus on what decisions/patterns emerged. Three flavors —
// the scaffolding is identical, only the framing sentence changes.
function buildPrompt(pageType: WikiPageType, label: string, records: RecordLite[]): string {
  const intro =
    pageType === 'dept'
      ? `You are writing a single-paragraph factual overview of the "${label}" department for an internal org wiki. Readers are employees trying to understand what this department works on.`
      : pageType === 'topic'
      ? `You are writing a single-paragraph factual overview of the topic "${label}" as it appears across this organization. Readers want to know what's happening around this topic.`
      : `You are writing a single-paragraph factual overview of what "${label}" has been working on, decided, or contributed to, based on records where they are named or which they authored.`

  const body = records
    .slice(0, MAX_RECORDS)
    .map((r, i) => {
      const blurb = (r.summary || r.content || '').slice(0, 300)
      return `[${i + 1}] (${r.type}) ${r.title}\n${blurb}`
    })
    .join('\n\n')
    .slice(0, MAX_INPUT_CHARS)

  return `${intro}

Rules:
- Roughly 80-120 words. One paragraph.
- Factual, neutral, no marketing language.
- Reference specific decisions or threads only if they appear multiple times.
- Do NOT speculate beyond the records. If it's thin, say so in one sentence.
- Do NOT start with "This department..." or "This topic..." — jump straight in.

Records (most recent first):

${body}`
}

async function runClaudeSummary(prompt: string): Promise<string> {
  const llm = getAskLLM()
  const text = await llm.generateText(prompt, 400)
  return (text || '').trim()
}

// Upsert a cached summary row. Overwrites any existing entry for the same
// (org, pageType, pageKey) and clears dirty.
async function writeSummary(opts: {
  organizationId: string
  pageType: WikiPageType
  pageKey: string
  summary: string
  recordCount: number
  lastRecordAt: string | null
}) {
  const existing = await db.query.wikiSummaries.findFirst({
    where: and(
      eq(schema.wikiSummaries.organizationId, opts.organizationId),
      eq(schema.wikiSummaries.pageType, opts.pageType),
      eq(schema.wikiSummaries.pageKey, opts.pageKey),
    ),
  })
  const now = new Date().toISOString()
  if (existing) {
    await db.update(schema.wikiSummaries).set({
      summary: opts.summary,
      recordCount: opts.recordCount,
      lastRecordAt: opts.lastRecordAt,
      dirty: false,
      generatedAt: now,
    }).where(eq(schema.wikiSummaries.id, existing.id))
    return existing.id
  }
  const [row] = await db.insert(schema.wikiSummaries).values({
    organizationId: opts.organizationId,
    pageType: opts.pageType,
    pageKey: opts.pageKey,
    summary: opts.summary,
    recordCount: opts.recordCount,
    lastRecordAt: opts.lastRecordAt,
    dirty: false,
  }).returning()
  return row.id
}

// Hot path: use cache if present and fresh, else regenerate.
// `records` is expected to be pre-fetched by the caller (each page type has
// its own scoping rules; centralizing here would couple this module to RBAC).
export async function getOrGenerateSummary(opts: {
  organizationId: string
  pageType: WikiPageType
  pageKey: string
  label: string
  records: RecordLite[]
}): Promise<{ summary: string; cached: boolean; recordCount: number; lastRecordAt: string | null; generatedAt: string }> {
  const lastRecordAt = opts.records.length
    ? opts.records.reduce((max, r) => (r.createdAt > max ? r.createdAt : max), opts.records[0].createdAt)
    : null

  const cached = await db.query.wikiSummaries.findFirst({
    where: and(
      eq(schema.wikiSummaries.organizationId, opts.organizationId),
      eq(schema.wikiSummaries.pageType, opts.pageType),
      eq(schema.wikiSummaries.pageKey, opts.pageKey),
    ),
  })

  const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
  const isFresh = cached
    && !cached.dirty
    && Date.now() - new Date(cached.generatedAt).getTime() < ttlMs
    && cached.recordCount === opts.records.length
    && cached.lastRecordAt === lastRecordAt

  if (cached && isFresh) {
    return {
      summary: cached.summary,
      cached: true,
      recordCount: cached.recordCount,
      lastRecordAt: cached.lastRecordAt,
      generatedAt: cached.generatedAt,
    }
  }

  // Empty-data short-circuit: don't bother calling Claude with nothing.
  if (opts.records.length === 0) {
    const summary = `No records yet for ${opts.label}. As the team captures decisions, meeting notes, and documents tagged to this ${opts.pageType}, a live summary will appear here.`
    await writeSummary({
      organizationId: opts.organizationId,
      pageType: opts.pageType,
      pageKey: opts.pageKey,
      summary,
      recordCount: 0,
      lastRecordAt: null,
    })
    return { summary, cached: false, recordCount: 0, lastRecordAt: null, generatedAt: new Date().toISOString() }
  }

  const prompt = buildPrompt(opts.pageType, opts.label, opts.records)
  let summary: string
  try {
    summary = await runClaudeSummary(prompt)
  } catch (err) {
    console.error('[wiki.summarize] LLM failed, using fallback:', err)
    summary = `Recent activity: ${opts.records.slice(0, 3).map((r) => r.title).join(' · ')}. (Claude summary will be regenerated automatically on next load.)`
  }

  await writeSummary({
    organizationId: opts.organizationId,
    pageType: opts.pageType,
    pageKey: opts.pageKey,
    summary,
    recordCount: opts.records.length,
    lastRecordAt,
  })
  return { summary, cached: false, recordCount: opts.records.length, lastRecordAt, generatedAt: new Date().toISOString() }
}

// Stale detector — 90+ days with no new records => stale. This is the
// badge rendered on the wiki page, not the cache TTL (which is 7d for LLM
// cost reasons).
export function isPageStale(lastRecordAt: string | null): boolean {
  if (!lastRecordAt) return true
  const STALE_MS = 90 * 24 * 60 * 60 * 1000
  return Date.now() - new Date(lastRecordAt).getTime() > STALE_MS
}
