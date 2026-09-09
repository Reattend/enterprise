'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, GitBranch, History, Flame, ArrowUpRight } from 'lucide-react'

// "Signals from your brain" - the Home panel from the design handoff.
//
// Every signal is real. Nothing here is generated copy: each card is built
// from one of three existing endpoints, and the panel only renders the
// cards that actually have something to say.
//
//   CONNECTION FOUND   /api/enterprise/graph        a `contradicts` link
//   WORTH RESURFACING  /api/enterprise/resurface    "N years ago today"
//   GAINING ATTENTION  /api/enterprise/trending     most-viewed this week
//
// All three take an optional orgId: with one they scope to the org (RBAC
// filtered), without one to the caller's own workspaces. So the same panel
// serves an org member and a personal account with no branching here.

type Tone = 'lilac' | 'lime' | 'peach'

interface Signal {
  key: string
  tone: Tone
  kicker: string
  icon: React.ReactNode
  headline: string
  detail: string
  href: string
}

interface GraphNode { id: string; title: string }
interface GraphEdge { id: string; from: string; to: string; kind: string }

export function MemorySignals({ orgId }: { orgId?: string | null }) {
  const [signals, setSignals] = useState<Signal[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const q = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''
    const get = (path: string) =>
      fetch(path).then((r) => (r.ok ? r.json() : null)).catch(() => null)

    ;(async () => {
      const [graph, resurface, trending] = await Promise.all([
        get(`/api/enterprise/graph${q}`),
        get(`/api/enterprise/resurface${q}`),
        get(`/api/enterprise/trending${q}${q ? '&' : '?'}days=7&limit=3`),
      ])
      if (cancelled) return

      const out: Signal[] = []

      // 1. A contradiction between two memories is the most useful thing we
      //    can say, so it leads when one exists.
      const nodes: GraphNode[] = graph?.nodes ?? []
      const edges: GraphEdge[] = graph?.edges ?? []
      const clash = edges.find((e) => e.kind === 'contradicts')
      if (clash) {
        const byId = new Map(nodes.map((n) => [n.id, n.title]))
        const a = byId.get(clash.from)
        const b = byId.get(clash.to)
        if (a && b) {
          out.push({
            key: 'clash',
            tone: 'lilac',
            kicker: 'Connection found',
            icon: <GitBranch size={12} />,
            headline: 'Two memories disagree',
            detail: `"${trim(a)}" and "${trim(b)}" point in different directions.`,
            href: '/app/landscape',
          })
        }
      }

      // 2. Something you saved on this day in a past year.
      const group = (resurface?.groups ?? [])[0]
      const rec = group?.records?.[0]
      if (rec) {
        out.push({
          key: 'resurface',
          tone: 'lime',
          kicker: 'Worth resurfacing',
          icon: <History size={12} />,
          headline: trim(rec.title || 'A memory from this day'),
          detail: `Saved ${group.label.toLowerCase()} today. Do you still believe it?`,
          href: `/app/memories/${rec.id}`,
        })
      }

      // 3. What you keep coming back to.
      const hot = (trending?.items ?? [])[0]
      if (hot) {
        out.push({
          key: 'trending',
          tone: 'peach',
          kicker: 'Gaining attention',
          icon: <Flame size={12} />,
          headline: trim(hot.title || 'Untitled'),
          detail: `Opened ${hot.viewCount} ${hot.viewCount === 1 ? 'time' : 'times'} in the last 7 days.`,
          href: `/app/memories/${hot.id}`,
        })
      }

      setSignals(out)
    })()

    return () => { cancelled = true }
  }, [orgId])

  // Never render an empty shell: a brand-new account has nothing to signal,
  // and a panel of placeholders would be worse than no panel.
  if (!signals || signals.length === 0) return null

  return (
    <section className="memory-signals" aria-label="Signals from your memory">
      <div className="memory-signals-head">
        <Sparkles size={14} />
        <b>Signals from your brain</b>
        <small>Found by reading what you already saved</small>
      </div>
      <div className="memory-signals-list">
        {signals.map((s) => (
          <Link key={s.key} href={s.href} className={`memory-signal tone-${s.tone}`}>
            <span className="memory-signal-kicker">{s.icon} {s.kicker}</span>
            <b>{s.headline}</b>
            <small>{s.detail}</small>
            <ArrowUpRight className="memory-signal-go" size={14} />
          </Link>
        ))}
      </div>
    </section>
  )
}

function trim(s: string, max = 68) {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}
