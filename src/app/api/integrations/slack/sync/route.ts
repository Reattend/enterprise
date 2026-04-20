import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { runSlackSync } from '@/lib/integrations/slack'

export async function POST() {
  try {
    const { userId, workspaceId } = await requireAuth()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'slack'),
      ),
    })

    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 })
    }

    const result = await runSlackSync(connection, workspaceId)

    return NextResponse.json({
      ...result,
      inboxUrl: '/app/inbox?source=slack',
    })
  } catch (error: any) {
    console.error('[Slack Sync Error]', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
