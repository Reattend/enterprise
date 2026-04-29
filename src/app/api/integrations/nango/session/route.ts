import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getNangoClient, getNangoConfig } from '@/lib/integrations/nango/client'
import { getProviderByKey } from '@/lib/integrations/nango/providers'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

// POST /api/integrations/nango/session
// Body: { providerKey: string }
// Returns: { sessionToken, expiresAt, connectionId, providerConfigKey, publicKey, host }
//
// The frontend passes sessionToken to @nangohq/frontend's Nango.connect() to
// open the OAuth modal. Nango then handles OAuth, saves the connection
// under the connectionId we pass in, and POSTs an 'auth' webhook to us.
export async function POST(req: NextRequest) {
  try {
    const cfg = getNangoConfig()
    if (!cfg.configured) {
      return NextResponse.json({
        error: 'Nango is not configured. Set NANGO_SECRET_KEY in env.',
        configured: false,
      }, { status: 503 })
    }

    const { userId, session } = await requireAuth()
    const { providerKey } = await req.json()
    if (!providerKey) return NextResponse.json({ error: 'providerKey required' }, { status: 400 })

    const provider = getProviderByKey(providerKey)
    if (!provider) return NextResponse.json({ error: 'unknown providerKey' }, { status: 400 })

    const email = session?.user?.email || 'unknown@example.com'
    const displayName = session?.user?.name || email.split('@')[0]

    // Fetch existing user row for organization context if we want it later
    const [userRow] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)

    const nango = getNangoClient()
    const result = await nango.createConnectSession({
      end_user: {
        // Our userId becomes Nango's end_user.id, which the auth webhook
        // echoes back. That's how we map the auto-generated connection_id
        // back to a workspace member.
        id: userId,
        email,
        display_name: userRow?.name || displayName,
      },
      allowed_integrations: [provider.providerConfigKey],
    })

    return NextResponse.json({
      sessionToken: (result as any).data?.token || (result as any).token,
      expiresAt: (result as any).data?.expires_at || (result as any).expires_at,
      providerConfigKey: provider.providerConfigKey,
      host: cfg.host,
    })
  } catch (err: any) {
    if (err?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    console.error('[nango session] failed', err)
    return NextResponse.json({ error: err?.message || 'failed to create session' }, { status: 500 })
  }
}
