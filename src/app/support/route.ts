import fs from 'node:fs/promises'
import path from 'node:path'

// /support — served as static design HTML so it shares the landing's chrome.

export const dynamic = 'force-static'

let cached: string | null = null

async function loadHtml(): Promise<string> {
  if (cached) return cached
  const filePath = path.join(process.cwd(), 'public', 'landing-design', 'support.html')
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
