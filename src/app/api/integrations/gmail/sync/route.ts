import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { runGmailSync } from '@/lib/integrations/gmail'

export async function POST() {
  try {
    const { userId, workspaceId } = await requireAuth()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'gmail'),
      ),
    })

    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 })
    }

    const result = await runGmailSync(connection, workspaceId)

    // Kick off background processing
    try {
      const origin = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
      fetch(`${origin}/api/jobs/process`, { method: 'POST' }).catch(() => {})
    } catch {}

    return NextResponse.json({
      ...result,
      message: result.synced > 0 ? `Synced ${result.synced} email thread${result.synced !== 1 ? 's' : ''}` : 'No new threads found',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
