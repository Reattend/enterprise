'use client'

// Dept detail — the right-hand article when a dept is picked. Renders:
//   breadcrumb + serif h2 + freshness pill + meta row + auto-gen strip
//   summary paragraph
//   topic-tag chips (derived from records' tags)
//   active decisions list (with effective / active / draft pills)
//   members grid (avatar + name + title)
//   recent records list (with type pip)
//
// Same data shape as before; only the chrome and layout changed.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Loader2, AlertTriangle, ChevronRight, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DeptDetailData = {
  dept: {
    id: string; name: string; slug: string; kind: string;
    description: string | null; parentId: string | null;
    head: { id: string; name: string | null; email: string } | null;
  }
  summary: string
  summaryCached: boolean
  summaryGeneratedAt: string
  stale: boolean
  lastRecordAt: string | null
  recordCount: number
  records: Array<{ id: string; title: string; summary: string | null; type: string; createdAt: string; tags?: string[] }>
  members: Array<{ userId: string; role: string; name: string | null; email: string; avatarUrl: string | null; title?: string | null }>
  decisions: Array<{ id: string; title: string; status: string; createdAt: string; refId?: string | null; ownerHandle?: string | null; ratifiedAt?: string | null; effectiveAt?: string | null }>
}

const AV_PALETTE = ['a', 'b', 'c', 'd', 'e', 'f'] as const

function avPalette(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AV_PALETTE[h % AV_PALETTE.length]
}
function avInitials(name: string | null, email: string) {
  return (name || email).split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
}

function fmtRelative(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 14) return `${days}d ago`
  return d.toLocaleDateString()
}

function fmtShort(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function decisionStatusClass(status: string): 'active' | 'draft' | 'eff' | 'superseded' | 'reversed' {
  const s = status.toLowerCase()
  if (s === 'effective') return 'eff'
  if (s === 'draft') return 'draft'
  if (s === 'superseded') return 'superseded'
  if (s === 'reversed') return 'reversed'
  return 'active'
}

export function DeptDetail({ deptId, orgName }: { deptId: string; orgName?: string }) {
  const [data, setData] = useState<DeptDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/wiki/dept/${deptId}`)
        if (!res.ok) { if (!cancelled) setData(null); return }
        const d = await res.json()
        if (!cancelled) setData(d)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [deptId])

  // Derive a topic-tag tally from the recent records — mirrors the design's
  // "Topics this team owns" chip strip without needing an extra fetch.
  const topicTally = useMemo(() => {
    if (!data) return [] as Array<{ tag: string; count: number }>
    const m = new Map<string, number>()
    for (const r of data.records) {
      for (const t of r.tags || []) {
        const k = t.toLowerCase().trim()
        if (!k || k === 'attachment') continue
        m.set(k, (m.get(k) || 0) + 1)
      }
    }
    return Array.from(m.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [data])

  if (loading) {
    return (
      <div className="wiki-article" style={{ padding: 32, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13 }}>
        <Loader2 size={14} className="animate-spin" /> Loading department…
      </div>
    )
  }
  if (!data) return null

  const synced = fmtRelative(data.summaryGeneratedAt)
  const freshTone: 'amber' | undefined = data.stale ? 'amber' : undefined

  return (
    <article className="wiki-article">
      <header className="wiki-art-hd">
        <div className="wiki-breadcrumb">
          {orgName && <span>{orgName}</span>}
          {orgName && <ChevronRight size={10} strokeWidth={2} />}
          <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{data.dept.name}</span>
        </div>
        <h2>
          <span className="name">{data.dept.name}</span>
          <span className={cn('wiki-fresh', freshTone)}>
            <span className="pulse" />
            {data.stale ? `stale · last record ${fmtShort(data.lastRecordAt)}` : `live · synced ${synced}`}
          </span>
        </h2>
        <div className="wiki-meta-row">
          {data.dept.head && (
            <span><b>Lead:</b> {data.dept.head.name || data.dept.head.email}</span>
          )}
          <span><b>Kind:</b> <span style={{ textTransform: 'capitalize' }}>{data.dept.kind}</span></span>
          <span><b>Memories:</b> {data.recordCount.toLocaleString()}</span>
          <span><b>Members:</b> {data.members.length}</span>
          {data.decisions.length > 0 && <span><b>Active decisions:</b> {data.decisions.length}</span>}
        </div>
        <div className="wiki-gen-strip">
          <Sparkles size={14} strokeWidth={1.8} />
          <span>
            <b>Auto-generated</b> from {data.recordCount.toLocaleString()} memor{data.recordCount === 1 ? 'y' : 'ies'} · last regen {synced}. Edits you make are kept on regen.
          </span>
          <span className="right">
            <Link href={`/app/memories?dept=${encodeURIComponent(data.dept.id)}`} style={{ color: 'var(--accent-ink)', fontSize: 11.5, fontWeight: 600, textDecoration: 'none' }}>
              See memories →
            </Link>
          </span>
        </div>
        {data.dept.description && (
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '12px 0 0' }}>{data.dept.description}</p>
        )}
      </header>

      <div className="wiki-art-body">
        <p className="wiki-summary">{data.summary}</p>

        {topicTally.length > 0 && (
          <>
            <div className="wiki-sec-head">Topics this team owns</div>
            <div className="wiki-topic-tags">
              {topicTally.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={`/app/wiki?tab=topics&topic=${encodeURIComponent(tag)}`}
                  className="wiki-ttag"
                >
                  #{tag}<span className="ct">{count}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {data.decisions.length > 0 && (
          <>
            <div className="wiki-sec-head">
              Active decisions
              <span className="qmark" title="Decisions currently in effect for this department">?</span>
            </div>
            <div className="wiki-dec-list">
              {data.decisions.map((d) => {
                const klass = decisionStatusClass(d.status)
                const refId = d.refId || `ADR-${d.id.slice(0, 4).toUpperCase()}`
                return (
                  <Link key={d.id} href={`/app/memories/${d.id}`} className="wiki-dec-row">
                    <span className="id">{refId}</span>
                    <div>
                      <div className="ttl">{d.title}</div>
                      <div className="meta">
                        {d.ownerHandle && `owner @${d.ownerHandle}`}
                        {d.ratifiedAt && ` · ratified ${fmtShort(d.ratifiedAt)}`}
                        {!d.ownerHandle && !d.ratifiedAt && `Created ${fmtShort(d.createdAt)}`}
                      </div>
                    </div>
                    <span className={cn('stat', klass)}>
                      {klass === 'eff' && d.effectiveAt
                        ? `Effective ${fmtShort(d.effectiveAt)}`
                        : d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                    </span>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {data.dept.head && (
          <>
            <div className="wiki-sec-head">Head</div>
            <div className="wiki-members" style={{ gridTemplateColumns: '1fr' }}>
              <Link
                href={`/app/wiki?tab=people&person=${data.dept.head.id}`}
                className="wiki-mem"
              >
                <div className={cn('av', avPalette(data.dept.head.id))}>
                  {avInitials(data.dept.head.name, data.dept.head.email)}
                </div>
                <div className="body">
                  <div className="nm">
                    {data.dept.head.name || data.dept.head.email}
                    <span className="wiki-pill-lead">Lead</span>
                    <Crown size={10} style={{ color: 'oklch(0.4 0.12 50)' }} />
                  </div>
                  <div className="ti">@{(data.dept.head.email || '').split('@')[0]}</div>
                </div>
              </Link>
            </div>
          </>
        )}

        {data.members.length > 0 && (
          <>
            <div className="wiki-sec-head">Members</div>
            <div className="wiki-members">
              {data.members.slice(0, 7).map((m) => {
                const palette = avPalette(m.userId)
                const initials = avInitials(m.name, m.email)
                return (
                  <Link
                    key={m.userId}
                    href={`/app/wiki?tab=people&person=${m.userId}`}
                    className="wiki-mem"
                  >
                    <div className={cn('av', palette)}>{initials}</div>
                    <div className="body">
                      <div className="nm">{m.name || m.email}</div>
                      <div className="ti">
                        {m.title || (m.role ? m.role.replace('_', ' ') : '')}
                        {m.email && ` · @${m.email.split('@')[0]}`}
                      </div>
                    </div>
                  </Link>
                )
              })}
              {data.members.length > 7 && (
                <div className="wiki-mem">
                  <div className="av c">+{data.members.length - 7}</div>
                  <div className="body">
                    <div className="nm" style={{ color: 'var(--ink-3)' }}>View all {data.members.length} members</div>
                    <div className="ti">Filter by role on the People tab</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="wiki-sec-head">Recent records · last 7 days</div>
        {data.records.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>No visible memories.</p>
        ) : (
          <div className="wiki-rec-list">
            {data.records.slice(0, 8).map((r) => (
              <Link key={r.id} href={`/app/memories/${r.id}`} className="wiki-rec">
                <span className={cn('pip', r.type)} />
                <div style={{ minWidth: 0 }}>
                  <div className="ttl">{r.title}</div>
                  <div className="meta">
                    <span style={{ textTransform: 'capitalize' }}>{r.type}</span>
                    {r.summary && ` · ${r.summary.slice(0, 80)}${r.summary.length > 80 ? '…' : ''}`}
                  </div>
                </div>
                <span className="when">{fmtShort(r.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}

        {data.stale && (
          <div className="wiki-risk-banner" style={{ borderColor: 'color-mix(in oklch, var(--mem-amber), white 60%)', background: 'var(--mem-amber-soft)', marginTop: 18, marginBottom: 0 }}>
            <AlertTriangle size={16} style={{ color: 'var(--mem-amber-ink)' }} />
            <div className="body">
              <div className="title" style={{ color: 'var(--mem-amber-ink)' }}>This department has gone quiet</div>
              <div className="desc">
                No new memories captured in the last 90 days. The summary may be stale.
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
