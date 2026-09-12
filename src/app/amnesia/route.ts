import { serveLandingPage } from '@/lib/seo/landing-head'

// /amnesia - the organizational amnesia essay series, ported from the
// standalone organizationalamnesia.com on 2026-09-11 so all of that traffic
// lands on reattend.com. Static pages live in public/landing-design/amnesia/;
// their essay styles are scoped under .oa and reattend's chrome sits in a
// cascade layer, see the <style> block at the top of each page.

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'amnesia/index.html', canonicalPath: '/amnesia' })
}
