import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getTransactionsForSubscription } from '@/lib/paddle'

export async function GET() {
  try {
    const { userId } = await requireAuth()

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.userId, userId),
    })

    if (!subscription?.paddleSubscriptionId) {
      return NextResponse.json({ transactions: [] })
    }

    const data = await getTransactionsForSubscription(subscription.paddleSubscriptionId)
    const transactions = (data.data || []).map((t: any) => ({
      id: t.id,
      status: t.status,
      createdAt: t.created_at,
      billedAt: t.billed_at,
      total: t.details?.totals?.total,
      currency: t.currency_code,
      invoiceUrl: t.invoice_url || null,
    }))

    return NextResponse.json({ transactions })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Paddle API failure — return empty list rather than error
    console.error('[billing/transactions]', error.message)
    return NextResponse.json({ transactions: [] })
  }
}
