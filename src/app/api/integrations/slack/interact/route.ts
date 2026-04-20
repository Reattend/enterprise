import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { verifySlackSignature, openDmAndSend } from '@/lib/slack'

export async function POST(req: NextRequest) {
  const body = await req.text()

  // Verify Slack signature
  const valid = await verifySlackSignature(req, body)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const params = new URLSearchParams(body)
  const payloadStr = params.get('payload')
  if (!payloadStr) return NextResponse.json({ error: 'No payload' }, { status: 400 })

  const payload = JSON.parse(payloadStr)

  // Message shortcut: "Save to Reattend"
  if (payload.type === 'message_action' && payload.callback_id === 'save_to_reattend') {
    const slackUserId = payload.user?.id
    const teamId = payload.team?.id
    const message = payload.message

    if (!message?.text?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    // Find the Reattend connection for this Slack user+team
    const connections = await db.query.integrationsConnections.findMany({
      where: eq(schema.integrationsConnections.integrationKey, 'slack'),
    })
    const connection = connections.find(c => {
      const s = c.settings ? JSON.parse(c.settings) : {}
      return s.teamId === teamId && s.slackUserId === slackUserId
    })

    if (!connection) {
      // Respond immediately (Slack requires <3s), can't DM without bot token
      return NextResponse.json({
        response_action: 'errors',
        errors: { message: 'Connect your Slack account at reattend.com first.' },
      })
    }

    const settings = JSON.parse(connection.settings || '{}')

    // Find or create Slack source
    let slackSourceId: string
    const existingSource = await db.query.sources.findFirst({
      where: and(
        eq(schema.sources.workspaceId, connection.workspaceId),
        eq(schema.sources.kind, 'chat'),
        eq(schema.sources.label, 'Slack'),
      ),
    })
    if (existingSource) {
      slackSourceId = existingSource.id
    } else {
      slackSourceId = crypto.randomUUID()
      await db.insert(schema.sources).values({
        id: slackSourceId,
        workspaceId: connection.workspaceId,
        kind: 'chat',
        label: 'Slack',
      })
    }

    const channelName = payload.channel?.name || 'unknown'
    const ts = message.ts || String(Date.now() / 1000)
    const externalId = `slack-shortcut-${payload.channel?.id}-${ts}`

    // Dedup check
    const existing = await db.query.rawItems.findFirst({
      where: and(
        eq(schema.rawItems.workspaceId, connection.workspaceId),
        eq(schema.rawItems.externalId, externalId),
      ),
    })

    if (!existing) {
      const content = `Channel: #${channelName}\nFrom: ${message.username || slackUserId}\nDate: ${new Date(parseFloat(ts) * 1000).toISOString()}\nSaved via: Shortcut\n\n${message.text}`
      await db.insert(schema.rawItems).values({
        workspaceId: connection.workspaceId,
        sourceId: slackSourceId,
        externalId,
        author: JSON.stringify({ name: message.username || slackUserId, id: slackUserId }),
        occurredAt: new Date(parseFloat(ts) * 1000).toISOString(),
        text: content.length > 5000 ? content.substring(0, 5000) + '...' : content,
        metadata: JSON.stringify({
          slackMessageTs: ts,
          channelId: payload.channel?.id,
          channelName,
          savedVia: 'shortcut',
        }),
        status: 'new',
      })
    }

    // Send confirmation DM if bot token is available
    if (settings.botToken) {
      openDmAndSend(settings.botToken, slackUserId,
        `Saved to Reattend memory. View it at https://reattend.com/app/inbox`,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Saved to Reattend* :white_check_mark:\n>${message.text.substring(0, 100)}${message.text.length > 100 ? '...' : ''}\n<https://reattend.com/app/inbox?source=slack|View in inbox>`,
            },
          },
        ],
      ).catch(() => { /* non-blocking */ })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
