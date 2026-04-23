'use client'

// Trust badge — one-glance signal on every memory.
//
// Four states, derived server-side (passed in as the `state` prop) OR
// computed client-side from (verifyEveryDays, lastVerifiedAt):
//
//   verified      lastVerifiedAt within cadence → green
//   unverified    has cadence but never verified → neutral
//   stale         cadence lapsed → yellow
//   contradicted  linked contradicts edge present → red (caller passes `contradicted`)
//
// Renders as a compact pill; falls back to nothing when cadence isn't set
// (we don't nag for every casual note).

import { Check, HelpCircle, AlertTriangle, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TrustState = 'verified' | 'unverified' | 'stale' | 'contradicted' | 'none'

export function computeTrustState(opts: {
  verifyEveryDays: number | null | undefined
  lastVerifiedAt: string | null | undefined
  contradicted?: boolean
}): TrustState {
  if (opts.contradicted) return 'contradicted'
  if (!opts.verifyEveryDays) return 'none'
  if (!opts.lastVerifiedAt) return 'unverified'
  const ageDays = (Date.now() - new Date(opts.lastVerifiedAt).getTime()) / (24 * 3600 * 1000)
  return ageDays > opts.verifyEveryDays ? 'stale' : 'verified'
}

const META: Record<Exclude<TrustState, 'none'>, { label: string; icon: any; cls: string }> = {
  verified:      { label: 'Verified',     icon: Check,         cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  unverified:    { label: 'Unverified',   icon: HelpCircle,    cls: 'bg-muted text-muted-foreground border-border' },
  stale:         { label: 'Stale',        icon: AlertTriangle, cls: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/30' },
  contradicted:  { label: 'Contradicted', icon: AlertOctagon,  cls: 'bg-red-500/10 text-red-600 border-red-500/30' },
}

export function TrustBadge({
  state, size = 'sm', showLabel = true,
}: {
  state: TrustState
  size?: 'xs' | 'sm'
  showLabel?: boolean
}) {
  if (state === 'none') return null
  const m = META[state]
  const Icon = m.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border',
        m.cls,
        size === 'xs' ? 'text-[9px] px-1.5 py-0 h-4' : 'text-[10px] px-2 py-0.5',
      )}
      title={`Trust: ${m.label.toLowerCase()}`}
    >
      <Icon className={cn(size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      {showLabel && <span className="font-semibold">{m.label}</span>}
    </span>
  )
}
