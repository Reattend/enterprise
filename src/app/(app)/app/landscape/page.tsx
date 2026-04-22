'use client'

// Landscape — two projections of the same memory corpus.
//
//   Temporal: Time Machine slider. Scrub through 24 months of org state.
//   Causal:   Memory graph. React Flow layout of records + record_links.
//
// Mode persists via ?mode=temporal|causal. Defaults to temporal since it's
// the more dramatic demo entrance.

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { History, Network } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TemporalView } from './temporal-view'
import { CausalView } from './causal-view'

type Mode = 'temporal' | 'causal'

function LandscapeInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const urlMode = (searchParams.get('mode') === 'causal' ? 'causal' : 'temporal') as Mode
  const [mode, setMode] = useState<Mode>(urlMode)

  useEffect(() => { setMode(urlMode) }, [urlMode])

  function pick(next: Mode) {
    setMode(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set('mode', next)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      <div className="max-w-6xl mx-auto px-1">
        <div className="inline-flex items-center rounded-full border bg-card p-0.5">
          <ModeButton active={mode === 'temporal'} onClick={() => pick('temporal')} icon={History} label="Temporal" sub="Scrub through time" />
          <ModeButton active={mode === 'causal'} onClick={() => pick('causal')} icon={Network} label="Causal" sub="Relationship graph" />
        </div>
      </div>
      {mode === 'temporal' ? <TemporalView /> : <CausalView />}
    </div>
  )
}

function ModeButton({
  active, onClick, icon: Icon, label, sub,
}: {
  active: boolean
  onClick: () => void
  icon: typeof History
  label: string
  sub: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold">{label}</span>
      <span className={cn('hidden sm:inline text-[10px]', active ? 'opacity-80' : 'opacity-60')}>· {sub}</span>
    </button>
  )
}

export default function LandscapePage() {
  return (
    <Suspense>
      <LandscapeInner />
    </Suspense>
  )
}
