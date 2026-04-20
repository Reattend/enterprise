import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

// GET — return Teams connection status + settings
export async function GET() {
  try {
    const { userId } = await requireAuth()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'microsoft-teams'),
      ),
    })

    if (!connection) {
      return NextResponse.json({ connected: false, settings: null })
    }

    const settings = connection.settings ? JSON.parse(connection.settings) : {}

    return NextResponse.json({
      connected: connection.status === 'connected',
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      syncError: connection.syncError,
      settings: {
        syncEnabled: settings.syncEnabled !== false,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT — update settings
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'microsoft-teams'),
      ),
    })

    if (!connection) {
      return NextResponse.json({ error: 'Teams not connected' }, { status: 404 })
    }

    const currentSettings = connection.settings ? JSON.parse(connection.settings) : {}
    const updatedSettings = {
      ...currentSettings,
      ...(body.syncEnabled !== undefined && { syncEnabled: body.syncEnabled }),
    }

    await db.update(schema.integrationsConnections)
      .set({
        settings: JSON.stringify(updatedSettings),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.integrationsConnections.id, connection.id))

    return NextResponse.json({ settings: updatedSettings })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE — disconnect Teams
export async function DELETE() {
  try {
    const { userId } = await requireAuth()

    await db.delete(schema.integrationsConnections)
      .where(and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'microsoft-teams'),
      ))

    return NextResponse.json({ disconnected: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
