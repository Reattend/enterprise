'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

// Slim banner that surfaces the trial countdown. Renders only when:
//   - User is on a paid tier in trialing status, AND
//   - trialEndsAt is set (and in the future), AND
//   - the user hasn't dismissed the banner this session
//
// Below 7 days left it amps the urgency (amber → red shading + bolder copy).
// Once the trial converts to paid (paddleSubscriptionId set), this banner
// disappears entirely.

interface BillingMe {
  tier: 'free' | 'professional' | 'enterprise'
  status: string
  trialEndsAt: string | null
  paddleSubscriptionId: string | null
}

const DISMISS_KEY = 'reattend.billing.trial-banner.dismissed-day'

export function TrialBanner() {
  // Mounted gate: prevents hydration mismatch. The first server render +
  // first client render both produce nothing; only AFTER mount do we read
  // sessionStorage / fetch /api/billing/me. Without this gate, React 18
  // hydration throws #418 / #425 because sessionStorage doesn't exist on
  // the server but does on the client.
  const [mounted, setMounted] = useState(false)
  const [me, setMe] = useState<BillingMe | null>(null)
  const [dismissedDay, setDismissedDay] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    try { setDismissedDay(sessionStorage.getItem(DISMISS_KEY)) } catch { /* private browsing */ }
    fetch('/api/billing/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setMe(data))
      .catch(() => setMe(null))
  }, [])

  if (!mounted) return null

  if (!me) return null
  if (me.tier === 'free') return null
  if (me.paddleSubscriptionId) return null  // already paying — no countdown
  if (!me.trialEndsAt) return null
  const ends = new Date(me.trialEndsAt)
  if (isNaN(ends.getTime())) return null
  if (ends.getTime() < Date.now()) return null  // expired — not our concern, the gate handles it

  const today = new Date().toISOString().slice(0, 10)
  if (dismissedDay === today) return null

  const daysLeft = Math.max(0, Math.ceil((ends.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  const urgent = daysLeft <= 7

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, today)
    setDismissedDay(today)
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-xs border-b ${
        urgent
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-blue-50 border-blue-200 text-blue-900'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium">
          {urgent ? '⏳' : '🎁'} {daysLeft} day{daysLeft === 1 ? '' : 's'} left in your {me.tier === 'professional' ? 'Professional' : 'Enterprise'} trial.
        </span>
        <span className="hidden sm:inline opacity-80">
          {urgent
            ? 'Add a card to keep your plan, or you\'ll downgrade to Free with all your data intact.'
            : 'No card required. Add one anytime to lock in your plan.'}
        </span>
        <Link
          href="/app/settings/billing"
          className="ml-1 underline underline-offset-2 font-medium hover:no-underline whitespace-nowrap"
        >
          Manage billing →
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="opacity-60 hover:opacity-100 flex-shrink-0"
        aria-label="Dismiss"
        title="Hide for today"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
