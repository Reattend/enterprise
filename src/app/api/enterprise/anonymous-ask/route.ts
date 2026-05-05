import { NextRequest, NextResponse } from 'next/server'
import { db, schema, searchFTS } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  buildAccessContext,
  filterToAccessibleRecords,
  filterToAccessibleWorkspaces,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/anonymous-ask
// Body: { orgId, question }
//
// Anonymous HR-style question flow:
//   - RBAC still applies (you only see what you could already see) because
//     retrieval needs a userId to know the accessibility set. We never
//     surface org data the caller couldn't otherwise access.
//   - BUT we strip the asker identity from the audit trail. The audit entry
//     has no userId and no IP; the admin sees "anonymous_query: <question>"
//     without attribution.
//   - We never persist to /api/chats, so the thread doesn't survive.
//   - We never set X-Trace / X-Sources headers (they'd leak user-specific
//     retrieval context that could fingerprint the asker).
//
// Intended use: sensitive HR / compliance questions where the answer is
// non-sensitive (a policy lookup) but the fact of asking is. Not for
// workflows requiring follow-up; those should use Ask.

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json()
    const { orgId, question } = body as { orgId?: string; question?: string }
    if (!orgId || !question || question.trim().length < 5) {
      return NextResponse.json({ error: 'orgId + question (min 5 chars) required' }, { status: 400 })
    }

    // Validate org membership. We return 403 rather than silent success so the
    // client knows if the user isn't in this org.
    const memb = await db.query.organizationMembers.findFirst({
      where: and(
        eq(schema.organizationMembers.organizationId, orgId),
        eq(schema.organizationMembers.userId, userId),
      ),
    })
    if (!memb) return NextResponse.json({ error: 'not in org' }, { status: 403 })

    // Audit as anonymous — no userId, no IP, no userAgent
    try {
      await db.insert(schema.auditLog).values({
        organizationId: orgId,
        userId: null,
        userEmail: 'anonymous',
        action: 'query',
        resourceType: 'anonymous_ask',
        resourceId: null,
        ipAddress: null,
        userAgent: null,
        metadata: JSON.stringify({ question: question.slice(0, 500), anonymous: true }),
      })
    } catch (err) {
      console.warn('[anonymous-ask] audit failed', err)
    }

    // Accessible workspace filter (RBAC preserved)
    const wsLinkRows = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const allWs = Array.from(new Set(wsLinkRows.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)
    if (accessibleWs.length === 0) {
      return new Response('No accessible memory in this org.', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // FTS + RBAC filter
    const ftsIds = searchFTS(question, accessibleWs, 40)
    let recordsBlock = ''
    if (ftsIds.length > 0) {
      const rows = await db.select().from(schema.records).where(inArray(schema.records.id, ftsIds))
      const ctx = await buildAccessContext(userId)
      const allowed = await filterToAccessibleRecords(ctx, rows.map((r) => r.id))
      const top = rows.filter((r) => allowed.has(r.id)).slice(0, 10)
      recordsBlock = top.map((r, i) =>
        `[${i + 1}] ${r.type.toUpperCase()} · ${r.title}${r.summary ? `\n    ${r.summary.slice(0, 240)}` : ''}${r.content ? `\n    ${r.content.slice(0, 400)}` : ''}`
      ).join('\n\n')
    }

    // Single Claude call. No history. Text response.
    const prompt = `You are answering an ANONYMOUS question from an employee. They chose anonymity because the topic is sensitive (HR / compliance / reporting). Your job: answer factually and warmly. Do not reveal or reference the asker. Do not speculate about who asked.

QUESTION: ${question}

RELEVANT POLICIES / MEMORIES the asker is entitled to see:
${recordsBlock || '(no directly-related material on file)'}

Rules:
- Answer in 3-6 sentences. No preamble.
- If the question is about a policy and you found it, quote the relevant clause briefly and cite "per the [policy title]".
- If you can't answer from policy, say plainly: "Your org hasn't documented this. Here's what I'd suggest based on common practice: ..." — offer 1-2 concrete next steps.
- For reporting-type questions (harassment, discrimination, safety), always end with "Your HR / ombuds channel can be reached confidentially" even if that path isn't in memory.
- Tone: calm, practical, empathetic. No legal disclaimers.`

    const llm = getAskLLM()
    const answer = await llm.generateText(prompt, 900)

    // Plain-text response. No X-Trace, no X-Sources — those would fingerprint.
    return new Response(answer, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
