import { serveLandingPage } from '@/lib/seo/landing-head'

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'amnesia/quiz.html', canonicalPath: '/amnesia/quiz' })
}
