import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { NANGO_PROVIDERS } from '@/lib/integrations/nango/providers'
import { getNangoConfig } from '@/lib/integrations/nango/client'

// GET /api/integrations/nango/status
// Returns the user's connection state for every Nango-powered provider,
// plus a global flag telling the UI whether Nango is configured at all.
export async function GET() {
  try {
    const { userId } = await requireAuth()
    const cfg = getNangoConfig()

    const rows = await db
      .select()
      .from(schema.integrationsConnections)
      .where(eq(schema.integrationsConnections.userId, userId))

    const byKey = new Map(rows.map((r) => [r.integrationKey, r]))

    const providers = NANGO_PROVIDERS.map((p) => {
      const row = byKey.get(p.key)
      return {
        key: p.key,
        providerConfigKey: p.providerConfigKey,
        name: p.name,
        category: p.category,
        description: p.description,
        iconHint: p.iconHint,
        status: row?.status ?? 'disconnected',
        lastSyncedAt: row?.lastSyncedAt ?? null,
        syncError: row?.syncError ?? null,
      }
    })

    return NextResponse.json({ configured: cfg.configured, providers })
  } catch (err: any) {
    if (err?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
