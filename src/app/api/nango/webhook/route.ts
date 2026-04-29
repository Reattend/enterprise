import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getNangoClient, getNangoConfig, parseNangoConnectionId } from '@/lib/integrations/nango/client'
import { getProviderByConfigKey } from '@/lib/integrations/nango/providers'
import { ingestFromNango } from '@/lib/integrations/nango/ingest'
import { processAllPendingJobs } from '@/lib/jobs/worker'

// Nango's auth event payload includes endUser metadata when the connection
// was minted via createConnectSession. We set end_user.id = our userId, so
// this is the canonical place to recover it after Nango auto-generates the
// connection_id.
function extractUserIdFromWebhook(body: Record<string, unknown>, connectionId: string): string | null {
  const endUser = (body.endUser ?? body.end_user) as Record<string, unknown> | undefined
  const endUserId = endUser?.endUserId ?? endUser?.end_user_id ?? endUser?.id
  if (typeof endUserId === 'string' && endUserId) return endUserId
  // Back-compat: legacy connections we built ourselves were "<userId>__<providerKey>".
  const parsed = parseNangoConnectionId(connectionId)
  return parsed?.userId ?? null
}

// Nango webhook receiver.
//
// Events we handle:
//   - `auth`: a user just completed an OAuth connect. We upsert a row in
//     integrations_connections so our UI reflects the connection.
//   - `sync`: a scheduled sync finished with deltas. We pull the delta via
//     nango.listRecords, normalize, write raw_items, enqueue triage.
//
// Signature verification uses the built-in SDK helper. Unverified requests
// are rejected with 401. In local dev without NANGO_WEBHOOK_SECRET set,
// verification is skipped.
export async function POST(req: NextRequest) {
  const cfg = getNangoConfig()
  if (!cfg.configured) {
    return NextResponse.json({ error: 'nango not configured' }, { status: 503 })
  }

  const raw = await req.text()
  const headers: Record<string, unknown> = {}
  req.headers.forEach((v, k) => { headers[k] = v })

  if (cfg.webhookSecret) {
    try {
      const ok = getNangoClient().verifyIncomingWebhookRequest(raw, headers)
      if (!ok) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
      }
    } catch (err) {
      console.error('[nango webhook] signature verify threw', err)
      return NextResponse.json({ error: 'signature verify failed' }, { status: 401 })
    }
  }

  let body: any
  try { body = JSON.parse(raw) } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const type: string = body.type || body.operation || ''
  const connectionId: string | undefined = body.connectionId || body.connection_id
  const providerConfigKey: string | undefined = body.providerConfigKey || body.provider_config_key

  if (!connectionId || !providerConfigKey) {
    // Ack unknown/malformed events so Nango doesn't retry forever.
    return NextResponse.json({ ok: true, ignored: 'missing connection/provider' })
  }

  const userId = extractUserIdFromWebhook(body, connectionId)
  if (!userId) {
    return NextResponse.json({ ok: true, ignored: 'no userId in endUser or connection_id' })
  }

  const provider = getProviderByConfigKey(providerConfigKey)
  if (!provider) {
    return NextResponse.json({ ok: true, ignored: `no normalizer for ${providerConfigKey}` })
  }
  // We always look up our local provider key from the providerConfigKey since
  // session-based connections no longer encode it in the connection_id.
  const providerKey = provider.key

  // Find the user's active workspace. For enterprise deployments this is
  // the most-recent workspace they belong to; the triage agent can be
  // retargeted to dept-linked workspaces later.
  const membership = await db.query.workspaceMembers.findFirst({
    where: eq(schema.workspaceMembers.userId, userId),
  })
  if (!membership) {
    return NextResponse.json({ ok: true, ignored: 'no workspace for user' })
  }
  const workspaceId = membership.workspaceId

  if (type === 'auth' || type === 'connection_created') {
    // Upsert our connection row so the Integrations UI reflects it.
    const existing = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, providerKey),
      ),
    })
    const settings = JSON.stringify({
      provider: 'nango',
      providerConfigKey,
      nangoConnectionId: connectionId,
    })
    if (existing) {
      await db.update(schema.integrationsConnections).set({
        status: 'connected',
        settings,
        syncError: null,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.integrationsConnections.id, existing.id))
    } else {
      await db.insert(schema.integrationsConnections).values({
        userId,
        workspaceId,
        integrationKey: providerKey,
        status: 'connected',
        settings,
      })
    }
    return NextResponse.json({ ok: true, type })
  }

  if (type === 'sync' || type === 'sync_completed') {
    const model: string = body.model || body.syncName || ''
    const results = body.responseResults || body.results || {}
    const changed = (results.added ?? 0) + (results.updated ?? 0)
    if (!model || changed === 0) {
      return NextResponse.json({ ok: true, changed: 0 })
    }

    // Only ingest models this provider publishes.
    if (!provider.models.includes(model)) {
      return NextResponse.json({ ok: true, ignored: `unknown model ${model}` })
    }

    try {
      const ingestResult = await ingestFromNango({
        userId,
        workspaceId,
        providerKey,
        model,
      })

      await db.update(schema.integrationsConnections)
        .set({ lastSyncedAt: new Date().toISOString(), syncError: null, updatedAt: new Date().toISOString() })
        .where(and(
          eq(schema.integrationsConnections.userId, userId),
          eq(schema.integrationsConnections.integrationKey, providerKey),
        ))

      // Kick the worker so triage runs without waiting for the next cycle.
      processAllPendingJobs().catch(e => console.error('[nango webhook] worker kick failed', e))

      return NextResponse.json({ ok: true, ingested: ingestResult })
    } catch (err: any) {
      console.error('[nango webhook] ingest failed', err)
      await db.update(schema.integrationsConnections)
        .set({ syncError: String(err?.message || err), updatedAt: new Date().toISOString() })
        .where(and(
          eq(schema.integrationsConnections.userId, userId),
          eq(schema.integrationsConnections.integrationKey, providerKey),
        ))
      return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 })
    }
  }

  // Unknown event — ack it so Nango won't retry.
  return NextResponse.json({ ok: true, ignored: `unhandled type: ${type}` })
}
