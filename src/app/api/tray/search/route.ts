import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'
import { validateApiToken } from '@/lib/auth/token'
import { getLLM } from '@/lib/ai'
import { cosineSimilarity } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const auth = await validateApiToken(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const q = req.nextUrl.searchParams.get('q')
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10'), 20)

    if (!q) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 })
    }

    // Get ALL workspaces this user belongs to (cross-workspace search)
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, auth.userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    if (allWorkspaceIds.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const results: Array<{
      id: string
      type: string
      title: string
      summary: string | null
      score: number
    }> = []

    // Text search across all workspaces
    const allRecords = await db.query.records.findMany({
      where: inArray(schema.records.workspaceId, allWorkspaceIds),
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
        })
      }
    }

    // Semantic search across all workspaces
    try {
      const llm = getLLM()
      const queryVector = await llm.embed(q)

      const allEmbeddings = await db.query.embeddings.findMany({
        where: inArray(schema.embeddings.workspaceId, allWorkspaceIds),
      })

      for (const emb of allEmbeddings) {
        const vector = JSON.parse(emb.vector) as number[]
        const similarity = cosineSimilarity(queryVector, vector)

        if (similarity > 0.2) {
          const existing = results.find(r => r.id === emb.recordId)
          if (existing) {
            existing.score += similarity
          } else {
            const record = allRecords.find(r => r.id === emb.recordId)
            if (record) {
              results.push({
                id: record.id,
                type: record.type,
                title: record.title,
                summary: record.summary,
                score: similarity,
              })
            }
          }
        }
      }
    } catch {
      // Embedding search failed, continue with text results
    }

    results.sort((a, b) => b.score - a.score)
    return NextResponse.json({ results: results.slice(0, limit) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
