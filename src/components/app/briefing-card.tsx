'use client'

// Start My Day on the home page. Reads today's cached briefing
// (/api/me/briefing - the same one the 7am email sends), so opening the
// app never costs a second AI call. Three states:
//   - something to say: the focus, then due soon / meetings / new / from
//     a few weeks ago, every line linking to its memory
//   - brand-new account, nothing yet: a teaser for tomorrow morning
//   - quiet day: one line, plus the memory from a few weeks back if any
// The footer switches the morning email on or off.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Sun, CalendarClock, Clock, Sparkles, History, Mail, ScrollText } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import './briefing-card.css'

interface Item { id: string; title: string; type: string; summary?: string | null; at?: string }

const TYPE_LABEL: Record<string, string> = {
  decision: 'Decision', tasklike: 'Task', meeting: 'Meeting', context: 'Context', note: 'Note',
  insight: 'Insight', idea: 'Idea', transcript: 'Transcript',
}
interface Due { id: string; title: string; when: string; objectId: string | null }
interface Meeting { id: string; title: string; startAt: string; attendees: string[] }
interface Briefing {
  day: string
  hasSomething: boolean
  focus: string | null
  counts: { newMemories: number; dueSoon: number; meetings: number; pendingAcks: number; totalMemories: number }
  newMemories: Item[]
  dueSoon: Due[]
  meetings: Meeting[]
  resurfaced: (Item & { ageDays: number }) | null
}
interface Resp { briefing: Briefing; emailOn: boolean; timezoneKnown: boolean; accountAgeDays: number | null }

export function BriefingCard() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const hydrated = useAppStore((s) => s.hasHydratedStore)
  const [data, setData] = useState<Resp | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)

  const load = useCallback(async () => {
    try {
      const q = activeOrgId ? `?orgId=${encodeURIComponent(activeOrgId)}` : ''
      const res = await fetch(`/api/me/briefing${q}`)
      if (res.ok) setData(await res.json())
    } catch { /* optional card - stay hidden */ }
  }, [activeOrgId])

  useEffect(() => { if (hydrated) load() }, [hydrated, load])

  async function setEmail(on: boolean) {
    setSavingEmail(true)
    try {
      const res = await fetch('/api/me/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: on }) })
      if (res.ok) {
        setData((d) => (d ? { ...d, emailOn: on } : d))
        toast.success(on ? 'Morning email on. It arrives around 7am your time.' : 'Morning email off. It stays here on your home page.')
      }
    } finally {
      setSavingEmail(false)
    }
  }

  if (!data) return null
  const { briefing: b, emailOn, accountAgeDays } = data
  const weekday = new Date().toLocaleDateString(undefined, { weekday: 'long' })
  const isNew = (accountAgeDays ?? 99) < 2
  const empty = !b.hasSomething

  // Brand-new and nothing yet: set up tomorrow's reason to come back.
  if (empty && isNew && !b.resurfaced) {
    return (
      <section className="bf-card is-teaser" aria-label="Start my day">
        <div className="bf-eyebrow"><Sun size={13} /> Start my day</div>
        <h2>Tomorrow morning, your first briefing.</h2>
        <p className="bf-lead">
          Each morning Reattend reads what arrived since yesterday, what is due and who you are meeting, and writes you a
          short briefing from your own memory. The more you add today, the better tomorrow&apos;s is.
        </p>
        <EmailToggle on={emailOn} saving={savingEmail} onChange={setEmail} />
      </section>
    )
  }

  const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })

  return (
    <section className="bf-card" aria-label="Start my day">
      <div className="bf-eyebrow"><Sun size={13} /> Start my day · {weekday}</div>
      {b.focus ? (
        <p className="bf-focus">{b.focus}</p>
      ) : (
        <h2>{empty ? 'Quiet day so far. Nothing new since yesterday.' : 'Here is your day.'}</h2>
      )}

      <div className="bf-grid">
        {b.counts.pendingAcks > 0 && (
          <div className="bf-block">
            <div className="bf-h"><ScrollText size={13} /> Waiting for you</div>
            <div className="bf-row">
              <Link href="/app/policies">{b.counts.pendingAcks} polic{b.counts.pendingAcks === 1 ? 'y' : 'ies'} to read and acknowledge</Link>
            </div>
          </div>
        )}
        {b.dueSoon.length > 0 && (
          <div className="bf-block">
            <div className="bf-h"><CalendarClock size={13} /> Coming up</div>
            {b.dueSoon.slice(0, 4).map((d) => (
              <div key={d.id} className="bf-row">
                {d.objectId ? <Link href={`/app/memories/${d.objectId}`}>{d.title}</Link> : <span>{d.title}</span>}
                <em>{when(d.when)}</em>
              </div>
            ))}
          </div>
        )}
        {b.meetings.length > 0 && (
          <div className="bf-block">
            <div className="bf-h"><Clock size={13} /> Meetings today</div>
            {b.meetings.slice(0, 4).map((m) => (
              <div key={m.id} className="bf-row">
                <span>{m.title}</span>
                <em>{time(m.startAt)}{m.attendees.length ? ` · ${m.attendees.slice(0, 2).join(', ')}${m.attendees.length > 2 ? ` +${m.attendees.length - 2}` : ''}` : ''}</em>
              </div>
            ))}
          </div>
        )}
        {b.newMemories.length > 0 && (
          <div className="bf-block">
            <div className="bf-h"><Sparkles size={13} /> New since yesterday · {b.counts.newMemories}</div>
            {b.newMemories.slice(0, 4).map((m) => (
              <div key={m.id} className="bf-row">
                <Link href={`/app/memories/${m.id}`}>{m.title}</Link>
                <em>{TYPE_LABEL[m.type] ?? m.type}</em>
              </div>
            ))}
          </div>
        )}
        {b.resurfaced && (
          <div className="bf-block">
            <div className="bf-h"><History size={13} /> From {Math.max(2, Math.round(b.resurfaced.ageDays / 7))} weeks ago</div>
            <div className="bf-row">
              <Link href={`/app/memories/${b.resurfaced.id}`}>{b.resurfaced.title}</Link>
              {b.resurfaced.summary && <em className="bf-sum">{b.resurfaced.summary.slice(0, 120)}</em>}
            </div>
          </div>
        )}
      </div>

      <EmailToggle on={emailOn} saving={savingEmail} onChange={setEmail} />
    </section>
  )
}

function EmailToggle({ on, saving, onChange }: { on: boolean; saving: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="bf-foot">
      <Mail size={12} />
      {on ? <>Also sent by email around 7am your time.</> : <>Morning email is off.</>}
      <button type="button" onClick={() => onChange(!on)} disabled={saving}>
        {on ? 'Turn off' : 'Email it to me'}
      </button>
    </div>
  )
}
