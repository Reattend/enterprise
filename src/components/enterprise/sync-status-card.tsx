'use client'

// Small Home-dashboard card showing connected integrations + last-sync time.
// Hidden entirely if Nango isn't configured or the user hasn't connected
// anything — no point cluttering Home with "connect something" nudges there
// (that belongs on /app/integrations).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Plug, Clock } from 'lucide-react'

type Provider = {
  key: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  lastSyncedAt: string | null
  syncError: string | null
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.round(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function SyncStatusCard() {
  const [providers, setProviders] = useState<Provider[] | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/integrations/nango/status')
        if (!res.ok) { setProviders([]); return }
        const data = await res.json()
        setProviders(data.providers || [])
      } catch {
        setProviders([])
      }
    })()
  }, [])

  if (!providers) return null
  const connected = providers.filter((p) => p.status === 'connected' || p.status === 'error')
  if (connected.length === 0) return null

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
        <Plug className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="text-sm font-semibold">Sync status</div>
        <Link href="/app/integrations" className="text-xs text-primary hover:underline ml-auto">Manage</Link>
      </div>
      <div className="divide-y">
        {connected.map((p) => {
          const ok = p.status === 'connected' && !p.syncError
          return (
            <div key={p.key} className="flex items-center gap-2 px-4 py-2 text-xs">
              {ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              )}
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground ml-auto inline-flex items-center gap-1">
                {p.lastSyncedAt ? (
                  <><Clock className="h-2.5 w-2.5" /> {relativeTime(p.lastSyncedAt)}</>
                ) : (
                  <span>not yet synced</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
