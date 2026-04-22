import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, like, or, and, desc } from 'drizzle-orm'
import { verifySlackSignature, openDmAndSend } from '@/lib/slack'

export async function POST(req: NextRequest) {
  const body = await req.text()

  // Verify Slack signature
  const valid = await verifySlackSignature(req, body)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const params = new URLSearchParams(body)
  const slackUserId = params.get('user_id') || ''
  const teamId = params.get('team_id') || ''
  const text = (params.get('text') || '').trim()
  const responseUrl = params.get('response_url') || ''

  // Parse sub-command: /reattend save [text] | /reattend search [query]
  const [subCmd, ...rest] = text.split(' ')
  const arg = rest.join(' ').trim()

  // Find connection
  const connections = await db.query.integrationsConnections.findMany({
    where: eq(schema.integrationsConnections.integrationKey, 'slack'),
  })
  const connection = connections.find(c => {
    const s = c.settings ? JSON.parse(c.settings) : {}
    return s.teamId === teamId && s.slackUserId === slackUserId
  })

  if (!connection) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Connect your Slack account at *reattend.com* first.',
    })
  }

  const settings = JSON.parse(connection.settings || '{}')

  if (subCmd === 'save' || (!subCmd && arg)) {
    const textToSave = subCmd === 'save' ? arg : text
    if (!textToSave) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: 'Usage: `/reattend save [your note]`',
      })
    }

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

    const ts = String(Date.now() / 1000)
    const externalId = `slack-cmd-${slackUserId}-${ts}`
    const content = `From: ${slackUserId}\nDate: ${new Date().toISOString()}\nSaved via: /reattend save\n\n${textToSave}`

    await db.insert(schema.rawItems).values({
      workspaceId: connection.workspaceId,
      sourceId: slackSourceId,
      externalId,
      author: JSON.stringify({ id: slackUserId }),
      occurredAt: new Date().toISOString(),
      text: content.length > 5000 ? content.substring(0, 5000) : content,
      metadata: JSON.stringify({ savedVia: 'slash_command', slackUserId }),
      status: 'new',
    })

    // Acknowledge immediately with ephemeral message
    const response = NextResponse.json({
      response_type: 'ephemeral',
      text: ':white_check_mark: Saved to Reattend memory.',
    })

    // Also send DM confirmation if bot token available
    if (settings.botToken) {
      openDmAndSend(settings.botToken, slackUserId,
        'Saved to Reattend memory.',
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Saved to Reattend* :white_check_mark:\n>${textToSave.substring(0, 100)}${textToSave.length > 100 ? '...' : ''}\n<https://reattend.com/app/inbox?source=slack|View in inbox>`,
            },
          },
        ],
      ).catch(() => { /* non-blocking */ })
    }

    return response
  }

  if (subCmd === 'search') {
    if (!arg) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: 'Usage: `/reattend search [query]`',
      })
    }

    const query = `%${arg}%`
    const results = await db.query.records.findMany({
      where: and(
        eq(schema.records.workspaceId, connection.workspaceId),
        or(
          like(schema.records.title, query),
          like(schema.records.summary, query),
          like(schema.records.content, query),
        ),
      ),
      orderBy: desc(schema.records.createdAt),
      limit: 5,
    })

    if (results.length === 0) {
      // Respond asynchronously via response_url for richer format
      fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: `No memories found for _${arg}_. Try different keywords.`,
        }),
      }).catch(() => { /* non-blocking */ })

      return NextResponse.json({
        response_type: 'ephemeral',
        text: `Searching Reattend for _${arg}_...`,
      })
    }

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reattend search results for* _${arg}_:`,
        },
      },
      { type: 'divider' },
      ...results.map(r => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${r.title}*\n${r.summary ? r.summary.substring(0, 120) + (r.summary.length > 120 ? '...' : '') : ''}`,
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'View' },
          url: `https://reattend.com/app/memory/${r.id}`,
          action_id: `view_record_${r.id}`,
        },
      })),
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `<https://reattend.com/app/memories?q=${encodeURIComponent(arg)}|See all results in Reattend>`,
        }],
      },
    ]

    // Respond with results via response_url (async, richer content)
    fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        blocks,
      }),
    }).catch(() => { /* non-blocking */ })

    return NextResponse.json({
      response_type: 'ephemeral',
      text: `Searching Reattend for _${arg}_...`,
    })
  }

  // Default: show help
  return NextResponse.json({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Reattend Slash Commands*\n`/reattend save [note]` — Save a note to your Reattend memory\n`/reattend search [query]` — Search your Reattend memories',
        },
      },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: '<https://reattend.com/app/integrations|Manage Reattend integration>',
        }],
      },
    ],
  })
}
