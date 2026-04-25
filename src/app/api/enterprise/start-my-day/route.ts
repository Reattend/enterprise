import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, gte, inArray, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  filterToAccessibleWorkspaces,
  buildAccessContext,
  filterToAccessibleRecords,
  pendingPoliciesForUser,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'
import { isSandboxEmail } from '@/lib/sandbox/detect'
import { SANDBOX_START_MY_DAY } from '@/lib/sandbox/fixtures'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/start-my-day?orgId=...&since=<ISO>
//
// The morning briefing. Looks at everything in the user's scope since the
// given timestamp (defaults to 24h ago) and produces:
//   - counts: new memories / decisions / transfers / pending acks
//   - a Claude-synthesized 3-line focus for today
//   - highlights: top-3 new items worth clicking
//
// Designed to be cached for ~1 hour per (user, org) pair at the UI — daily
// habit cards don't need live numbers.
export async function GET(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || ''
    const orgId = req.nextUrl.searchParams.get('orgId')
    const sinceParam = req.nextUrl.searchParams.get('since')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const sinceIso = sinceParam || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Sandbox: canned morning briefing. Same response shape as live.
    if (isSandboxEmail(userEmail)) {
      return NextResponse.json({
        since: sinceIso,
        user: { name: session?.user?.name || null, email: userEmail },
        counts: {
          newMemories: 7,
          newDecisions: 2,
          reversals: 0,
          supersessions: 1,
          pendingAcks: 1,
          incomingTransfers: 0,
        },
        focus: `${SANDBOX_START_MY_DAY.headline}\n\n${SANDBOX_START_MY_DAY.focus}`,
        highlights: {
          memories: [
            { id: 'sb-m1', title: 'Vendor X Secretary escalation — Apr 18', type: 'decision', summary: 'Priya re-escalated the data residency concern to Secretary level.', by: 'Priya Iyer', createdAt: new Date().toISOString() },
            { id: 'sb-m2', title: 'Data Residency Policy v1.2 flagged stale', type: 'insight', summary: 'Self-healing flagged this policy — last verified 14 months ago.', by: 'Self-Healing', createdAt: new Date().toISOString() },
            { id: 'sb-m3', title: 'BEPS reservation clock — 23 days to go', type: 'note', summary: 'Apr 14, 2026 review deadline approaching.', by: 'System', createdAt: new Date().toISOString() },
          ],
          decisions: [],
          pendingPolicies: [{ id: 'sb-p1', title: 'GDPR Data Subject Rights Policy v1.3', category: 'Compliance' }],
        },
        meta: { sandbox: true },
      })
    }

    // ── Workspaces in scope ───────────────────────────────
    const wsLinkRows = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const allWs = Array.from(new Set(wsLinkRows.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)

    const [user] = await db.select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    const [org] = await db.select({ name: schema.organizations.name })
      .from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1)

    // ── New memories since ─────────────────────────────────
    let newRecords: Array<{ id: string; title: string; type: string; summary: string | null; createdBy: string; createdAt: string }> = []
    if (accessibleWs.length) {
      const rows = await db.select({
        id: schema.records.id,
        title: schema.records.title,
        type: schema.records.type,
        summary: schema.records.summary,
        createdBy: schema.records.createdBy,
        createdAt: schema.records.createdAt,
      }).from(schema.records)
        .where(and(
          inArray(schema.records.workspaceId, accessibleWs),
          gte(schema.records.createdAt, sinceIso),
        ))
        .orderBy(desc(schema.records.createdAt))
        .limit(50)
      // RBAC pass — some depts might be restricted
      const ctx = await buildAccessContext(userId)
      const allowed = await filterToAccessibleRecords(ctx, rows.map((r) => r.id))
      newRecords = rows.filter((r) => allowed.has(r.id))
    }

    // ── New decisions since ────────────────────────────────
    const newDecisions = await db.select({
      id: schema.decisions.id,
      title: schema.decisions.title,
      status: schema.decisions.status,
      decidedByUserId: schema.decisions.decidedByUserId,
      decidedAt: schema.decisions.decidedAt,
    }).from(schema.decisions)
      .where(and(
        eq(schema.decisions.organizationId, orgId),
        gte(schema.decisions.createdAt, sinceIso),
      ))
      .orderBy(desc(schema.decisions.decidedAt))
      .limit(20)

    // Reversals/supersessions specifically — the highest-signal event type
    const reversals = newDecisions.filter((d) => d.status === 'reversed')
    const supersessions = newDecisions.filter((d) => d.status === 'superseded')

    // ── Pending policy acks (user-specific) ────────────────
    const pendingPolicies = await pendingPoliciesForUser({ userId, organizationId: orgId })

    // ── Transfers affecting this user ──────────────────────
    const incomingTransfers = await db.select()
      .from(schema.transferEvents)
      .where(and(
        eq(schema.transferEvents.organizationId, orgId),
        eq(schema.transferEvents.toUserId, userId),
        gte(schema.transferEvents.createdAt, sinceIso),
      ))

    // ── Hydrate creators for attribution in the briefing ──
    const creatorIds = Array.from(new Set([
      ...newRecords.map((r) => r.createdBy),
      ...newDecisions.map((d) => d.decidedByUserId).filter((x): x is string => !!x),
    ]))
    const creatorRows = creatorIds.length
      ? await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
          .from(schema.users).where(inArray(schema.users.id, creatorIds))
      : []
    const creatorById = new Map(creatorRows.map((u) => [u.id, u]))

    // ── Claude synthesizes the one-paragraph focus ─────────
    let focus: string | null = null
    const hasSomething =
      newRecords.length + newDecisions.length + pendingPolicies.length + incomingTransfers.length > 0

    if (hasSomething && process.env.ANTHROPIC_API_KEY) {
      try {
        const llm = getAskLLM()
        const firstName = (user?.name || user?.email || 'there').split(' ')[0]
        const highlights = newRecords.slice(0, 6).map((r, i) => {
          const by = creatorById.get(r.createdBy)
          return `[r${i + 1}] ${r.type}: ${r.title}${by ? ` (by ${by.name || by.email})` : ''}${r.summary ? ` — ${r.summary.slice(0, 150)}` : ''}`
        }).join('\n')
        const decisionLines = newDecisions.slice(0, 5).map((d, i) => {
          const by = d.decidedByUserId ? creatorById.get(d.decidedByUserId) : null
          return `[d${i + 1}] ${d.title} (${d.status}${by ? `, by ${by.name || by.email}` : ''})`
        }).join('\n')
        const policyLines = pendingPolicies.slice(0, 5).map((p, i) => `[p${i + 1}] ${p.title}${p.category ? ` (${p.category})` : ''}`).join('\n')

        const prompt = `You are writing a 3-4 sentence morning briefing for ${firstName} at ${org?.name || 'their organization'}.

What's happened in their scope since ${new Date(sinceIso).toLocaleString()}:

NEW MEMORIES (${newRecords.length}):
${highlights || '(none)'}

NEW DECISIONS (${newDecisions.length}):
${decisionLines || '(none)'}

PENDING ACKS (${pendingPolicies.length}):
${policyLines || '(none)'}

Transfers to them: ${incomingTransfers.length}
Reversals: ${reversals.length}, Supersessions: ${supersessions.length}

Rules:
- Open with "${firstName}, " — not "Hi".
- 3-4 sentences max. No bullets, no headers. Tight prose.
- Surface the highest-stakes item first (reversals > decisions > policy acks > memories).
- If something needs the reader's action (ack a policy, review a transfer), say so with specific ask.
- If the day is quiet, say so honestly — "Quiet morning. One new memory on X."
- Do NOT use the word "today" more than once.

Briefing:`
        focus = (await llm.generateText(prompt, 300)).trim()
      } catch (err) {
        console.warn('[start-my-day] focus generation failed', err)
      }
    }

    return NextResponse.json({
      since: sinceIso,
      user: { name: user?.name || null, email: user?.email || '' },
      counts: {
        newMemories: newRecords.length,
        newDecisions: newDecisions.length,
        reversals: reversals.length,
        supersessions: supersessions.length,
        pendingAcks: pendingPolicies.length,
        incomingTransfers: incomingTransfers.length,
      },
      focus,
      highlights: {
        memories: newRecords.slice(0, 5).map((r) => ({
          id: r.id, title: r.title, type: r.type, summary: r.summary,
          by: creatorById.get(r.createdBy)?.name || null,
          createdAt: r.createdAt,
        })),
        decisions: newDecisions.slice(0, 5).map((d) => ({
          id: d.id, title: d.title, status: d.status,
          by: d.decidedByUserId ? (creatorById.get(d.decidedByUserId)?.name || null) : null,
          decidedAt: d.decidedAt,
        })),
        pendingPolicies: pendingPolicies.slice(0, 5),
      },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
