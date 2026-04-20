import crypto from 'crypto'

const PADDLE_API_URL = 'https://api.paddle.com'

// ─── Webhook Signature Verification ────────────────────────
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[Paddle] No PADDLE_WEBHOOK_SECRET configured, skipping verification')
    return true
  }

  try {
    // Paddle Billing v2 signature format: ts=TIMESTAMP;h1=HASH
    const parts: Record<string, string> = {}
    for (const part of signature.split(';')) {
      const [key, ...rest] = part.split('=')
      parts[key] = rest.join('=')
    }

    const ts = parts.ts
    const h1 = parts.h1
    if (!ts || !h1) return false

    // Verify timestamp is within 5 minutes
    const tsNum = parseInt(ts, 10)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - tsNum) > 300) {
      console.warn('[Paddle] Webhook timestamp too old')
      return false
    }

    const payload = `${ts}:${rawBody}`
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected))
  } catch (err) {
    console.error('[Paddle] Signature verification error:', err)
    return false
  }
}

// ─── Paddle API Helpers ────────────────────────────────────
async function paddleApi(method: string, path: string, body?: any) {
  const apiKey = process.env.PADDLE_API_KEY
  if (!apiKey) throw new Error('PADDLE_API_KEY not configured')

  const res = await fetch(`${PADDLE_API_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('[Paddle API Error]', path, data)
    throw new Error(data?.error?.detail || `Paddle API error: ${res.status}`)
  }

  return data
}

export async function getSubscription(subscriptionId: string) {
  return paddleApi('GET', `/subscriptions/${subscriptionId}`)
}

export async function cancelSubscription(subscriptionId: string, effectiveFrom: 'immediately' | 'next_billing_period' = 'immediately') {
  return paddleApi('POST', `/subscriptions/${subscriptionId}/cancel`, {
    effective_from: effectiveFrom,
  })
}

export async function getTransactionsForSubscription(subscriptionId: string) {
  return paddleApi('GET', `/transactions?subscription_id=${subscriptionId}&order_by=created_at[DESC]&per_page=10`)
}
