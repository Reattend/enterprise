import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { verifySlackRequest, slackPost } from '@/lib/slack-game'

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text()
    const timestamp = req.headers.get('x-slack-request-timestamp') || ''
    const signature = req.headers.get('x-slack-signature') || ''

    if (!verifySlackRequest(bodyText, timestamp, signature)) {
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
    if (type === 'block_actions' && actions?.[0]?.action_id === 'memory_match_answer') {
      const promptId = actions[0].value
      const teamId = payload.team?.id

      // Check if user already answered
      const existingAnswer = await db.query.slackGameAnswers.findFirst({
        where: and(
          eq(schema.slackGameAnswers.promptId, promptId),
          eq(schema.slackGameAnswers.userId, user.id),
        ),
      })

      if (existingAnswer) {
        // User already answered — tell them
        const team = await db.query.slackGameTeams.findFirst({
          where: eq(schema.slackGameTeams.teamId, teamId),
        })
        if (team) {
          await slackPost('chat.postEphemeral', team.botToken, {
            channel: payload.channel?.id,
            user: user.id,
            text: '✅ You\'ve already submitted your answer for this round. Wait for `/memory-match reveal` to see results!',
          })
        }
        return new Response('', { status: 200 })
      }

      // Get the prompt question for the modal title
      const prompt = await db.query.slackGamePrompts.findFirst({
        where: eq(schema.slackGamePrompts.id, promptId),
      })

      // Open modal
      const team = await db.query.slackGameTeams.findFirst({
        where: eq(schema.slackGameTeams.teamId, teamId),
      })
      if (!team) return new Response('', { status: 200 })

      await slackPost('views.open', team.botToken, {
        trigger_id,
        view: {
          type: 'modal',
          callback_id: 'memory_match_submit',
          private_metadata: promptId,
          title: { type: 'plain_text', text: 'Memory Match' },
          submit: { type: 'plain_text', text: 'Submit' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Quick recall 👀*\n_"${prompt?.question || 'What do you remember?'}"_\n\nYour answer is anonymous.`,
              },
            },
            {
              type: 'input',
              block_id: 'answer_block',
              element: {
                type: 'plain_text_input',
                action_id: 'answer_input',
                multiline: true,
                placeholder: { type: 'plain_text', text: 'What do you remember?' },
              },
              label: { type: 'plain_text', text: 'Your answer' },
            },
          ],
        },
      })

      return new Response('', { status: 200 })
    }

    // ── MODAL SUBMIT: Store answer ──
    if (type === 'view_submission' && view?.callback_id === 'memory_match_submit') {
      const promptId = view.private_metadata
      const answer = view.state?.values?.answer_block?.answer_input?.value || ''

      if (!answer.trim()) {
        return NextResponse.json({
          response_action: 'errors',
          errors: { answer_block: 'Please write something.' },
        })
      }

      // Check for duplicate (race condition guard)
      const existing = await db.query.slackGameAnswers.findFirst({
        where: and(
          eq(schema.slackGameAnswers.promptId, promptId),
          eq(schema.slackGameAnswers.userId, user.id),
        ),
      })

      if (!existing) {
        await db.insert(schema.slackGameAnswers).values({
          promptId,
          userId: user.id,
          answer: answer.trim(),
        })
      }

      // Close modal with a success message
      return NextResponse.json({
        response_action: 'update',
        view: {
          type: 'modal',
          title: { type: 'plain_text', text: 'Memory Match' },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ *Answer submitted!*\n\nYour answer is anonymous. Wait for someone to run `/memory-match reveal` to see how your team\'s memories compare.',
              },
            },
          ],
        },
      })
    }

    return new Response('', { status: 200 })
  } catch (error: any) {
    console.error('[Slack Game Interact Error]', error)
    return new Response('', { status: 200 })
  }
}
