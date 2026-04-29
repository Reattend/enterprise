import fs from 'node:fs/promises'
import path from 'node:path'

// Root route handler — serves the static landing page directly as HTML.
//
// We deliberately bypass Next.js layout/metadata for the marketing root: the
// landing.html in /public/landing-design has its own <head> (title, meta,
// Google Fonts), its own <body>, and its own inline scripts. Returning it
// raw preserves the design-prototype fidelity 1:1.
//
// The companion CSS files live alongside it at /public/landing-design/*.css
// and load via absolute hrefs, so they're served by Next's static handler.

export const dynamic = 'force-static'

let cached: string | null = null

async function loadHtml(): Promise<string> {
  if (cached) return cached
  const filePath = path.join(process.cwd(), 'public', 'landing-design', 'landing.html')
  cached = await fs.readFile(filePath, 'utf-8')
  return cached
}

export async function GET() {
  const html = await loadHtml()
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
