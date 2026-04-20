import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { verifySlackRequest, slackPost, PROMPTS, computeAlignment } from '@/lib/slack-game'

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text()
    const timestamp = req.headers.get('x-slack-request-timestamp') || ''
    const signature = req.headers.get('x-slack-signature') || ''

    if (!verifySlackRequest(bodyText, timestamp, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const params = new URLSearchParams(bodyText)
    const teamId = params.get('team_id') || ''
    const channelId = params.get('channel_id') || ''
    const commandText = (params.get('text') || '').trim()
    const triggerId = params.get('trigger_id') || ''

    // Find bot token for this team
    const team = await db.query.slackGameTeams.findFirst({
      where: eq(schema.slackGameTeams.teamId, teamId),
    })
    if (!team) {
      return new Response('Memory Match is not installed for this workspace. Visit https://reattend.com/tool/slack-memory-match to install.', { status: 200 })
    }

    // ── REVEAL ──
    if (commandText.toLowerCase() === 'reveal') {
      const activePrompt = await db.query.slackGamePrompts.findFirst({
        where: and(
          eq(schema.slackGamePrompts.teamId, teamId),
          eq(schema.slackGamePrompts.channelId, channelId),
          eq(schema.slackGamePrompts.status, 'active'),
        ),
      })

      if (!activePrompt) {
        return new Response('No active prompt in this channel. Start one with `/memory-match`.', { status: 200 })
      }

      // Get all answers
      const answers = await db.query.slackGameAnswers.findMany({
        where: eq(schema.slackGameAnswers.promptId, activePrompt.id),
      })

      // Close the prompt
      await db.update(schema.slackGamePrompts)
        .set({ status: 'closed' as any })
        .where(eq(schema.slackGamePrompts.id, activePrompt.id))

      if (answers.length === 0) {
        await slackPost('chat.postMessage', team.botToken, {
          channel: channelId,
          text: `No one answered this round. Try again with \`/memory-match\`!`,
        })
        return new Response('', { status: 200 })
      }

      // Compute alignment
      const alignment = computeAlignment(answers.map(a => a.answer))
      const alignmentEmoji = alignment.score === 'High' ? '🟢' : alignment.score === 'Medium' ? '🟡' : '🔴'

      // Build results message
      const answerBlocks: any[] = answers.map((a, i) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `> _"${a.answer}"_`,
        },
      }))

      await slackPost('chat.postMessage', team.botToken, {
        channel: channelId,
        text: `Memory Match Results: ${activePrompt.question}`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '🧠 Memory Match — Results' },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*"${activePrompt.question}"*\n\n${answers.length} team member${answers.length === 1 ? '' : 's'} answered:`,
            },
          },
          { type: 'divider' },
          ...answerBlocks,
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${alignmentEmoji} *Memory Alignment: ${alignment.score}*\n${alignment.detail}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Same conversation. ${answers.length} memories. · _<https://reattend.com/tool/slack-memory-match|Want one shared memory next time? Try Reattend.>_`,
              },
            ],
          },
        ],
      })

      return new Response('', { status: 200 })
    }

    // ── START NEW PROMPT ──
    // Check for active prompt in this channel
    const existingActive = await db.query.slackGamePrompts.findFirst({
      where: and(
        eq(schema.slackGamePrompts.teamId, teamId),
        eq(schema.slackGamePrompts.channelId, channelId),
        eq(schema.slackGamePrompts.status, 'active'),
      ),
    })
    if (existingActive) {
      return new Response(`There's already an active prompt in this channel. Use \`/memory-match reveal\` to see results first.`, { status: 200 })
    }

    // Pick question: custom text or random from curated list
    const question = commandText || PROMPTS[Math.floor(Math.random() * PROMPTS.length)]

    // Create prompt in DB
    const promptId = crypto.randomUUID()
    await db.insert(schema.slackGamePrompts).values({
      id: promptId,
      teamId,
      channelId,
      question,
    })

    // Post to channel
    const postResult = await slackPost('chat.postMessage', team.botToken, {
      channel: channelId,
      text: `Memory Match: ${question}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🧠 Memory Match' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Quick recall 👀*\n\n_"${question}"_`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✏️ Submit Your Answer' },
              action_id: 'memory_match_answer',
              value: promptId,
              style: 'primary',
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Answers are anonymous. Use `/memory-match reveal` when ready.',
            },
          ],
        },
      ],
    })

    // Store message ts for reference
    if (postResult.ok && postResult.ts) {
      await db.update(schema.slackGamePrompts)
        .set({ messageTs: postResult.ts })
        .where(eq(schema.slackGamePrompts.id, promptId))
    }

    return new Response('', { status: 200 })
  } catch (error: any) {
    console.error('[Slack Game Command Error]', error)
    return new Response('Something went wrong. Please try again.', { status: 200 })
  }
}
