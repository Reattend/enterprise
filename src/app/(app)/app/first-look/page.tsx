'use client'

// First look - "Here's what Reattend found". The payoff right after someone
// imports a tool or brain-dumps for the first time: the decisions, dated
// items, people and one connection it pulled out of their own material,
// plus three questions they can ask with one click. Refreshes itself while
// items are still being filed. Data: GET /api/me/first-look (scoped to the
// active org or Personal, access-filtered).

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Gavel, CalendarClock, Users, Link2, AlertTriangle, ArrowRight, Loader2, Brain, MessageSquare, Plug, PenLine,
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import './first-look.css'

interface Item { id: string; title: string; type: string; at?: string }
interface Due { id: string; title: string; when: string; objectId: string | null }
interface Look {
  context: 'personal' | 'org'
  counts: { memories: number; decisions: number; dated: number; tasks: number; people: number; filing: number }
  decisions: Item[]
  dated: Due[]
  tasks: Item[]
  people: Array<{ name: string; count: number }>
  connection: { kind: string; from: { id: string; title: string }; to: { id: string; title: string } } | null
  questions: string[]
  aiReady: boolean
}

const REL: Record<string, string> = {
  contradicts: 'contradicts', supports: 'supports', depends_on: 'depends on', causes: 'causes', leads_to: 'leads to',
  blocks: 'blocks', part_of: 'is part of', continuation_of: 'continues', same_topic: 'is about the same thing as',
  same_people: 'involves the same people as', related_to: 'is related to',
}

const ask = (q: string) => `/app/ask?q=${encodeURIComponent(q)}&send=1`

export default function FirstLookPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const hydrated = useAppStore((s) => s.hasHydratedStore)
  const [look, setLook] = useState<Look | null>(null)
  const polls = useRef(0)

  const load = useCallback(async () => {
    try {
      const q = activeOrgId ? `?orgId=${encodeURIComponent(activeOrgId)}` : ''
      const res = await fetch(`/api/me/first-look${q}`)
      if (res.ok) setLook(await res.json())
    } catch { /* keep the last good view */ }
  }, [activeOrgId])

  useEffect(() => { if (hydrated) load() }, [hydrated, load])

  // While things are still being filed, check back every 5s (for ~3 min).
  useEffect(() => {
    if (!look || look.counts.filing === 0 || polls.current > 36) return
    const t = window.setTimeout(() => { polls.current++; load() }, 5000)
    return () => window.clearTimeout(t)
  }, [look, load])

  if (!look) {
    return <div className="fl-page"><div className="fl-loading"><Loader2 size={16} className="animate-spin" /> Looking through your memory…</div></div>
  }

  const { counts } = look
  const nothing = counts.memories === 0 && counts.filing === 0

  if (nothing) {
    return (
      <div className="fl-page">
        <div className="fl-eyebrow"><Sparkles size={13} /> First look</div>
        <h1>Nothing to look at yet.</h1>
        <p className="fl-sub">Give Reattend something to read and this page fills in: decisions, dates, people and questions worth asking.</p>
        <div className="fl-empty-actions">
          <Link href="/app/brain-dump" className="fl-btn"><PenLine size={14} /> Brain-dump some notes</Link>
          <Link href="/app/integrations" className="fl-btn ghost"><Plug size={14} /> Connect a tool</Link>
        </div>
      </div>
    )
  }

  const upcoming = look.dated.length ? look.dated : []

  return (
    <div className="fl-page">
      <div className="fl-eyebrow"><Sparkles size={13} /> First look</div>
      <h1>Here&apos;s what Reattend found.</h1>
      <p className="fl-sub">
        From {counts.memories.toLocaleString()} memor{counts.memories === 1 ? 'y' : 'ies'} so far. It keeps connecting things as you add more.
      </p>

      {counts.filing > 0 && (
        <div className="fl-filing"><Loader2 size={14} className="animate-spin" /> Filing {counts.filing} more… this page fills in by itself.</div>
      )}

      <div className="fl-stats">
        <Stat n={counts.memories} label="memories" />
        <Stat n={counts.decisions} label="decisions" />
        {counts.dated > 0 ? <Stat n={counts.dated} label="things with a date" /> : <Stat n={counts.tasks} label="open tasks" />}
        <Stat n={counts.people} label="people" />
      </div>

      <section className="fl-card fl-ask">
        <div className="fl-h"><MessageSquare size={14} /> Ask it something</div>
        {look.aiReady ? (
          <div className="fl-questions">
            {look.questions.map((q) => (
              <Link key={q} href={ask(q)} className="fl-q">
                <span>{q}</span> <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="fl-note">
            Turn on the AI to ask questions and get answers with sources. <Link href="/app/settings/billing">Start the free trial</Link> or{' '}
            <Link href="/app/settings?tab=ai-provider">connect your own key</Link>.
          </p>
        )}
      </section>

      <div className="fl-grid">
        {look.decisions.length > 0 && (
          <section className="fl-card">
            <div className="fl-h"><Gavel size={14} /> Decisions it spotted</div>
            {look.decisions.map((d) => (
              <Link key={d.id} href={`/app/memories/${d.id}`} className="fl-row">{d.title}</Link>
            ))}
          </section>
        )}

        {(upcoming.length > 0 || look.tasks.length > 0) && (
          <section className="fl-card">
            <div className="fl-h"><CalendarClock size={14} /> {upcoming.length ? 'Coming up' : 'Open tasks'}</div>
            {upcoming.length
              ? upcoming.map((d) => (
                <div key={d.id} className="fl-row fl-dated">
                  {d.objectId ? <Link href={`/app/memories/${d.objectId}`}>{d.title}</Link> : <span>{d.title}</span>}
                  <em>{new Date(d.when).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</em>
                </div>
              ))
              : look.tasks.map((t) => <Link key={t.id} href={`/app/memories/${t.id}`} className="fl-row">{t.title}</Link>)}
          </section>
        )}

        {look.people.length > 0 && (
          <section className="fl-card">
            <div className="fl-h"><Users size={14} /> People who come up most</div>
            <div className="fl-people">
              {look.people.map((p) => (
                <Link key={p.name} href={ask(`What has ${p.name} been involved in?`)} className="fl-person" title={`Ask about ${p.name}`}>
                  {p.name} <em>{p.count}</em>
                </Link>
              ))}
            </div>
          </section>
        )}

        {look.connection && (
          <section className={`fl-card ${look.connection.kind === 'contradicts' ? 'is-warn' : ''}`}>
            <div className="fl-h">
              {look.connection.kind === 'contradicts' ? <AlertTriangle size={14} /> : <Link2 size={14} />}
              {look.connection.kind === 'contradicts' ? 'Two memories disagree' : 'A connection worth a look'}
            </div>
            <p className="fl-conn">
              <Link href={`/app/memories/${look.connection.from.id}`}>{look.connection.from.title}</Link>
              <span className="fl-rel">{REL[look.connection.kind] ?? look.connection.kind.replace(/_/g, ' ')}</span>
              <Link href={`/app/memories/${look.connection.to.id}`}>{look.connection.to.title}</Link>
            </p>
          </section>
        )}
      </div>

      <div className="fl-foot">
        <Link href="/app/landscape" className="fl-btn"><Brain size={14} /> See your memory as a brain</Link>
        <Link href="/app" className="fl-btn ghost">Go to home</Link>
      </div>
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="fl-stat">
      <b>{n.toLocaleString()}</b>
      <span>{label}</span>
    </div>
  )
}
