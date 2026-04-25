import { NextRequest, NextResponse } from 'next/server'
import { db, schema, searchFTS } from '@/lib/db'
import { eq, inArray, and, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
  buildAccessContext,
  filterToAccessibleRecords,
  filterToAccessibleWorkspaces,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'
import { isSandboxEmail } from '@/lib/sandbox/detect'
import { SANDBOX_COMPOSE } from '@/lib/sandbox/fixtures'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/compose
//
// Action agents — the "draft something" tools. Two live kinds today:
//
//   { kind: 'email-reply', orgId, thread: string, instruction?: string }
//     Claude drafts a memory-grounded reply to an email thread.
//
//   { kind: 'broadcast', orgId, decisionId | topic: string, medium?: 'slack' | 'email' }
//     Claude drafts an announcement about a decision or topic, tuned for
//     the medium.
//
// Returns { draft, sources[], meta }. User copies the text into wherever
// (Gmail, Slack, etc.) — real send integrations land in Sprint P with Nango.

type ComposeKind = 'email-reply' | 'broadcast'

interface BaseBody {
  kind: ComposeKind
  orgId: string
}

export async function POST(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || ''
    const body = await req.json() as Partial<BaseBody> & Record<string, any>

    const { kind, orgId } = body
    if (!kind || !orgId) return NextResponse.json({ error: 'kind + orgId required' }, { status: 400 })

    // Sandbox: return a scripted compose draft. Shape matches real response.
    if (isSandboxEmail(userEmail)) {
      return NextResponse.json({
        draft: {
          subject: SANDBOX_COMPOSE.subject,
          body: SANDBOX_COMPOSE.body,
          tone: SANDBOX_COMPOSE.tone,
        },
        sources: [{ id: 'demo-compose-1', title: 'BEPS sync Feb 12, 2026 — minutes', type: 'meeting' }],
        meta: { sandbox: true, kind },
      })
    }

    const orgCtx = await getOrgContext(userId, orgId)
    if (!orgCtx || !hasOrgPermission(orgCtx, 'org.read')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    if (kind === 'email-reply') {
      return handleEmailReply({ userId, orgId, body })
    }
    if (kind === 'broadcast') {
      return handleBroadcast({ userId, orgId, body })
    }
    return NextResponse.json({ error: 'unknown kind' }, { status: 400 })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

async function handleEmailReply(opts: { userId: string; orgId: string; body: any }) {
  const { userId, orgId, body } = opts
  const thread = typeof body.thread === 'string' ? body.thread.trim() : ''
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : ''
  if (thread.length < 20) {
    return NextResponse.json({ error: 'thread must be at least 20 chars' }, { status: 400 })
  }

  // Find related memories via FTS on the thread text
  const links = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
    .from(schema.workspaceOrgLinks)
    .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
  const allWs = Array.from(new Set(links.map((l) => l.workspaceId)))
  const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)

  const ftsIds = accessibleWs.length > 0 ? searchFTS(thread, accessibleWs, 40) : []
  let related: (typeof schema.records.$inferSelect)[] = []
  if (ftsIds.length > 0) {
    const raw = await db.select().from(schema.records).where(inArray(schema.records.id, ftsIds))
    const ctx = await buildAccessContext(userId)
    const allowed = await filterToAccessibleRecords(ctx, raw.map((r) => r.id))
    const rank = new Map(ftsIds.map((id, i) => [id, i]))
    related = raw.filter((r) => allowed.has(r.id))
      .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
      .slice(0, 8)
  }

  const memoriesBlock = related.map((r, i) =>
    `[M${i + 1}] ${r.type.toUpperCase()} · ${r.title}${r.summary ? `\n    ${r.summary.slice(0, 240)}` : ''}`
  ).join('\n')

  const prompt = `You are drafting a REPLY to the email thread below. Use the memory context to stay factually grounded — do not invent people, dates, or commitments that aren't there.

EMAIL THREAD:
---
${thread}
---

${instruction ? `INSTRUCTION: ${instruction}\n\n` : ''}RELEVANT MEMORY CONTEXT:
${memoriesBlock || '(none found)'}

Rules:
- Write the reply in the same tone and style as the thread. Match formality.
- Start with a greeting appropriate to the thread.
- Cite sources parenthetically like "(from our decision log on Nov 4)" — do NOT use [M#] citations in the actual reply. Citations are for humans, not for copy-paste.
- Keep it concise — no bigger than the original message unless the question demands detail.
- End with a plain signoff ("Best,") — leave the name blank for the user to fill.
- Output ONLY the reply text. No preamble, no commentary, no markdown headers.`

  let draft = ''
  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Claude not configured')
    const llm = getAskLLM()
    draft = await llm.generateText(prompt, 1200)
  } catch (err) {
    console.warn('[compose email]', err)
    return NextResponse.json({ error: 'Draft generation failed' }, { status: 502 })
  }

  return NextResponse.json({
    draft,
    sources: related.slice(0, 5).map((r) => ({ id: r.id, title: r.title, type: r.type })),
    meta: { memoriesScanned: related.length },
  })
}

async function handleBroadcast(opts: { userId: string; orgId: string; body: any }) {
  const { userId, orgId, body } = opts
  const decisionId = typeof body.decisionId === 'string' ? body.decisionId : ''
  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  const medium = body.medium === 'email' ? 'email' : 'slack'

  if (!decisionId && !topic) {
    return NextResponse.json({ error: 'decisionId or topic required' }, { status: 400 })
  }

  let decision: (typeof schema.decisions.$inferSelect) | null = null
  let related: (typeof schema.records.$inferSelect)[] = []

  if (decisionId) {
    const row = await db.query.decisions.findFirst({
      where: and(
        eq(schema.decisions.id, decisionId),
        eq(schema.decisions.organizationId, orgId),
      ),
    })
    if (!row) return NextResponse.json({ error: 'decision not found' }, { status: 404 })
    decision = row

    // Linked record + context
    if (row.recordId) {
      const rec = await db.query.records.findFirst({ where: eq(schema.records.id, row.recordId) })
      if (rec) related.push(rec)
    }
  } else if (topic) {
    // FTS on the topic
    const links = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const allWs = Array.from(new Set(links.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)
    const ftsIds = accessibleWs.length > 0 ? searchFTS(topic, accessibleWs, 20) : []
    if (ftsIds.length > 0) {
      const raw = await db.select().from(schema.records).where(inArray(schema.records.id, ftsIds))
      const ctx = await buildAccessContext(userId)
      const allowed = await filterToAccessibleRecords(ctx, raw.map((r) => r.id))
      related = raw.filter((r) => allowed.has(r.id)).slice(0, 5)
    }
  }

  const decisionBlock = decision
    ? `DECISION: ${decision.title}\n${decision.rationale ? `Rationale: ${decision.rationale}\n` : ''}${decision.context ? `Context: ${decision.context}\n` : ''}Decided: ${new Date(decision.decidedAt).toLocaleDateString()}\nStatus: ${decision.status}`
    : `TOPIC: ${topic}`

  const memoriesBlock = related.map((r, i) =>
    `[M${i + 1}] ${r.title}${r.summary ? ` — ${r.summary.slice(0, 160)}` : ''}`
  ).join('\n')

  const prompt = `You are drafting an INTERNAL ANNOUNCEMENT for the team about the subject below.

${decisionBlock}

SUPPORTING MEMORY CONTEXT:
${memoriesBlock || '(none)'}

Write two versions:
1. A SLACK version — short, 2-4 sentences, uses bold for the key ask, ends with a light call-to-action or question
2. An EMAIL version — longer, structured (short opening / context / what changes / what to do next), ends with a signoff placeholder "Best,"

${medium === 'email' ? 'Put EMAIL first.' : 'Put SLACK first.'}

Output format — plain text with exactly these two separators, nothing else:

--- SLACK ---
<text>

--- EMAIL ---
<text>

No preamble, no commentary.`

  let draft = ''
  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Claude not configured')
    const llm = getAskLLM()
    draft = await llm.generateText(prompt, 1500)
  } catch (err) {
    console.warn('[compose broadcast]', err)
    return NextResponse.json({ error: 'Draft generation failed' }, { status: 502 })
  }

  // Split into the two versions if present
  const slackMatch = draft.match(/---\s*SLACK\s*---\s*([\s\S]*?)(?=---\s*EMAIL\s*---|$)/i)
  const emailMatch = draft.match(/---\s*EMAIL\s*---\s*([\s\S]*)$/i)
  const versions = {
    slack: slackMatch ? slackMatch[1].trim() : '',
    email: emailMatch ? emailMatch[1].trim() : '',
  }
  if (!versions.slack && !versions.email) {
    versions.slack = draft.trim()
  }

  return NextResponse.json({
    versions,
    subject: decision?.title || topic,
    meta: { memoriesScanned: related.length, decisionId: decision?.id ?? null },
  })
}
