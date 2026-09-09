'use client'

// Demo banner - shown at the top of the app shell whenever the session
// belongs to a demo (sandbox) user. It states plainly that this is
// pre-filled data with no live AI, keeps a booking link one click away,
// and offers the way out.
//
// "Exit demo" asks /api/sandbox/exit. If the visitor started the demo while
// signed in, that returns a one-time ticket which puts them straight back
// into their own account. If they arrived anonymously from marketing there
// is nothing to return to, so they land on the marketing site instead.

import { useEffect, useState } from 'react'
import { CalendarCheck, Sparkles, LogOut, Loader2 } from 'lucide-react'

const CALENDLY = 'https://calendly.com/pb-reattend/30min'

export function SandboxBanner() {
  const [isSandbox, setIsSandbox] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Detect the demo via /api/user - the email suffix is the marker.
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/user', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const email: string = data.user?.email || ''
        if (!cancelled && email.toLowerCase().endsWith('@sandbox.reattend.local')) {
          setIsSandbox(true)
        }
      } catch {/* silent */}
    })()
    return () => { cancelled = true }
  }, [])

  async function exitDemo() {
    if (leaving) return
    setLeaving(true)
    try {
      const res = await fetch('/api/sandbox/exit', { method: 'POST' })
      const data = res.ok ? await res.json() : null

      if (data?.returned && data.ticket) {
        // Same trade the sandbox launch does, in reverse: swap the ticket
        // for this visitor's own session.
        const csrfRes = await fetch('/api/auth/csrf')
        const { csrfToken } = await csrfRes.json()
        const params = new URLSearchParams()
        params.set('csrfToken', csrfToken)
        params.set('ticket', data.ticket)
        params.set('callbackUrl', '/app')
        params.set('json', 'true')
        await fetch('/api/auth/callback/sso-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          credentials: 'same-origin',
        })
        window.location.href = '/app'
        return
      }

      // Anonymous visitor: no account to go back to.
      window.location.href = '/'
    } catch {
      setLeaving(false)
    }
  }

  if (!isSandbox) return null

  return (
    <div className="demo-banner">
      <span className="demo-banner-tag"><Sparkles size={11} /> Enterprise demo</span>
      <span className="demo-banner-copy">
        Pre-filled sample organization. Nothing you do here is saved, and the AI is not running.
      </span>
      <a className="demo-banner-book" href={CALENDLY} target="_blank" rel="noreferrer">
        <CalendarCheck size={13} /> Schedule a meeting
      </a>
      <button className="demo-banner-exit" onClick={exitDemo} disabled={leaving} type="button">
        {leaving ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
        {leaving ? 'Leaving…' : 'Exit demo'}
      </button>
    </div>
  )
}
