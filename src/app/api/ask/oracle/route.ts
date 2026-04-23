import { NextRequest, NextResponse } from 'next/server'
import { db, schema, searchFTS } from '@/lib/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  buildAccessContext,
  filterToAccessibleRecords,
  filterToAccessibleWorkspaces,
  handleEnterpriseError,
  auditForAllUserOrgs,
  extractRequestMeta,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'
import { rerankWithClaudeHaiku } from '@/lib/ai/reranker'

export const dynamic = 'force-dynamic'

// POST /api/ask/oracle
// Body: { orgId, question }
//
// Oracle Mode — the "deep research" mode for high-stakes questions. Unlike
// /api/ask, this endpoint:
//   - Pulls ~150 candidates (vs 30) via FTS over the user's accessible
//     workspaces
//   - Re-ranks the top 30 with Claude Haiku
//   - Feeds them into a single long Claude call with a structured prompt
//     (Situation / Evidence / Risks / Recommendations / Unknowns)
//   - Returns the structured dossier + citation list
//
// Takes ~20-40 seconds. The UI shows a "thinking" indicator with step labels.

interface OracleSection {
  heading: string
  body: string
}

interface OracleResponse {
  question: string
  dossier: {
    situation: string
    evidence: string
    risks: string
    recommendations: string
    unknowns: string
  }
  sources: Array<{
    id: string
    title: string
    type: string
    date: string | null
    passage: string | null  // best-matching sentence/paragraph from the source
  }>
  meta: {
    candidatesScanned: number
    accessibleFiltered: number
    reranked: number
    elapsedMs: number
  }
}

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'
    const body = await req.json()
    const { orgId, question } = body as { orgId?: string; question?: string }

    if (!orgId || !question || question.trim().length < 5) {
      return NextResponse.json({ error: 'orgId + question (min 5 chars) required' }, { status: 400 })
    }

    // Audit — Oracle queries are high-signal, worth logging prominently
    const reqMeta = extractRequestMeta(req)
    auditForAllUserOrgs(userId, userEmail, 'query', {
      resourceType: 'oracle',
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
      metadata: { question: question.slice(0, 500), mode: 'oracle' },
    })

    // ── Accessible workspaces in this org ──────────────────
    const wsLinkRows = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const allWs = Array.from(new Set(wsLinkRows.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)
    if (accessibleWs.length === 0) {
      return NextResponse.json({ error: 'no accessible workspaces' }, { status: 403 })
    }

    // ── Stage 1: FTS retrieval — 150 candidates ────────────
    const ftsIds = searchFTS(question, accessibleWs, 150)
    const candidatesScanned = ftsIds.length
    if (ftsIds.length === 0) {
      return NextResponse.json({
        question,
        dossier: {
          situation: `I don't have any memories touching this topic.`,
          evidence: '',
          risks: '',
          recommendations: 'Capture a few memories about this topic first, then ask again.',
          unknowns: 'Everything — this question has zero corpus to lean on.',
        },
        sources: [],
        meta: { candidatesScanned: 0, accessibleFiltered: 0, reranked: 0, elapsedMs: Date.now() - t0 },
      } as OracleResponse)
    }

    // ── Stage 2: record-level RBAC ─────────────────────────
    const rawRows = await db.select().from(schema.records)
      .where(inArray(schema.records.id, ftsIds))
    const ctx = await buildAccessContext(userId)
    const allowed = await filterToAccessibleRecords(ctx, rawRows.map((r) => r.id))
    // Preserve FTS rank order
    const rankById = new Map(ftsIds.map((id, i) => [id, i]))
    const visible = rawRows.filter((r) => allowed.has(r.id))
      .sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0))

    const accessibleFiltered = visible.length
    if (visible.length === 0) {
      return NextResponse.json({
        question,
        dossier: {
          situation: `Records exist on this topic but none are within your access scope.`,
          evidence: '',
          risks: '',
          recommendations: 'Ask someone with broader access, or request visibility from an admin.',
          unknowns: '',
        },
        sources: [],
        meta: { candidatesScanned, accessibleFiltered: 0, reranked: 0, elapsedMs: Date.now() - t0 },
      } as OracleResponse)
    }

    // ── Stage 3: Claude Haiku rerank to top 30 ─────────────
    let top = visible.slice(0, 30)
    try {
      const ranked = await rerankWithClaudeHaiku(question, visible.slice(0, 60).map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        content: r.content,
        type: r.type,
      })), 30)
      const byId = new Map(visible.map((r) => [r.id, r]))
      top = ranked.map((r) => byId.get(r.id)).filter((r): r is (typeof visible)[number] => !!r)
      if (top.length === 0) top = visible.slice(0, 30)
    } catch (err) {
      console.warn('[oracle] rerank failed, using FTS order', err)
    }

    // ── Stage 4: single structured Claude call ─────────────
    const memoriesBlock = top.map((r, i) => {
      const typeLabel = r.type.toUpperCase()
      const dateStr = (r.occurredAt || r.createdAt).slice(0, 10)
      const summary = r.summary ? r.summary.slice(0, 400) : ''
      const content = r.content ? r.content.slice(0, 1500) : ''
      return `[${i + 1}] ${typeLabel} · ${dateStr} · ${r.title}
${summary}${content ? `\n${content}` : ''}`
    }).join('\n\n---\n\n')

    const prompt = `You are Reattend's Oracle Mode. The user has asked a high-stakes question and expects a structured dossier, not a casual chat reply.

USER QUESTION: ${question}

Read the ${top.length} memories below and produce a dossier with exactly five sections. Cite inline as [1], [2], [3] using the memory numbers.

Rules:
- Ground every claim in the memories. Don't invent. If unknown, say so in "Unknowns".
- Name specific people, dates, and numbers verbatim from the memories.
- Use markdown bullets for Evidence, Risks, and Recommendations. Plain prose for Situation and Unknowns.
- No preamble, no closing, no self-reference. Just the five sections.

## SITUATION
One paragraph summarizing the current state of this question based on the evidence.

## EVIDENCE
- Bullet each load-bearing fact with [citation]. Prefer dated, authored claims over general statements.

## RISKS
- Bullet each risk or contradiction visible in the memories. Cite.

## RECOMMENDATIONS
- Concrete, actionable bullets. Tie each to the evidence.

## UNKNOWNS
Plain paragraph. What the corpus does NOT answer — the question behind the question. If everything is covered, write "None significant." and nothing else.

---

MEMORIES:

${memoriesBlock}

---

BEGIN DOSSIER:`

    const llm = getAskLLM()
    const answer = await llm.generateText(prompt, 3000)

    // ── Stage 5: parse the five sections from Claude's output ──────
    const sections = parseOracleSections(answer)

    return NextResponse.json({
      question,
      dossier: sections,
      sources: top.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        date: (r.occurredAt || r.createdAt) || null,
        passage: extractBestPassage(question, r.content || r.summary || ''),
      })),
      meta: {
        candidatesScanned,
        accessibleFiltered,
        reranked: top.length,
        elapsedMs: Date.now() - t0,
      },
    } as OracleResponse)
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    console.error('[oracle]', err)
    return handleEnterpriseError(err)
  }
}

// Extract the paragraph from a memory that best overlaps the user's question.
// Simple keyword-overlap scoring — fast, no extra LLM call. Returns null for
// short/empty content. Trimmed to ~280 chars so the UI can surface a readable
// snippet beside each source citation.
function extractBestPassage(question: string, content: string): string | null {
  if (!content || content.length < 60) return null
  const stopwords = new Set(['the','a','an','and','or','but','of','to','in','is','are','was','were','be','for','on','with','as','by','at','it','this','that','which','who','what','how','we','our','their','they','has','have','had','will','would','should','can','could'])
  const qTerms = question.toLowerCase().split(/\W+/)
    .filter((w) => w.length > 2 && !stopwords.has(w))
  if (qTerms.length === 0) return null

  // Prefer paragraph (\n\n-separated) as the unit; fall back to sentences
  const paragraphs = content.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 30)
  const units = paragraphs.length > 1 ? paragraphs : content.split(/(?<=[.!?])\s+/).filter((s) => s.length > 30)
  if (units.length === 0) return null

  let best = ''
  let bestScore = 0
  for (const u of units) {
    const ul = u.toLowerCase()
    let score = 0
    for (const t of qTerms) {
      if (ul.includes(t)) score += 1
    }
    if (score > bestScore) { bestScore = score; best = u }
  }
  if (bestScore === 0) return null
  return best.length > 280 ? best.slice(0, 280) + '…' : best
}

// Parse the five sections out of Claude's markdown-ish output. Falls back to
// putting the whole answer in "situation" if headings are absent.
function parseOracleSections(raw: string): OracleResponse['dossier'] {
  const section = (key: string) => {
    const re = new RegExp(`##\\s*${key}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i')
    const m = raw.match(re)
    return m ? m[1].trim() : ''
  }
  const situation = section('SITUATION') || section('Situation')
  const evidence = section('EVIDENCE') || section('Evidence')
  const risks = section('RISKS') || section('Risks')
  const recommendations = section('RECOMMENDATIONS') || section('Recommendations')
  const unknowns = section('UNKNOWNS') || section('Unknowns')
  if (!situation && !evidence && !risks && !recommendations) {
    return { situation: raw.trim(), evidence: '', risks: '', recommendations: '', unknowns: '' }
  }
  return { situation, evidence, risks, recommendations, unknowns }
}
