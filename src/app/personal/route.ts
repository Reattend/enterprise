import { serveLandingPage } from '@/lib/seo/landing-head'

// reattend.com/personal - the lander for individual accounts. Personal is a
// tenant of the same app (a no-org account), not a separate product, so this
// page exists for marketing only; sign-up and sign-in are the shared ones.
export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'personal.html', canonicalPath: '/personal' })
}
