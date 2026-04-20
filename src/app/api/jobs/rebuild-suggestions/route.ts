import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function POST() {
  try {
    const { workspaceId } = await requireAuth()

    // Delete existing project suggestions for this workspace
    await db.delete(schema.projectSuggestions)
      .where(eq(schema.projectSuggestions.workspaceId, workspaceId))

    // Get all records in workspace
    const records = await db.query.records.findMany({
      where: eq(schema.records.workspaceId, workspaceId),
    })

    // Queue triage jobs for each record to regenerate project suggestions
    let queued = 0
    for (const record of records) {
      if (record.rawItemId) {
        await db.insert(schema.jobQueue).values({
          workspaceId,
          type: 'triage',
          payload: JSON.stringify({ rawItemId: record.rawItemId }),
        })
        queued++
      }
    }

    return NextResponse.json({ queued, message: `Cleared old suggestions, queued ${queued} for re-analysis` })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
