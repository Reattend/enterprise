import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth'
import { getAskLLM } from '@/lib/ai/llm'
import { enqueueJob, processAllPendingJobs } from '@/lib/jobs/worker'
import { auditForAllUserOrgs, extractRequestMeta } from '@/lib/enterprise'
import { resolveTargetWorkspace } from '@/lib/enterprise/workspace-resolver'
import { findExactDuplicate, contentHash } from '@/lib/ai/ingestion'
import { isSandboxEmail } from '@/lib/sandbox/detect'
import { SANDBOX_BRAIN_DUMP } from '@/lib/sandbox/fixtures'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/brain-dump
// Body: { rawText: string, commit?: boolean }
//
// Two-phase flow:
//   1. commit=false (default): Claude parses the raw dump and returns a
//      preview of what it would extract — decisions, open questions, action
//      items, and plain memory fragments. No DB writes. The UI lets the
//      user deselect or edit items before committing.
//   2. commit=true with items[]: actually materializes the selected items
//      as records. Each one goes through the normal ingest pipeline.
//
// Why this pattern: brain dumps are high-volume, high-noise. A raw stream
// becomes many small memories. Auto-committing without review buries the
// triage signal. Preview-first lets the user keep only what matters.

interface DumpItem {
  kind: 'decision' | 'question' | 'action' | 'fact'
  title: string
  detail?: string | null
  // The span of the raw text this item came from — shown to the user so
  // they can spot-check that nothing was fabricated.
  sourceSpan?: string | null
}

interface Preview {
  items: DumpItem[]
  rejectedReason: string | null
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId: defaultWorkspaceId, userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'
    const body = await req.json()
    const {
      rawText, commit, items: commitItems,
      workspaceId: overrideWorkspaceId,
      projectId,
      orgId,        // Active enterprise org from the client store
      saveAsOne,    // Skip AI extraction; commit raw text as a single record
    } = body as {
      rawText?: string
      commit?: boolean
      items?: DumpItem[]
      workspaceId?: string
      projectId?: string
      orgId?: string
      saveAsOne?: boolean
    }

    // Sandbox: preview-only; commit path is a no-op that reports success.
    if (isSandboxEmail(userEmail)) {
      if (commit === true) {
        return NextResponse.json({
          committed: [],
          rejected: [],
          meta: { sandbox: true, message: 'Brain dump commit is a no-op in the sandbox — nothing persists.' },
        })
      }
      return NextResponse.json({
        preview: {
          items: SANDBOX_BRAIN_DUMP.items.map((i) => ({
            kind: i.kind,
            title: i.title,
            detail: i.summary,
            sourceSpan: null,
          })),
          rejectedReason: null,
        },
        meta: SANDBOX_BRAIN_DUMP.meta,
      })
    }

    if (commit === true) {
      // Resolve the workspace via the shared resolver — honors explicit
      // override, falls back to the active org's first team workspace,
      // then to personal. Same semantics as /api/records POST.
      const resolved = await resolveTargetWorkspace({
        userId,
        requestedWorkspaceId: overrideWorkspaceId,
        orgId,
        fallbackWorkspaceId: defaultWorkspaceId,
      })
      return handleCommit({ workspaceId: resolved.workspaceId, userId, userEmail, items: commitItems || [], projectId, req })
    }

    // saveAsOne short-circuit: skip the LLM extraction and return a single
    // synthetic item the client can commit verbatim. Lets users opt out of
    // the firehose split when they really mean "this whole text = one note".
    if (saveAsOne === true && rawText && rawText.trim().length > 0) {
      const text = rawText.trim()
      const title = text.split('\n').find((l) => l.trim().length > 0)?.slice(0, 80) || 'Captured note'
      return NextResponse.json({
        items: [{ kind: 'fact', title, detail: text, sourceSpan: null }],
        rejectedReason: null,
        savedAsOne: true,
      })
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json({
        error: 'rawText required (min 50 chars for a meaningful parse)',
      }, { status: 400 })
    }

    const preview = await parseWithClaude(rawText.trim())
    return NextResponse.json(preview)
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    console.error('[brain-dump]', err)
    return NextResponse.json({ error: (err as Error).message || 'failed' }, { status: 500 })
  }
}

async function parseWithClaude(raw: string): Promise<Preview> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { items: [], rejectedReason: 'Claude is not configured on this server.' }
  }
  const llm = getAskLLM()
  const prompt = `You are structuring a free-form brain dump into discrete, actionable items. The user's just spoken or typed everything in their head; your job is to extract the load-bearing parts.

Four item kinds:
- "decision": something that was DECIDED or needs to be. "We're going with X." or "Need to decide Y by Friday."
- "question": explicit open questions. "Do we still support SKU-32?" "Why is latency spiking?"
- "action": a specific action item — who needs to do what. "Partha to send the draft by Tue."
- "fact": a useful piece of context/observation that doesn't fit the above but IS worth remembering. "AWS bill is 34% up QoQ."

Rules:
- Output STRICT JSON: { "items": [{ "kind": "...", "title": "...", "detail": "...", "sourceSpan": "..." }] }
- No prose, no markdown, no preamble. Just the JSON object.
- Max 20 items. Quality over quantity — skip filler.
- Titles are 3-12 words, imperative or declarative. Not full sentences from the dump.
- "detail" is optional, adds the 1-2 sentences of context from the dump.
- "sourceSpan" is a short quoted-verbatim snippet (10-30 words) from the dump so the user can verify grounding. DO NOT invent content.
- If the dump is genuinely empty / pure noise, return { "items": [], "rejectedReason": "nothing actionable in this dump" }.

DUMP:
${raw}

JSON:`
  try {
    const raw2 = await llm.generateText(prompt, 2000)
    const match = raw2.match(/\{[\s\S]*\}/)
    if (!match) {
      return { items: [], rejectedReason: "Couldn't parse the dump — try rephrasing." }
    }
    const parsed = JSON.parse(match[0]) as Preview
    // Sanity-clean
    const items = (parsed.items || []).filter((it) =>
      it && typeof it.title === 'string' && it.title.length > 0 &&
      ['decision', 'question', 'action', 'fact'].includes(it.kind),
    ).slice(0, 20)
    return { items, rejectedReason: parsed.rejectedReason || null }
  } catch (err) {
    console.error('[brain-dump] parse failed', err)
    return { items: [], rejectedReason: 'Parse failed. Dump preserved — try again.' }
  }
}

async function handleCommit(opts: {
  workspaceId: string
  userId: string
  userEmail: string
  items: DumpItem[]
  projectId?: string
  req: NextRequest
}) {
  const { workspaceId, userId, items, projectId, req } = opts
  if (items.length === 0) {
    return NextResponse.json({ error: 'items required when commit=true' }, { status: 400 })
  }

  const kindToType: Record<DumpItem['kind'], string> = {
    decision: 'decision',
    question: 'context',
    action: 'tasklike',
    fact: 'context',
  }
  const kindToTag: Record<DumpItem['kind'], string> = {
    decision: 'decision',
    question: 'open-question',
    action: 'action-item',
    fact: 'observation',
  }

  const created: Array<{ id: string; title: string; kind: DumpItem['kind'] }> = []
  const skippedDupes: string[] = []

  for (const item of items) {
    const content = [item.title, item.detail, item.sourceSpan ? `\n— Source: "${item.sourceSpan}"` : '']
      .filter(Boolean).join('\n\n')
    const hash = contentHash(content)

    // Skip exact-duplicate content within this workspace.
    const dup = await findExactDuplicate(workspaceId, content)
    if (dup.hit) {
      skippedDupes.push(item.title)
      continue
    }

    const recordId = crypto.randomUUID()
    await db.insert(schema.records).values({
      id: recordId,
      workspaceId,
      type: kindToType[item.kind] as any,
      title: item.title,
      summary: item.detail?.slice(0, 200) || item.title.slice(0, 200),
      content,
      confidence: 0.6,
      tags: JSON.stringify([kindToTag[item.kind], 'brain-dump']),
      triageStatus: 'auto_accepted',
      createdBy: userId,
      source: 'brain-dump',
      meta: JSON.stringify({ contentHash: hash, brainDump: true, kind: item.kind, projectId: projectId || null }),
    })

    // Project linking (if specified). project_records table is a many-to-many
    // join between projects and records.
    if (projectId) {
      try {
        await db.insert(schema.projectRecords).values({
          projectId,
          recordId,
        })
      } catch (e) {
        console.warn('[brain-dump] project link failed', e)
      }
    }

    // Ingest job picks up the new record, embeds + links + further triage.
    await enqueueJob(workspaceId, 'ingest', { recordId, content })
    created.push({ id: recordId, title: item.title, kind: item.kind })
  }

  processAllPendingJobs().catch((e) => console.error('[brain-dump] worker kick failed:', e))

  const reqMeta = extractRequestMeta(req)
  auditForAllUserOrgs(opts.userId, opts.userEmail, 'create', {
    resourceType: 'brain_dump_batch',
    ipAddress: reqMeta.ipAddress,
    userAgent: reqMeta.userAgent,
    metadata: { createdCount: created.length, skippedDupes: skippedDupes.length },
  })

  return NextResponse.json({ created, skippedDupes })
}
