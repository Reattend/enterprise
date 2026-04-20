import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getValidAccessToken } from '@/lib/google'

// GET — return Gmail connection status + settings
export async function GET() {
  try {
    const { userId } = await requireAuth()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'gmail'),
      ),
    })

    if (!connection) {
      return NextResponse.json({ connected: false, settings: null })
    }

    const settings = connection.settings ? JSON.parse(connection.settings) : {}

    // Auto-fetch connectedEmail for existing connections that don't have it
    if (!settings.connectedEmail && connection.status === 'connected' && connection.refreshToken) {
      try {
        const accessToken = await getValidAccessToken(connection.refreshToken, connection.accessToken, connection.tokenExpiresAt)
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json()
          settings.connectedEmail = userInfo.email
          await db.update(schema.integrationsConnections)
            .set({ settings: JSON.stringify(settings), updatedAt: new Date().toISOString() })
            .where(eq(schema.integrationsConnections.id, connection.id))
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      connected: connection.status === 'connected',
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      syncError: connection.syncError,
      connectedEmail: settings.connectedEmail || null,
      settings: {
        domainWhitelist: settings.domainWhitelist || [],
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

// PUT — update settings (domain whitelist, sync enabled)
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'gmail'),
      ),
    })

    if (!connection) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 404 })
    }

    const currentSettings = connection.settings ? JSON.parse(connection.settings) : {}
    const updatedSettings = {
      ...currentSettings,
      ...(body.domainWhitelist !== undefined && { domainWhitelist: body.domainWhitelist }),
      ...(body.syncEnabled !== undefined && { syncEnabled: body.syncEnabled }),
    }

    // If the whitelist changed (new domains added), reset lastSyncedAt so the
    // next sync does a full historical scan for all domains
    const whitelistChanged = body.domainWhitelist !== undefined &&
      JSON.stringify(body.domainWhitelist.sort()) !== JSON.stringify((currentSettings.domainWhitelist || []).slice().sort())

    await db.update(schema.integrationsConnections)
      .set({
        settings: JSON.stringify(updatedSettings),
        ...(whitelistChanged ? { lastSyncedAt: null } : {}),
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

// DELETE — disconnect Gmail
export async function DELETE() {
  try {
    const { userId } = await requireAuth()

    await db.delete(schema.integrationsConnections)
      .where(and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'gmail'),
      ))

    return NextResponse.json({ disconnected: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
