import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth, getUserSubscription } from '@/lib/auth'
import { cancelSubscription as paddleCancelSubscription } from '@/lib/paddle'

export async function GET() {
  try {
    const { userId } = await requireAuth()
    const subscription = await getUserSubscription(userId)
    return NextResponse.json({ subscription })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth()
    const { action } = await req.json()

    if (action === 'start_trial') {
      const existing = await getUserSubscription(userId)
      if (existing.plan === 'smart') {
        return NextResponse.json({ error: 'You already have Smart Memories' }, { status: 400 })
      }

      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 30)

      await db.update(schema.subscriptions)
        .set({
          planKey: 'smart',
          status: 'trialing',
          trialEndsAt: trialEnd.toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.subscriptions.userId, userId))

      // Queue retroactive AI processing for existing memories
      const memberships = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.userId, userId),
      })

      let jobsQueued = 0
      for (const membership of memberships) {
        const records = await db.query.records.findMany({
          where: eq(schema.records.workspaceId, membership.workspaceId),
        })

        for (const record of records) {
          const existingEmbed = await db.query.embeddings.findFirst({
            where: eq(schema.embeddings.recordId, record.id),
          })

          if (!existingEmbed) {
            await db.insert(schema.jobQueue).values({
              workspaceId: membership.workspaceId,
              type: 'embed',
              payload: JSON.stringify({ recordId: record.id }),
              status: 'pending',
            })
            jobsQueued++
          }
        }
      }

      const subscription = await getUserSubscription(userId)
      return NextResponse.json({
        ok: true,
        message: `Smart Memories trial started. ${jobsQueued} memories queued for AI processing.`,
        subscription,
      })
    }

    if (action === 'cancel') {
      const existing = await getUserSubscription(userId)

      // If there's a Paddle subscription, cancel via Paddle API
      if (existing.paddleSubscriptionId) {
        try {
          await paddleCancelSubscription(existing.paddleSubscriptionId, 'immediately')
        } catch (err: any) {
          console.error('[Cancel] Paddle API error:', err.message)
        }
      }

      await db.update(schema.subscriptions)
        .set({
          planKey: 'normal',
          status: 'active',
          trialEndsAt: null,
          renewsAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.subscriptions.userId, userId))

      const subscription = await getUserSubscription(userId)
      return NextResponse.json({ ok: true, message: 'Subscription canceled', subscription })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
