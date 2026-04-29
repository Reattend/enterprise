import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getNangoClient, getNangoConfig } from '@/lib/integrations/nango/client'
import { getProviderByKey } from '@/lib/integrations/nango/providers'

// POST /api/integrations/nango/finalize
// Body: { providerKey: string }
//
// Called by the frontend immediately after Nango's auth() popup succeeds.
// We don't wait for the auth webhook because (a) it might be misconfigured,
// (b) it can take seconds to arrive, racing the backfill call. Instead we
// query Nango directly for connections owned by this end_user and persist
// the matching one. The webhook handler stays in place for the steady-state
// 'sync_completed' events.
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

    const nango = getNangoClient()

    // Ask Nango for every connection associated with this end_user. We pass
    // userId as end_user.id when minting the session, so this is the canonical
    // way to recover the auto-generated connection_id.
    const list = await nango.listConnections({
      endUserId: userId,
    } as any)
    const connections = (list as any).connections ?? (list as any).data ?? []

    // Filter to the integration the user just connected. Pick the most
    // recently created if multiple exist (user retried OAuth — old ones
    // remain until disconnect).
    const matching = connections
      .filter((c: any) => c.provider_config_key === provider.providerConfigKey || c.providerConfigKey === provider.providerConfigKey)
      .sort((a: any, b: any) => new Date(b.created_at ?? b.createdAt ?? 0).getTime() - new Date(a.created_at ?? a.createdAt ?? 0).getTime())

    if (matching.length === 0) {
      return NextResponse.json({
        error: `No Nango connection found for ${provider.providerConfigKey}. The OAuth popup may have closed before completing — try Connect again.`,
      }, { status: 404 })
    }

    const conn = matching[0]
    const nangoConnectionId: string = conn.connection_id ?? conn.connectionId
    if (!nangoConnectionId) {
      return NextResponse.json({ error: 'Nango returned a connection without an id' }, { status: 500 })
    }

    // Determine which workspace to anchor this against. Mirror the webhook's
    // logic: the user's first workspace membership.
    const membership = await db.query.workspaceMembers.findFirst({
      where: eq(schema.workspaceMembers.userId, userId),
    })
    if (!membership) {
      return NextResponse.json({ error: 'no workspace for user' }, { status: 400 })
    }

    const settings = JSON.stringify({
      provider: 'nango',
      providerConfigKey: provider.providerConfigKey,
      nangoConnectionId,
    })

    const existing = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, providerKey),
      ),
    })
    if (existing) {
      // Preserve the user's scope filter (if any) by merging into existing settings.
      let scope: unknown = undefined
      try { scope = existing.settings ? JSON.parse(existing.settings).scope : undefined } catch { /* ignore */ }
      const merged = scope ? { ...JSON.parse(settings), scope } : JSON.parse(settings)
      await db.update(schema.integrationsConnections).set({
        status: 'connected',
        settings: JSON.stringify(merged),
        syncError: null,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.integrationsConnections.id, existing.id))
    } else {
      await db.insert(schema.integrationsConnections).values({
        userId,
        workspaceId: membership.workspaceId,
        integrationKey: providerKey,
        status: 'connected',
        settings,
      })
    }

    return NextResponse.json({ ok: true, nangoConnectionId, providerConfigKey: provider.providerConfigKey })
  } catch (err: any) {
    if (err?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    console.error('[nango finalize]', err)
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
