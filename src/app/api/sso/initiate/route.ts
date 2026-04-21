import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { fetchDiscovery, buildAuthorizeUrl } from '@/lib/sso/oidc'

// Dynamic — uses searchParams + cookies, never safe to pre-render.
export const dynamic = 'force-dynamic'

// GET /api/sso/initiate?email=foo@acme.com
// Looks up an enabled SSO config by email domain, redirects the user to
// the IdP's authorize endpoint. Short-lived cookie holds state + nonce for
// the callback to validate against.
export async function GET(req: NextRequest) {
  try {
    const email = (req.nextUrl.searchParams.get('email') || '').toLowerCase().trim()
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }
    const domain = email.split('@')[1]

    const config = await db.query.ssoConfigs.findFirst({
      where: and(eq(schema.ssoConfigs.domain, domain), eq(schema.ssoConfigs.enabled, true)),
    })
    if (!config) {
      // No SSO for this domain — caller falls back to OTP/password flow.
      return NextResponse.json({ ssoAvailable: false })
    }
    if (!config.metadataUrl || !config.clientId || !config.clientSecretEncrypted) {
      return NextResponse.json({ error: 'sso config incomplete' }, { status: 500 })
    }

    const discovery = await fetchDiscovery(config.metadataUrl)
    const state = crypto.randomBytes(16).toString('hex')
    const nonce = crypto.randomBytes(16).toString('hex')
    const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`
    const redirectUri = `${origin}/api/sso/callback`

    // Store state + nonce + configId + email in an httpOnly cookie.
    // 5-minute TTL is plenty for the IdP round-trip.
    const cookieStore = await cookies()
    cookieStore.set('sso_pending', JSON.stringify({
      state, nonce, configId: config.id, email,
    }), {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 5 * 60,
    })

    const authorizeUrl = buildAuthorizeUrl({
      discovery,
      clientId: config.clientId,
      redirectUri,
      state,
      nonce,
      loginHint: email,
    })

    return NextResponse.redirect(authorizeUrl)
  } catch (err: any) {
    console.error('[sso initiate]', err)
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
