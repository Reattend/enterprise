import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { briefingUnsubscribeToken } from '@/lib/briefing'

// One-click unsubscribe for the Start My Day email. The link carries the
// user id and an HMAC of it, so it works without signing in. GET shows a
// small confirmation page; POST is the RFC 8058 List-Unsubscribe-Post form.
function valid(u: string | null, t: string | null): u is string {
  if (!u || !t) return false
  const expected = briefingUnsubscribeToken(u)
  return t.length === expected.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(expected))
}

async function turnOff(req: NextRequest): Promise<boolean> {
  const u = req.nextUrl.searchParams.get('u')
  const t = req.nextUrl.searchParams.get('t')
  if (!valid(u, t)) return false
  await db.update(schema.users).set({ briefingEmail: false }).where(eq(schema.users.id, u))
  return true
}

const page = (ok: boolean) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reattend</title>
<style>body{font-family:-apple-system,Segoe UI,Inter,sans-serif;background:#fafaf7;color:#1c1f26;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
.c{max-width:420px;background:#fff;border:1px solid #e7e7e1;border-radius:14px;padding:28px}h1{font-size:19px;margin:0 0 8px}p{color:#5c6270;line-height:1.5;font-size:14px;margin:0 0 14px}a{color:#4d7c2a;font-weight:600}</style></head>
<body><div class="c">${ok
  ? '<h1>Morning email turned off</h1><p>You will not get Start My Day by email any more. It is still on your Reattend home page, and you can switch the email back on there.</p>'
  : '<h1>That link did not work</h1><p>It may be incomplete. You can turn the morning email off from the Start My Day card on your Reattend home page.</p>'}
<a href="https://reattend.com/app">Open Reattend</a></div></body></html>`

export async function GET(req: NextRequest) {
  const ok = await turnOff(req)
  return new NextResponse(page(ok), { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function POST(req: NextRequest) {
  const ok = await turnOff(req)
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 })
}
