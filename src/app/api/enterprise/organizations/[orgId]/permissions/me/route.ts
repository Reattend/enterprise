import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPermissionSnapshot } from '@/lib/enterprise/permissions'

// GET /api/enterprise/organizations/[orgId]/permissions/me
//
// Returns the calling user's full permission snapshot for this org —
// org-wide grants + per-department grants. Used by the usePermission()
// hook so the UI can hide buttons the user can't action without round-
// tripping for every check. Server still enforces — this is purely UX.
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const { userId } = await requireAuth()
    const snapshot = await getPermissionSnapshot(userId, orgId)
    if (!snapshot) {
      return NextResponse.json({ error: 'not a member of this organization' }, { status: 403 })
    }
    return NextResponse.json(snapshot)
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    console.error('[permissions/me]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
