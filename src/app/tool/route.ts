import { serveLandingPage } from '@/lib/seo/landing-head'

// /tool - the free-tools hub, served from the static marketing design.
// Each card links to a real, interactive tool route (/free-*, /tool/*),
// which stay as React pages.

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'tool.html', canonicalPath: '/tool' })
}
