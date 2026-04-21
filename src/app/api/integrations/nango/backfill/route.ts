import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getProviderByKey } from '@/lib/integrations/nango/providers'
import { ingestFromNango } from '@/lib/integrations/nango/ingest'
import { processAllPendingJobs } from '@/lib/jobs/worker'
import { getNangoConfig } from '@/lib/integrations/nango/client'

// POST /api/integrations/nango/backfill
// Body: { providerKey }
// Pulls the FULL Nango-available history for this connection (capped at
// 3 pages × 100 records = 300 records per model). Used right after the
// user completes OAuth so they see data immediately instead of waiting
// for Nango's scheduled sync.
//
// Unlike /sync, backfill paginates through next_cursor until exhausted or
// the page cap is hit. Synchronous — we don't enqueue a job because the
// user is watching a spinner.
export async function POST(req: NextRequest) {
  try {
    const cfg = getNangoConfig()
    if (!cfg.configured) {
      return NextResponse.json({ error: 'nango not configured' }, { status: 503 })
    }

    const { userId } = await requireAuth()
    const { providerKey } = await req.json()
    if (!providerKey) return NextResponse.json({ error: 'providerKey required' }, { status: 400 })

    const provider = getProviderByKey(providerKey)
    if (!provider) return NextResponse.json({ error: 'unknown providerKey' }, { status: 400 })

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, providerKey),
      ),
    })
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'not connected' }, { status: 400 })
    }

    const workspaceId = connection.workspaceId

    const MAX_PAGES = 3
    const totals = { added: 0, skipped: 0, errors: 0, filtered: 0, pages: 0 }

    // Iterate through models + paginate each.
    for (const model of provider.models) {
      let cursor: string | null | undefined = undefined
      for (let page = 0; page < MAX_PAGES; page++) {
        const result = await ingestFromNango({
          userId, workspaceId, providerKey, model,
          cursor: cursor ?? undefined,
          limit: 100,
        })
        totals.added += result.added
        totals.skipped += result.skipped
        totals.errors += result.errors
        totals.filtered += result.filtered
        totals.pages += 1
        cursor = result.nextCursor
        if (!cursor) break
      }
    }

    await db.update(schema.integrationsConnections)
      .set({ lastSyncedAt: new Date().toISOString(), syncError: null, updatedAt: new Date().toISOString() })
      .where(eq(schema.integrationsConnections.id, connection.id))

    // Kick worker so triage runs for the newly inserted raw_items.
    processAllPendingJobs().catch((e) => console.error('[nango backfill] worker kick failed', e))

    return NextResponse.json({ ok: true, ...totals })
  } catch (err: any) {
    if (err?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    console.error('[nango backfill]', err)
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
