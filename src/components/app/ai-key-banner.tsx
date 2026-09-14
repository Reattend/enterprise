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

  const [tick, setTick] = useState(0)
  // Re-check when the tab regains focus, and when something on the page
  // starts a trial or connects a key (they dispatch reattend:billing-changed).
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    window.addEventListener('focus', bump)
    window.addEventListener('reattend:billing-changed', bump)
    return () => {
      window.removeEventListener('focus', bump)
      window.removeEventListener('reattend:billing-changed', bump)
    }
  }, [])

  useEffect(() => {
    if (!enterpriseOrgsLoaded) return
    let cancelled = false
    ;(async () => {
      // Every path ends in exactly one setHref, so the banner also goes away
      // once AI is on (it used to stick until a full reload).
      let next: string | null = null
      let bad = false
      try {
        const meRes = await fetch('/api/user', { cache: 'no-store' })
        const meEmail: string = meRes.ok ? ((await meRes.json())?.user?.email || '') : ''
        if (!meEmail.toLowerCase().endsWith('@sandbox.reattend.local')) {
          // /api/billing/status is org-aware (resolves the org's billing
          // owner); /api/billing/me is the caller's own row, which made the
          // banner nag admins of a Managed org who didn't create it.
          const [statusRes, byokRes] = await Promise.all([fetch('/api/billing/status'), fetch('/api/billing/me')])
          const status = statusRes.ok ? await statusRes.json() : null
          const me = byokRes.ok ? ((await byokRes.json()) as BillingMe) : null
          const tier = status?.tier ?? me?.tier
          if (!tier || tier === 'free') {
            if (activeEnterpriseOrgId) {
              const role = enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId)?.role
              if (role === 'admin' || role === 'super_admin') {
                const keyRes = await fetch(`/api/enterprise/organizations/${activeEnterpriseOrgId}/ai-provider-key`)
                const key = keyRes.ok ? (await keyRes.json())?.key : null
                if (!key || key.status === 'invalid') {
                  bad = !!key
                  next = `/app/admin/${activeEnterpriseOrgId}/settings#ai-provider`
                }
              }
            } else if (!me?.byok || me.byok.status === 'invalid') {
              bad = !!me?.byok
              next = '/app/settings?tab=ai-provider'
            }
          }
        }
      } catch { /* non-fatal: a missing banner is better than a broken shell */ }
      if (cancelled) return
      setInvalid(bad)
      setHref(next)
    })()
    return () => { cancelled = true }
  }, [activeEnterpriseOrgId, enterpriseOrgs, enterpriseOrgsLoaded, tick])

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
