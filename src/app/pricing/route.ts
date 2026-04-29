import fs from 'node:fs/promises'
import path from 'node:path'

// /pricing — serves the static pricing.html from /public/landing-design.
// Same approach as the root landing route: bypass Next.js layout/metadata
// in favor of the prototype's self-contained <head> + body + inline scripts.

export const dynamic = 'force-static'

let cached: string | null = null

async function loadHtml(): Promise<string> {
  if (cached) return cached
  const filePath = path.join(process.cwd(), 'public', 'landing-design', 'pricing.html')
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
