import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getProviderByKey } from '@/lib/integrations/nango/providers'
import { ingestFromNango } from '@/lib/integrations/nango/ingest'
import { processAllPendingJobs } from '@/lib/jobs/worker'
import { getNangoConfig } from '@/lib/integrations/nango/client'

// POST /api/integrations/nango/sync
// Body: { providerKey: string, model?: string }
//
// Manual sync trigger — pulls the latest records for a connected provider
// without waiting for Nango's scheduled sync. Useful right after a user
// connects (first webhook can lag 15+ seconds).
export async function POST(req: NextRequest) {
  try {
    const cfg = getNangoConfig()
    if (!cfg.configured) {
      return NextResponse.json({ error: 'nango not configured' }, { status: 503 })
    }

    const { userId } = await requireAuth()
    const { providerKey, model } = await req.json()
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
    const targetModel = model || provider.models[0]
    if (!targetModel) return NextResponse.json({ error: 'no model available' }, { status: 400 })

    const result = await ingestFromNango({
      userId,
      workspaceId,
      providerKey,
      model: targetModel,
    })

    await db.update(schema.integrationsConnections)
      .set({ lastSyncedAt: new Date().toISOString(), syncError: null, updatedAt: new Date().toISOString() })
      .where(eq(schema.integrationsConnections.id, connection.id))

    processAllPendingJobs().catch((e) => console.error('[nango sync] worker kick failed', e))
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    if (err?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    console.error('[nango sync]', err)
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
