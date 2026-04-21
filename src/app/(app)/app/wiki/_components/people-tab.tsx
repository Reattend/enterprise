'use client'

// People tab — every active member + record/decision counts. Offboarded users
// with records get a "Knowledge at risk" badge — clicking through shows their
// page with a transfer-protocol hint.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, AlertTriangle, User as UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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

export function PeopleTab({
  orgId, selectedPerson, onSelect, filter,
}: {
  orgId: string
  selectedPerson: string | null
  onSelect: (id: string) => void
  filter: string
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
        if (!cancelled) setPeople(data.people || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
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
    return <div className="rounded-2xl border bg-card p-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading people…</div>
  }

  if (!people || people.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        <UserIcon className="h-6 w-6 mx-auto mb-2 opacity-50" />
        No members in this org yet.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="max-h-[70vh] overflow-y-auto divide-y">
        {filtered.map((p) => {
          const active = p.userId === selectedPerson
          const atRisk = p.status === 'offboarded' && p.recordCount > 0
          const initials = (p.name || p.email).split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
          return (
            <button
              key={p.userId}
              onClick={() => onSelect(p.userId)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-2 ${
                active ? 'bg-primary/5 border-primary' : 'border-transparent hover:bg-muted/40'
              }`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.name || p.email} />}
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{p.name || p.email}</span>
                  {p.status === 'offboarded' && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">left</Badge>
                  )}
                  {atRisk && (
                    <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1 border-red-500/40 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-2 w-2" /> At risk
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {p.title || p.email} · {p.recordCount} memor{p.recordCount === 1 ? 'y' : 'ies'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
