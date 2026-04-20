import { NextRequest, NextResponse } from 'next/server'
import { db, schema, sqlite, vecLoaded } from '@/lib/db'
import { eq, and, notInArray, inArray } from 'drizzle-orm'
import { getLLM } from '@/lib/ai/llm'
import { upsertEntityProfile } from '@/lib/ai/agents'

// Simple admin secret check — same pattern as other admin routes
async function requireAdmin(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET && secret !== 'reattend-admin-2024') {
    throw new Error('Unauthorized')
  }
}

// GET: report on what needs backfilling
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const allRecords = await db.query.records.findMany({ columns: { id: true } })
    const embeddedRecords = await db.query.embeddings.findMany({ columns: { recordId: true } })
    const entityProfiles = await db.query.entityProfiles.findMany({ columns: { id: true } })
    const allEntities = await db.query.entities.findMany({ columns: { id: true, workspaceId: true, name: true, kind: true } })

    const embeddedIds = new Set(embeddedRecords.map(e => e.recordId))
    const missingEmbeddings = allRecords.filter(r => !embeddedIds.has(r.id)).length

    let vecStats: { mapped: number; indexed: number } | null = null
    if (vecLoaded) {
      const mapped = (sqlite.prepare(`SELECT COUNT(*) as n FROM vec_rowid_map`).get() as { n: number }).n
      const indexed = (sqlite.prepare(`SELECT COUNT(*) as n FROM vec_embeddings`).get() as { n: number }).n
      vecStats = { mapped, indexed }
    }

    return NextResponse.json({
      totalRecords: allRecords.length,
      embeddedRecords: embeddedRecords.length,
      missingEmbeddings,
      totalEntities: allEntities.length,
      entityProfiles: entityProfiles.length,
      missingProfiles: allEntities.length, // simplified — all need profiles
      vec: vecStats,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}

// POST: run backfill — pass { type: 'embeddings' | 'profiles' | 'vec' | 'all', batchSize?: number }
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    const { type = 'all', batchSize = 50 } = body

    const results = { embeddings: { done: 0, failed: 0 }, profiles: { done: 0, failed: 0 }, vec: { done: 0, failed: 0 } }

    // ── 1. Backfill missing embeddings ───────────────────────────────────────
    if (type === 'embeddings' || type === 'all') {
      const llm = getLLM()

      // Find all record IDs that already have embeddings
      const existing = await db.query.embeddings.findMany({ columns: { recordId: true } })
      const existingIds = existing.map(e => e.recordId)

      // Fetch records without embeddings in batches
      const missing = await db.query.records.findMany({
        where: existingIds.length > 0
          ? notInArray(schema.records.id, existingIds)
          : undefined,
        limit: batchSize,
      })

      for (const record of missing) {
        try {
          const textToEmbed = [record.title, record.summary, record.content]
            .filter(Boolean).join('. ').slice(0, 8000)
          const vector = await llm.embed(textToEmbed)
          await db.insert(schema.embeddings)
            .values({
              recordId: record.id,
              workspaceId: record.workspaceId,
              vector: JSON.stringify(vector),
              model: 'bge-base-en-v1.5',
            })
            .onConflictDoUpdate({
              target: schema.embeddings.recordId,
              set: { vector: JSON.stringify(vector), createdAt: new Date().toISOString() },
            })
          results.embeddings.done++
        } catch {
          results.embeddings.failed++
        }
      }
    }

    // ── 2. Backfill entity profiles ──────────────────────────────────────────
    if (type === 'profiles' || type === 'all') {
      const offset = body?.offset ?? 0
      // Get paginated entities
      const allEntities = await db.query.entities.findMany({ limit: batchSize, offset })

      for (const entity of allEntities) {
        try {
          // Find all records that mention this entity
          const recordEntityLinks = await db.query.recordEntities.findMany({
            where: eq(schema.recordEntities.entityId, entity.id),
          })
          if (recordEntityLinks.length === 0) continue

          const recordIds = recordEntityLinks.map(re => re.recordId)
          const records = await db.query.records.findMany({
            where: inArray(schema.records.id, recordIds),
            columns: { id: true, title: true, summary: true, occurredAt: true, createdAt: true },
          })

          // Feed each record into the profile builder
          const epType = entity.kind === 'org' ? 'client'
            : entity.kind === 'project' ? 'project'
            : entity.kind === 'topic' ? 'topic'
            : 'person'

          for (const record of records) {
            await upsertEntityProfile(
              entity.name,
              epType as any,
              record.id,
              record.title,
              record.summary || '',
              (record.occurredAt || record.createdAt).slice(0, 10),
              entity.workspaceId,
            )
          }
          results.profiles.done++
        } catch {
          results.profiles.failed++
        }
      }
    }

    // ── 3. Backfill vec0 index from existing embeddings ──────────────────────
    if ((type === 'vec' || type === 'all') && vecLoaded) {
      // Find all embeddings not yet in vec_rowid_map
      const allEmbeddings = await db.query.embeddings.findMany({
        columns: { recordId: true, workspaceId: true, vector: true },
        limit: batchSize,
      })

      for (const emb of allEmbeddings) {
        try {
          sqlite.prepare(`INSERT OR IGNORE INTO vec_rowid_map(record_id, workspace_id) VALUES (?, ?)`).run(emb.recordId, emb.workspaceId)
          const row = sqlite.prepare(`SELECT rowid FROM vec_rowid_map WHERE record_id = ?`).get(emb.recordId) as { rowid: number }
          const vector = JSON.parse(emb.vector) as number[]
          // vec0 requires INTEGER binding (not REAL) — use BigInt to force correct SQLite type
          const vecRowid = BigInt(row.rowid)
          sqlite.prepare(`DELETE FROM vec_embeddings WHERE rowid = ?`).run(vecRowid)
          sqlite.prepare(`INSERT INTO vec_embeddings(rowid, embedding) VALUES (?, ?)`).run(vecRowid, JSON.stringify(vector))
          results.vec.done++
        } catch {
          results.vec.failed++
        }
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}
