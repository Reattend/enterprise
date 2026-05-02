import fs from 'node:fs/promises'
import path from 'node:path'

// /sandbox — public try-it-now entry, served as the static design HTML so it
// shares the landing's chrome and design language. Replaces the prior React
// page; the launch flow lives in the inline <script> in sandbox.html and
// hits the same /api/sandbox/launch endpoint + NextAuth credentials callback.

export const dynamic = 'force-static'

let cached: string | null = null

async function loadHtml(): Promise<string> {
  if (cached) return cached
  const filePath = path.join(process.cwd(), 'public', 'landing-design', 'sandbox.html')
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
