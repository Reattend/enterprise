'use client'

// Landscape — two projections of the same memory corpus.
//
//   Rewind: Time-Machine slider. Scrub through 24 months of org state.
//   Board:  Memory graph. React Flow layout of records + record links.
//
// Mode persists via ?mode=rewind|board. Older links using mode=temporal /
// mode=causal still resolve to the new modes for backwards compatibility.

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { History, Network } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RewindView } from './rewind-view'
import { BoardView } from './board-view'

type Mode = 'rewind' | 'board'

function normalizeMode(raw: string | null): Mode {
  // Accept legacy values so bookmarks from the old naming still work.
  if (raw === 'board' || raw === 'causal') return 'board'
  return 'rewind'
}

function LandscapeInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const urlMode = normalizeMode(searchParams.get('mode'))
  const [mode, setMode] = useState<Mode>(urlMode)

  useEffect(() => { setMode(urlMode) }, [urlMode])

  function pick(next: Mode) {
    setMode(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set('mode', next)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto px-1 pt-1">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center rounded-full border bg-card p-0.5 shadow-sm">
          <ModeButton active={mode === 'rewind'} onClick={() => pick('rewind')} icon={History} label="Rewind" sub="Scrub through time" />
          <ModeButton active={mode === 'board'} onClick={() => pick('board')} icon={Network} label="Board" sub="Memory map" />
        </div>
      </div>
      {mode === 'rewind' ? <RewindView /> : <BoardView />}
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
        'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs transition-colors',
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
