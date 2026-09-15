import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { safeTimezone } from '@/lib/briefing'

// POST /api/me/timezone { timezone: 'Asia/Kolkata' }
// The browser reports its IANA zone so the Start My Day email lands in the
// person's morning. Invalid zones are ignored rather than stored.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { timezone } = await req.json().catch(() => ({})) as { timezone?: string }
    if (!timezone || safeTimezone(timezone) !== timezone) return NextResponse.json({ ok: false }, { status: 400 })
    await db.update(schema.users).set({ timezone }).where(eq(schema.users.id, userId))
    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
