import { NextRequest } from 'next/server'
import { db, schema, sqlite, vecLoaded, searchFTS, ftsReady } from '@/lib/db'
import { eq, and, desc, or, inArray, like, ne } from 'drizzle-orm'
import { validateApiToken } from '@/lib/auth/token'
import { getUserSubscription } from '@/lib/auth'
import { recordUsage } from '@/lib/metering'
import { getAskLLM } from '@/lib/ai/llm'
import { cosineSimilarity } from '@/lib/utils'

const AI_QUERY_LIMIT = 20

function extractKeywords(text: string): string[] {
  const STOP_WORDS = new Set([
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
    'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'a', 'an',
    'the', 'and', 'but', 'or', 'not', 'so', 'if', 'than', 'very', 'just',
    'about', 'all', 'also', 'any', 'by', 'for', 'from', 'how', 'in', 'more',
    'no', 'of', 'on', 'what', 'when', 'where', 'which', 'who', 'why', 'with',
  ])
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiToken(req.headers.get('authorization'))
    if (!auth) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const sub = await getUserSubscription(auth.userId)
    if (!sub.isSmartActive) {
      const today = new Date().toISOString().slice(0, 10)
      const usage = await db.query.usageDaily.findFirst({
        where: and(eq(schema.usageDaily.userId, auth.userId), eq(schema.usageDaily.date, today)),
      })
      const used = usage?.opsCount ?? 0
      if (used >= AI_QUERY_LIMIT) {
        return Response.json({ error: 'quota_exceeded', used, limit: AI_QUERY_LIMIT }, { status: 429 })
      }
      await recordUsage(null, auth.userId, 'registered', 'ai_query')
    }

    const { question } = await req.json() as { question: string }
    if (!question) {
      return Response.json({ error: 'question is required' }, { status: 400 })
    }

    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, auth.userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    if (allWorkspaceIds.length === 0) {
      return new Response("You don't have any memories yet. Save some and I'll be able to answer.", {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const llm = getAskLLM()
    const keywords = extractKeywords(question)

    // Fetch recent + keyword/FTS records
    const recentRecords = await db.query.records.findMany({
      where: and(inArray(schema.records.workspaceId, allWorkspaceIds), ne(schema.records.triageStatus, 'needs_review')),
      orderBy: desc(schema.records.createdAt),
      limit: 150,
    })

    let keywordRecords: typeof recentRecords = []
    if (ftsReady) {
      const ftsIds = searchFTS(question, allWorkspaceIds, 50)
      if (ftsIds.length > 0) {
        keywordRecords = await db.query.records.findMany({
          where: and(inArray(schema.records.id, ftsIds), ne(schema.records.triageStatus, 'needs_review')),
        })
      }
    } else if (keywords.length > 0) {
      const conds = keywords.flatMap(kw => [
        like(schema.records.title, `%${kw}%`),
        like(schema.records.summary, `%${kw}%`),
        like(schema.records.content, `%${kw}%`),
      ])
      keywordRecords = await db.query.records.findMany({
        where: and(inArray(schema.records.workspaceId, allWorkspaceIds), ne(schema.records.triageStatus, 'needs_review'), or(...conds)),
        limit: 50,
      })
    }

    // Merge + dedup
    const seenIds = new Set<string>()
    const allRecords: typeof recentRecords = []
    for (const r of [...keywordRecords, ...recentRecords]) {
      if (!seenIds.has(r.id)) { seenIds.add(r.id); allRecords.push(r) }
    }

    // Score
    const lowerQ = question.toLowerCase()
    const scored = allRecords.map(r => {
      const text = [r.title, r.summary || '', r.content || ''].join(' ').toLowerCase()
      let score = 0
      for (const kw of keywords) {
        if (r.title.toLowerCase().includes(kw)) score += 2
        else if (text.includes(kw)) score++
      }
      return { record: r, score }
    })

    // Vector search boost
    try {
      const queryVector = await llm.embed(question)
      if (vecLoaded) {
        const wsSet = new Set(allWorkspaceIds)
        const rows = sqlite.prepare(`
          SELECT m.record_id, m.workspace_id, v.distance
          FROM vec_embeddings v JOIN vec_rowid_map m ON m.rowid = v.rowid
          WHERE v.embedding MATCH ? AND v.k = 30
          ORDER BY v.distance
        `).all(JSON.stringify(queryVector)) as Array<{ record_id: string; workspace_id: string; distance: number }>
        for (const row of rows.filter(r => wsSet.has(r.workspace_id)).slice(0, 10)) {
          const sim = 1 - row.distance
          if (sim < 0.3) continue
          const existing = scored.find(x => x.record.id === row.record_id)
          if (existing) existing.score += sim * 5
        }
      }
    } catch {}

    scored.sort((a, b) => b.score - a.score)
    let top = scored.filter(s => s.score >= 1).slice(0, 10).map(s => s.record)
    if (top.length === 0) top = allRecords.slice(0, 3)

    if (top.length === 0) {
      return new Response("You don't have any memories yet.", { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }

    // Build context
    const stripMd = (t: string) => t.replace(/^#{1,6}\s+/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim()
    const context = top.map((r, i) => {
      const dateStr = formatDate(r.occurredAt || r.createdAt)
      const dateLine = dateStr ? `\nDate: ${dateStr}` : ''
      const summaryLine = r.summary ? `\nSummary: ${stripMd(r.summary).slice(0, 800)}` : ''
      const contentLine = r.content ? `\nContent: ${stripMd(r.content).slice(0, 1500)}` : ''
      return `[${i + 1}] ${r.type.toUpperCase()}: ${r.title}${dateLine}${summaryLine}${contentLine}`
    }).join('\n\n---\n\n')

    const prompt = `You are Reattend — the user's AI memory assistant. You have access to their saved notes and meetings.

RULES:
- Use ONLY the memories below. Never invent facts. Cite sources as [1], [2], [3].
- Be specific: quote exact names, dates, numbers.
- Write clear, natural prose. No markdown headers.
- If something isn't in the memories, say "I don't have this saved yet."
- Surface contradictions or risks if you notice them.
- You can draft emails, briefs, summaries, and presentations from the memories.

MEMORIES:
${context}

USER QUESTION: ${question}

ANSWER:

After your answer, write:

Follow-up questions:
- (a question that digs deeper)
- (a question connecting to other memories)
- (a forward-looking question)

Offers:
- If you want, I can [specific action]
- Do you want me to [specific action]`

    const stream = await llm.generateTextStream(prompt)

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }
}
