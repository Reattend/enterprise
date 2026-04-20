import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { processAllPendingJobs } from '@/lib/jobs/worker'

export async function POST() {
  try {
    const { workspaceId } = await requireAuth()

    // Get all records in workspace that have embeddings
    const embeddings = await db.query.embeddings.findMany({
      where: eq(schema.embeddings.workspaceId, workspaceId),
    })

    // Queue a link job for each record
    let queued = 0
    for (const emb of embeddings) {
      await db.insert(schema.jobQueue).values({
        workspaceId,
        type: 'link',
        payload: JSON.stringify({ recordId: emb.recordId }),
      })
      queued++
    }

    // Process in background
    processAllPendingJobs().catch(console.error)

    return NextResponse.json({ queued, message: `Queued ${queued} re-link jobs` })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
