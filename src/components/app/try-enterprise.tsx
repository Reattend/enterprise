'use client'

// "Try Enterprise" - the in-app door to the pre-filled Enterprise demo.
//
// Only personal accounts (no org) see it: an org member is already in
// Enterprise. Clicking launches the same demo org marketing links to, and
// because the visitor is signed in, /api/sandbox/launch records who they
// are so the demo's "Exit demo" can hand their own account straight back.

import { useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

export function TryEnterprise() {
  const { activeEnterpriseOrgId, enterpriseOrgs, enterpriseOrgsLoaded } = useAppStore()
  const [launching, setLaunching] = useState(false)

  // Hidden for anyone who belongs to an org, and until we know.
  if (!enterpriseOrgsLoaded || activeEnterpriseOrgId || enterpriseOrgs.length > 0) return null

  async function launch() {
    if (launching) return
    setLaunching(true)
    try {
      const res = await fetch('/api/sandbox/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'super_admin' }),
      })
      if (!res.ok) { setLaunching(false); return }
      const { ticket } = await res.json()

      const csrfRes = await fetch('/api/auth/csrf')
      const { csrfToken } = await csrfRes.json()
      const params = new URLSearchParams()
      params.set('csrfToken', csrfToken)
      params.set('ticket', ticket)
      params.set('callbackUrl', '/app')
      params.set('json', 'true')
      await fetch('/api/auth/callback/sso-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        credentials: 'same-origin',
      })
      window.location.href = '/app'
    } catch {
      setLaunching(false)
    }
  }

  return (
    <button
      type="button"
      className="try-ent hidden lg:inline-flex"
      onClick={launch}
      disabled={launching}
      title="Open a pre-filled Enterprise workspace. Your own account stays where it is."
    >
      {launching ? <Loader2 size={13} className="animate-spin" /> : <Building2 size={13} />}
      {launching ? 'Opening…' : 'Try Enterprise'}
    </button>
  )
}
