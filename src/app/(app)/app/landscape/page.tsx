'use client'

// Landscape - two projections of the same memory corpus.
//
//   Board:  Miro-style canvas of memories and their links. Full window,
//           no app chrome (see CANVAS_ROUTES in app/layout.tsx). Default.
//   Rewind: Time-Machine slider. Scrub through 24 months of org state.
//
// Mode persists via ?mode=rewind|board. Older mode=temporal still
// resolves to rewind; mode=causal and the removed mode=space fall through
// to the board.

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { RotateCcw, GitBranch, ArrowLeft } from 'lucide-react'
import { RewindView } from './rewind-view'
import { BoardView } from './board-view'
import { useIsDark } from './board-model'

function LandscapeInner() {
  const searchParams = useSearchParams()
  const raw = searchParams.get('mode')
  const rewind = raw === 'rewind' || raw === 'temporal'
  const dark = useIsDark()

  if (!rewind) return <BoardView />

  // The layout has no sidebar or topbar on this route, so Rewind carries
  // its own slim bar: back to the app, and back to the board.
  return (
    <div className="rb-rewind-shell">
      <div className="rb-rewind-top">
        <Link href="/app" className="rb-back" title="Back to Reattend" aria-label="Back to Reattend">
          <ArrowLeft size={15} />
        </Link>
        <img src={dark ? '/white_logo.png' : '/black_logo.png'} alt="" className="logo" />
        <span className="app">Reattend</span>
        <div className="lsc-modes" role="tablist">
          <Link href="/app/landscape" className="lsc-mode-btn" role="tab" aria-selected={false}>
            <GitBranch size={14} strokeWidth={1.8} />
            Board
          </Link>
          <span className="lsc-mode-btn active" role="tab" aria-selected>
            <RotateCcw size={14} strokeWidth={1.8} />
            Rewind
          </span>
        </div>
      </div>
      <div className="lsc-page-wrap">
        <div className="lsc-page">
          <RewindView />
        </div>
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
