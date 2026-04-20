import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET() {
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
      return NextResponse.json({ connected: false })
    }

    const settings = connection.settings ? JSON.parse(connection.settings) : {}

    return NextResponse.json({
      connected: connection.status === 'connected',
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      syncError: connection.syncError,
      workspaceName: settings.workspaceName || null,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { userId, workspaceId } = await requireAuth()

    await db.delete(schema.integrationsConnections)
      .where(and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.workspaceId, workspaceId),
        eq(schema.integrationsConnections.integrationKey, 'notion'),
      ))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
