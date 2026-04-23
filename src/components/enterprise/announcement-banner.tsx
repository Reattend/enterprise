'use client'

// Announcement banner — Guru-style pinned message from admins.
//
// Shows at the top of the main content area for every user until dismissed
// (per-user) or the announcement is deactivated / expired. Supports 3
// tones: info (blue), warning (amber), success (emerald).
//
// Fetches once per mount per org. Polls every 2 minutes in case admin
// publishes a new one mid-session.

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface Announcement {
  id: string
  title: string
  body: string
  tone: 'info' | 'warning' | 'success'
  endsAt: string | null
  dismissed: boolean
}

const TONE: Record<Announcement['tone'], { wrap: string; icon: any; color: string }> = {
  info:    { wrap: 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-100',       icon: Info,          color: 'text-blue-500' },
  warning: { wrap: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-900 dark:text-yellow-100', icon: AlertCircle,   color: 'text-yellow-500' },
  success: { wrap: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100', icon: CheckCircle2, color: 'text-emerald-500' },
}

export function AnnouncementBanner({ orgId }: { orgId: string | null }) {
  const [items, setItems] = useState<Announcement[]>([])

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/enterprise/announcements?orgId=${orgId}`)
        if (!res.ok) return
        const d = await res.json()
        if (!cancelled) setItems(d.announcements || [])
      } catch { /* silent */ }
    }
    load()
    const t = setInterval(load, 120_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [orgId])

  async function dismiss(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id))
    try {
      await fetch(`/api/enterprise/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
    } catch { /* silent */ }
  }

  if (!orgId || items.length === 0) return null

  return (
    <div className="space-y-2 px-4 sm:px-6 pt-4">
      {items.map((a) => {
        const meta = TONE[a.tone] || TONE.info
        const Icon = meta.icon
        return (
          <div key={a.id} className={cn('rounded-xl border p-3 flex items-start gap-3', meta.wrap)}>
            <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', meta.color)} />
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-semibold">{a.title}</div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-inherit mt-0.5 prose-p:my-0.5 prose-a:underline">
                <ReactMarkdown>{a.body}</ReactMarkdown>
              </div>
            </div>
            <button
              onClick={() => dismiss(a.id)}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
