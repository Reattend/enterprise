import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { isSandboxEmail } from '@/lib/sandbox/detect'
import { getTodayBriefing, verifiedOrg } from '@/lib/briefing'

// GET /api/me/briefing?orgId=   Today's Start My Day for the active scope
//                                (Personal, or an org the user belongs to).
// POST /api/me/briefing          { email: boolean } - morning email on/off.
export async function GET(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const orgId = await verifiedOrg(userId, req.nextUrl.searchParams.get('orgId'))
    const [u] = await db.select({ tz: schema.users.timezone, email: schema.users.briefingEmail, createdAt: schema.users.createdAt })
      .from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    const briefing = await getTodayBriefing(userId, orgId, u?.tz ?? null, { noAi: isSandboxEmail(session?.user?.email || '') })
    return NextResponse.json({
      briefing,
      emailOn: u?.email ?? true,
      timezoneKnown: !!u?.tz,
      accountAgeDays: u?.createdAt ? Math.floor((Date.now() - new Date(u.createdAt).getTime()) / 86_400_000) : null,
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    console.error('[briefing]', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json().catch(() => ({})) as { email?: boolean }
    if (typeof body.email !== 'boolean') return NextResponse.json({ error: 'email (boolean) required' }, { status: 400 })
    await db.update(schema.users).set({ briefingEmail: body.email }).where(eq(schema.users.id, userId))
    return NextResponse.json({ ok: true, emailOn: body.email })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
