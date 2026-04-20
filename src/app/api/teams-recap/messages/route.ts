import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  teamsRecapInstalls,
  teamsRecapSessions,
  teamsRecapResponses,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  verifyTeamsRequest,
  TEAMS_BOT_APP_ID,
  sendTeamsActivity,
  updateTeamsActivity,
  stripMention,
  buildRecapFormCard,
  buildCollectingCard,
  buildSummaryCard,
  buildWelcomeCard,
  buildHelpCard,
} from '@/lib/teams-recap'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Verify JWT from Bot Framework
    const authHeader = req.headers.get('authorization') || ''
    if (TEAMS_BOT_APP_ID) {
      const valid = await verifyTeamsRequest(authHeader)
      if (!valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const activity = await req.json()
    const { type, channelData, from, conversation, serviceUrl } = activity

    // ─── conversationUpdate: bot was added ───
    if (type === 'conversationUpdate' && activity.membersAdded) {
      const botAdded = activity.membersAdded.some(
        (m: any) => m.id === activity.recipient?.id
      )
      if (botAdded && serviceUrl && conversation?.id) {
        // Upsert install record
        const tenantId = channelData?.tenant?.id || 'unknown'
        const teamId = channelData?.team?.id || null
        const channelId = activity.channelId || conversation.id

        const existing = db
          .select()
          .from(teamsRecapInstalls)
          .where(
            and(
              eq(teamsRecapInstalls.tenantId, tenantId),
              eq(teamsRecapInstalls.conversationId, conversation.id)
            )
          )
          .get()

        if (!existing) {
          db.insert(teamsRecapInstalls)
            .values({
              tenantId,
              teamId,
              channelId,
              conversationId: conversation.id,
              serviceUrl,
              installedBy: from?.id || null,
            })
            .run()
        }

        // Send welcome message
        try {
          await sendTeamsActivity(serviceUrl, conversation.id, buildWelcomeCard())
        } catch (e) {
          console.error('Failed to send welcome message:', e)
        }
      }
      return NextResponse.json({}, { status: 200 })
    }

    // ─── message: user typed something ───
    if (type === 'message' && activity.text) {
      const text = stripMention(activity.text).toLowerCase().trim()
      const tenantId = channelData?.tenant?.id || 'unknown'

      // Ensure install record exists
      let install = db
        .select()
        .from(teamsRecapInstalls)
        .where(eq(teamsRecapInstalls.conversationId, conversation.id))
        .get()

      if (!install) {
        install = db
          .insert(teamsRecapInstalls)
          .values({
            tenantId,
            teamId: channelData?.team?.id || null,
            channelId: activity.channelId || conversation.id,
            conversationId: conversation.id,
            serviceUrl,
            installedBy: from?.id || null,
          })
          .returning()
          .get()
      }

      if (text === 'recap' || text === 'start' || text === 'new recap') {
        // Create a new session
        const session = db
          .insert(teamsRecapSessions)
          .values({
            installId: install.id,
            conversationId: conversation.id,
            triggeredBy: from?.id || 'unknown',
            triggeredByName: from?.name || null,
          })
          .returning()
          .get()

        // Post the form card
        const formCard = buildRecapFormCard(session.id)
        const result = await sendTeamsActivity(serviceUrl, conversation.id, formCard)

        // Save the activity ID so we can update the card later
        db.update(teamsRecapSessions)
          .set({ cardActivityId: result.id })
          .where(eq(teamsRecapSessions.id, session.id))
          .run()

        return NextResponse.json({}, { status: 200 })
      }

      if (text === 'done' || text === 'summary' || text === 'compile') {
        // Find the latest collecting session for this conversation
        const session = db
          .select()
          .from(teamsRecapSessions)
          .where(
            and(
              eq(teamsRecapSessions.conversationId, conversation.id),
              eq(teamsRecapSessions.status, 'collecting')
            )
          )
          .orderBy(teamsRecapSessions.createdAt)
          .get()

        if (!session) {
          await sendTeamsActivity(serviceUrl, conversation.id, {
            type: 'message',
            text: 'No active recap session. Type **@Recap recap** to start one.',
          })
          return NextResponse.json({}, { status: 200 })
        }

        // Get responses
        const responses = db
          .select()
          .from(teamsRecapResponses)
          .where(eq(teamsRecapResponses.sessionId, session.id))
          .all()

        if (responses.length === 0) {
          await sendTeamsActivity(serviceUrl, conversation.id, {
            type: 'message',
            text: 'No responses yet. Ask your team to fill in the recap form above, then try **@Recap done** again.',
          })
          return NextResponse.json({}, { status: 200 })
        }

        // Post summary
        const summaryCard = buildSummaryCard(responses, session.triggeredByName)
        await sendTeamsActivity(serviceUrl, conversation.id, summaryCard)

        // Mark session as posted
        db.update(teamsRecapSessions)
          .set({ status: 'posted' })
          .where(eq(teamsRecapSessions.id, session.id))
          .run()

        return NextResponse.json({}, { status: 200 })
      }

      if (text === 'help' || text === '') {
        await sendTeamsActivity(serviceUrl, conversation.id, buildHelpCard())
        return NextResponse.json({}, { status: 200 })
      }

      // Unknown command
      await sendTeamsActivity(serviceUrl, conversation.id, {
        type: 'message',
        text: "I didn't understand that. Try **recap** to start a new recap, **done** to compile responses, or **help** for more info.",
      })
      return NextResponse.json({}, { status: 200 })
    }

    // ─── invoke: Adaptive Card action ───
    if (type === 'invoke' && activity.name === 'adaptiveCard/action') {
      const { verb, sessionId, decisions, actionItems, notes } =
        activity.value?.action?.data || {}

      if (verb === 'submitRecap' && sessionId) {
        // Check session exists and is still collecting
        const session = db
          .select()
          .from(teamsRecapSessions)
          .where(
            and(
              eq(teamsRecapSessions.id, sessionId),
              eq(teamsRecapSessions.status, 'collecting')
            )
          )
          .get()

        if (!session) {
          return NextResponse.json(
            {
              statusCode: 200,
              type: 'application/vnd.microsoft.activity.message',
              value: 'This recap session has already been completed.',
            },
            { status: 200 }
          )
        }

        // Check if user already submitted
        const existing = db
          .select()
          .from(teamsRecapResponses)
          .where(
            and(
              eq(teamsRecapResponses.sessionId, sessionId),
              eq(teamsRecapResponses.userId, from?.id || 'unknown')
            )
          )
          .get()

        if (existing) {
          // Update existing response
          db.update(teamsRecapResponses)
            .set({
              decisions: decisions || null,
              actionItems: actionItems || null,
              notes: notes || null,
              submittedAt: new Date().toISOString(),
            })
            .where(eq(teamsRecapResponses.id, existing.id))
            .run()
        } else {
          // Insert new response
          db.insert(teamsRecapResponses)
            .values({
              sessionId,
              userId: from?.id || 'unknown',
              userName: from?.name || null,
              decisions: decisions || null,
              actionItems: actionItems || null,
              notes: notes || null,
            })
            .run()
        }

        // Get updated response count
        const allResponses = db
          .select()
          .from(teamsRecapResponses)
          .where(eq(teamsRecapResponses.sessionId, sessionId))
          .all()

        const respondentNames = allResponses
          .map((r) => r.userName || 'Someone')

        // Update the card to show response count
        if (session.cardActivityId && serviceUrl) {
          try {
            const install = db
              .select()
              .from(teamsRecapInstalls)
              .where(eq(teamsRecapInstalls.id, session.installId))
              .get()

            if (install) {
              const updatedCard = buildCollectingCard(
                sessionId,
                allResponses.length,
                respondentNames
              )
              await updateTeamsActivity(
                install.serviceUrl,
                session.conversationId,
                session.cardActivityId,
                updatedCard
              )
            }
          } catch (e) {
            console.error('Failed to update card:', e)
          }
        }

        return NextResponse.json(
          {
            statusCode: 200,
            type: 'application/vnd.microsoft.activity.message',
            value: `✅ Thanks ${from?.name || ''}! Your recap has been recorded. (${allResponses.length} response${allResponses.length !== 1 ? 's' : ''} total)`,
          },
          { status: 200 }
        )
      }
    }

    // Default: return 200 for unhandled activity types
    return NextResponse.json({}, { status: 200 })
  } catch (error) {
    console.error('Teams recap bot error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
