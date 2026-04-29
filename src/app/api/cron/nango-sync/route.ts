import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ingestFromNango } from '@/lib/integrations/nango/ingest'
import { processAllPendingJobs } from '@/lib/jobs/worker'
import { getProviderByKey } from '@/lib/integrations/nango/providers'
import { getNangoConfig } from '@/lib/integrations/nango/client'

export const dynamic = 'force-dynamic'

// GET /api/cron/nango-sync
//
// Periodic auto-sync for every connected Nango integration. Wired to a
// system cron entry on the droplet (every 30 min):
//
//   */30 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" \
//     "http://localhost:3000/api/cron/nango-sync" > /var/log/nango-sync.log 2>&1
//
// Auth: optional bearer via NANGO_CRON_SECRET env var. If unset the route is
// open (acceptable since it's bound to localhost via the system cron). Setting
// the secret is recommended for defense-in-depth.
//
// Idempotency: ingestFromNango dedupes on externalId per workspace, so a
// double-fire from overlapping cron runs cannot create duplicates. Each
// connection is processed independently — one provider's failure does not
// block the rest.
export async function GET(req: NextRequest) {
  const startedAt = Date.now()

  const secret = process.env.NANGO_CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const cfg = getNangoConfig()
  if (!cfg.configured) {
    return NextResponse.json({ ok: true, skipped: 'nango not configured' })
  }

  // Pick up every active connection. workspaceId comes from the row so
  // ingestFromNango writes records into the right workspace.
  const connections = await db.select()
    .from(schema.integrationsConnections)
    .where(eq(schema.integrationsConnections.status, 'connected'))

  const results: Array<{
    userId: string
    providerKey: string
    workspaceId: string
    added: number
    skipped: number
    errors: number
    filtered: number
    error?: string
  }> = []

  for (const conn of connections) {
    const provider = getProviderByKey(conn.integrationKey)
    if (!provider) {
      results.push({
        userId: conn.userId,
        providerKey: conn.integrationKey,
        workspaceId: conn.workspaceId,
        added: 0, skipped: 0, errors: 0, filtered: 0,
        error: 'unknown providerKey',
      })
      continue
    }

    // For proxy providers `model` is unused — pass the first declared model
    // so the listRecords fallback (if it ever runs) has something sensible.
    const model = provider.models[0] || 'unused'

    try {
      const r = await ingestFromNango({
        userId: conn.userId,
        workspaceId: conn.workspaceId,
        providerKey: conn.integrationKey,
        model,
      })

      await db.update(schema.integrationsConnections)
        .set({
          lastSyncedAt: new Date().toISOString(),
          syncError: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.integrationsConnections.id, conn.id))

      results.push({
        userId: conn.userId,
        providerKey: conn.integrationKey,
        workspaceId: conn.workspaceId,
        added: r.added,
        skipped: r.skipped,
        errors: r.errors,
        filtered: r.filtered,
      })
    } catch (err: any) {
      const message = err?.message || String(err)
      console.error(`[cron nango-sync] ${conn.integrationKey} for ${conn.userId} failed:`, message)
      await db.update(schema.integrationsConnections)
        .set({
          syncError: message.slice(0, 500),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.integrationsConnections.id, conn.id))
      results.push({
        userId: conn.userId,
        providerKey: conn.integrationKey,
        workspaceId: conn.workspaceId,
        added: 0, skipped: 0, errors: 1, filtered: 0,
        error: message.slice(0, 200),
      })
    }
  }

  // Kick the job worker so triage runs for everything we just enqueued
  // instead of waiting for its next idle cycle.
  processAllPendingJobs().catch((e) => console.error('[cron nango-sync] worker kick failed', e))

  const totals = results.reduce(
    (acc, r) => ({
      added:    acc.added    + r.added,
      skipped:  acc.skipped  + r.skipped,
      errors:   acc.errors   + r.errors,
      filtered: acc.filtered + r.filtered,
    }),
    { added: 0, skipped: 0, errors: 0, filtered: 0 },
  )

  const elapsedMs = Date.now() - startedAt
  console.log(`[cron nango-sync] ${connections.length} connections, ${totals.added} new, ${totals.skipped} dedup, ${totals.errors} errors, ${elapsedMs}ms`)

  return NextResponse.json({
    ok: true,
    elapsedMs,
    connectionsProcessed: connections.length,
    totals,
    results,
  })
}
