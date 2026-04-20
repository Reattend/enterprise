import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { verifySlackSignature } from '@/lib/slack'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const payload = JSON.parse(body)

  // url_verification must be handled before signature check (one-time setup handshake)
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge })
  }

  // Verify Slack signature for all other events
  const valid = await verifySlackSignature(req, body)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (payload.type === 'event_callback') {
    const event = payload.event

    // app_uninstalled: user removed the app from their Slack workspace
    if (event.type === 'app_uninstalled') {
      const teamId = payload.team_id
      // Find all connections for this Slack team and mark them disconnected
      const connections = await db.query.integrationsConnections.findMany({
        where: eq(schema.integrationsConnections.integrationKey, 'slack'),
      })
      for (const conn of connections) {
        const settings = conn.settings ? JSON.parse(conn.settings) : {}
        if (settings.teamId === teamId) {
          await db.update(schema.integrationsConnections)
            .set({
              status: 'disconnected',
              accessToken: null,
              refreshToken: null,
              syncError: 'App was uninstalled from Slack workspace',
              updatedAt: new Date().toISOString(),
            })
            .where(and(
              eq(schema.integrationsConnections.id, conn.id),
              eq(schema.integrationsConnections.integrationKey, 'slack'),
            ))
        }
      }
    }

    // tokens_revoked: user revoked app permissions
    if (event.type === 'tokens_revoked') {
      const teamId = payload.team_id
      const connections = await db.query.integrationsConnections.findMany({
        where: eq(schema.integrationsConnections.integrationKey, 'slack'),
      })
      for (const conn of connections) {
        const settings = conn.settings ? JSON.parse(conn.settings) : {}
        if (settings.teamId === teamId) {
          await db.update(schema.integrationsConnections)
            .set({
              status: 'error',
              syncError: 'Slack tokens revoked — please reconnect',
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.integrationsConnections.id, conn.id))
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
