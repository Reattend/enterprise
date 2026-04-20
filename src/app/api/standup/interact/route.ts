import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { verifyStandupRequest, standupSlackPost, buildSummaryBlocks } from '@/lib/slack-standup'

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text()
    const timestamp = req.headers.get('x-slack-request-timestamp') || ''
    const signature = req.headers.get('x-slack-signature') || ''

    if (!verifyStandupRequest(bodyText, timestamp, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const params = new URLSearchParams(bodyText)
    const payloadStr = params.get('payload')
    if (!payloadStr) {
      return NextResponse.json({ error: 'No payload' }, { status: 400 })
    }

    const payload = JSON.parse(payloadStr)
    const { type, trigger_id, user, actions, view } = payload

    // ── BUTTON CLICK: Open answer modal ──
    if (type === 'block_actions' && actions?.[0]?.action_id === 'standup_answer') {
      const { configId, sessionId } = JSON.parse(actions[0].value)
      const teamId = payload.team?.id

      const team = await db.query.standupTeams.findFirst({
        where: eq(schema.standupTeams.slackTeamId, teamId),
      })
      if (!team) return new Response('', { status: 200 })

      // Check if already answered
      const existing = await db.query.standupResponses.findFirst({
        where: and(
          eq(schema.standupResponses.sessionId, sessionId),
          eq(schema.standupResponses.userId, user.id),
        ),
      })
      if (existing) {
        await standupSlackPost('chat.postEphemeral', team.botToken, {
          channel: payload.channel?.id,
          user: user.id,
          text: '✅ You\'ve already submitted your standup for today!',
        })
        return new Response('', { status: 200 })
      }

      // Get config for questions
      const config = await db.query.standupConfigs.findFirst({
        where: eq(schema.standupConfigs.id, configId),
      })
      if (!config) return new Response('', { status: 200 })

      const questions = JSON.parse(config.questions) as string[]

      // Build input blocks for each question
      const inputBlocks = questions.map((q, i) => ({
        type: 'input',
        block_id: `q_${i}`,
        element: {
          type: 'plain_text_input',
          action_id: `a_${i}`,
          multiline: true,
          placeholder: { type: 'plain_text', text: 'Your answer...' },
        },
        label: { type: 'plain_text', text: q },
      }))

      await standupSlackPost('views.open', team.botToken, {
        trigger_id,
        view: {
          type: 'modal',
          callback_id: 'standup_submit',
          private_metadata: JSON.stringify({ sessionId, configId }),
          title: { type: 'plain_text', text: 'Daily Standup' },
          submit: { type: 'plain_text', text: 'Submit' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📋 *#${config.channelName || 'standup'}* — Fill in your update:`,
              },
            },
            ...inputBlocks,
          ],
        },
      })

      return new Response('', { status: 200 })
    }

    // ── MODAL SUBMIT: Setup standup config ──
    if (type === 'view_submission' && view?.callback_id === 'standup_setup') {
      const { channelId } = JSON.parse(view.private_metadata)
      const teamId = payload.team?.id || view.team_id

      const team = await db.query.standupTeams.findFirst({
        where: eq(schema.standupTeams.slackTeamId, teamId),
      })
      if (!team) {
        return NextResponse.json({
          response_action: 'errors',
          errors: { questions_block: 'Team not found. Please reinstall the app.' },
        })
      }

      // Parse form values
      const values = view.state?.values || {}
      const questionsRaw = values.questions_block?.questions_input?.value || ''
      const timeRaw = values.time_block?.time_input?.value || '09:00'
      const timezoneRaw = values.timezone_block?.timezone_input?.selected_option?.value || 'America/New_York'
      const daysRaw = values.days_block?.days_input?.selected_options || []

      // Validate
      const questions = questionsRaw.split('\n').map((q: string) => q.trim()).filter((q: string) => q.length > 0)
      if (questions.length === 0) {
        return NextResponse.json({
          response_action: 'errors',
          errors: { questions_block: 'Please enter at least one question.' },
        })
      }

      const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})$/)
      if (!timeMatch || parseInt(timeMatch[1]) > 23 || parseInt(timeMatch[2]) > 59) {
        return NextResponse.json({
          response_action: 'errors',
          errors: { time_block: 'Please enter a valid time in 24h format (e.g. 09:00).' },
        })
      }
      const scheduleTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`

      const scheduleDays = daysRaw.map((opt: any) => parseInt(opt.value))
      if (scheduleDays.length === 0) {
        return NextResponse.json({
          response_action: 'errors',
          errors: { days_block: 'Please select at least one day.' },
        })
      }

      // Get channel name
      let channelName = channelId
      try {
        const infoRes = await standupSlackPost('conversations.info', team.botToken, {
          channel: channelId,
        })
        if (infoRes.ok) channelName = infoRes.channel?.name || channelId
      } catch {
        // Use channelId as fallback
      }

      // Upsert config (one standup per channel)
      const existingConfig = await db.query.standupConfigs.findFirst({
        where: and(
          eq(schema.standupConfigs.teamId, team.id),
          eq(schema.standupConfigs.channelId, channelId),
        ),
      })

      if (existingConfig) {
        await db.update(schema.standupConfigs)
          .set({
            questions: JSON.stringify(questions),
            scheduleDays: JSON.stringify(scheduleDays),
            scheduleTime,
            timezone: timezoneRaw,
            channelName,
            isActive: true,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.standupConfigs.id, existingConfig.id))
      } else {
        await db.insert(schema.standupConfigs).values({
          teamId: team.id,
          channelId,
          channelName,
          questions: JSON.stringify(questions),
          scheduleDays: JSON.stringify(scheduleDays),
          scheduleTime,
          timezone: timezoneRaw,
        })
      }

      // Post confirmation to channel
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayStr = scheduleDays.sort().map((d: number) => dayNames[d]).join(', ')

      await standupSlackPost('chat.postMessage', team.botToken, {
        channel: channelId,
        text: `Standup configured for this channel!`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Standup configured for #${channelName}!*\n\n` +
                `*Schedule:* ${dayStr} at ${scheduleTime} (${timezoneRaw})\n` +
                `*Questions:*\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}\n\n` +
                `Use \`/standup trigger\` to test it now, or wait for the scheduled time.`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '_Powered by <https://reattend.com/free-standup-bot|Reattend Standups> — Free async standups for Slack_',
              },
            ],
          },
        ],
      })

      // Close modal with success
      return NextResponse.json({
        response_action: 'update',
        view: {
          type: 'modal',
          title: { type: 'plain_text', text: 'Standup Configured' },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `✅ *Standup is set up!*\n\nYour team will receive DMs at ${scheduleTime} (${timezoneRaw}) on ${dayStr}.\n\nUse \`/standup trigger\` in the channel to test it right now.`,
              },
            },
          ],
        },
      })
    }

    // ── MODAL SUBMIT: Standup answer ──
    if (type === 'view_submission' && view?.callback_id === 'standup_submit') {
      const { sessionId, configId } = JSON.parse(view.private_metadata)
      const values = view.state?.values || {}

      // Get config to know how many questions
      const config = await db.query.standupConfigs.findFirst({
        where: eq(schema.standupConfigs.id, configId),
      })
      if (!config) return new Response('', { status: 200 })

      const questions = JSON.parse(config.questions) as string[]
      const answers: string[] = []

      for (let i = 0; i < questions.length; i++) {
        const val = values[`q_${i}`]?.[`a_${i}`]?.value || ''
        if (!val.trim()) {
          return NextResponse.json({
            response_action: 'errors',
            errors: { [`q_${i}`]: 'Please answer this question.' },
          })
        }
        answers.push(val.trim())
      }

      // Duplicate guard
      const existing = await db.query.standupResponses.findFirst({
        where: and(
          eq(schema.standupResponses.sessionId, sessionId),
          eq(schema.standupResponses.userId, user.id),
        ),
      })

      if (!existing) {
        await db.insert(schema.standupResponses).values({
          sessionId,
          userId: user.id,
          answers: JSON.stringify(answers),
        })
      }

      // Check if all participants responded
      const session = await db.query.standupSessions.findFirst({
        where: eq(schema.standupSessions.id, sessionId),
      })
      if (session && session.status === 'collecting') {
        const allResponses = await db.query.standupResponses.findMany({
          where: eq(schema.standupResponses.sessionId, sessionId),
        })

        // Get expected participant count
        const participants = config.participants ? JSON.parse(config.participants) as string[] : []
        let expectedCount = participants.length

        if (expectedCount === 0) {
          // Channel-based — get member count
          const team = await db.query.standupTeams.findFirst({
            where: eq(schema.standupTeams.id, config.teamId),
          })
          if (team) {
            try {
              const membersRes = await standupSlackPost('conversations.members', team.botToken, {
                channel: config.channelId,
                limit: 200,
              })
              if (membersRes.ok) expectedCount = membersRes.members?.length || 0
            } catch {
              expectedCount = 999 // Don't auto-post if we can't check
            }
          }
        }

        // If all responded, auto-post summary
        if (allResponses.length >= expectedCount && expectedCount > 0) {
          const team = await db.query.standupTeams.findFirst({
            where: eq(schema.standupTeams.id, config.teamId),
          })
          if (team) {
            const blocks = buildSummaryBlocks(
              allResponses.map(r => ({ userId: r.userId, answers: JSON.parse(r.answers) as string[] })),
              questions,
              config.channelName || config.channelId,
              session.date,
            )
            const postRes = await standupSlackPost('chat.postMessage', team.botToken, {
              channel: config.channelId,
              text: `📋 Standup Summary — ${session.date}`,
              blocks,
            })
            await db.update(schema.standupSessions)
              .set({ status: 'posted' as any, summaryTs: postRes.ok ? postRes.ts : null })
              .where(eq(schema.standupSessions.id, session.id))
          }
        }
      }

      // Close modal with success
      return NextResponse.json({
        response_action: 'update',
        view: {
          type: 'modal',
          title: { type: 'plain_text', text: 'Standup Submitted' },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ *Update submitted!*\n\nYour standup has been recorded. The summary will be posted to the channel once everyone responds (or after the deadline).',
              },
            },
          ],
        },
      })
    }

    return new Response('', { status: 200 })
  } catch (error: any) {
    console.error('[Standup Interact Error]', error)
    return new Response('', { status: 200 })
  }
}
