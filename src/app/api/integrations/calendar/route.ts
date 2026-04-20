import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getValidAccessToken, listCalendars } from '@/lib/google'

export async function GET() {
  try {
    const { userId } = await requireAuth()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'google-calendar'),
      ),
    })

    if (!connection) {
      return NextResponse.json({ connected: false, settings: null, calendars: [] })
    }

    const settings = connection.settings ? JSON.parse(connection.settings) : {}

    let calendars: Array<{ id: string; summary: string; primary?: boolean }> = []
    if (connection.status === 'connected' && connection.refreshToken) {
      try {
        const accessToken = await getValidAccessToken(connection.refreshToken, connection.accessToken, connection.tokenExpiresAt)
        const list = await listCalendars(accessToken)
        calendars = list
          .filter(c => c.accessRole === 'owner' || c.accessRole === 'writer' || c.primary)
          .map(c => ({ id: c.id, summary: c.summary, primary: c.primary }))

        // Auto-fetch connectedEmail for existing connections that don't have it yet
        const updatedSettings = { ...settings }
        if (!settings.connectedEmail) {
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
            if (userInfoRes.ok) {
              const userInfo = await userInfoRes.json()
              updatedSettings.connectedEmail = userInfo.email
            }
          } catch { /* non-fatal */ }
        }

        const tokenChanged = accessToken !== connection.accessToken
        const emailChanged = updatedSettings.connectedEmail !== settings.connectedEmail
        if (tokenChanged || emailChanged) {
          await db.update(schema.integrationsConnections)
            .set({ accessToken, settings: JSON.stringify(updatedSettings), updatedAt: new Date().toISOString() })
            .where(eq(schema.integrationsConnections.id, connection.id))
          Object.assign(settings, updatedSettings)
        }
      } catch (e: any) {
        console.error('[Calendar GET] Could not fetch calendar list:', e.message)
      }
    }

    return NextResponse.json({
      connected: connection.status === 'connected',
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      syncError: connection.syncError,
      connectedEmail: settings.connectedEmail || null,
      settings: {
        syncEnabled: settings.syncEnabled !== false,
        syncDays: settings.syncDays ?? 30,
        selectedCalendars: settings.selectedCalendars || [],
      },
      calendars,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'google-calendar'),
      ),
    })

    if (!connection) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 404 })
    }

    const currentSettings = connection.settings ? JSON.parse(connection.settings) : {}
    const updatedSettings = {
      ...currentSettings,
      ...(body.syncEnabled !== undefined && { syncEnabled: body.syncEnabled }),
      ...(body.syncDays !== undefined && { syncDays: body.syncDays }),
      ...(body.selectedCalendars !== undefined && { selectedCalendars: body.selectedCalendars }),
    }

    // Reset lastSyncedAt if selected calendars changed — forces full rescan for new calendars
    const calendarsChanged = body.selectedCalendars !== undefined &&
      JSON.stringify([...(body.selectedCalendars)].sort()) !== JSON.stringify([...(currentSettings.selectedCalendars || [])].sort())

    await db.update(schema.integrationsConnections)
      .set({
        settings: JSON.stringify(updatedSettings),
        ...(calendarsChanged ? { lastSyncedAt: null } : {}),
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

export async function DELETE() {
  try {
    const { userId } = await requireAuth()

    await db.delete(schema.integrationsConnections)
      .where(and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'google-calendar'),
      ))

    return NextResponse.json({ disconnected: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
