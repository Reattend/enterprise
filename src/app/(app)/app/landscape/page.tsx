'use client'

// Landscape — two projections of the same memory corpus.
//
//   Rewind: Time-Machine slider. Scrub through 24 months of org state.
//   Board:  Memory graph. React Flow layout of records + record links.
//
// Mode persists via ?mode=rewind|board. Older links using mode=temporal /
// mode=causal still resolve to the new modes for backwards compatibility.
//
// New chrome: violet-gradient segmented mode switch (matches the Capture
// page's `cap-modes` control). Each mode renders its own page-shaped view
// underneath, so the inner views own their crumb / hero / content.

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { RotateCcw, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RewindView } from './rewind-view'
import { BoardView } from './board-view'

type Mode = 'rewind' | 'board'

function normalizeMode(raw: string | null): Mode {
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
    <div className="lsc-page-wrap">
      <div className="lsc-page">
        {/* Mode switch — violet-gradient pill matches design exactly */}
        <div className="lsc-modes" role="tablist">
          <button
            type="button"
            className={cn('lsc-mode-btn', mode === 'rewind' && 'active')}
            onClick={() => pick('rewind')}
            role="tab"
            aria-selected={mode === 'rewind'}
          >
            <RotateCcw size={14} strokeWidth={1.8} />
            Rewind
            <span className="lab-sub">· Scrub through time</span>
          </button>
          <button
            type="button"
            className={cn('lsc-mode-btn', mode === 'board' && 'active')}
            onClick={() => pick('board')}
            role="tab"
            aria-selected={mode === 'board'}
          >
            <GitBranch size={14} strokeWidth={1.8} />
            Board
            <span className="lab-sub">· Memory map</span>
          </button>
        </div>

        {mode === 'rewind' ? <RewindView /> : <BoardView />}
      </div>
    </div>
  )
}

export default function LandscapePage() {
  return (
    <Suspense>
      <LandscapeInner />
    </Suspense>
  )
}
