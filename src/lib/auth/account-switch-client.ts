// Client-side helper for the linked-accounts switch flow.
//
// The server-side /api/auth/switch endpoint only mints an SSO ticket —
// it can't write the session cookie itself (NextAuth owns that, and
// hand-rolling Set-Cookie has the documented Chrome silent-drop bug).
// To actually swap the session, the browser must POST the ticket to
// /api/auth/callback/sso-ticket with a CSRF token, exactly the way
// /sandbox launches a session for a sandbox visitor.
//
// switchToLinkedAccount() does the full dance: ask the server for a
// ticket, fetch a CSRF token, POST to the credentials callback,
// and navigate to the destination URL the callback returns.

interface SwitchResult {
  ok: boolean
  destinationUrl?: string
  error?: string
}

export async function switchToLinkedAccount(targetUserId: string, callbackUrl = '/app'): Promise<SwitchResult> {
  try {
    // 1. Server validates the link and returns a 60s ticket
    const switchRes = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: targetUserId }),
    })
    if (!switchRes.ok) {
      const body = await switchRes.json().catch(() => ({}))
      return { ok: false, error: body.error || `switch failed (${switchRes.status})` }
    }
    const { ticket } = await switchRes.json() as { ticket: string }

    // 2. Trade the ticket via NextAuth's credentials callback
    const csrfRes = await fetch('/api/auth/csrf')
    const { csrfToken } = await csrfRes.json() as { csrfToken: string }

    const params = new URLSearchParams()
    params.set('csrfToken', csrfToken)
    params.set('ticket', ticket)
    params.set('callbackUrl', callbackUrl)
    params.set('json', 'true')

    const callbackRes = await fetch('/api/auth/callback/sso-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      credentials: 'same-origin',
    })
    const data = await callbackRes.json().catch(() => ({})) as { url?: string; error?: string }
    if (data.error) return { ok: false, error: data.error }
    return { ok: true, destinationUrl: data.url || callbackUrl }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'switch failed' }
  }
}
