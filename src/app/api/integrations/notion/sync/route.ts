import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { runNotionSync } from '@/lib/integrations/notion'
import { processAllPendingJobs, processNewRawItems } from '@/lib/jobs/worker'

export async function POST() {
  try {
    const { userId, workspaceId } = await requireAuth()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.workspaceId, workspaceId),
        eq(schema.integrationsConnections.integrationKey, 'notion'),
      ),
    })

    if (!connection) {
      return NextResponse.json({ error: 'Notion not connected' }, { status: 400 })
    }

    const result = await runNotionSync(connection, workspaceId)

    // Process new raw items through Rabbit triage
    if (result.synced > 0) {
      await processNewRawItems()
      processAllPendingJobs().catch(console.error)
    }

    return NextResponse.json(result)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
