import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/admin/[orgId]/triage-review?limit=50
//
// Returns the most-recently ingested raw_items belonging to workspaces in
// this org, with the triage decision unpacked: was it promoted to a memory,
// rejected, or still pending. Admin-gated (org.audit.read) — this surface
// is meant for trust-and-verify of what the AI is doing on incoming data,
// not for end-user consumption.
export async function GET(req: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    const orgId = params.orgId
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 50), 200)

    const auth = await requireOrgAuth(req, orgId, 'org.audit.read')
    if (isAuthResponse(auth)) return auth

    // Workspaces the admin can audit: org-linked workspaces (multi-user) PLUS
    // workspaces the admin is a member of (catches solo / pre-link ingest like
    // a freshly-connected Gmail dumping into the admin's personal workspace).
    const orgLinks = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const ownMemberships = await db.select({ workspaceId: schema.workspaceMembers.workspaceId })
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.userId, auth.userId))
    const workspaceIds = Array.from(new Set([
      ...orgLinks.map((w) => w.workspaceId),
      ...ownMemberships.map((w) => w.workspaceId),
    ]))
    if (workspaceIds.length === 0) {
      return NextResponse.json({ items: [], counts: { new: 0, triaged: 0, ignored: 0, promoted: 0 } })
    }

    const items = await db.select({
      id: schema.rawItems.id,
      workspaceId: schema.rawItems.workspaceId,
      sourceId: schema.rawItems.sourceId,
      author: schema.rawItems.author,
      text: schema.rawItems.text,
      occurredAt: schema.rawItems.occurredAt,
      status: schema.rawItems.status,
      triageResult: schema.rawItems.triageResult,
      createdAt: schema.rawItems.createdAt,
    })
      .from(schema.rawItems)
      .where(inArray(schema.rawItems.workspaceId, workspaceIds))
      .orderBy(desc(schema.rawItems.createdAt))
      .limit(limit)

    // Pull source labels in one query.
    const sourceIds = Array.from(new Set(items.map((i) => i.sourceId).filter(Boolean) as string[]))
    const sources = sourceIds.length > 0
      ? await db.select().from(schema.sources).where(inArray(schema.sources.id, sourceIds))
      : []
    const sourceById = new Map(sources.map((s) => [s.id, s]))

    // Pull promoted records for all items in one query.
    const itemIds = items.map((i) => i.id)
    const promotedRecords = itemIds.length > 0
      ? await db.select({
          id: schema.records.id,
          rawItemId: schema.records.rawItemId,
          title: schema.records.title,
          type: schema.records.type,
        })
          .from(schema.records)
          .where(inArray(schema.records.rawItemId, itemIds))
      : []
    const recordByRawId = new Map(promotedRecords.map((r) => [r.rawItemId!, r]))

    const counts = { new: 0, triaged: 0, ignored: 0, promoted: 0 }
    const enriched = items.map((it) => {
      let parsedTriage: any = null
      try { parsedTriage = it.triageResult ? JSON.parse(it.triageResult) : null } catch { /* ignore */ }
      let parsedAuthor: any = null
      try { parsedAuthor = it.author ? JSON.parse(it.author) : null } catch { /* ignore */ }

      const promotedTo = recordByRawId.get(it.id) ?? null
      counts[it.status as keyof typeof counts] = (counts[it.status as keyof typeof counts] ?? 0) + 1
      if (promotedTo) counts.promoted += 1

      const source = it.sourceId ? sourceById.get(it.sourceId) : null

      return {
        id: it.id,
        source: source ? { id: source.id, label: source.label, kind: source.kind } : null,
        author: parsedAuthor,
        preview: it.text.slice(0, 320),
        textLength: it.text.length,
        occurredAt: it.occurredAt,
        createdAt: it.createdAt,
        status: it.status, // 'new' | 'triaged' | 'ignored'
        promotedTo,         // { id, title, type } or null
        triage: parsedTriage ? {
          shouldStore: parsedTriage.should_store ?? null,
          recordType: parsedTriage.record_type ?? null,
          title: parsedTriage.title ?? null,
          summary: parsedTriage.summary ?? null,
          confidence: parsedTriage.confidence ?? null,
          whyKeptOrDropped: parsedTriage.why_kept_or_dropped ?? null,
          feedback: parsedTriage.feedback ?? null, // { vote: 'good'|'bad', note?, by, at }
        } : null,
      }
    })

    return NextResponse.json({ items: enriched, counts })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// POST /api/admin/[orgId]/triage-review
// Body: { rawItemId, vote: 'good'|'bad', note?: string }
//
// Stores admin feedback as a `feedback` field merged into raw_items.triageResult.
// Triage retraining can later pull these as positive/negative examples.
export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    const orgId = params.orgId
    const body = await req.json()
    const { rawItemId, vote, note } = body as { rawItemId?: string; vote?: 'good' | 'bad'; note?: string }
    if (!rawItemId || !vote || !['good', 'bad'].includes(vote)) {
      return NextResponse.json({ error: 'rawItemId + vote (good|bad) required' }, { status: 400 })
    }

    const auth = await requireOrgAuth(req, orgId, 'org.audit.read')
    if (isAuthResponse(auth)) return auth

    // Same workspace set as the GET path: org-linked + admin's own.
    const orgLinks = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const ownMemberships = await db.select({ workspaceId: schema.workspaceMembers.workspaceId })
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.userId, auth.userId))
    const workspaceIds = Array.from(new Set([
      ...orgLinks.map((w) => w.workspaceId),
      ...ownMemberships.map((w) => w.workspaceId),
    ]))
    const item = await db.query.rawItems.findFirst({
      where: and(
        eq(schema.rawItems.id, rawItemId),
        inArray(schema.rawItems.workspaceId, workspaceIds),
      ),
    })
    if (!item) return NextResponse.json({ error: 'raw_item not found in this org' }, { status: 404 })

    let triage: any = {}
    try { triage = item.triageResult ? JSON.parse(item.triageResult) : {} } catch { /* ignore */ }
    triage.feedback = {
      vote,
      note: note?.slice(0, 500) ?? null,
      by: auth.userId,
      at: new Date().toISOString(),
    }

    await db.update(schema.rawItems)
      .set({ triageResult: JSON.stringify(triage) })
      .where(eq(schema.rawItems.id, rawItemId))

    return NextResponse.json({ ok: true, feedback: triage.feedback })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
