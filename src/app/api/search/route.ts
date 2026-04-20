import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getLLM } from '@/lib/ai'
import { cosineSimilarity } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireAuth()

    const params = req.nextUrl.searchParams
    const q = params.get('q')
    const mode = params.get('mode') || 'hybrid'

    if (!q) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 })
    }

    const results: Array<{
      id: string
      type: string
      title: string
      summary: string | null
      score: number
      source: 'text' | 'semantic'
    }> = []

    // Text search
    if (mode === 'text' || mode === 'hybrid') {
      const allRecords = await db.query.records.findMany({
        where: eq(schema.records.workspaceId, workspaceId),
      })

      const lowerQ = q.toLowerCase()
      for (const record of allRecords) {
        const titleMatch = record.title.toLowerCase().includes(lowerQ) ? 1 : 0
        const summaryMatch = record.summary?.toLowerCase().includes(lowerQ) ? 0.5 : 0
        const contentMatch = record.content?.toLowerCase().includes(lowerQ) ? 0.3 : 0
        const score = titleMatch + summaryMatch + contentMatch

        if (score > 0) {
          results.push({
            id: record.id,
            type: record.type,
            title: record.title,
            summary: record.summary,
            score,
            source: 'text',
          })
        }
      }
    }

    // Semantic search (only for Smart users)
    if (mode === 'semantic' || mode === 'hybrid') {
      const llm = getLLM()
      const queryVector = await llm.embed(q)

      const allEmbeddings = await db.query.embeddings.findMany({
        where: eq(schema.embeddings.workspaceId, workspaceId),
      })

      for (const emb of allEmbeddings) {
        const vector = JSON.parse(emb.vector) as number[]
        const similarity = cosineSimilarity(queryVector, vector)

        if (similarity > 0.2) {
          const existing = results.find(r => r.id === emb.recordId)
          if (existing) {
            existing.score += similarity
          } else {
            const record = await db.query.records.findFirst({
              where: eq(schema.records.id, emb.recordId),
            })
            if (record) {
              results.push({
                id: record.id,
                type: record.type,
                title: record.title,
                summary: record.summary,
                score: similarity,
                source: 'semantic',
              })
            }
          }
        }
      }
    }

    // Also search projects
    const allProjects = await db.query.projects.findMany({
      where: eq(schema.projects.workspaceId, workspaceId),
    })
    const projectResults = allProjects
      .filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.description?.toLowerCase().includes(q.toLowerCase()))
      .map(p => ({
        id: p.id,
        type: 'project' as const,
        title: p.name,
        summary: p.description,
        score: 0.8,
        source: 'text' as const,
      }))

    // Also search entities
    const allEntities = await db.query.entities.findMany({
      where: eq(schema.entities.workspaceId, workspaceId),
    })
    const entityResults = allEntities
      .filter(e => e.name.toLowerCase().includes(q.toLowerCase()))
      .map(e => ({
        id: e.id,
        type: `entity:${e.kind}` as const,
        title: e.name,
        summary: `${e.kind}: ${e.name}`,
        score: 0.7,
        source: 'text' as const,
      }))

    const allResults = [...results, ...projectResults, ...entityResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    return NextResponse.json({ results: allResults, total: allResults.length, mode, aiAvailable: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
