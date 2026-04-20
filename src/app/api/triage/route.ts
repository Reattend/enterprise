import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { runTriageAgent } from '@/lib/ai'
import { processAllPendingJobs } from '@/lib/jobs/worker'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireAuth()
    const body = await req.json()
    const { raw_item_id, bulk } = body

    if (bulk) {
      const items = await db.query.rawItems.findMany({
        where: and(
          eq(schema.rawItems.workspaceId, workspaceId),
          eq(schema.rawItems.status, 'new'),
        ),
      })

      const results = []
      for (const item of items) {
        try {
          const result = await runTriageAgent(item.id, workspaceId)
          results.push({ id: item.id, result })
        } catch (e: any) {
          results.push({ id: item.id, error: e.message })
        }
      }

      await processAllPendingJobs()
      return NextResponse.json({ processed: results.length, results })
    }

    if (!raw_item_id) {
      return NextResponse.json({ error: 'raw_item_id required' }, { status: 400 })
    }

    const result = await runTriageAgent(raw_item_id, workspaceId)
    await processAllPendingJobs()

    return NextResponse.json({ result })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
