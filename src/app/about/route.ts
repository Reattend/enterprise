import fs from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-static'

let cached: string | null = null

export async function GET() {
  if (!cached) {
    cached = await fs.readFile(
      path.join(process.cwd(), 'public', 'landing-design', 'about.html'),
      'utf-8',
    )
  }
  return new Response(cached, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
