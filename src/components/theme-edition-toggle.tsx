'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeEditionToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [ready, setReady] = useState(false)

  useEffect(() => setReady(true), [])

  const dark = ready && resolvedTheme === 'dark'
  return (
    <button
      type="button"
      className={`edition-toggle ${className}`.trim()}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Use light edition' : 'Use dark edition'}
      title={dark ? 'Use light edition' : 'Use dark edition'}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}
