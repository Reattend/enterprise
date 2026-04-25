import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { jwtVerify } from 'jose'

const SANDBOX_EMAIL_SUFFIX = '@sandbox.reattend.local'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin dashboard — separate auth, only protect /admin/dashboard
  if (pathname.startsWith('/admin/dashboard')) {
    const adminToken = request.cookies.get('admin-session')?.value
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET)
      await jwtVerify(adminToken, secret)
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Public pages — redirect to /app if already logged in
  const publicAuthPages = ['/', '/login', '/register', '/pricing']
  if (publicAuthPages.includes(pathname)) {
    const useSecureCookie = !!(process.env.NEXTAUTH_URL?.startsWith('https://') || process.env.AUTH_URL?.startsWith('https://'))
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: useSecureCookie,
    })

    if (token) {
      return NextResponse.redirect(new URL('/app', request.url))
    }

    return NextResponse.next()
  }

  // App routes — NextAuth session
  const useSecureCookie = !!(process.env.NEXTAUTH_URL?.startsWith('https://') || process.env.AUTH_URL?.startsWith('https://'))
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: useSecureCookie,
  })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Sandbox isolation ────────────────────────────────────
  // Sandbox sessions never leak into the production app surfaces. The API
  // layer (getOrgContext / requireOrgAuth) already rejects cross-org reads
  // because the visitor is only a member of their sandbox org. This is
  // belt-and-suspenders: we enforce the same constraint at the URL layer
  // so a confused click on an orgId in a copy-pasted URL silently
  // re-routes back to the visitor's own sandbox dashboard.
  const email = (token.email as string | null | undefined)?.toLowerCase() || ''
  if (email.endsWith(SANDBOX_EMAIL_SUFFIX)) {
    // Block the admin org-scoped path /app/admin/<orgId>/... if the orgId
    // is one we know is NOT a sandbox org (i.e. the canonical demo-mof
    // production org or any other reachable id). Sandbox sessions are
    // expected to live entirely under their own dynamically-generated
    // sandbox org id; we don't have that id in the token, but we DO know
    // that admin URLs containing 'demo-mof' are always wrong for sandbox.
    if (pathname.includes('/app/admin/')) {
      // Defensive: if a visitor pastes a URL with a non-UUID-looking
      // segment (e.g. 'demo-mof'), bounce them home. Real sandbox URLs
      // always use UUIDs.
      const adminMatch = pathname.match(/\/app\/admin\/([^/]+)/)
      if (adminMatch) {
        const seg = adminMatch[1]
        const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)
        if (!looksLikeUuid) {
          return NextResponse.redirect(new URL('/app', request.url))
        }
      }
    }
    // /app/admin/onboarding is a no-op for sandbox visitors — they already
    // have an org. Bounce to /app to avoid the empty onboarding flow.
    if (pathname.startsWith('/app/admin/onboarding')) {
      return NextResponse.redirect(new URL('/app', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/admin/dashboard/:path*', '/', '/login', '/register', '/pricing'],
}
