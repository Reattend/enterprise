import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { verifyWebhook, EventName } from '@/lib/billing/paddle'
import { priceIdToTier } from '@/lib/billing/tier'

// Paddle Billing webhook endpoint. Configured in Paddle dashboard:
//   Developer Tools → Notifications → Endpoint URL: https://reattend.com/api/billing/paddle/webhook
//
// Subscribed events (any other event is acknowledged but ignored):
//   subscription.created, subscription.updated, subscription.activated,
//   subscription.canceled, subscription.past_due,
//   transaction.completed, transaction.payment_failed
//
// Signature verification uses the Notification Secret from Paddle (never the
// API key). On signature failure we return 401 — Paddle retries with backoff.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const signature = req.headers.get('paddle-signature')

  let event
  try {
    event = await verifyWebhook(raw, signature)
  } catch (err: any) {
    console.error('[paddle webhook] signature verification failed:', err?.message)
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionPastDue:
        await handleSubscriptionEvent(event.data as any)
        break

      case EventName.SubscriptionCanceled:
        await handleSubscriptionCanceled(event.data as any)
        break

      case EventName.TransactionCompleted:
      case EventName.TransactionPaymentFailed:
        // Paddle fires subscription.updated alongside these, so we don't need
        // to mutate state here. Log for audit.
        console.log(`[paddle webhook] ${event.eventType} for txn=${(event.data as any)?.id}`)
        break

      default:
        console.log(`[paddle webhook] ignored event ${event.eventType}`)
    }
  } catch (err: any) {
    console.error(`[paddle webhook] handler failed for ${event.eventType}:`, err)
    // 500 → Paddle retries. Better than swallowing because a transient DB
    // glitch shouldn't lose subscription state.
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// Subscription lifecycle: created/updated/activated/past_due all collapse into
// the same "make sure the DB row reflects what Paddle says" upsert. We key off
// custom_data.userId — set on the transaction by /api/billing/checkout — to
// know which Reattend user this subscription belongs to.
async function handleSubscriptionEvent(data: any) {
  const userId = data?.customData?.userId
  if (!userId) {
    console.warn('[paddle webhook] subscription event without customData.userId; skipping. id=', data?.id)
    return
  }

  // Pull the active price + quantity from the first item. We don't sell mixed
  // bundles, so item[0] is the only relevant one.
  const item = (data?.items || [])[0]
  const priceId = item?.price?.id || item?.priceId
  const seatCount = Number(item?.quantity ?? 1)
  const mapping = priceIdToTier(priceId)
  if (!mapping) {
    console.warn(`[paddle webhook] unknown price ${priceId} on subscription ${data.id}; skipping`)
    return
  }

  // Status → our enum. Paddle has more states; collapse to the ones we use.
  const paddleStatus: string = data?.status || ''
  const ourStatus =
    paddleStatus === 'active' ? 'active' :
    paddleStatus === 'trialing' ? 'trialing' :
    paddleStatus === 'past_due' ? 'past_due' :
    paddleStatus === 'paused' ? 'past_due' :
    paddleStatus === 'canceled' ? 'canceled' :
    'active'

  await db
    .update(schema.subscriptions)
    .set({
      tier: mapping.tier,
      billingCycle: mapping.billingCycle,
      seatCount,
      status: ourStatus as any,
      paddleSubscriptionId: data.id || null,
      paddleCustomerId: data?.customerId || null,
      paddlePriceId: priceId || null,
      currentPeriodEnd: data?.currentBillingPeriod?.endsAt || null,
      renewsAt: data?.nextBilledAt || data?.currentBillingPeriod?.endsAt || null,
      trialEndsAt: data?.firstBilledAt && paddleStatus === 'trialing' ? data.firstBilledAt : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.subscriptions.userId, userId))

  console.log(`[paddle webhook] subscription ${data.id} → user ${userId} → ${mapping.tier} ${mapping.billingCycle} x${seatCount} (${ourStatus})`)
}

// Cancellation: drop tier back to free, clear seat count, but keep the data.
// User can re-upgrade anytime via /app/settings/billing.
async function handleSubscriptionCanceled(data: any) {
  const userId = data?.customData?.userId
  if (!userId) {
    console.warn('[paddle webhook] cancel without customData.userId; skipping')
    return
  }
  await db
    .update(schema.subscriptions)
    .set({
      tier: 'free',
      status: 'canceled',
      seatCount: 1,
      // Keep paddleSubscriptionId for audit even though it's now inactive.
      currentPeriodEnd: null,
      renewsAt: null,
      trialEndsAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.subscriptions.userId, userId))

  console.log(`[paddle webhook] subscription ${data.id} canceled → user ${userId} downgraded to free`)
}
