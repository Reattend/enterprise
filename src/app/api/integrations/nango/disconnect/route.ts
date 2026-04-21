import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  getNangoClient,
  getNangoConfig,
  buildNangoConnectionId,
} from '@/lib/integrations/nango/client'
import { getProviderByKey } from '@/lib/integrations/nango/providers'

// POST /api/integrations/nango/disconnect
// Body: { providerKey: string }
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { providerKey } = await req.json()
    if (!providerKey) return NextResponse.json({ error: 'providerKey required' }, { status: 400 })

    const provider = getProviderByKey(providerKey)
    if (!provider) return NextResponse.json({ error: 'unknown providerKey' }, { status: 400 })

    const cfg = getNangoConfig()
    if (cfg.configured) {
      try {
        const nango = getNangoClient()
        await nango.deleteConnection(provider.providerConfigKey, buildNangoConnectionId(userId, providerKey))
      } catch (err) {
        // If Nango already forgot the connection, keep going so we can still
        // clean up our local row.
        console.warn('[nango disconnect] remote delete failed (ignored):', err)
      }
    }

    await db.update(schema.integrationsConnections)
      .set({ status: 'disconnected', updatedAt: new Date().toISOString() })
      .where(and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, providerKey),
      ))

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
