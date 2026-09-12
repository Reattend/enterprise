import { serveLandingPage } from '@/lib/seo/landing-head'

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'amnesia/ai-memory.html', canonicalPath: '/amnesia/ai-memory' })
}
