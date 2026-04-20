import { NextRequest } from 'next/server'
import { db, schema, sqlite, vecLoaded, searchFTS, ftsReady } from '@/lib/db'
import { eq, and, desc, or, inArray, like, ne } from 'drizzle-orm'
import { requireAuth, getUserSubscription } from '@/lib/auth'
import { recordUsage } from '@/lib/metering'
import { getAskLLM } from '@/lib/ai/llm'
import { cosineSimilarity } from '@/lib/utils'

const DEEPTHINK_DAILY_LIMIT = 10

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function formatDate(d: string | null): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '' }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || ''
    const { question, history } = await req.json() as { question: string; history?: ChatMessage[] }

    if (!question) {
      return Response.json({ error: 'question is required' }, { status: 400 })
    }

    // DeepThink quota: 10/day for free, unlimited for pro
    const sub = await getUserSubscription(userId)
    if (!sub.isSmartActive) {
      const today = new Date().toISOString().slice(0, 10)
      const usage = await db.query.usageDaily.findFirst({
        where: and(eq(schema.usageDaily.userId, userId), eq(schema.usageDaily.date, today)),
      })
      const used = usage?.opsCount ?? 0
      if (used >= DEEPTHINK_DAILY_LIMIT) {
        return new Response(`You've used all ${DEEPTHINK_DAILY_LIMIT} DeepThink sessions for today. Your mind needs rest too — come back tomorrow with fresh perspective.\n\nPro users get unlimited DeepThink sessions.`, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
      await recordUsage(null, userId, 'registered', 'deepthink')
    }

    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    if (allWorkspaceIds.length === 0) {
      return new Response("Save some memories first — meeting notes, decisions, ideas. Then come back and I'll think with you.", {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const llm = getAskLLM(userEmail)

    // For DeepThink, fetch MORE context than normal ask — up to 30 memories
    // sorted by relevance + recency. We want the AI to see patterns.
    const recentRecords = await db.query.records.findMany({
      where: and(
        inArray(schema.records.workspaceId, allWorkspaceIds),
        ne(schema.records.triageStatus, 'needs_review'),
      ),
      orderBy: desc(schema.records.createdAt),
      limit: 200,
    })

    // FTS search
    let keywordRecords: typeof recentRecords = []
    if (ftsReady) {
      const ftsIds = searchFTS(question, allWorkspaceIds, 50)
      if (ftsIds.length > 0) {
        keywordRecords = await db.query.records.findMany({
          where: and(inArray(schema.records.id, ftsIds), ne(schema.records.triageStatus, 'needs_review')),
        })
      }
    }

    // Merge + dedup
    const seenIds = new Set<string>()
    const allRecords: typeof recentRecords = []
    for (const r of [...keywordRecords, ...recentRecords]) {
      if (!seenIds.has(r.id)) { seenIds.add(r.id); allRecords.push(r) }
    }

    // Score
    const keywords = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2)
    const scored = allRecords.map(r => {
      const text = [r.title, r.summary || '', r.content || ''].join(' ').toLowerCase()
      let score = 0
      for (const kw of keywords) {
        if (r.title.toLowerCase().includes(kw)) score += 2
        else if (text.includes(kw)) score++
      }
      // Recency boost for DeepThink — recent patterns matter more
      const daysAgo = (Date.now() - new Date(r.createdAt).getTime()) / 86400000
      if (daysAgo < 7) score += 3
      else if (daysAgo < 30) score += 1
      return { record: r, score }
    })

    // Vector search
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
        for (const row of rows.filter(r => wsSet.has(r.workspace_id)).slice(0, 15)) {
          const sim = 1 - row.distance
          if (sim < 0.25) continue
          const existing = scored.find(x => x.record.id === row.record_id)
          if (existing) existing.score += sim * 5
        }
      }
    } catch {}

    scored.sort((a, b) => b.score - a.score)
    // DeepThink gets MORE context — up to 20 memories (vs 10 for normal ask)
    let top = scored.filter(s => s.score >= 1).slice(0, 20).map(s => s.record)
    if (top.length < 5) top = allRecords.slice(0, 15)

    // Build rich context — include content for pattern detection
    const stripMd = (t: string) => t.replace(/^#{1,6}\s+/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim()

    const context = top.map((r, i) => {
      const dateStr = formatDate(r.occurredAt || r.createdAt)
      const dateLine = dateStr ? ` (${dateStr})` : ''
      const summary = r.summary ? `\n${stripMd(r.summary).slice(0, 600)}` : ''
      const content = r.content ? `\n${stripMd(r.content).slice(0, 1000)}` : ''
      return `[${i + 1}] ${r.type.toUpperCase()}: ${r.title}${dateLine}${summary}${content}`
    }).join('\n\n---\n\n')

    // Conversation history
    const recentHistory = (history || []).slice(-10)
    const historyText = recentHistory.length > 0
      ? '\n\nConversation so far:\n' + recentHistory.map(m =>
          m.role === 'user' ? `You: ${m.content}` : `DeepThink: ${m.content.slice(0, 600)}`
        ).join('\n')
      : ''

    // Count patterns for the AI to work with
    const typeCount: Record<string, number> = {}
    const dateSpan = { earliest: '', latest: '' }
    for (const r of top) {
      typeCount[r.type] = (typeCount[r.type] || 0) + 1
      if (!dateSpan.earliest || r.createdAt < dateSpan.earliest) dateSpan.earliest = r.createdAt
      if (!dateSpan.latest || r.createdAt > dateSpan.latest) dateSpan.latest = r.createdAt
    }
    const patternNote = `\nYou have access to ${top.length} memories spanning ${formatDate(dateSpan.earliest)} to ${formatDate(dateSpan.latest)}. Types: ${Object.entries(typeCount).map(([k, v]) => `${v} ${k}(s)`).join(', ')}.`

    const prompt = `You are DeepThink — the most honest, insightful thinking partner a person can have. You have perfect recall of everything they've saved: meetings, decisions, ideas, notes, conversations.

WHO YOU ARE:
- You are not an assistant. You are a strategic advisor who happens to have read everything.
- You challenge. You provoke. You connect dots the user hasn't connected.
- You notice patterns: what they keep deciding and undoing, what they avoid, what they say vs what they do.
- You are warm but direct. Like the smartest friend who isn't afraid to say the uncomfortable thing.

HOW YOU THINK:
- Start with the most surprising insight, not a summary.
- Surface contradictions: "You decided X on March 5 but your actions since then suggest you don't actually believe it."
- Track recurring themes: "This is the third time in 6 weeks you've discussed hiring. Each time you decide to hire, then postpone. What's the real blocker?"
- Name what's unspoken: "You talk about client A in every meeting but never mention client B, who's 2x the revenue. Why?"
- Connect across memories: link a decision from 3 weeks ago to a problem from yesterday.
- Be specific — cite dates, names, numbers from the memories.

THE MOST IMPORTANT RULE — YOU ALWAYS ASK BACK:
- Every single response MUST end with a probing question directed at the user.
- Not a generic "what do you think?" — a specific, pointed question that forces them to confront something.
- Examples:
  "You've postponed this decision 3 times. What are you afraid will happen if you actually commit?"
  "You assigned this to Arjun but never followed up. Do you actually trust him to deliver it?"
  "This is the pattern: you plan big, then cut scope at the last minute. Is that pragmatism or fear?"
- This is what makes you different from a search engine. You don't just answer — you keep the conversation going deeper.

CROSS-REFERENCING:
- If the user attaches a document (business plan, strategy doc, pitch deck, anything), cross-reference it against everything you know about them from their memories.
- Be honest but kind. If their business plan says "we'll reach 10K users by Q3" but their memories show they've been struggling with 5 users for 3 months, say so gently.
- Point out gaps between the document and reality. What does the doc assume that their memories contradict?
- Find strengths too — where does the document align with what they've actually accomplished?

TONE — CRITICAL:
- You are empathetic. Mental health comes first. Never be cruel or dismissive.
- Be the friend who tells hard truths because they care, not because they enjoy it.
- If someone is clearly stressed or struggling, acknowledge it before pushing deeper.
- Celebrate wins. If they've been consistent on something, say so.
- But do NOT agree with everything. If they're wrong, say "I see it differently" and explain why from their own history.

WHAT YOU DO NOT DO:
- Never be generic. Never give advice you could give without reading their memories.
- Never say "based on your notes" or "according to your memories" — just say the insight.
- Never be a yes-man. If their thinking has a flaw, name it gently.
- Never just list things. Weave a narrative, then ask the uncomfortable question.
- Never be harsh. Be direct but warm.
- Never invent facts. If you don't have enough to answer, say "I don't have enough saved to see this clearly. Save more about [specific topic] and I'll be able to help."

${patternNote}

MEMORIES:
${context}
${historyText}

USER: ${question}

DEEPTHINK:`

    const stream = await llm.generateTextStream(prompt)

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }
}
