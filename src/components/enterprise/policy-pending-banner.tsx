'use client'

// Shows a subtle banner at the top of the app when the current user has
// unacknowledged published policies. Clicking takes them to /app/policies,
// which sorts pending → top so they land on it immediately. Click-through
// is the self-healing feedback loop.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, X, FileText } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

const DISMISS_KEY = 'policy_pending_banner_dismissed_at'
const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h

export function PolicyPendingBanner() {
  const { activeEnterpriseOrgId } = useAppStore()
  const [count, setCount] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Respect the last dismiss within 24h so we don't nag on every page nav.
    if (typeof window !== 'undefined') {
      const last = localStorage.getItem(DISMISS_KEY)
      if (last && Date.now() - parseInt(last, 10) < DISMISS_WINDOW_MS) {
        setDismissed(true)
      }
    }
  }, [])

  useEffect(() => {
    if (!activeEnterpriseOrgId) { setCount(0); return }
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/policies/pending?orgId=${activeEnterpriseOrgId}`)
        if (!res.ok) return
        const data = await res.json()
        setCount(data.count || 0)
      } catch { /* non-fatal */ }
    })()
  }, [activeEnterpriseOrgId])

  if (!activeEnterpriseOrgId || count === 0 || dismissed) return null

  return (
    <div className="flex items-center gap-3 bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-900 dark:bg-yellow-950/40 dark:border-yellow-800/60 dark:text-yellow-200">
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">
        <strong>{count} {count === 1 ? 'policy needs' : 'policies need'}</strong> your acknowledgment.{' '}
        <Link href="/app/policies" className="underline underline-offset-2 font-semibold hover:opacity-80">
          Review now →
        </Link>
      </span>
      <button
        onClick={() => {
          setDismissed(true)
          try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
        }}
        className="shrink-0 rounded p-0.5 hover:bg-yellow-200/60 dark:hover:bg-yellow-800/40 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
