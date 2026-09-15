'use client'

// Tells the server the browser's timezone once per session, so the Start
// My Day email arrives in the person's morning. Renders nothing.

import { useEffect } from 'react'

const KEY = 'reattend:tz-reported'

export function reportTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz || window.sessionStorage.getItem(KEY) === tz) return
    fetch('/api/me/timezone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: tz }),
    }).then((r) => { if (r.ok) window.sessionStorage.setItem(KEY, tz) }).catch(() => {})
  } catch { /* storage or Intl unavailable - skip */ }
}

export function TimezoneReporter() {
  useEffect(() => { reportTimezone() }, [])
  return null
}
