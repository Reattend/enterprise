import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, or, inArray, like } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/decisions/[decisionId]/blast-radius
//
// "If we reverse this decision, what else is affected?" — one of the hardest
// questions for any exec to answer. We surface the data that would otherwise
// sit across six tools: which memories cite it, which policies reference it,
// which other decisions supersede or depend on it, which departments own
// related work, which roles hold institutional knowledge about it.
//
// Returns:
//   - direct: memories explicitly linked (record_links) + policies whose
//     text mentions this decision's title
//   - chain: decisions that supersede or are superseded by this one
//   - people: who decided it, who's affected (creators of linked records)
//   - departments: dept rollup of linked records
//   - implicit: Claude-suggested downstream effects in plain English (optional)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> },
) {
  try {
    const { userId } = await requireAuth()
    const { decisionId } = await params

    const [decision] = await db.select().from(schema.decisions).where(eq(schema.decisions.id, decisionId)).limit(1)
    if (!decision) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, decision.organizationId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // ── 1. Direct: linked memories via record_links ───────
    // A decision has a recordId; use that as the anchor for record_links.
    let linkedRecords: Array<{ id: string; title: string; type: string; kind: string }> = []
    if (decision.recordId) {
      const outbound = await db.select({
        id: schema.recordLinks.id,
        fromRecordId: schema.recordLinks.fromRecordId,
        toRecordId: schema.recordLinks.toRecordId,
        kind: schema.recordLinks.kind,
      }).from(schema.recordLinks)
        .where(or(
          eq(schema.recordLinks.fromRecordId, decision.recordId),
          eq(schema.recordLinks.toRecordId, decision.recordId),
        ))
      const otherIds = Array.from(new Set(outbound.flatMap((l) => [
        l.fromRecordId === decision.recordId ? l.toRecordId : l.fromRecordId,
      ])))
      if (otherIds.length) {
        const recs = await db.select({
          id: schema.records.id,
          title: schema.records.title,
          type: schema.records.type,
        }).from(schema.records).where(inArray(schema.records.id, otherIds))
        const kindById = new Map(outbound.map((l) => [
          l.fromRecordId === decision.recordId ? l.toRecordId : l.fromRecordId,
          l.kind,
        ]))
        linkedRecords = recs.map((r) => ({ ...r, kind: kindById.get(r.id) || 'related' }))
      }
    }

    // ── 2. Policies whose text mentions this decision ──────
    // Rough match: policy body contains decision's title keywords. False
    // positives are acceptable here — the UI labels them "mentions" not "depends on".
    const decisionKeywords = decision.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 5)
      .slice(0, 3)
    let referencingPolicies: Array<{ id: string; title: string; category: string | null; matchedTerms: string[] }> = []
    if (decisionKeywords.length > 0) {
      const versions = await db.select({
        id: schema.policyVersions.id,
        policyId: schema.policyVersions.policyId,
        title: schema.policyVersions.title,
        body: schema.policyVersions.body,
      }).from(schema.policyVersions)
        .innerJoin(schema.policies, eq(schema.policies.currentVersionId, schema.policyVersions.id))
        .where(and(
          eq(schema.policies.organizationId, decision.organizationId),
          eq(schema.policies.status, 'published'),
          or(...decisionKeywords.map((kw) => like(schema.policyVersions.body, `%${kw}%`))),
        ))
      const policyIds = versions.map((v) => v.policyId)
      if (policyIds.length) {
        const polRows = await db.select({
          id: schema.policies.id,
          title: schema.policies.title,
          category: schema.policies.category,
        }).from(schema.policies).where(inArray(schema.policies.id, policyIds))
        const matchedByPolicy = new Map<string, string[]>()
        for (const v of versions) {
          const matched = decisionKeywords.filter((kw) => (v.body || '').toLowerCase().includes(kw))
          matchedByPolicy.set(v.policyId, matched)
        }
        referencingPolicies = polRows.map((p) => ({
          ...p,
          matchedTerms: matchedByPolicy.get(p.id) || [],
        }))
      }
    }

    // ── 3. Chain: supersession + reversal relatives ───────
    // Decisions that THIS one superseded (older ones it replaced).
    const predecessors = decision.supersededById
      ? []
      : await db.select({
          id: schema.decisions.id,
          title: schema.decisions.title,
          status: schema.decisions.status,
          decidedAt: schema.decisions.decidedAt,
        }).from(schema.decisions)
          .where(and(
            eq(schema.decisions.organizationId, decision.organizationId),
            eq(schema.decisions.supersededById, decision.id),
          ))

    // Decisions that superseded THIS one (the thing it got replaced by, if any).
    let successors: typeof predecessors = []
    if (decision.supersededById) {
      const [row] = await db.select({
        id: schema.decisions.id,
        title: schema.decisions.title,
        status: schema.decisions.status,
        decidedAt: schema.decisions.decidedAt,
      }).from(schema.decisions)
        .where(eq(schema.decisions.id, decision.supersededById))
        .limit(1)
      if (row) successors = [row]
    }

    // ── 4. People: deciders + linked-record authors ──────
    const peopleIds = new Set<string>()
    if (decision.decidedByUserId) peopleIds.add(decision.decidedByUserId)
    if (decision.reversedByUserId) peopleIds.add(decision.reversedByUserId)
    if (decision.recordId && linkedRecords.length) {
      const authorRows = await db.select({ createdBy: schema.records.createdBy })
        .from(schema.records)
        .where(inArray(schema.records.id, linkedRecords.map((r) => r.id)))
      authorRows.forEach((r) => peopleIds.add(r.createdBy))
    }
    const peopleRows = peopleIds.size ? await db.select({
      id: schema.users.id, name: schema.users.name, email: schema.users.email,
    }).from(schema.users).where(inArray(schema.users.id, Array.from(peopleIds))) : []

    // ── 5. Claude's 2-3 sentence "if reversed…" narrative ──
    let implicit: string | null = null
    if (process.env.ANTHROPIC_API_KEY && (linkedRecords.length > 0 || referencingPolicies.length > 0)) {
      try {
        const llm = getAskLLM()
        const prompt = `A decision titled "${decision.title}" is about to be reversed. Below is the known blast radius. Write 2-3 sentences describing, in concrete terms, what would break or need re-doing. Cite the linked item types, not details you don't know.

Rules:
- No speculation beyond the data. If blast is small, say so.
- Be specific: "The hybrid-work policy (section 2) cites this." not "policies may be affected."
- Plain prose. No bullets, no headers.

Decision rationale: ${decision.rationale || '(none captured)'}
Decision context: ${decision.context || '(none captured)'}

Linked memories (${linkedRecords.length}):
${linkedRecords.slice(0, 8).map((r) => `- ${r.type}: ${r.title} (${r.kind})`).join('\n') || '(none)'}

Referencing policies (${referencingPolicies.length}):
${referencingPolicies.slice(0, 5).map((p) => `- ${p.title}${p.category ? ` [${p.category}]` : ''}`).join('\n') || '(none)'}

Predecessor decisions (this would un-replace): ${predecessors.length}
Successor decisions (this was replaced by): ${successors.length}

Write the impact summary now:`
        implicit = (await llm.generateText(prompt, 400)).trim()
      } catch (err) {
        console.warn('[blast-radius] narrative failed', err)
      }
    }

    return NextResponse.json({
      decision: {
        id: decision.id,
        title: decision.title,
        status: decision.status,
        decidedAt: decision.decidedAt,
        supersededById: decision.supersededById,
        reversedAt: decision.reversedAt,
      },
      linkedRecords,
      referencingPolicies,
      predecessors,
      successors,
      people: peopleRows,
      implicit,
      counts: {
        memories: linkedRecords.length,
        policies: referencingPolicies.length,
        predecessors: predecessors.length,
        successors: successors.length,
        people: peopleRows.length,
      },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
