import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  fetchDiscovery,
  exchangeCodeForTokens,
  verifyIdToken,
  issueSsoTicket,
} from '@/lib/sso/oidc'

// Dynamic — reads searchParams + cookies, must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/sso/callback?code=...&state=...
// IdP redirects here after user authenticates. We:
//   1. Validate state against the cookie we set in initiate
//   2. Exchange the auth code for an id_token
//   3. Verify the id_token signature + issuer + audience + nonce via JWKS
//   4. JIT-provision user + org membership + workspace (if needed)
//   5. Issue a short-lived SSO ticket and bounce to /login?ticket=...
//      The login page trades the ticket for a NextAuth session.
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const state = req.nextUrl.searchParams.get('state')
    const errorParam = req.nextUrl.searchParams.get('error')
    if (errorParam) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_error=${encodeURIComponent(errorParam)}`)
    }
    if (!code || !state) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_error=missing_params`)
    }

    const cookieStore = await cookies()
    const pendingRaw = cookieStore.get('sso_pending')?.value
    if (!pendingRaw) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_error=expired_state`)
    }
    let pending: { state: string; nonce: string; configId: string; email: string }
    try { pending = JSON.parse(pendingRaw) } catch {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_error=bad_state`)
    }
    if (pending.state !== state) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_error=state_mismatch`)
    }

    const config = await db.query.ssoConfigs.findFirst({
      where: eq(schema.ssoConfigs.id, pending.configId),
    })
    if (!config || !config.metadataUrl || !config.clientId || !config.clientSecretEncrypted) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_error=config_missing`)
    }

    const discovery = await fetchDiscovery(config.metadataUrl)
    const tokens = await exchangeCodeForTokens({
      discovery,
      clientId: config.clientId,
      clientSecret: config.clientSecretEncrypted, // TODO: decrypt at rest; stored plain today
      code,
      redirectUri: `${req.nextUrl.origin}/api/sso/callback`,
    })
    const claims = await verifyIdToken({
      discovery,
      idToken: tokens.id_token,
      clientId: config.clientId,
      expectedNonce: pending.nonce,
    })

    const assertedEmail = (claims.email || pending.email || '').toLowerCase()
    if (!assertedEmail || !assertedEmail.endsWith('@' + config.domain)) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_error=domain_mismatch`)
    }

    // JIT provision user
    let user = await db.query.users.findFirst({ where: eq(schema.users.email, assertedEmail) })
    if (!user) {
      if (!config.justInTimeProvisioning) {
        return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_error=jit_disabled`)
      }
      const id = crypto.randomUUID()
      await db.insert(schema.users).values({
        id,
        email: assertedEmail,
        name: claims.name || claims.preferred_username || assertedEmail.split('@')[0],
        avatarUrl: claims.picture || null,
      })
      user = await db.query.users.findFirst({ where: eq(schema.users.id, id) })
    }
    if (!user) throw new Error('user provisioning failed')

    // Add to org if missing
    const existingMembership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(schema.organizationMembers.organizationId, config.organizationId),
        eq(schema.organizationMembers.userId, user.id),
      ),
    })
    if (!existingMembership) {
      await db.insert(schema.organizationMembers).values({
        organizationId: config.organizationId,
        userId: user.id,
        role: config.defaultRole,
        status: 'active',
      })
    } else if (existingMembership.status !== 'active') {
      // Reactivate — offboarded user who SSO'd back in gets reinstated
      await db.update(schema.organizationMembers)
        .set({ status: 'active', updatedAt: new Date().toISOString() })
        .where(eq(schema.organizationMembers.id, existingMembership.id))
    }

    // Issue a short-lived ticket the login page trades for a NextAuth session.
    const ticket = await issueSsoTicket({
      userId: user.id,
      email: assertedEmail,
      organizationId: config.organizationId,
      secret: process.env.NEXTAUTH_SECRET || 'dev-fallback-do-not-use',
    })

    // Clear the pending cookie
    cookieStore.delete('sso_pending')

    return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_ticket=${encodeURIComponent(ticket)}`)
  } catch (err: any) {
    console.error('[sso callback]', err)
    return NextResponse.redirect(`${req.nextUrl.origin}/login?sso_error=${encodeURIComponent((err?.message || 'failed').slice(0, 80))}`)
  }
}
