'use client'

// People tab — every active member + record/decision counts. Offboarded
// users with records get a small risk dot (red) — clicking through opens
// their detail with the full at-risk banner.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Person = {
  userId: string
  role: string
  title: string | null
  status: 'active' | 'offboarded' | string
  offboardedAt: string | null
  name: string | null
  email: string
  avatarUrl: string | null
  lastRecordAt: string | null
  recordCount: number
}

const AV_PALETTE = ['a', 'b', 'c', 'd', 'e', 'f'] as const

function avPalette(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AV_PALETTE[h % AV_PALETTE.length]
}

function avInitials(person: Person) {
  return (person.name || person.email).split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
}

export function PeopleTab({
  orgId, selectedPerson, onSelect, filter, onCount,
}: {
  orgId: string
  selectedPerson: string | null
  onSelect: (id: string) => void
  filter: string
  onCount?: (n: number) => void
}) {
  const [people, setPeople] = useState<Person[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/enterprise/wiki/people?orgId=${orgId}`)
        if (!res.ok) { if (!cancelled) setPeople([]); return }
        const data = await res.json()
        if (!cancelled) {
          const list = data.people || []
          setPeople(list)
          onCount?.(list.length)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return people || []
    return (people || []).filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.title || '').toLowerCase().includes(q),
    )
  }, [people, filter])

  if (loading) {
    return (
      <div className="wiki-tree" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
        <Loader2 size={14} className="animate-spin" /> Loading people…
      </div>
    )
  }

  if (!people || people.length === 0) {
    return (
      <div className="wiki-tree" style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        <UserIcon size={20} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
        No members in this org yet.
      </div>
    )
  }

  return (
    <aside className="wiki-tree">
      <h4>People</h4>
      {filtered.map((p) => {
        const active = p.userId === selectedPerson
        const atRisk = p.status === 'offboarded' && p.recordCount > 0
        const initials = avInitials(p)
        const palette = avPalette(p.userId)
        return (
          <button
            key={p.userId}
            type="button"
            onClick={() => onSelect(p.userId)}
            className={cn('wiki-tnode', active && 'active')}
            title={`${p.title || p.email} · ${p.recordCount} memor${p.recordCount === 1 ? 'y' : 'ies'}`}
          >
            <span className="av" data-palette={palette} style={paletteStyle(palette)}>
              {initials}
            </span>
            <span className="lab">
              {p.name || p.email}
              {p.status === 'offboarded' && <span style={{ fontSize: 10, color: 'var(--ink-4)', marginLeft: 4, fontWeight: 400 }}>· left</span>}
            </span>
            {atRisk && <span className="risk-dot" title="Knowledge at risk" aria-label="At risk" />}
            <span className="ct">{p.recordCount.toLocaleString()}</span>
          </button>
        )
      })}
      {filtered.length === 0 && (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
          No matches.
        </div>
      )}
    </aside>
  )
}

function paletteStyle(p: typeof AV_PALETTE[number]): React.CSSProperties {
  switch (p) {
    case 'a': return { background: 'oklch(0.85 0.04 60)', color: 'oklch(0.35 0.08 40)' }
    case 'b': return { background: 'oklch(0.85 0.05 200)', color: 'oklch(0.32 0.12 220)' }
    case 'c': return { background: 'oklch(0.86 0.05 145)', color: 'oklch(0.32 0.13 155)' }
    case 'd': return { background: 'oklch(0.87 0.05 320)', color: 'oklch(0.32 0.14 320)' }
    case 'e': return { background: 'oklch(0.86 0.05 25)', color: 'oklch(0.36 0.13 25)' }
    case 'f': return { background: 'oklch(0.86 0.04 270)', color: 'oklch(0.32 0.14 270)' }
  }
}
