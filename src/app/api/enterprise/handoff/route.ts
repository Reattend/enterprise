import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'
import { enqueueJob } from '@/lib/jobs/worker'
import { isSandboxEmail } from '@/lib/sandbox/detect'
import { SANDBOX_HANDOFF_DOC } from '@/lib/sandbox/fixtures'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/handoff
// Body: { orgId, fromUserId, toUserId, scope?: string }
//
// Pulls the outgoing person's memory footprint (authored records, decisions
// made, top entities, policies touched) and asks Claude to write a
// personalized handoff doc for the incoming person. Saves the result as a
// memory so it's searchable and lives in the org's knowledge graph.
//
// Unlike Exit Interview Agent (which asks the person questions), Handoff
// Generator is one-click — it synthesizes from what's already captured. Use
// it when the departing person has left, can't be reached, or you just need
// a fast overview.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId, fromUserId, toUserId, scope } = body as {
      orgId?: string
      fromUserId?: string
      toUserId?: string
      scope?: string
    }
    if (!orgId || !fromUserId || !toUserId) {
      return NextResponse.json({ error: 'orgId + fromUserId + toUserId required' }, { status: 400 })
    }
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    // Sandbox: return the pre-built handoff markdown.
    if (isSandboxEmail(auth.userEmail)) {
      return NextResponse.json({
        markdown: SANDBOX_HANDOFF_DOC,
        record: null,
        meta: { sandbox: true, fromUserId, toUserId, scope: scope || 'full' },
      })
    }

    // Validate both users are in the org
    const memberships = await db.select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, orgId),
        inArray(schema.organizationMembers.userId, [fromUserId, toUserId]),
      ))
    if (memberships.length < 2) {
      return NextResponse.json({ error: 'both users must be in the org' }, { status: 400 })
    }

    // User rows for display names in prompt
    const users = await db.select()
      .from(schema.users)
      .where(inArray(schema.users.id, [fromUserId, toUserId]))
    const fromUser = users.find((u) => u.id === fromUserId)
    const toUser = users.find((u) => u.id === toUserId)
    const fromName = fromUser?.name || fromUser?.email || 'the outgoing person'
    const toName = toUser?.name || toUser?.email || 'the successor'

    // ── Pull footprint ──
    const authored = await db.select()
      .from(schema.records)
      .where(eq(schema.records.createdBy, fromUserId))
      .orderBy(desc(schema.records.createdAt))
      .limit(30)

    const decisions = await db.select()
      .from(schema.decisions)
      .where(and(
        eq(schema.decisions.organizationId, orgId),
        eq(schema.decisions.decidedByUserId, fromUserId),
      ))
      .orderBy(desc(schema.decisions.decidedAt))
      .limit(15)

    // ── Compose prompt ──
    const authoredBlock = authored.length > 0
      ? authored.map((r, i) => `[M${i + 1}] ${r.type.toUpperCase()} · ${r.title}${r.summary ? `\n    ${r.summary.slice(0, 200)}` : ''}`).join('\n')
      : 'No authored memories on file.'

    const decisionsBlock = decisions.length > 0
      ? decisions.map((d, i) => `[D${i + 1}] ${d.title}${d.rationale ? ` — ${d.rationale.slice(0, 200)}` : ''}${d.status !== 'active' ? ` (${d.status})` : ''}`).join('\n')
      : 'No decisions on file.'

    const prompt = `Write a PERSONALIZED HANDOFF DOCUMENT. ${fromName} is leaving; ${toName} is taking over${scope ? ` ${scope}` : ''}. The successor should be able to read this and get productive in 30 minutes on day one.

${fromName}'S AUTHORED MEMORIES:
${authoredBlock}

${fromName}'S DECISIONS:
${decisionsBlock}

Write the handoff with these H2 sections:
1. ## What you're inheriting — 2-3 sentences, then the 3 most important things to know
2. ## Key active decisions — bullet the top 5, with cite [D#] and one sentence on what it means
3. ## Projects & work in flight — bullet, name concretely, cite [M#]
4. ## People you'll interact with — inferred from the memories (don't invent)
5. ## Watch-outs — reversed/superseded decisions that might be tried again, known risks from memory content
6. ## Where to go next — which memories to open first (list 5 with [M#] citations)

Rules:
- Cite from the memory list using [M#] and [D#]. Every concrete claim needs a citation.
- Don't invent people or projects not in the footprint.
- Tone: direct, warm, practical. Not corporate.
- No preamble. Start with "## What you're inheriting".`

    let handoffDoc = ''
    try {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('Claude not configured')
      const llm = getAskLLM()
      handoffDoc = await llm.generateText(prompt, 4000)
    } catch (err) {
      console.warn('[handoff] synth failed', err)
      handoffDoc = `## What you're inheriting\n\nClaude synthesis unavailable. Raw footprint below.\n\n### Authored memories\n${authoredBlock}\n\n### Decisions\n${decisionsBlock}`
    }

    // ── Save as a memory ──
    const recordId = crypto.randomUUID()
    const linkRow = await db.select()
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
      .limit(1)
    const ws = linkRow[0]?.workspaceId
    if (ws) {
      await db.insert(schema.records).values({
        id: recordId,
        workspaceId: ws,
        type: 'context',
        title: `Handoff · ${fromName} → ${toName}${scope ? ` (${scope})` : ''}`,
        summary: `Personalized handoff doc generated from ${fromName}'s memory footprint — ${authored.length} memories, ${decisions.length} decisions. Intended for ${toName}.`,
        content: handoffDoc,
        confidence: 0.85,
        tags: JSON.stringify(['handoff', 'role-transfer', scope || 'general']),
        triageStatus: 'auto_accepted',
        createdBy: auth.userId,
        source: 'handoff-generator',
        visibility: 'org',
        meta: JSON.stringify({ fromUserId, toUserId, scope: scope || null }),
      })
      await enqueueJob(ws, 'ingest', { recordId, content: handoffDoc })
    }

    auditFromAuth(auth, 'create', {
      resourceType: 'handoff_doc',
      resourceId: recordId,
      metadata: { fromUserId, toUserId, scope: scope || null },
    })

    return NextResponse.json({
      ok: true,
      recordId: ws ? recordId : null,
      handoffDoc,
      footprint: {
        authoredCount: authored.length,
        decisionCount: decisions.length,
      },
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
