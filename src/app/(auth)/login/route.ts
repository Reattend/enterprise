import fs from 'node:fs/promises'
import path from 'node:path'

// /login — serves the static signin.html from /public/landing-design.
// Same approach as the marketing routes. Inline JS in the HTML wires the
// email/OTP/SSO-ticket flows to the existing /api/auth/* endpoints.

export const dynamic = 'force-static'

let cached: string | null = null

export async function GET() {
  if (!cached) {
    cached = await fs.readFile(
      path.join(process.cwd(), 'public', 'landing-design', 'signin.html'),
      'utf-8',
    )
  }
  return new Response(cached, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // No browser cache: /login carries the OTP submit JS, and we ship
      // bug fixes here often. A stale cached page can leave users stuck
      // on a broken submit handler for up to 5 min after deploy.
      'Cache-Control': 'no-store, must-revalidate',
    },
  })
}
