'use client'

// Persistent "no AI provider key" banner.
//
// Without a key and without a Managed plan, capture triage and every answer
// silently degrade - so this stays visible until it is resolved rather than
// hiding behind Settings. It is deliberately quiet in tone: an unfinished
// setup step, not an error.
//
// Who sees it:
//   personal, no key, tier is free          -> connect in Settings
//   org ADMIN, no org key, tier is free     -> connect in the Control Room
//   org member (non-admin)                  -> nothing. Keys are an admin
//                                              concern; a member cannot act
//                                              on this and should not be
//                                              nagged about it.
// Anyone on a paid/Managed plan sees nothing: we run the AI for them.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { KeyRound, ArrowRight } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

interface BillingMe {
  byok?: { provider: string; keyLast4: string | null; status: string } | null
  tier?: 'free' | 'professional' | 'enterprise'
}

export function AiKeyBanner() {
  const { activeEnterpriseOrgId, enterpriseOrgs, enterpriseOrgsLoaded } = useAppStore()
  const [href, setHref] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    if (!enterpriseOrgsLoaded) return
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/billing/me')
        if (!res.ok) return
        const me = (await res.json()) as BillingMe
        if (cancelled) return

        // Managed / paid: we supply the AI, nothing to connect.
        if (me.tier && me.tier !== 'free') return

        if (activeEnterpriseOrgId) {
          const role = enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId)?.role
          if (role !== 'admin' && role !== 'super_admin') return
          const keyRes = await fetch(`/api/enterprise/organizations/${activeEnterpriseOrgId}/ai-provider-key`)
          const key = keyRes.ok ? (await keyRes.json())?.key : null
          if (cancelled) return
          if (key && key.status !== 'invalid') return
          setInvalid(!!key)
          setHref(`/app/admin/${activeEnterpriseOrgId}/settings`)
          return
        }

        if (me.byok && me.byok.status !== 'invalid') return
        setInvalid(!!me.byok)
        setHref('/app/settings')
      } catch { /* non-fatal: a missing banner is better than a broken shell */ }
    })()

    return () => { cancelled = true }
  }, [activeEnterpriseOrgId, enterpriseOrgs, enterpriseOrgsLoaded])

  if (!href) return null

  return (
    <div className="ai-key-banner">
      <span className="ai-key-banner-icon"><KeyRound size={13} /></span>
      <span className="ai-key-banner-copy">
        <b>{invalid ? 'Your AI key stopped working' : 'No AI key connected'}</b>
        <small>
          {invalid
            ? 'The provider rejected it, so answers and capture triage are paused.'
            : 'Connect one to turn on answers, auto-titling and triage. Free - it runs on your own provider account.'}
        </small>
      </span>
      <Link className="ai-key-banner-cta" href={href}>
        {invalid ? 'Fix the key' : 'Connect a key'} <ArrowRight size={13} />
      </Link>
    </div>
  )
}
