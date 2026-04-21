// Thin wrapper around the @nangohq/node SDK so every call site reads config
// from one place. Enterprise customers point NANGO_HOST at their self-hosted
// Nango instance; SaaS customers leave it on the default (api.nango.dev).

import { Nango } from '@nangohq/node'

export interface NangoConfig {
  host: string
  secretKey: string
  publicKey: string | null // legacy — current SDK uses sessionToken instead
  webhookSecret: string | null
  configured: boolean
}

// Read config from env. Returns `configured: false` if the secret key is
// missing, so route handlers can bail with a friendly error instead of
// throwing inside SDK construction. The public key is optional — new
// Nango deployments authenticate the browser SDK via session tokens
// minted by the backend (see createConnectSession).
export function getNangoConfig(): NangoConfig {
  const host = process.env.NANGO_HOST || 'https://api.nango.dev'
  const secretKey = process.env.NANGO_SECRET_KEY || ''
  const publicKey = process.env.NANGO_PUBLIC_KEY || null
  const webhookSecret = process.env.NANGO_WEBHOOK_SECRET || null
  const configured = !!secretKey
  return { host, secretKey, publicKey, webhookSecret, configured }
}

let _client: Nango | null = null

// Returns a memoized Nango backend client. Throws if env is not configured —
// callers should check `getNangoConfig().configured` first.
export function getNangoClient(): Nango {
  const cfg = getNangoConfig()
  if (!cfg.configured) {
    throw new Error('Nango is not configured (set NANGO_SECRET_KEY)')
  }
  if (_client) return _client
  _client = new Nango({ host: cfg.host, secretKey: cfg.secretKey })
  return _client
}

// Canonical Nango connection_id derived from our user + provider. Reversible
// at webhook time so we can route events back to the right user+workspace.
// Format: `<userId>__<providerKey>`. Underscores avoid collisions with UUIDs.
export function buildNangoConnectionId(userId: string, providerKey: string): string {
  return `${userId}__${providerKey}`
}

export function parseNangoConnectionId(connectionId: string): { userId: string; providerKey: string } | null {
  const idx = connectionId.indexOf('__')
  if (idx <= 0) return null
  return { userId: connectionId.slice(0, idx), providerKey: connectionId.slice(idx + 2) }
}
