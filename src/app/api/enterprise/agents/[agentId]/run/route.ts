import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'
import { enqueueJob } from '@/lib/jobs/worker'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/agents/[agentId]/run
// Admin-triggered one-shot agent execution. The agent reads a recent slice
// of its scoped corpus and produces a digest-style output which we save as
// a new memory (type: 'context', tag: 'agent-run', createdBy: userId).
//
// This is the v1 "agent runtime." A scheduled worker that runs agents on a
// cadence lands post-launch; for now, admins click "Run now" on an agent
// card and the result appears as a memory they can link / share.

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await params
    const { userId } = await requireAuth()

    const agent = await db.query.agents.findFirst({ where: eq(schema.agents.id, agentId) })
    if (!agent) return NextResponse.json({ error: 'agent not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, agent.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'agents.manage')) {
      return NextResponse.json({ error: 'only admins can run agents' }, { status: 403 })
    }

    // Pick workspace — first one linked to the org
    const wsLink = await db.select().from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, agent.organizationId))
      .limit(1)
    const workspaceId = wsLink[0]?.workspaceId
    if (!workspaceId) {
      return NextResponse.json({ error: 'no workspace linked to org' }, { status: 400 })
    }

    // Scope: if the agent has scopeConfig.types, filter; else use all recent
    const scope = (() => {
      try {
        return agent.scopeConfig ? JSON.parse(agent.scopeConfig) : {}
      } catch { return {} }
    })() as { types?: string[]; tags?: string[] }

    let recentQuery = db.select()
      .from(schema.records)
      .where(eq(schema.records.workspaceId, workspaceId))
      .orderBy(desc(schema.records.createdAt))
      .limit(40)
    if (scope.types && Array.isArray(scope.types) && scope.types.length > 0) {
      recentQuery = db.select()
        .from(schema.records)
        .where(and(
          eq(schema.records.workspaceId, workspaceId),
          inArray(schema.records.type, scope.types as any[]),
        ))
        .orderBy(desc(schema.records.createdAt))
        .limit(40)
    }
    const recent = await recentQuery

    // Build corpus block + prompt
    const corpusBlock = recent.slice(0, 25).map((r, i) =>
      `[${i + 1}] ${r.type.toUpperCase()} · ${r.title}${r.summary ? `\n    ${r.summary.slice(0, 240)}` : ''}`
    ).join('\n')

    const prompt = `${agent.systemPrompt}

You have been asked to run a DIGEST OVER RECENT MEMORY. Below is a slice of the org's recent memory that falls in your scope.

${corpusBlock || '(empty corpus)'}

Produce a short, focused output (~200-400 words) appropriate to your role. If your scope has nothing new, say "No new activity in scope" and stop.`

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude not configured on server' }, { status: 503 })
    }
    const llm = getAskLLM()
    const output = await llm.generateText(prompt, 1500)

    // Save output as a new memory
    const recordId = crypto.randomUUID()
    await db.insert(schema.records).values({
      id: recordId,
      workspaceId,
      type: 'context',
      title: `${agent.name} — run ${new Date().toLocaleDateString()}`,
      summary: output.split('\n').find((l) => l.trim().length > 0)?.slice(0, 200) || `${agent.name} agent run`,
      content: output,
      confidence: 0.85,
      tags: JSON.stringify(['agent-run', agent.slug]),
      triageStatus: 'auto_accepted',
      createdBy: userId,
      source: `agent:${agent.slug}`,
      visibility: 'org',
      meta: JSON.stringify({ agentId, corpusSize: recent.length }),
    })

    // Enqueue ingest to embed + link
    await enqueueJob(workspaceId, 'ingest', { recordId, content: output })
      .catch((e) => console.warn('[agent-run] ingest enqueue failed', e))

    // Audit
    try {
      await db.insert(schema.auditLog).values({
        organizationId: agent.organizationId,
        userId,
        userEmail: '',
        action: 'admin_action',
        resourceType: 'agent_run',
        resourceId: agentId,
        metadata: JSON.stringify({ agentName: agent.name, recordId, corpusSize: recent.length }),
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({
      ok: true,
      recordId,
      output,
      corpusSize: recent.length,
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
