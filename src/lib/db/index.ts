import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const dbPath = path.resolve(process.cwd(), 'data', 'reattend.db')

// Ensure data directory exists
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Load sqlite-vec extension for ANN vector search
export let vecLoaded = false
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sqliteVec = require('sqlite-vec')
  sqliteVec.load(sqlite)

  // Rowid ↔ UUID mapping table (vec0 needs integer rowids)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS vec_rowid_map (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id TEXT UNIQUE NOT NULL,
      workspace_id TEXT NOT NULL
    )
  `)

  // vec0 virtual table — 768-dim cosine distance (BGE-base-en-v1.5)
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_embeddings USING vec0(
      rowid INTEGER PRIMARY KEY,
      embedding float[768] distance_metric=cosine
    )
  `)

  vecLoaded = true
  console.log('[db] sqlite-vec loaded — ANN search active')
} catch (e) {
  console.warn('[db] sqlite-vec unavailable, using JS cosine fallback:', (e as Error).message)
}

// FTS5 full-text search index — dramatically faster than LIKE '%keyword%'
// at scale. Tokenizes title + summary + content for ranked text search.
export let ftsReady = false
try {
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(
      record_id UNINDEXED,
      workspace_id UNINDEXED,
      title,
      summary,
      content,
      tokenize='porter unicode61'
    )
  `)
  // Backfill: if FTS index is empty but records exist, populate it
  const ftsCount = (sqlite.prepare('SELECT count(*) as c FROM records_fts').get() as any)?.c || 0
  const recordCount = (sqlite.prepare('SELECT count(*) as c FROM records').get() as any)?.c || 0
  if (ftsCount === 0 && recordCount > 0) {
    console.log(`[db] Backfilling FTS5 index with ${recordCount} records...`)
    const rows = sqlite.prepare('SELECT id, workspace_id, title, summary, content FROM records').all() as Array<{
      id: string; workspace_id: string; title: string; summary: string; content: string
    }>
    const insert = sqlite.prepare('INSERT INTO records_fts (record_id, workspace_id, title, summary, content) VALUES (?, ?, ?, ?, ?)')
    const tx = sqlite.transaction(() => {
      for (const r of rows) {
        insert.run(r.id, r.workspace_id, r.title || '', r.summary || '', r.content || '')
      }
    })
    tx()
    console.log(`[db] FTS5 backfill complete: ${rows.length} records indexed`)
  }

  // Keep records_fts.workspace_id in sync with records.workspace_id.
  // Without this, bulk UPDATE on records (e.g. the personal-memory
  // migration) leaves FTS rows pointing at the OLD workspace, breaking
  // /api/enterprise/search which filters by accessible workspace IDs.
  // Triggers cover future writes; the one-shot UPDATE heals existing drift.
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS records_fts_workspace_sync
    AFTER UPDATE OF workspace_id ON records
    BEGIN
      UPDATE records_fts SET workspace_id = NEW.workspace_id WHERE record_id = NEW.id;
    END;
  `)
  // One-shot heal on startup (idempotent — UPDATE with WHERE clause that
  // only touches drifted rows). Safe to run every cold boot.
  const drifted = (sqlite.prepare(`
    SELECT COUNT(*) as c FROM records_fts f
    JOIN records r ON r.id = f.record_id
    WHERE f.workspace_id != r.workspace_id
  `).get() as { c: number }).c
  if (drifted > 0) {
    console.log(`[db] FTS5 workspace_id drift detected on ${drifted} rows — healing`)
    sqlite.exec(`
      UPDATE records_fts SET workspace_id = (
        SELECT workspace_id FROM records WHERE id = records_fts.record_id
      )
      WHERE EXISTS (
        SELECT 1 FROM records WHERE id = records_fts.record_id
        AND records.workspace_id != records_fts.workspace_id
      )
    `)
    console.log('[db] FTS5 heal complete')
  }

  ftsReady = true
  console.log('[db] FTS5 search index ready')
} catch (e) {
  console.warn('[db] FTS5 unavailable:', (e as Error).message)
}

// Upsert a record into the FTS5 index. Call after insert or update.
export function upsertFTS(recordId: string, workspaceId: string, title: string, summary: string, content: string) {
  if (!ftsReady) return
  try {
    sqlite.prepare(`DELETE FROM records_fts WHERE record_id = ?`).run(recordId)
    sqlite.prepare(`INSERT INTO records_fts (record_id, workspace_id, title, summary, content) VALUES (?, ?, ?, ?, ?)`)
      .run(recordId, workspaceId, title || '', summary || '', content || '')
  } catch (e) {
    console.warn('[FTS] upsert failed:', (e as Error).message)
  }
}

// Search FTS5 index. Returns record IDs ranked by relevance.
export function searchFTS(query: string, workspaceIds: string[], limit = 50): string[] {
  if (!ftsReady) return []
  try {
    const ftsQuery = query
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .map(w => `"${w}"*`)
      .join(' OR ')
    if (!ftsQuery) return []
    const placeholders = workspaceIds.map(() => '?').join(',')
    const rows = sqlite.prepare(`
      SELECT record_id, rank
      FROM records_fts
      WHERE records_fts MATCH ? AND workspace_id IN (${placeholders})
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, ...workspaceIds, limit) as Array<{ record_id: string; rank: number }>
    return rows.map(r => r.record_id)
  } catch (e) {
    console.warn('[FTS] search failed:', (e as Error).message)
    return []
  }
}

export const db = drizzle(sqlite, { schema })
export { schema, sqlite }
export type DB = typeof db
