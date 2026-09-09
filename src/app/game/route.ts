import { serveLandingPage } from '@/lib/seo/landing-head'

// /game - the free team-games hub, served from the static marketing design.
// Each card links to a real, playable game route (/game/*), which stay as
// React pages.

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'game.html', canonicalPath: '/game' })
}
