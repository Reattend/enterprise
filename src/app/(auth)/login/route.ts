import { NextResponse } from 'next/server'
import { serveLandingPage } from '@/lib/seo/landing-head'

// /login — serves the static signin.html. Inline JS in the HTML wires the
// email/OTP/SSO-ticket flows to the existing /api/auth/* endpoints.
//
// no-store cache because we ship bug fixes to the OTP submit handler
// often; a stale cached page can leave users stuck on a broken submit
// for up to 5 min after deploy.
//
// On the test droplet (ALLOW_TEST_PASSWORD_LOGIN=true), the OTP path is
// dead — seed users use @seed.reattend.local which has no inbox. Redirect
// /login → /test-login there so testers always land on the right form.
// Prod doesn't set the env var; redirect doesn't fire.

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.ALLOW_TEST_PASSWORD_LOGIN === 'true') {
    return NextResponse.redirect(new URL('/test-login', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
  }
  return serveLandingPage({
    filename: 'signin.html',
    canonicalPath: '/login',
    cacheControl: 'no-store, must-revalidate',
  })
}
