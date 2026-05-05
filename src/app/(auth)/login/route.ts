import { serveLandingPage } from '@/lib/seo/landing-head'

// /login — serves the static signin.html. Inline JS in the HTML wires the
// email/OTP/SSO-ticket flows to the existing /api/auth/* endpoints.
//
// no-store cache because we ship bug fixes to the OTP submit handler
// often; a stale cached page can leave users stuck on a broken submit
// for up to 5 min after deploy.

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({
    filename: 'signin.html',
    canonicalPath: '/login',
    cacheControl: 'no-store, must-revalidate',
  })
}
