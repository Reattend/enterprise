'use client'

// Shows a persistent banner while the org is on a Managed trial or has hit
// a payment problem. Talk to sales stays visible here too, not just at
// onboarding - a self-serve trial should never be a dead end (today.md
// 2026-08-29). Non-admin org members see the same status, just without the
// action buttons - billing is org-wide, not something every teammate can
// change.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock3, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

interface BillingStatus {
  hasOrg: boolean
  isAdmin: boolean
  tier: 'free' | 'professional' | 'enterprise'
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired'
  trialEndsAt: string | null
}

export function TrialBanner() {
  const { activeEnterpriseOrgId, enterpriseOrgsLoaded } = useAppStore()
  const [data, setData] = useState<BillingStatus | null>(null)

  useEffect(() => {
    // Same enterpriseOrgsLoaded gate as the other shell banners - see
    // policy-pending-banner.tsx for why (2026-08-26 stale-org-id race).
    if (!enterpriseOrgsLoaded || !activeEnterpriseOrgId) { setData(null); return }
    ;(async () => {
      try {
        const res = await fetch('/api/billing/status')
        if (!res.ok) return
        setData(await res.json())
      } catch { /* non-fatal */ }
    })()
  }, [activeEnterpriseOrgId, enterpriseOrgsLoaded])

  if (!activeEnterpriseOrgId || !data || data.tier !== 'professional') return null
  if (data.status !== 'trialing' && data.status !== 'past_due') return null

  if (data.status === 'past_due') {
    return (
      <div className="flex items-center gap-3 bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:border-red-800/60 dark:text-red-200">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">
          <strong>Payment failed</strong> on your Managed plan - AI access will pause soon.{' '}
          {data.isAdmin ? (
            <Link href="/app/settings/billing" className="underline underline-offset-2 font-semibold hover:opacity-80">
              Update payment method →
            </Link>
          ) : 'Ask an admin to update the payment method.'}
        </span>
        <a href="https://calendly.com/pb-reattend/30min" target="_blank" rel="noreferrer" className="shrink-0 underline underline-offset-2 font-medium hover:opacity-80">
          Talk to sales
        </a>
      </div>
    )
  }

  const daysLeft = data.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(data.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null

  return (
    <div className="flex items-center gap-3 bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-900 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-200">
      <Clock3 className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">
        <strong>{daysLeft === null ? 'Managed trial active' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}</strong> in your Managed trial - $15/seat/mo after, no auto-charge.{' '}
        {data.isAdmin && (
          <Link href="/app/settings/billing" className="underline underline-offset-2 font-semibold hover:opacity-80">
            Add payment method →
          </Link>
        )}
      </span>
      <a href="https://calendly.com/pb-reattend/30min" target="_blank" rel="noreferrer" className="shrink-0 underline underline-offset-2 font-medium hover:opacity-80">
        Talk to sales
      </a>
    </div>
  )
}
