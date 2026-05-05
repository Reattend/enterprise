import { serveLandingPage } from '@/lib/seo/landing-head'

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'coming-soon.html', canonicalPath: '/coming-soon' })
}
