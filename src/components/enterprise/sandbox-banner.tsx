'use client'

// Sandbox banner — surfaces at the top of the app shell whenever the session
// belongs to a sandbox user. Reminds the visitor (a) nothing they do persists,
// (b) AI is in scripted-demo mode, and (c) how to sign up for a real account.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, X } from 'lucide-react'

export function SandboxBanner() {
  const [isSandbox, setIsSandbox] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Detect sandbox via the /api/user endpoint — email suffix is the marker
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/user', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const email: string = data.user?.email || ''
        if (!cancelled && email.toLowerCase().endsWith('@sandbox.reattend.local')) {
          setIsSandbox(true)
        }
      } catch {/* silent */}
    })()
    return () => { cancelled = true }
  }, [])

  if (!isSandbox || dismissed) return null

  return (
    <div className="relative z-10 flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 border-b border-violet-500/20 text-[12px]">
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold text-[10px] uppercase tracking-wider shrink-0">
        <Sparkles className="h-3 w-3" /> Sandbox
      </div>
      <span className="text-muted-foreground leading-tight flex-1 min-w-0">
        You&apos;re in a demo org. Nothing persists, AI answers are scripted.
        <span className="hidden sm:inline"> Your real deployment gets Claude Sonnet on your live memory.</span>
      </span>
      <Link
        href="/pricing"
        className="shrink-0 inline-flex items-center gap-1 font-semibold text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"
      >
        See pricing <ArrowRight className="h-3 w-3" />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-md hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground transition-colors"
        title="Dismiss (still in sandbox)"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
