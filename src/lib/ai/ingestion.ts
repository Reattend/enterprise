// ─── Ingestion helpers ──────────────────────────────────────────────────────
// Content-hash deduplication and near-duplicate detection, used before and
// after the triage step to prevent the memory from bloating with repeated
// content (common when Nango backfills + the Chrome extension both capture
// the same email, or two people paste the same meeting transcript).

import crypto from 'crypto'
import { db, schema } from '../db'
import { eq, and, inArray } from 'drizzle-orm'
import { cosineSimilarity } from '../utils'

// SHA-256 hex of normalized text. Normalization: trim, collapse whitespace,
// lowercase. Stable enough that two copies of the same doc match regardless
// of copy-paste line break differences, but distinct docs stay distinct.
export function contentHash(content: string): string {
  const normalized = content
    .trim()
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex')
}

export interface DedupMatch {
  hit: true
  existingRecordId: string
  existingTitle: string
  kind: 'exact_hash'
}
export interface DedupMiss {
  hit: false
}

// Exact-hash dedup. Checks records in the same workspace with a matching
// content hash. Hash is stored in records.meta JSON as { contentHash: "…" }
// — keeps us out of a migration right now. Callers should set the hash on
// insert.
export async function findExactDuplicate(
  workspaceId: string,
  content: string,
): Promise<DedupMatch | DedupMiss> {
  const hash = contentHash(content)
  // Drizzle + SQLite can't do JSON extract portably in the where clause
  // without a raw SQL shim, so we fetch the candidate rows and filter in JS.
  // For larger orgs we'll add a dedicated content_hash column with an index;
  // for now records per workspace stays small enough that this is fine.
  const candidates = await db
    .select({ id: schema.records.id, title: schema.records.title, meta: schema.records.meta })
    .from(schema.records)
    .where(eq(schema.records.workspaceId, workspaceId))

  for (const c of candidates) {
    if (!c.meta) continue
    try {
      const meta = JSON.parse(c.meta) as { contentHash?: string }
      if (meta.contentHash === hash) {
        return { hit: true, existingRecordId: c.id, existingTitle: c.title, kind: 'exact_hash' }
      }
    } catch { /* ignore bad JSON */ }
  }
  return { hit: false }
}

// Attach a content hash to a record's meta JSON. Merges with existing meta.
export async function attachContentHash(recordId: string, content: string): Promise<void> {
  const rows = await db.select({ meta: schema.records.meta }).from(schema.records).where(eq(schema.records.id, recordId)).limit(1)
  const existing = rows[0]?.meta ? (() => { try { return JSON.parse(rows[0]!.meta!) } catch { return {} } })() : {}
  const merged = { ...existing, contentHash: contentHash(content) }
  await db.update(schema.records).set({ meta: JSON.stringify(merged) }).where(eq(schema.records.id, recordId))
}

// ─── Near-duplicate detection ───────────────────────────────────────────────
// After embedding is generated for a new record, look for existing records
// in the same workspace with cosine similarity > NEAR_DUP_THRESHOLD. If found,
// auto-create a `same_topic` record_link between them so the graph shows
// the relationship rather than the memory feeling spuriously fresh.

const NEAR_DUP_THRESHOLD = 0.95
const NEAR_DUP_SCAN_CAP = 500 // how many candidates to check (most recent first)

export interface NearDupResult {
  found: Array<{
    recordId: string
    similarity: number
    title: string
  }>
}

export async function detectNearDuplicates(
  recordId: string,
  workspaceId: string,
  vector: number[],
): Promise<NearDupResult> {
  // Pull recent embeddings in the same workspace (excluding this record).
  const candidates = await db
    .select({
      recordId: schema.embeddings.recordId,
      vector: schema.embeddings.vector,
    })
    .from(schema.embeddings)
    .where(and(
      eq(schema.embeddings.workspaceId, workspaceId),
    ))
    .limit(NEAR_DUP_SCAN_CAP)

  const matches: { recordId: string; similarity: number }[] = []
  for (const c of candidates) {
    if (c.recordId === recordId) continue
    try {
      const v = JSON.parse(c.vector) as number[]
      if (!Array.isArray(v) || v.length !== vector.length) continue
      const sim = cosineSimilarity(vector, v)
      if (sim >= NEAR_DUP_THRESHOLD) matches.push({ recordId: c.recordId, similarity: sim })
    } catch { /* skip bad rows */ }
  }
  if (matches.length === 0) return { found: [] }

  // Enrich with titles
  const titleRows = await db
    .select({ id: schema.records.id, title: schema.records.title })
    .from(schema.records)
    .where(inArray(schema.records.id, matches.map((m) => m.recordId)))
  const titleById = new Map(titleRows.map((r) => [r.id, r.title]))

  return {
    found: matches.map((m) => ({
      recordId: m.recordId,
      similarity: m.similarity,
      title: titleById.get(m.recordId) ?? 'Unknown',
    })).sort((a, b) => b.similarity - a.similarity),
  }
}

// Creates `same_topic` links between this record and each near-dup it found.
// Idempotent: checks for existing link before inserting.
export async function linkNearDuplicates(
  recordId: string,
  workspaceId: string,
  nearDups: NearDupResult,
  userId: string = 'agent',
): Promise<number> {
  if (nearDups.found.length === 0) return 0
  let created = 0
  for (const dup of nearDups.found) {
    // Check existing link (either direction)
    const existing = await db
      .select({ id: schema.recordLinks.id })
      .from(schema.recordLinks)
      .where(and(
        eq(schema.recordLinks.fromRecordId, recordId),
        eq(schema.recordLinks.toRecordId, dup.recordId),
      ))
      .limit(1)
    if (existing[0]) continue
    const reverse = await db
      .select({ id: schema.recordLinks.id })
      .from(schema.recordLinks)
      .where(and(
        eq(schema.recordLinks.fromRecordId, dup.recordId),
        eq(schema.recordLinks.toRecordId, recordId),
      ))
      .limit(1)
    if (reverse[0]) continue

    await db.insert(schema.recordLinks).values({
      workspaceId,
      fromRecordId: recordId,
      toRecordId: dup.recordId,
      kind: 'same_topic',
      weight: dup.similarity,
      explanation: `Auto: ${(dup.similarity * 100).toFixed(0)}% semantic similarity (near-duplicate)`,
      createdBy: userId,
    })
    created++
  }
  return created
}
