import fs from 'node:fs/promises'
import path from 'node:path'

// /integrations — served as static design HTML. The integration catalog is
// rendered client-side from a JS array in the page script (~70 entries
// across 9 categories with search + chip filtering).

export const dynamic = 'force-static'

let cached: string | null = null

async function loadHtml(): Promise<string> {
  if (cached) return cached
  const filePath = path.join(process.cwd(), 'public', 'landing-design', 'integrations.html')
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
