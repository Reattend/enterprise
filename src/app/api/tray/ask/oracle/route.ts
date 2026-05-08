import { NextRequest, NextResponse } from 'next/server'
import { db, schema, searchFTS } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'
import { validateApiToken } from '@/lib/auth/token'
import { requireExtensionAccess } from '@/lib/billing/gates'
import {
  buildAccessContext,
  filterToAccessibleRecords,
  filterToAccessibleWorkspaces,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'
import { rerankWithClaudeHaiku } from '@/lib/ai/reranker'

export const dynamic = 'force-dynamic'

// Bearer-auth twin of /api/ask/oracle for the desktop's Deepthink mode.
// Same JSON contract: { question, dossier, sources, meta }. The dashboard
// version uses session cookies + an explicit orgId; the desktop talks
// across all the user's accessible workspaces (matching /api/tray/ask),
// so orgId is optional — when omitted, we search every workspace the user
// can see.

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
    passage: string | null
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
    const auth = await validateApiToken(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const gateRes = await requireExtensionAccess(auth.userId)
    if (gateRes) return gateRes

    const body = await req.json().catch(() => ({})) as { orgId?: string; question?: string }
    const { orgId, question } = body
    if (!question || question.trim().length < 5) {
      return NextResponse.json({ error: 'question (min 5 chars) required' }, { status: 400 })
    }

    // Workspace scope: prefer the explicit org if passed, otherwise every
    // workspace the user is a member of (matches /api/tray/ask behavior).
    let candidateWs: string[]
    if (orgId) {
      const links = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
        .from(schema.workspaceOrgLinks)
        .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
      candidateWs = Array.from(new Set(links.map(l => l.workspaceId)))
    } else {
      const memberships = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.userId, auth.userId),
      })
      candidateWs = memberships.map(m => m.workspaceId)
    }

    const accessibleWs = await filterToAccessibleWorkspaces(auth.userId, candidateWs)
    if (accessibleWs.length === 0) {
      return NextResponse.json({ error: 'no accessible workspaces' }, { status: 403 })
    }

    // Stage 1: FTS retrieval — 150 candidates
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

    // Stage 2: record-level RBAC
    const rawRows = await db.select().from(schema.records)
      .where(inArray(schema.records.id, ftsIds))
    const ctx = await buildAccessContext(auth.userId)
    const allowed = await filterToAccessibleRecords(ctx, rawRows.map(r => r.id))
    const rankById = new Map(ftsIds.map((id, i) => [id, i]))
    const visible = rawRows
      .filter(r => allowed.has(r.id))
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

    // Stage 3: Claude Haiku rerank to top 30
    let top = visible.slice(0, 30)
    try {
      const ranked = await rerankWithClaudeHaiku(question, visible.slice(0, 60).map(r => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        content: r.content,
        type: r.type,
      })), 30)
      const byId = new Map(visible.map(r => [r.id, r]))
      top = ranked.map(r => byId.get(r.id)).filter((r): r is (typeof visible)[number] => !!r)
      if (top.length === 0) top = visible.slice(0, 30)
    } catch (err) {
      console.warn('[tray/oracle] rerank failed, using FTS order', err)
    }

    // Stage 4: structured Claude call
    const memoriesBlock = top.map((r, i) => {
      const dateStr = (r.occurredAt || r.createdAt).slice(0, 10)
      const summary = r.summary ? r.summary.slice(0, 400) : ''
      const content = r.content ? r.content.slice(0, 1500) : ''
      return `[${i + 1}] ${r.type.toUpperCase()} · ${dateStr} · ${r.title}
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
    const dossier = parseOracleSections(answer)

    return NextResponse.json({
      question,
      dossier,
      sources: top.map(r => ({
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
    console.error('[tray/oracle]', err)
    return handleEnterpriseError(err)
  }
}

function extractBestPassage(question: string, content: string): string | null {
  if (!content || content.length < 60) return null
  const stop = new Set(['the','a','an','and','or','but','of','to','in','is','are','was','were','be','for','on','with','as','by','at','it','this','that','which','who','what','how','we','our','their','they','has','have','had','will','would','should','can','could'])
  const qTerms = question.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stop.has(w))
  if (qTerms.length === 0) return null

  const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 30)
  const units = paragraphs.length > 1 ? paragraphs : content.split(/(?<=[.!?])\s+/).filter(s => s.length > 30)
  if (units.length === 0) return null

  let best = ''
  let bestScore = 0
  for (const u of units) {
    const ul = u.toLowerCase()
    let score = 0
    for (const t of qTerms) if (ul.includes(t)) score += 1
    if (score > bestScore) { bestScore = score; best = u }
  }
  if (bestScore === 0) return null
  return best.length > 280 ? best.slice(0, 280) + '…' : best
}

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
