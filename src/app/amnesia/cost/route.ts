import { serveLandingPage } from '@/lib/seo/landing-head'

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'amnesia/cost.html', canonicalPath: '/amnesia/cost' })
}
