import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { runTriageAgent } from '@/lib/ai/agents'
import { resolveLLMForWorkspace, NoAIConfiguredError } from '@/lib/ai/byok'
import { processAllPendingJobs } from '@/lib/jobs/worker'
import { resolveTargetWorkspace } from '@/lib/enterprise/workspace-resolver'

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireAuth()
    const params = req.nextUrl.searchParams
    const status = params.get('status') // 'new' | 'triaged' | 'ignored' | null (all)
    const sourceKind = params.get('sourceKind') // 'email', 'manual', etc.
    const limit = parseInt(params.get('limit') || '50')
    const offset = parseInt(params.get('offset') || '0')

    // If filtering by source kind, look up matching source IDs
    let sourceIds: string[] | undefined
    if (sourceKind) {
      const matchingSources = await db.query.sources.findMany({
        where: and(
          eq(schema.sources.workspaceId, workspaceId),
          eq(schema.sources.kind, sourceKind as any),
        ),
      })
      sourceIds = matchingSources.map(s => s.id)
      // If no sources match, return empty
      if (sourceIds.length === 0) {
        return NextResponse.json({ items: [], total: 0 })
      }
    }

    const conditions = [eq(schema.rawItems.workspaceId, workspaceId)]
    if (status) conditions.push(eq(schema.rawItems.status, status as any))
    if (sourceIds) conditions.push(inArray(schema.rawItems.sourceId, sourceIds))

    const items = await db.query.rawItems.findMany({
      where: and(...conditions),
      orderBy: desc(schema.rawItems.createdAt),
      limit,
      offset,
    })

    // Enrich items with source info
    const sourceIdSet = Array.from(new Set(items.filter(i => i.sourceId).map(i => i.sourceId!)))
    let sourcesMap: Record<string, { kind: string; label: string }> = {}
    if (sourceIdSet.length > 0) {
      const foundSources = await db.query.sources.findMany({
        where: inArray(schema.sources.id, sourceIdSet),
      })
      sourcesMap = Object.fromEntries(foundSources.map(s => [s.id, { kind: s.kind, label: s.label }]))
    }

    const enrichedItems = items.map(item => ({
      ...item,
      source: item.sourceId ? sourcesMap[item.sourceId] || null : null,
    }))

    return NextResponse.json({ items: enrichedItems, total: enrichedItems.length })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    const { userId } = auth
    const { text, sourceId, externalId, author, occurredAt, metadata, orgId, workspaceId: requestedWorkspaceId } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // Resolve the right workspace - same trap as /api/records, /api/upload,
    // and brain-dump: without this, a capture made while the user is in an
    // org context silently lands in their personal workspace instead, which
    // is invisible to every org-scoped read path (Memories, Board, Rewind,
    // wiki, admin). See workspace-resolver.ts for the full trap writeup.
    const resolved = await resolveTargetWorkspace({
      userId,
      requestedWorkspaceId,
      orgId,
      fallbackWorkspaceId: auth.workspaceId,
    })
    const workspaceId = resolved.workspaceId

    const id = crypto.randomUUID()
    await db.insert(schema.rawItems).values({
      id,
      workspaceId,
      sourceId: sourceId || null,
      externalId: externalId || null,
      author: author ? JSON.stringify(author) : null,
      occurredAt: occurredAt || new Date().toISOString(),
      text,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })

    // Queue triage job AND process it immediately. Without this last step,
    // the record only materializes on the next 30-min periodic worker tick,
    // so the user sees "Memory saved" but nothing in /app/memories until
    // half an hour later. brain-dump and tray/capture both run jobs inline
    // for the same reason.
    try {
      await db.insert(schema.jobQueue).values({
        workspaceId,
        type: 'triage',
        payload: JSON.stringify({ rawItemId: id }),
      })
    } catch (e) {
      console.error('Failed to queue triage job:', e)
    }

    // Best-effort inline processing. If it fails, the periodic worker will
    // retry - so we never leave the user in a worse state than before.
    try {
      await processAllPendingJobs()
    } catch (e) {
      console.error('Failed to process triage job inline:', e)
    }

    const item = await db.query.rawItems.findFirst({
      where: eq(schema.rawItems.id, id),
    })

    // Cheap, side-effect-free pre-check (no network call, just a BYOK/tier
    // lookup) so the client can tell the user their capture was saved as
    // plain text rather than staying silent about it - runTriageAgent
    // already handles the actual fallback (createUntriagedRecord in
    // agents.ts), this is purely for the response message.
    let aiConfigured = true
    try {
      await resolveLLMForWorkspace(workspaceId, 'simple')
    } catch (e) {
      if (e instanceof NoAIConfiguredError) aiConfigured = false
    }

    return NextResponse.json({ item, aiConfigured })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { workspaceId } = await requireAuth()
    const { id, status, projectId } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (!status || !['new', 'triaged', 'ignored'].includes(status)) {
      return NextResponse.json({ error: 'status must be "new", "triaged", or "ignored"' }, { status: 400 })
    }

    if (status === 'triaged') {
      // Run the triage agent to process the item, optionally with a target project
      const result = await runTriageAgent(id, workspaceId, projectId || undefined)

      // Find the created record so the frontend can link to it
      let record = null
      let projectName = null
      if (result.should_store) {
        const rec = await db.query.records.findFirst({
          where: and(
            eq(schema.records.rawItemId, id),
            eq(schema.records.workspaceId, workspaceId),
          ),
        })
        if (rec) {
          record = { id: rec.id, title: rec.title, type: rec.type }

          // Find assigned project name
          const pr = await db.query.projectRecords.findFirst({
            where: eq(schema.projectRecords.recordId, rec.id),
          })
          if (pr) {
            const proj = await db.query.projects.findFirst({
              where: eq(schema.projects.id, pr.projectId),
            })
            if (proj) projectName = proj.name
          }
        }
      }

      return NextResponse.json({ message: 'Item triaged', result, record, projectName })
    }

    // For 'ignored' or 'new' (restore) status, just update directly
    await db.update(schema.rawItems)
      .set({ status: status as any })
      .where(
        and(
          eq(schema.rawItems.id, id),
          eq(schema.rawItems.workspaceId, workspaceId),
        )
      )

    return NextResponse.json({ message: status === 'ignored' ? 'Item ignored' : 'Item restored' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
