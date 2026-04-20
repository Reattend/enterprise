import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  verifyStandupRequest,
  standupSlackPost,
  DEFAULT_QUESTIONS,
  COMMON_TIMEZONES,
} from '@/lib/slack-standup'

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text()
    const timestamp = req.headers.get('x-slack-request-timestamp') || ''
    const signature = req.headers.get('x-slack-signature') || ''

    if (!verifyStandupRequest(bodyText, timestamp, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const params = new URLSearchParams(bodyText)
    const teamId = params.get('team_id') || ''
    const channelId = params.get('channel_id') || ''
    const commandText = (params.get('text') || '').trim().toLowerCase()
    const triggerId = params.get('trigger_id') || ''

    // Find team
    const team = await db.query.standupTeams.findFirst({
      where: eq(schema.standupTeams.slackTeamId, teamId),
    })
    if (!team) {
      return new Response(
        'Reattend Standups is not installed for this workspace. Visit https://reattend.com/free-standup-bot to install.',
        { status: 200 },
      )
    }

    // ── SETUP ──
    if (commandText === 'setup') {
      const timezoneOptions = COMMON_TIMEZONES.map(tz => ({
        text: { type: 'plain_text' as const, text: tz.label },
        value: tz.value,
      }))

      await standupSlackPost('views.open', team.botToken, {
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'standup_setup',
          private_metadata: JSON.stringify({ channelId }),
          title: { type: 'plain_text', text: 'Setup Standup' },
          submit: { type: 'plain_text', text: 'Create Standup' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'input',
              block_id: 'questions_block',
              element: {
                type: 'plain_text_input',
                action_id: 'questions_input',
                multiline: true,
                initial_value: DEFAULT_QUESTIONS.join('\n'),
                placeholder: { type: 'plain_text', text: 'One question per line' },
              },
              label: { type: 'plain_text', text: 'Standup Questions' },
              hint: { type: 'plain_text', text: 'One question per line. You can customize these.' },
            },
            {
              type: 'input',
              block_id: 'time_block',
              element: {
                type: 'plain_text_input',
                action_id: 'time_input',
                initial_value: '09:00',
                placeholder: { type: 'plain_text', text: '09:00' },
              },
              label: { type: 'plain_text', text: 'Send Time (24h format)' },
              hint: { type: 'plain_text', text: 'e.g. 09:00, 14:30' },
            },
            {
              type: 'input',
              block_id: 'timezone_block',
              element: {
                type: 'static_select',
                action_id: 'timezone_input',
                initial_option: timezoneOptions[0],
                options: timezoneOptions,
              },
              label: { type: 'plain_text', text: 'Timezone' },
            },
            {
              type: 'input',
              block_id: 'days_block',
              element: {
                type: 'checkboxes',
                action_id: 'days_input',
                initial_options: [
                  { text: { type: 'plain_text', text: 'Monday' }, value: '1' },
                  { text: { type: 'plain_text', text: 'Tuesday' }, value: '2' },
                  { text: { type: 'plain_text', text: 'Wednesday' }, value: '3' },
                  { text: { type: 'plain_text', text: 'Thursday' }, value: '4' },
                  { text: { type: 'plain_text', text: 'Friday' }, value: '5' },
                ],
                options: [
                  { text: { type: 'plain_text', text: 'Monday' }, value: '1' },
                  { text: { type: 'plain_text', text: 'Tuesday' }, value: '2' },
                  { text: { type: 'plain_text', text: 'Wednesday' }, value: '3' },
                  { text: { type: 'plain_text', text: 'Thursday' }, value: '4' },
                  { text: { type: 'plain_text', text: 'Friday' }, value: '5' },
                  { text: { type: 'plain_text', text: 'Saturday' }, value: '6' },
                  { text: { type: 'plain_text', text: 'Sunday' }, value: '0' },
                ],
              },
              label: { type: 'plain_text', text: 'Days to Run' },
            },
          ],
        },
      })
      return new Response('', { status: 200 })
    }

    // ── LIST ──
    if (commandText === 'list') {
      const configs = await db.query.standupConfigs.findMany({
        where: eq(schema.standupConfigs.teamId, team.id),
      })

      if (configs.length === 0) {
        return new Response(
          'No standups configured yet. Use `/standup setup` in any channel to create one.',
          { status: 200 },
        )
      }

      const lines = configs.map(c => {
        const status = c.isActive ? '🟢 Active' : '⏸️ Paused'
        const days = JSON.parse(c.scheduleDays) as number[]
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const dayStr = days.map(d => dayNames[d]).join(', ')
        return `• *#${c.channelName || c.channelId}* — ${status} — ${c.scheduleTime} ${c.timezone} (${dayStr})`
      })

      return new Response(
        `*Configured Standups:*\n\n${lines.join('\n')}`,
        { status: 200 },
      )
    }

    // ── PAUSE ──
    if (commandText === 'pause') {
      const config = await db.query.standupConfigs.findFirst({
        where: and(
          eq(schema.standupConfigs.teamId, team.id),
          eq(schema.standupConfigs.channelId, channelId),
        ),
      })
      if (!config) {
        return new Response('No standup configured for this channel. Use `/standup setup` first.', { status: 200 })
      }
      await db.update(schema.standupConfigs)
        .set({ isActive: false, updatedAt: new Date().toISOString() })
        .where(eq(schema.standupConfigs.id, config.id))
      return new Response('⏸️ Standup paused for this channel. Use `/standup resume` to restart.', { status: 200 })
    }

    // ── RESUME ──
    if (commandText === 'resume') {
      const config = await db.query.standupConfigs.findFirst({
        where: and(
          eq(schema.standupConfigs.teamId, team.id),
          eq(schema.standupConfigs.channelId, channelId),
        ),
      })
      if (!config) {
        return new Response('No standup configured for this channel. Use `/standup setup` first.', { status: 200 })
      }
      await db.update(schema.standupConfigs)
        .set({ isActive: true, updatedAt: new Date().toISOString() })
        .where(eq(schema.standupConfigs.id, config.id))
      return new Response('🟢 Standup resumed for this channel!', { status: 200 })
    }

    // ── TRIGGER (manual run) ──
    if (commandText === 'trigger') {
      const config = await db.query.standupConfigs.findFirst({
        where: and(
          eq(schema.standupConfigs.teamId, team.id),
          eq(schema.standupConfigs.channelId, channelId),
        ),
      })
      if (!config) {
        return new Response('No standup configured for this channel. Use `/standup setup` first.', { status: 200 })
      }

      // Trigger by calling the cron endpoint internally
      const { triggerStandupSession } = await import('@/lib/slack-standup-cron')
      const dateStr = new Date().toISOString().slice(0, 10)
      await triggerStandupSession(config, team, dateStr)
      return new Response('📋 Standup triggered! DMs are being sent now.', { status: 200 })
    }

    // ── HELP (default) ──
    return new Response(
      `*Reattend Standups* — Free async standups for Slack\n\n` +
      `• \`/standup setup\` — Configure a standup for this channel\n` +
      `• \`/standup list\` — List all configured standups\n` +
      `• \`/standup trigger\` — Manually trigger today's standup now\n` +
      `• \`/standup pause\` — Pause the standup in this channel\n` +
      `• \`/standup resume\` — Resume a paused standup\n\n` +
      `_<https://reattend.com/free-standup-bot|Learn more about Reattend Standups>_`,
      { status: 200 },
    )
  } catch (error: any) {
    console.error('[Standup Command Error]', error)
    return new Response('Something went wrong. Please try again.', { status: 200 })
  }
}
