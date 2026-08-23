import { serveLandingPage } from '@/lib/seo/landing-head'

// Root route - serves the static landing.html from /public/landing-design
// with SEO (JSON-LD, og:tags, GA, canonical) injected server-side. The
// static HTML keeps its self-contained <head>; we only add what was
// missing because this route bypasses the React <RootLayout>.

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'landing.html', canonicalPath: '/' })
}
