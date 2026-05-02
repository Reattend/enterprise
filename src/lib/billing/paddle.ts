// Server-side Paddle SDK wrapper.
//
// Paddle is initialized lazily because the API key only exists in production
// env (.env.local on the droplet). Dev environments without a key get a stub
// that throws on any call — so accidental dev usage fails loud, not silent.
//
// The wrapper only exposes the methods we actually use; if you need more,
// add them here so we have one place to mock for tests.

import { Paddle, Environment, EventName } from '@paddle/paddle-node-sdk'

let _client: Paddle | null = null

export function paddle(): Paddle {
  if (_client) return _client
  const apiKey = process.env.PADDLE_API_KEY
  if (!apiKey) throw new Error('PADDLE_API_KEY missing — Paddle calls disabled')
  const env = process.env.PADDLE_ENV === 'sandbox' ? Environment.sandbox : Environment.production
  _client = new Paddle(apiKey, { environment: env })
  return _client
}

export { EventName }

// Webhook signature verification. The Paddle SDK does this for us — wrap it
// so the route handler stays clean and we can swap implementations later.
export function verifyWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) throw new Error('PADDLE_WEBHOOK_SECRET missing')
  if (!signature) throw new Error('Missing Paddle-Signature header')
  return paddle().webhooks.unmarshal(rawBody, secret, signature)
}
