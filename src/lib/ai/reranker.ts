// ─── Cross-encoder reranker ─────────────────────────────────────────────────
// Takes a query + N candidate records (typically top-20 or top-50 from a
// hybrid FTS+vector search) and uses Claude Haiku as a pairwise relevance
// judge to return the top-K. Dramatically improves Chat answer quality
// because raw cosine/BM25 miss subtle semantic matches (e.g. "what did we
// decide about Singapore" should rank the Singapore tax treaty decision
// above a generic international-tax reflection).
//
// Graceful: falls back to the input order if Haiku is unavailable or the
// response isn't parseable. Never throws.

export interface RerankableRecord {
  id: string
  title: string
  summary?: string | null
  content?: string | null
  type?: string
}

interface RankedResult {
  id: string
  score: number // 0..10, higher = more relevant
}

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_CANDIDATES = 30
const TIMEOUT_MS = 8000

// Renders a candidate into a ~120-word snippet — enough for Haiku to judge
// relevance, short enough to keep the batch prompt under 8k tokens.
function candidateSnippet(r: RerankableRecord): string {
  const preview = (r.summary || r.content || '').replace(/\s+/g, ' ').trim().slice(0, 400)
  return `${r.title}${r.type ? ` [${r.type}]` : ''}${preview ? ` — ${preview}` : ''}`
}

export async function rerankWithClaudeHaiku(
  query: string,
  candidates: RerankableRecord[],
  topK: number = 10,
): Promise<RerankableRecord[]> {
  if (candidates.length === 0) return candidates
  if (candidates.length <= topK) return candidates

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return candidates.slice(0, topK) // no rerank possible

  // Cap input to keep latency sane. Beyond 30 the quality gains flatten.
  const limited = candidates.slice(0, MAX_CANDIDATES)

  const numbered = limited
    .map((r, i) => `[${i + 1}] ${candidateSnippet(r)}`)
    .join('\n')

  const prompt = `You are a relevance judge. Given a user's question and a numbered list of candidate memory records, score each candidate's relevance to the question from 0 to 10 (integer). 10 = directly answers the question. 5 = related but tangential. 0 = unrelated.

Question: ${query}

Candidates:
${numbered}

Reply with JSON only, no prose, shape:
[{"n":1,"score":0},{"n":2,"score":0},...]
One object per candidate, in order. Integer scores 0-10.`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        temperature: 0,
        system: 'You output strict JSON only. No preamble, no code fences.',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      console.warn('[rerank] Haiku returned', res.status)
      return candidates.slice(0, topK)
    }
    const body = await res.json() as { content?: Array<{ type: string; text?: string }> }
    const text = (body.content ?? []).map((b) => (b.type === 'text' ? (b.text ?? '') : '')).join('')
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return candidates.slice(0, topK)

    const parsed = JSON.parse(match[0]) as Array<{ n: number; score: number }>
    const scores = new Map<string, number>()
    for (const p of parsed) {
      const candidate = limited[p.n - 1]
      if (candidate && typeof p.score === 'number') {
        scores.set(candidate.id, p.score)
      }
    }
    // Sort by Haiku score desc, ties broken by original order (stable)
    const ranked: RankedResult[] = limited
      .map((c) => ({ id: c.id, score: scores.get(c.id) ?? 0 }))
      .sort((a, b) => b.score - a.score)

    const byId = new Map(candidates.map((c) => [c.id, c]))
    return ranked
      .slice(0, topK)
      .map((r) => byId.get(r.id))
      .filter((r): r is RerankableRecord => !!r)
  } catch (err) {
    // Any failure → fall back to input order (which was already sorted by
    // hybrid score). Never break the ask path.
    console.warn('[rerank] Haiku rerank failed, using hybrid order:', (err as Error).message)
    return candidates.slice(0, topK)
  }
}
