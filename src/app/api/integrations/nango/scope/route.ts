import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getProviderByKey } from '@/lib/integrations/nango/providers'

// GET /api/integrations/nango/scope?providerKey=gmail-nango
// Returns the current scope config for the caller's connection.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const providerKey = req.nextUrl.searchParams.get('providerKey')
    if (!providerKey) return NextResponse.json({ error: 'providerKey required' }, { status: 400 })

    const conn = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, providerKey),
      ),
    })
    if (!conn) return NextResponse.json({ scope: null })

    const settings = conn.settings ? JSON.parse(conn.settings) : {}
    return NextResponse.json({
      scope: settings.scope || { includeTerms: [], excludeTerms: [], domainWhitelist: [] },
    })
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}

// PATCH /api/integrations/nango/scope
// Body: { providerKey, scope: { includeTerms?, excludeTerms?, domainWhitelist? } }
// Scope filtering is enforced at ingest time (src/lib/integrations/nango/ingest.ts).
// Empty arrays = no filter.
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json()
    const { providerKey, scope } = body
    if (!providerKey) return NextResponse.json({ error: 'providerKey required' }, { status: 400 })
    if (!getProviderByKey(providerKey)) return NextResponse.json({ error: 'unknown provider' }, { status: 400 })

    const normalized = {
      includeTerms: Array.isArray(scope?.includeTerms) ? scope.includeTerms.filter(Boolean).map((s: string) => String(s).toLowerCase().trim()) : [],
      excludeTerms: Array.isArray(scope?.excludeTerms) ? scope.excludeTerms.filter(Boolean).map((s: string) => String(s).toLowerCase().trim()) : [],
      domainWhitelist: Array.isArray(scope?.domainWhitelist) ? scope.domainWhitelist.filter(Boolean).map((s: string) => String(s).toLowerCase().trim()) : [],
    }

    const conn = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, providerKey),
      ),
    })
    if (!conn) return NextResponse.json({ error: 'not connected' }, { status: 400 })

    const settings = conn.settings ? JSON.parse(conn.settings) : {}
    settings.scope = normalized
    await db.update(schema.integrationsConnections)
      .set({ settings: JSON.stringify(settings), updatedAt: new Date().toISOString() })
      .where(eq(schema.integrationsConnections.id, conn.id))

    return NextResponse.json({ ok: true, scope: normalized })
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
