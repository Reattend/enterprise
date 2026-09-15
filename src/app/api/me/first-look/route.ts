import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isSandboxEmail } from '@/lib/sandbox/detect'
import { buildFirstLook, scopeCounts, verifiedOrg } from '@/lib/briefing'

// GET /api/me/first-look?orgId=[&counts=1]
// "Here's what Reattend found" - decisions, dated tasks, people, one link,
// three questions - plus counts (including items still being filed) so the
// import step and the reveal page can show progress live.
export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceId, session } = await requireAuth()
    const orgId = await verifiedOrg(userId, req.nextUrl.searchParams.get('orgId'))
    // ?counts=1: just the numbers, for polling during an import (no AI).
    if (req.nextUrl.searchParams.get('counts') === '1') {
      return NextResponse.json(await scopeCounts(userId, orgId, orgId ? null : workspaceId))
    }
    const look = await buildFirstLook(userId, orgId, orgId ? null : workspaceId, { noAi: isSandboxEmail(session?.user?.email || '') })
    return NextResponse.json({ context: orgId ? 'org' : 'personal', ...look })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    console.error('[first-look]', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
