import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { handleEnterpriseError } from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/records/[id]/view
// Fire-and-forget. Records a view for trending + admin analytics. Idempotent
// isn't required; we want every view counted. RBAC is deliberately loose —
// if the user can't read the record they wouldn't get here anyway, and
// falsely counting a blocked view is a minor metric-noise issue only.

export async function POST(_req: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  try {
    const { recordId: id } = await params
    const { userId } = await requireAuth()

    // Cheap existence check — avoid FK violations on deleted records
    const rec = await db.query.records.findFirst({ where: eq(schema.records.id, id) })
    if (!rec) return NextResponse.json({ ok: false }, { status: 200 })

    try {
      await db.insert(schema.recordViews).values({ recordId: id, userId })
    } catch (err) {
      // non-fatal — view tracking is best-effort
      console.warn('[record-view] insert failed', err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
