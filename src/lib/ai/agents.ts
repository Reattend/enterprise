import { z } from 'zod'
import { getLLM } from './llm'
import { PROMPTS } from './prompts'
import { db, schema, sqlite, vecLoaded, upsertFTS } from '../db'
import { eq, and, ne, or, like, lt, asc } from 'drizzle-orm'
import { cosineSimilarity } from '../utils'

// ─── Rabbit Direct API ─────────────────────────────────
// Calls Rabbit's specialized endpoints directly instead of going through the
// LLM provider. Used by the ingest flow: /v1/ingest runs TRIAGE + EXTRACT +
// SUMMARIZE + SENTIMENT + IMPORTANCE as separate focused signal calls and
// returns a pre-shaped result that maps cleanly to TriageResult.
const RABBIT_URL = process.env.RABBIT_API_URL
const RABBIT_KEY = process.env.RABBIT_API_KEY

async function rabbitIngest(content: string): Promise<{
  triage: any; extract: any; summary: string; sentiment: string; importance: any; embedding: number[];
} | null> {
  if (!RABBIT_URL || !RABBIT_KEY) return null
  const res = await fetch(`${RABBIT_URL}/v1/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RABBIT_KEY}` },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(180_000),
  })
  if (!res.ok) throw new Error(`Rabbit ingest failed (${res.status})`)
  return res.json()
}

// Map Rabbit's /v1/ingest response to TriageResult schema
function mapIngestToTriageResult(ingest: any): any {
  const triage = typeof ingest.triage === 'string' ? JSON.parse(ingest.triage) : (ingest.triage || {})
  const extract = typeof ingest.extract === 'string' ? JSON.parse(ingest.extract) : (ingest.extract || {})
  const importance = typeof ingest.importance === 'string' ? JSON.parse(ingest.importance) : (ingest.importance || {})

  // Map Rabbit's type names to Reattend's record_type enum
  const typeMap: Record<string, string> = {
    triage: 'note', sync: 'meeting', update: 'context', chat: 'context',
    call: 'meeting', meeting: 'meeting', decision: 'decision', task: 'tasklike',
    insight: 'insight', idea: 'idea', context: 'context', note: 'note',
  }
  const rawType = (triage.type || triage.record_type || 'note').toLowerCase()
  const recordType = typeMap[rawType] || 'note'

  // Build entities from extract results
  const entities: Array<{ kind: string; name: string }> = []
  if (Array.isArray(extract.people)) {
    for (const p of extract.people) entities.push({ kind: 'person', name: typeof p === 'string' ? p : p.name || String(p) })
  }
  if (Array.isArray(extract.organizations)) {
    for (const o of extract.organizations) entities.push({ kind: 'org', name: typeof o === 'string' ? o : o.name || String(o) })
  }
  if (Array.isArray(extract.topics)) {
    for (const t of extract.topics) entities.push({ kind: 'topic', name: typeof t === 'string' ? t : t.name || String(t) })
  }

  // Build dates from extract
  const dates: Array<{ date: string; label: string; type: string }> = []
  if (Array.isArray(extract.dates)) {
    for (const d of extract.dates) {
      if (typeof d === 'string') dates.push({ date: d, label: d, type: 'event' })
      else if (d && d.date) dates.push({ date: d.date, label: d.label || d.date, type: d.type || 'event' })
    }
  }

  const summary = ingest.summary || triage.summary || ''
  // Build a clean short title: prefer Rabbit's own title if it set one,
  // otherwise use the first sentence of the summary (up to 80 chars).
  // Fall back to a truncated prefix if the first sentence is too long.
  const firstSentence = (summary.match(/^[^.!?\n]{10,120}[.!?]/) || [])[0]?.trim()
  const truncateNice = (s: string, n: number) =>
    s.length <= n ? s : s.slice(0, n).replace(/[,;\s]+\S*$/, '') + '…'
  const title = triage.title?.trim()
    || (firstSentence && firstSentence.length <= 90 ? firstSentence.replace(/[.!?]$/, '') : null)
    || (summary ? truncateNice(summary, 80) : null)
    || 'Untitled'
  const tags = Array.isArray(triage.tags) ? triage.tags : []
  const confidence = typeof importance?.score === 'number' ? importance.score / 5 : 0.7

  return {
    should_store: true,
    record_type: recordType,
    title,
    summary,
    tags,
    entities,
    dates,
    confidence,
    proposed_projects: [],
    suggested_links: [],
    why_kept_or_dropped: 'stored via Rabbit ingest',
  }
}

// Call Rabbit /v1/ingest and map to triage result.
// Returns null if Rabbit is unconfigured (env unset). Throws on network/HTTP
// errors so the worker's retry + backoff path handles 524 / timeouts, instead
// of silently swallowing them like it used to.
export async function rabbitIngestAndMap(content: string): Promise<{
  result: any;
  embedding: number[];
} | null> {
  const ingest = await rabbitIngest(content)
  if (!ingest) return null
  const mapped = mapIngestToTriageResult(ingest)
  return { result: mapped, embedding: ingest.embedding }
}

// Enrichment job for a manually-created record. The record already exists
// with placeholder title/summary/type; this fills in the AI-derived fields
// and runs the embedding + linking agents. Any thrown error propagates up to
// the worker loop, which handles retry/backoff/permanent-fail → notification.
export async function runIngestJob(
  recordId: string,
  workspaceId: string,
  content: string,
): Promise<string> {
  // Route through /v1/raw (via getLLM().generateJSON) rather than /v1/ingest.
  // Rabbit's /v1/ingest runs 5 sequential signal calls; on inputs > ~3k chars
  // it either exceeds Cloudflare's 100s proxy limit (524) or returns a
  // truncated gzipped body ("zlib: unexpected end of file"). /v1/raw with a
  // single triage prompt is faster.
  //
  // BUT: Rabbit on RunPod is fronted by Cloudflare with a ~100s proxy ceiling
  // and the 32B model takes longer than that to process an 8k+ prompt. Triage
  // only needs the first ~2000 chars of a transcript to decide title / summary
  // / type / tags; the full content is still stored in the DB for ask-time
  // retrieval. So we truncate the content fed into the triage prompt — this
  // keeps total prompt length under ~6k chars and well below the Cloudflare
  // timeout.
  const TRIAGE_CONTENT_CAP = 2000
  const truncated = content.length > TRIAGE_CONTENT_CAP
    ? content.slice(0, TRIAGE_CONTENT_CAP) + '\n\n[…transcript continues, truncated for triage]'
    : content

  let result: any
  if (content.length < 2500) {
    try {
      const ingestResult = await rabbitIngestAndMap(content)
      if (ingestResult) {
        result = triageResultSchema.parse(ingestResult.result)
      }
    } catch (e: any) {
      console.warn('[runIngestJob] /v1/ingest failed, falling back to /v1/raw:', e.message)
    }
  }
  if (!result) {
    const llm = getLLM()
    result = await llm.generateJSON(PROMPTS.triage(truncated), triageResultSchema)
  }

  await db.update(schema.records).set({
    title: result.title,
    summary: result.summary,
    type: result.record_type,
    tags: JSON.stringify(result.tags),
    confidence: result.confidence,
    meta: Array.isArray(result.dates) && result.dates.length > 0
      ? JSON.stringify({ dates: result.dates })
      : undefined,
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.records.id, recordId))

  // Update FTS5 index with enriched content
  upsertFTS(recordId, workspaceId, result.title, result.summary, content)

  // Upsert entities + join rows
  for (const entity of result.entities) {
    const normalized = entity.name.toLowerCase().trim()
    let existing = await db.query.entities.findFirst({
      where: and(
        eq(schema.entities.workspaceId, workspaceId),
        eq(schema.entities.normalized, normalized),
      ),
    })
    if (!existing) {
      const entityId = crypto.randomUUID()
      await db.insert(schema.entities).values({
        id: entityId,
        workspaceId,
        kind: entity.kind as any,
        name: entity.name,
        normalized,
      })
      existing = { id: entityId } as any
    }
    await db.insert(schema.recordEntities).values({
      recordId,
      entityId: existing!.id,
    })
  }

  // Entity profiles (fire-and-forget, don't block the job on these)
  const recordDateStr = new Date().toISOString().slice(0, 10)
  for (const entity of result.entities) {
    const epType = entity.kind === 'org' ? 'client'
      : entity.kind === 'project' ? 'project'
      : entity.kind === 'topic' ? 'topic'
      : 'person'
    upsertEntityProfile(
      entity.name,
      epType as any,
      recordId,
      result.title,
      result.summary,
      recordDateStr,
      workspaceId,
    ).catch(() => {})
  }

  // Embed + link (both throw on failure, worker retries whole job)
  await runEmbeddingJob(recordId, workspaceId)
  await runLinkingAgent(recordId, workspaceId)

  return `Enriched: ${result.title}`
}

// ─── Schemas ────────────────────────────────────────────
export const triageResultSchema = z.object({
  should_store: z.boolean(),
  record_type: z.string()
    .transform(t => {
      const map: Record<string, string> = {
        event: 'meeting', transcript: 'meeting', sync: 'meeting', call: 'meeting',
        task: 'tasklike', todo: 'tasklike', action_item: 'tasklike',
        page_visit: 'context', browse: 'context', other: 'note', update: 'context',
        chat: 'context', information: 'context', observation: 'insight',
      }
      const normalized = (map[t.toLowerCase()] || t.toLowerCase()) as string
      const valid = ['decision', 'insight', 'meeting', 'idea', 'context', 'tasklike', 'note']
      return valid.includes(normalized) ? normalized : 'note'
    }) as z.ZodType<'decision' | 'insight' | 'meeting' | 'idea' | 'context' | 'tasklike' | 'note'>,
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  entities: z.array(z.object({
    kind: z.enum(['person', 'org', 'topic', 'product', 'project', 'custom']),
    name: z.string(),
  })),
  dates: z.array(z.object({
    date: z.string(),
    label: z.string(),
    type: z.string(),
  })),
  confidence: z.number().min(0).max(1),
  proposed_projects: z.array(z.object({
    name: z.string(),
    confidence: z.number(),
    reason: z.string(),
  })),
  suggested_links: z.array(z.object({
    query_text: z.string(),
    reason: z.string(),
  })),
  why_kept_or_dropped: z.string(),
})

export type TriageResult = z.infer<typeof triageResultSchema>

const linkingResultSchema = z.object({
  links: z.array(z.object({
    target_id: z.string(),
    kind: z.enum(['same_topic', 'depends_on', 'contradicts', 'continuation_of', 'same_people', 'causes', 'temporal']),
    weight: z.number().min(0).max(1),
    explanation: z.string(),
  })),
})

// ─── Triage Agent ───────────────────────────────────────
export async function runTriageAgent(rawItemId: string, workspaceId: string, targetProjectId?: string): Promise<TriageResult> {
  const llm = getLLM()

  // Fetch raw item
  const rawItem = await db.query.rawItems.findFirst({
    where: eq(schema.rawItems.id, rawItemId),
  })
  if (!rawItem) throw new Error(`Raw item ${rawItemId} not found`)

  const prompt = PROMPTS.triage(rawItem.text, rawItem.metadata || undefined)
  const result = await llm.generateJSON(prompt, triageResultSchema)

  // Update raw item with triage result
  await db.update(schema.rawItems)
    .set({
      status: result.should_store ? 'triaged' : 'ignored',
      triageResult: JSON.stringify(result),
    })
    .where(eq(schema.rawItems.id, rawItemId))

  // Determine if this came from an integration (has a source) vs manual/extension input
  const fromIntegration = !!rawItem.sourceId
  // Check if this was an explicit user capture (right-click Save, extension context menu)
  const fromExtension = rawItem.metadata
    ? (() => { try { return JSON.parse(rawItem.metadata)?.capturedBy === 'tray' } catch { return false } })()
    : false
  // Auto-accept: integrations (Notion, Gmail, Slack), explicit user captures
  // (extension right-click, paste), and anything with decent confidence.
  // Only low-confidence screen captures go to inbox for review.
  const autoAccept = fromIntegration || fromExtension || result.confidence >= 0.5

  // Resolve source label from the source kind (gmail, google-calendar, etc.)
  let recordSource: string | undefined
  if (rawItem.sourceId) {
    const src = await db.query.sources.findFirst({ where: eq(schema.sources.id, rawItem.sourceId) })
    if (src) {
      recordSource = src.kind === 'email' ? 'gmail' : src.kind === 'calendar' ? 'google-calendar' : src.kind === 'chat' ? src.label.toLowerCase() : src.kind
    }
  }

  if (result.should_store) {
    // Create record
    const recordId = crypto.randomUUID()
    await db.insert(schema.records).values({
      id: recordId,
      workspaceId,
      rawItemId,
      type: result.record_type,
      title: result.title,
      summary: result.summary,
      content: rawItem.text,
      confidence: result.confidence,
      tags: JSON.stringify(result.tags),
      triageStatus: autoAccept ? 'auto_accepted' : 'needs_review',
      source: recordSource,
      createdBy: 'agent',
    })

    // Upsert entities
    for (const entity of result.entities) {
      const normalized = entity.name.toLowerCase().trim()
      let existingEntity = await db.query.entities.findFirst({
        where: and(
          eq(schema.entities.workspaceId, workspaceId),
          eq(schema.entities.normalized, normalized),
        ),
      })

      if (!existingEntity) {
        const entityId = crypto.randomUUID()
        await db.insert(schema.entities).values({
          id: entityId,
          workspaceId,
          kind: entity.kind,
          name: entity.name,
          normalized,
        })
        existingEntity = { id: entityId } as any
      }

      await db.insert(schema.recordEntities).values({
        recordId,
        entityId: existingEntity!.id,
      })
    }

    // ── Upsert entity profiles (background knowledge graph) ──────
    const recordDateStr = rawItem.occurredAt
      ? rawItem.occurredAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    for (const entity of result.entities) {
      const epType = entity.kind === 'org' ? 'client'
        : entity.kind === 'project' ? 'project'
        : entity.kind === 'topic' ? 'topic'
        : 'person'
      upsertEntityProfile(
        entity.name,
        epType as any,
        recordId,
        result.title,
        result.summary,
        recordDateStr,
        workspaceId,
      ).catch(() => {}) // fire-and-forget, never block triage
    }

    // ── Save extracted future dates to record_dates ──────────────
    const today = new Date().toISOString().split('T')[0]
    const validDateTypes = ['deadline', 'follow_up', 'event', 'due_date', 'launch', 'reminder']
    for (const d of result.dates) {
      if (!d.date || d.date < today) continue // skip past dates and invalid
      const dateType = validDateTypes.includes(d.type) ? d.type : 'reminder'
      try {
        await db.insert(schema.recordDates).values({
          workspaceId,
          recordId,
          date: d.date,
          label: d.label,
          type: dateType as any,
        })
      } catch { /* ignore duplicate inserts */ }
    }

    // ── Project assignment ───────────────────────────────────────
    // Only assign to an explicitly requested project (e.g. user adding a note
    // to a project manually). Triage never auto-creates or auto-assigns projects
    // — memories land in the Memories list and users organise them into projects.
    if (targetProjectId) {
      await db.insert(schema.projectRecords).values({
        projectId: targetProjectId,
        recordId,
      })
    }

    // Queue embedding job (pass suggested_links for use in linking stage)
    await db.insert(schema.jobQueue).values({
      workspaceId,
      type: 'embed',
      payload: JSON.stringify({
        recordId,
        suggestedLinks: result.suggested_links,
      }),
    })

    // Create notifications for all workspace members
    try {
      const members = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.workspaceId, workspaceId),
      })

      // Auto-accepted items go straight to memories — no inbox notification needed
      if (!autoAccept) {
        const notifType = result.record_type === 'tasklike' ? 'todo'
          : result.record_type === 'decision' ? 'decision_pending'
          : 'needs_review'

        const notifTitle = result.record_type === 'tasklike'
          ? `Task: ${result.title}`
          : result.record_type === 'decision'
          ? `Decision: ${result.title}`
          : result.title

        for (const member of members) {
          await db.insert(schema.inboxNotifications).values({
            workspaceId,
            userId: member.userId,
            type: notifType,
            title: notifTitle,
            body: result.summary.length > 120 ? result.summary.slice(0, 117) + '...' : result.summary,
            objectType: 'record',
            objectId: recordId,
          })
        }
      }

      // Create reminder notifications for each future date
      const futureDates = result.dates.filter(d => d.date && d.date >= today)
      for (const d of futureDates) {
        const dateType = validDateTypes.includes(d.type) ? d.type : 'reminder'
        // Schedule the notification to appear on that date via snoozedUntil
        const notifDate = new Date(d.date + 'T09:00:00.000Z').toISOString()
        for (const member of members) {
          await db.insert(schema.inboxNotifications).values({
            workspaceId,
            userId: member.userId,
            type: 'reminder',
            title: `${dateType === 'deadline' ? '⚑ Deadline' : dateType === 'follow_up' ? '↩ Follow-up' : '◷ Upcoming'}: ${d.label}`,
            body: `From: ${result.title}`,
            objectType: 'record',
            objectId: recordId,
            snoozedUntil: notifDate,
          })
        }
      }
    } catch (e) {
      console.error('[Triage] Failed to create notifications:', e)
    }

    // Log activity
    await db.insert(schema.activityLog).values({
      workspaceId,
      actor: 'agent',
      action: 'triaged',
      objectType: 'raw_item',
      objectId: rawItemId,
      meta: JSON.stringify({ recordId, result: result.why_kept_or_dropped }),
    })
  } else {
    // AI rejected this item — create rejected notification so user can rescue if needed
    try {
      const members = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.workspaceId, workspaceId),
      })
      for (const member of members) {
        await db.insert(schema.inboxNotifications).values({
          workspaceId,
          userId: member.userId,
          type: 'rejected',
          title: result.title || rawItem.text.slice(0, 80),
          body: result.why_kept_or_dropped,
          objectType: 'raw_item',
          objectId: rawItemId,
        })
      }
    } catch (e) {
      console.error('[Triage] Failed to create rejected notification:', e)
    }
  }

  return result
}

// ─── Embedding Job ──────────────────────────────────────
export async function runEmbeddingJob(recordId: string, workspaceId: string, suggestedLinks?: Array<{ query_text: string; reason: string }>): Promise<void> {
  const llm = getLLM()

  const record = await db.query.records.findFirst({
    where: eq(schema.records.id, recordId),
  })
  if (!record) throw new Error(`Record ${recordId} not found`)

  const textToEmbed = `${record.title}. ${record.summary || ''}. ${record.content || ''}`
  const vector = await llm.embed(textToEmbed)

  // Upsert embedding
  await db.insert(schema.embeddings)
    .values({
      recordId,
      workspaceId,
      vector: JSON.stringify(vector),
      model: 'bge-base-en-v1.5',
    })
    .onConflictDoUpdate({
      target: schema.embeddings.recordId,
      set: {
        vector: JSON.stringify(vector),
        model: 'bge-base-en-v1.5',
        createdAt: new Date().toISOString(),
      },
    })

  // Write to vec0 virtual table for ANN search
  if (vecLoaded) {
    try {
      sqlite.prepare(`INSERT OR IGNORE INTO vec_rowid_map(record_id, workspace_id) VALUES (?, ?)`).run(recordId, workspaceId)
      const row = sqlite.prepare(`SELECT rowid FROM vec_rowid_map WHERE record_id = ?`).get(recordId) as { rowid: number }
      // vec0 requires INTEGER binding (not REAL) — use BigInt to force correct SQLite type
      const vecRowid = BigInt(row.rowid)
      sqlite.prepare(`DELETE FROM vec_embeddings WHERE rowid = ?`).run(vecRowid)
      sqlite.prepare(`INSERT INTO vec_embeddings(rowid, embedding) VALUES (?, ?)`).run(vecRowid, JSON.stringify(vector))
    } catch (e) {
      console.warn('[embed] vec0 write failed:', e)
    }
  }

  // Near-duplicate detection: now that we have this record's vector, compare
  // against every other embedding in the workspace. Anything > 0.95 cosine
  // is almost certainly the same thing said twice — auto-link as same_topic
  // so the graph shows the relationship and Chat doesn't retrieve redundant
  // context.
  try {
    const { detectNearDuplicates, linkNearDuplicates } = await import('./ingestion')
    const nearDups = await detectNearDuplicates(recordId, workspaceId, vector)
    if (nearDups.found.length > 0) {
      const linked = await linkNearDuplicates(recordId, workspaceId, nearDups)
      if (linked > 0) {
        console.log(`[embed] linked ${linked} near-duplicates for ${recordId}`)
      }
    }
  } catch (e) {
    // Near-dup is best-effort — a failure here shouldn't break ingestion
    console.warn('[embed] near-dup detection failed:', (e as Error).message)
  }

  // NOTE: in the records route we call runLinkingAgent() directly right
  // after runEmbeddingJob(), so no queue row is needed. Enqueuing a link
  // job here would create an orphan pending row that never gets picked up,
  // because the direct call does the actual work and never marks the queue
  // row completed. Leave this comment as the anchor for anyone trying to
  // understand why there's no enqueue at the end of this function.
}

// ─── Linking Agent ──────────────────────────────────────
export async function runLinkingAgent(recordId: string, workspaceId: string, suggestedLinks?: Array<{ query_text: string; reason: string }>): Promise<void> {
  const record = await db.query.records.findFirst({
    where: eq(schema.records.id, recordId),
  })
  if (!record) throw new Error(`Record ${recordId} not found`)

  const sourceEmbedding = await db.query.embeddings.findFirst({
    where: eq(schema.embeddings.recordId, recordId),
  })
  if (!sourceEmbedding) return

  const sourceVector = JSON.parse(sourceEmbedding.vector) as number[]

  // Get all other embeddings in workspace
  const allEmbeddings = await db.query.embeddings.findMany({
    where: and(
      eq(schema.embeddings.workspaceId, workspaceId),
      ne(schema.embeddings.recordId, recordId),
    ),
  })

  // Calculate semantic similarities
  const similarities: Array<{ recordId: string; similarity: number }> = []
  for (const emb of allEmbeddings) {
    const vector = JSON.parse(emb.vector) as number[]
    const sim = cosineSimilarity(sourceVector, vector)
    if (sim > 0.4) { // raised threshold to reduce noise
      similarities.push({ recordId: emb.recordId, similarity: sim })
    }
  }
  similarities.sort((a, b) => b.similarity - a.similarity)
  const topSemantic = similarities.slice(0, 8)

  // ── Keyword-seed candidates from suggested_links ─────────────
  const seededIds = new Set<string>()
  if (suggestedLinks && suggestedLinks.length > 0) {
    for (const suggestion of suggestedLinks) {
      const keywords = suggestion.query_text
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 3)

      if (keywords.length === 0) continue

      const conditions = keywords.flatMap(kw => [
        like(schema.records.title, `%${kw}%`),
        like(schema.records.summary, `%${kw}%`),
      ])

      const keywordMatches = await db.query.records.findMany({
        where: and(
          eq(schema.records.workspaceId, workspaceId),
          ne(schema.records.id, recordId),
          or(...conditions),
        ),
        limit: 3,
      })

      for (const r of keywordMatches) seededIds.add(r.id)
    }
  }

  // Merge: seeded candidates get a high synthetic similarity so they rank near the top
  const seededCandidates = Array.from(seededIds)
    .filter(id => !topSemantic.some(s => s.recordId === id))
    .map(id => ({ recordId: id, similarity: 0.55 })) // treat as medium-high confidence

  const allCandidates = [...topSemantic, ...seededCandidates].slice(0, 12)
  if (allCandidates.length === 0) return

  // Fetch candidate records
  const candidateRecords = await Promise.all(
    allCandidates.map(async (c) => {
      const rec = await db.query.records.findFirst({
        where: eq(schema.records.id, c.recordId),
      })
      return rec ? { id: rec.id, title: rec.title, summary: rec.summary || '' } : null
    })
  )
  const validCandidates = candidateRecords.filter(Boolean) as Array<{ id: string; title: string; summary: string }>

  const llm = getLLM()
  const prompt = PROMPTS.linking(record.title, record.summary || '', validCandidates)

  try {
    const result = await llm.generateJSON(prompt, linkingResultSchema)

    let linkCount = 0
    for (const link of result.links) {
      if (linkCount >= 8) break

      const existing = await db.query.recordLinks.findFirst({
        where: or(
          and(
            eq(schema.recordLinks.fromRecordId, recordId),
            eq(schema.recordLinks.toRecordId, link.target_id),
          ),
          and(
            eq(schema.recordLinks.fromRecordId, link.target_id),
            eq(schema.recordLinks.toRecordId, recordId),
          ),
        ),
      })

      if (!existing) {
        await db.insert(schema.recordLinks).values({
          workspaceId,
          fromRecordId: recordId,
          toRecordId: link.target_id,
          kind: link.kind,
          weight: link.weight,
          explanation: link.explanation,
          createdBy: 'agent',
        })
        linkCount++
      }
    }
  } catch (e) {
    // Fallback: only link if similarity is strong (raised threshold)
    for (const candidate of topSemantic.slice(0, 3).filter(c => c.similarity > 0.6)) {
      const existing = await db.query.recordLinks.findFirst({
        where: or(
          and(eq(schema.recordLinks.fromRecordId, recordId), eq(schema.recordLinks.toRecordId, candidate.recordId)),
          and(eq(schema.recordLinks.fromRecordId, candidate.recordId), eq(schema.recordLinks.toRecordId, recordId)),
        ),
      })
      if (!existing) {
        await db.insert(schema.recordLinks).values({
          workspaceId,
          fromRecordId: recordId,
          toRecordId: candidate.recordId,
          kind: 'same_topic',
          weight: candidate.similarity,
          explanation: `Semantic similarity: ${(candidate.similarity * 100).toFixed(0)}%`,
          createdBy: 'agent',
        })
      }
    }
  }
}

// ─── Entity Profile Upsert ──────────────────────────────
// Called after every record creation/triage. Maintains a running LLM summary
// per entity (person/client/project/topic) so Ask queries can retrieve a
// pre-aggregated profile instead of scanning individual records.
export async function upsertEntityProfile(
  entityName: string,
  entityType: 'person' | 'client' | 'project' | 'topic',
  recordId: string,
  recordTitle: string,
  recordSummary: string,
  recordDate: string,
  workspaceId: string,
): Promise<void> {
  try {
    const normalizedName = entityName.toLowerCase().trim()
    if (normalizedName.length < 2) return

    // Load existing profile
    const existing = await db.query.entityProfiles.findFirst({
      where: and(
        eq(schema.entityProfiles.workspaceId, workspaceId),
        eq(schema.entityProfiles.entityName, normalizedName),
      ),
    })

    const existingFacts: string[] = existing ? JSON.parse(existing.rawFacts) : []
    const existingRecordIds: string[] = existing ? JSON.parse(existing.recordIds) : []

    // Skip if this record was already incorporated
    if (existingRecordIds.includes(recordId)) return

    // Add new fact: "[date] ([type]) 'Title': summary snippet"
    const factDate = recordDate || new Date().toISOString().slice(0, 10)
    const snippet = recordSummary.slice(0, 200).replace(/\n/g, ' ').trim()
    const newFact = `${factDate} — "${recordTitle}"${snippet ? `: ${snippet}` : ''}`

    // Append and cap at 60 facts (evict oldest)
    const updatedFacts = [...existingFacts, newFact].slice(-60)
    const updatedRecordIds = [...existingRecordIds, recordId].slice(-100)

    // Regenerate summary if: no summary yet, or every 5th new record
    let summary = existing?.summary || ''
    const shouldRegenerate = !summary || (updatedRecordIds.length % 5 === 0)
    if (shouldRegenerate && updatedFacts.length > 0) {
      try {
        const llm = getLLM()
        const summaryPrompt = `Write a concise 2-3 sentence factual summary of "${entityName}" based on these memory facts:
${updatedFacts.slice(-20).map(f => `• ${f}`).join('\n')}
Focus on: what they work on, key decisions, recent activity. Be specific and factual. No filler.`
        summary = await llm.generateText(summaryPrompt, 200)
      } catch {
        summary = existing?.summary || ''
      }
    }

    const now = new Date().toISOString()
    if (existing) {
      await db.update(schema.entityProfiles)
        .set({
          summary,
          rawFacts: JSON.stringify(updatedFacts),
          recordIds: JSON.stringify(updatedRecordIds),
          updatedAt: now,
        })
        .where(eq(schema.entityProfiles.id, existing.id))
    } else {
      await db.insert(schema.entityProfiles).values({
        workspaceId,
        entityName: normalizedName,
        entityType,
        summary,
        rawFacts: JSON.stringify(updatedFacts),
        recordIds: JSON.stringify(updatedRecordIds),
      })
    }
  } catch (e) {
    console.error('[EntityProfile] upsert failed for', entityName, e)
  }
}

// ─── Ask Agent (Q&A) ───────────────────────────────────
export async function runAskAgent(question: string, workspaceId: string): Promise<string> {
  const llm = getLLM()

  const questionVector = await llm.embed(question)

  const allEmbeddings = await db.query.embeddings.findMany({
    where: eq(schema.embeddings.workspaceId, workspaceId),
  })

  const similarities: Array<{ recordId: string; similarity: number }> = []
  for (const emb of allEmbeddings) {
    const vector = JSON.parse(emb.vector) as number[]
    const sim = cosineSimilarity(questionVector, vector)
    similarities.push({ recordId: emb.recordId, similarity: sim })
  }

  similarities.sort((a, b) => b.similarity - a.similarity)
  const topRecordIds = similarities.slice(0, 5).map(s => s.recordId)

  const contextRecords = await Promise.all(
    topRecordIds.map(async (id) => {
      const rec = await db.query.records.findFirst({
        where: eq(schema.records.id, id),
      })
      return rec
    })
  )

  const validRecords = contextRecords.filter(Boolean).map(r => ({
    title: r!.title,
    summary: r!.summary || '',
    content: r!.content || undefined,
    type: r!.type,
  }))

  const prompt = PROMPTS.ask(question, validRecords)
  const answer = await llm.generateText(prompt)

  return answer
}

// ─── Memory Compression Job ──────────────────────────────────────────────────
// Groups old records by month and compresses each group into a single dense
// summary record. Compressed source records are tagged 'compressed:source'.
// At 10K+ memories, retrieval favours summary records over individual old ones.
export async function runCompressionJob(
  workspaceId: string,
  options: { olderThanDays?: number; minRecords?: number; dryRun?: boolean } = {},
): Promise<{ compressed: number; skipped: number; failed: number }> {
  const { olderThanDays = 90, minRecords = 5, dryRun = false } = options
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  // Fetch old records not already marked as compressed sources
  const oldRecords = await db.query.records.findMany({
    where: and(
      eq(schema.records.workspaceId, workspaceId),
      ne(schema.records.triageStatus, 'needs_review'),
      lt(schema.records.createdAt, cutoff.toISOString()),
    ),
    columns: { id: true, title: true, summary: true, content: true, createdAt: true, type: true, tags: true },
    orderBy: asc(schema.records.createdAt),
  })

  // Filter out records already compressed or already a summary
  const uncompressed = oldRecords.filter(r => {
    const tags: string[] = JSON.parse(r.tags || '[]')
    return !tags.includes('compressed:source') && !tags.includes('auto-compressed')
  })

  if (uncompressed.length < minRecords) {
    return { compressed: 0, skipped: uncompressed.length, failed: 0 }
  }

  // Group by YYYY-MM
  const byMonth = new Map<string, typeof uncompressed>()
  for (const r of uncompressed) {
    const month = r.createdAt.slice(0, 7)
    if (!byMonth.has(month)) byMonth.set(month, [])
    byMonth.get(month)!.push(r)
  }

  const llm = getLLM()
  let compressed = 0, skipped = 0, failed = 0

  for (const [month, monthRecs] of Array.from(byMonth.entries())) {
    if (monthRecs.length < minRecords) { skipped += monthRecs.length; continue }

    // Skip months that already have a compression record
    const existing = await db.query.records.findFirst({
      where: and(
        eq(schema.records.workspaceId, workspaceId),
        like(schema.records.tags, `%auto-compressed%`),
        like(schema.records.tags, `%${month}%`),
      ),
    })
    if (existing) { skipped += monthRecs.length; continue }

    try {
      const recordsText = monthRecs.map(r =>
        `- [${r.type}] ${r.title}: ${(r.summary || r.content || '').slice(0, 400)}`
      ).join('\n')

      const [year, monthNum] = month.split('-')
      const monthLabel = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
        .toLocaleString('en-US', { month: 'long', year: 'numeric' })

      const summaryPrompt = `Compress these ${monthRecs.length} memory records from ${monthLabel} into a single thorough summary.
Preserve all key facts, names, decisions, numbers, and outcomes. Write in past tense. Use bullet points grouped by theme.

RECORDS:
${recordsText}

Write a comprehensive summary (3-6 paragraphs or grouped bullets):`

      const summary = await llm.generateText(summaryPrompt, 800)

      if (!dryRun) {
        const compressionId = crypto.randomUUID()
        await db.insert(schema.records).values({
          id: compressionId,
          workspaceId,
          type: 'context',
          title: `Memory Summary: ${monthLabel}`,
          summary: summary.slice(0, 500),
          content: summary,
          confidence: 0.95,
          tags: JSON.stringify(['auto-compressed', `compressed:${month}`, `source-count:${monthRecs.length}`]),
          triageStatus: 'auto_accepted',
          createdBy: 'system',
          occurredAt: `${month}-15T00:00:00.000Z`,
        })

        // Tag source records so they're not compressed again
        for (const r of monthRecs) {
          const existingTags: string[] = JSON.parse(r.tags || '[]')
          if (!existingTags.includes('compressed:source')) {
            existingTags.push('compressed:source')
            await db.update(schema.records)
              .set({ tags: JSON.stringify(existingTags) })
              .where(eq(schema.records.id, r.id))
          }
        }
      }

      compressed++
    } catch {
      failed++
    }
  }

  return { compressed, skipped, failed }
}
