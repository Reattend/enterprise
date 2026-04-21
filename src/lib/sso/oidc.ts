// OIDC single sign-on for Reattend Enterprise.
//
// Why OIDC (not SAML): every major enterprise IdP — Azure AD, Okta, Google
// Workspace, Auth0, PingFederate — supports OIDC. It's OAuth 2.0 plus a
// standardized `id_token` (JWT) that carries user claims. SAML support
// requires a heavier library and solves the same problem for the same IdPs.
// If a customer ONLY supports SAML (rare, usually legacy), we'll add it.
//
// Flow:
//   1. User visits /login, enters their email
//   2. We look up sso_configs by domain (e.g. @acme.com → Azure AD config)
//   3. GET /api/sso/initiate → we fetch the IdP's .well-known metadata,
//      generate state + nonce, store them in a short-lived signed cookie,
//      redirect to the IdP's authorize endpoint
//   4. User authenticates with Azure AD → Azure redirects to our callback
//   5. GET /api/sso/callback → verify state, exchange code for id_token,
//      verify id_token signature via JWKS, JIT-provision the user + org
//      membership, issue a short-lived SSO ticket, redirect to /login?ticket=
//   6. Login page calls signIn('sso-ticket', { ticket }) → NextAuth creates
//      the JWT session cookie → user is in.
//
// Why the ticket handoff: NextAuth wants to be the one that sets session
// cookies. Rather than fight that, we issue a one-time JWT ticket that the
// client trades via a CredentialsProvider NextAuth already knows.

import { jwtVerify, createRemoteJWKSet, SignJWT } from 'jose'

export interface OidcDiscovery {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
  userinfo_endpoint?: string
}

interface DiscoveryCacheEntry {
  doc: OidcDiscovery
  fetchedAt: number
}
const DISCOVERY_TTL_MS = 60 * 60 * 1000 // 1 hour
const discoveryCache = new Map<string, DiscoveryCacheEntry>()

export async function fetchDiscovery(metadataUrl: string): Promise<OidcDiscovery> {
  const cached = discoveryCache.get(metadataUrl)
  if (cached && Date.now() - cached.fetchedAt < DISCOVERY_TTL_MS) return cached.doc
  const res = await fetch(metadataUrl, { cache: 'no-store' })
  if (!res.ok) throw new Error(`IdP metadata fetch failed: ${res.status}`)
  const doc = await res.json() as OidcDiscovery
  if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri) {
    throw new Error('IdP metadata missing required endpoints')
  }
  discoveryCache.set(metadataUrl, { doc, fetchedAt: Date.now() })
  return doc
}

export function buildAuthorizeUrl(opts: {
  discovery: OidcDiscovery
  clientId: string
  redirectUri: string
  state: string
  nonce: string
  loginHint?: string
  scope?: string
}): string {
  const url = new URL(opts.discovery.authorization_endpoint)
  url.searchParams.set('client_id', opts.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', opts.redirectUri)
  url.searchParams.set('state', opts.state)
  url.searchParams.set('nonce', opts.nonce)
  url.searchParams.set('scope', opts.scope || 'openid email profile')
  if (opts.loginHint) url.searchParams.set('login_hint', opts.loginHint)
  return url.toString()
}

export async function exchangeCodeForTokens(opts: {
  discovery: OidcDiscovery
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}): Promise<{ id_token: string; access_token?: string }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
  })
  const res = await fetch(opts.discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`token exchange failed: ${res.status} ${text.slice(0, 200)}`)
  }
  return res.json()
}

export interface IdTokenClaims {
  sub: string
  iss: string
  aud: string | string[]
  email?: string
  email_verified?: boolean
  name?: string
  preferred_username?: string
  picture?: string
  nonce?: string
  exp: number
  iat: number
}

// Verify the id_token signature using the IdP's JWKS, and validate iss/aud/
// nonce. This is the security-critical step — a bogus token means a
// forged login.
export async function verifyIdToken(opts: {
  discovery: OidcDiscovery
  idToken: string
  clientId: string
  expectedNonce: string
}): Promise<IdTokenClaims> {
  const jwks = createRemoteJWKSet(new URL(opts.discovery.jwks_uri))
  const { payload } = await jwtVerify(opts.idToken, jwks, {
    issuer: opts.discovery.issuer,
    audience: opts.clientId,
  })
  const claims = payload as unknown as IdTokenClaims
  if (claims.nonce !== opts.expectedNonce) {
    throw new Error('nonce mismatch in id_token')
  }
  if (!claims.sub) throw new Error('id_token missing sub')
  return claims
}

// Short-lived ticket we hand back to the browser after successful IdP auth.
// Browser trades it via the 'sso-ticket' NextAuth CredentialsProvider which
// issues the real long-lived session cookie.
export async function issueSsoTicket(opts: {
  userId: string
  email: string
  organizationId: string
  secret: string
}): Promise<string> {
  const encoder = new TextEncoder()
  const jwt = await new SignJWT({
    email: opts.email,
    organizationId: opts.organizationId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(opts.userId)
    .setIssuedAt()
    .setExpirationTime('60s')
    .setIssuer('reattend-sso')
    .sign(encoder.encode(opts.secret))
  return jwt
}

export async function verifySsoTicket(ticket: string, secret: string): Promise<{
  userId: string
  email: string
  organizationId: string
}> {
  const encoder = new TextEncoder()
  const { payload } = await jwtVerify(ticket, encoder.encode(secret), {
    issuer: 'reattend-sso',
  })
  if (!payload.sub) throw new Error('ticket missing sub')
  return {
    userId: String(payload.sub),
    email: String(payload.email),
    organizationId: String(payload.organizationId),
  }
}
