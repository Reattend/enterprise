import { serveLandingPage } from '@/lib/seo/landing-head'

// /personal — the side door for individual users.
//
// Same product, same codebase, same /app — just a marketing surface that
// pitches the solo use case ("Notion + Obsidian + Reattend's AI") without
// touching the homepage's narrowing on the 200-person-startup ICP.

export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'personal.html', canonicalPath: '/personal' })
}
