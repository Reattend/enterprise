'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

export function InboxBanner() {
  const { inboxUnread, inboxBannerDismissed, setInboxBannerDismissed } = useAppStore()

  if (inboxUnread === 0 || inboxBannerDismissed) return null

  return (
    <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200">
      <span className="text-base leading-none">⚠️</span>
      <span className="flex-1">
        Reattend needs your attention —{' '}
        <strong>{inboxUnread} {inboxUnread === 1 ? 'memory' : 'memories'}</strong> flagged for review.{' '}
        <Link href="/app/inbox" className="underline underline-offset-2 font-semibold hover:opacity-80">
          View inbox →
        </Link>
      </span>
      <button
        onClick={() => setInboxBannerDismissed(true)}
        className="shrink-0 rounded p-0.5 hover:bg-amber-200/60 dark:hover:bg-amber-800/40 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
