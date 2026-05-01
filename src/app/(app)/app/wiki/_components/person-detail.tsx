'use client'

// Person detail — same data shape as before. Restyled to match the article
// chrome used by Dept and Topic. The "Knowledge at risk" banner stays on
// top when the person is offboarded with un-transferred records, and the
// transfer-history panel still loads independently.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Loader2, AlertTriangle, ChevronRight, Building2, ArrowRightLeft,
  History, Briefcase, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PersonDetailData = {
  person: {
    id: string; name: string | null; email: string; avatarUrl: string | null;
    role: string; title: string | null; status: string; offboardedAt: string | null;
  }
  departments: Array<{ id?: string; name?: string; kind?: string; role: string }>
  currentRoles: Array<{ title: string; deptId: string | null }>
  authored: Array<{ id: string; title: string; type: string; createdAt: string }>
  decisions: Array<{ id: string; title: string; status: string; decidedAt: string }>
  summary: string
  summaryCached: boolean
  summaryGeneratedAt: string
  stale: boolean
  lastRecordAt: string | null
  atRisk: boolean
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
  const s = (status || '').toLowerCase()
  if (s === 'effective') return 'eff'
  if (s === 'draft') return 'draft'
  if (s === 'superseded') return 'superseded'
  if (s === 'reversed') return 'reversed'
  return 'active'
}

export function PersonDetail({ orgId, userId, orgName }: { orgId: string; userId: string; orgName?: string }) {
  const [data, setData] = useState<PersonDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/wiki/person/${userId}?orgId=${orgId}`)
        if (!res.ok) { if (!cancelled) setData(null); return }
        const d = await res.json()
        if (!cancelled) setData(d)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orgId, userId])

  if (loading) {
    return (
      <div className="wiki-article" style={{ padding: 32, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13 }}>
        <Loader2 size={14} className="animate-spin" /> Loading person…
      </div>
    )
  }
  if (!data) return null

  const p = data.person
  const palette = avPalette(p.id)
  const initials = avInitials(p.name, p.email)
  const synced = fmtRelative(data.summaryGeneratedAt)
  const freshTone: 'amber' | 'rose' | undefined =
    p.status === 'offboarded' ? 'rose' : data.stale ? 'amber' : undefined
  const freshLabel =
    p.status === 'offboarded' ? `offboarded${p.offboardedAt ? ' · ' + fmtShort(p.offboardedAt) : ''}` :
    data.stale ? `stale · last record ${fmtShort(data.lastRecordAt)}` :
    `live · synced ${synced}`

  return (
    <>
      {data.atRisk && (
        <div className="wiki-risk-banner">
          <AlertTriangle className="ic" size={16} />
          <div className="body">
            <div className="title">Knowledge at risk</div>
            <div className="desc">
              {p.name || p.email} is offboarded but {data.authored.length} memor{data.authored.length === 1 ? 'y has' : 'ies have'} not been transferred to a current role-holder. Anchor them before this memory effectively vanishes.
            </div>
          </div>
          <Link href={`/app/admin/${orgId}/transfers`} className="action">
            <ArrowRightLeft size={12} /> Transfer
          </Link>
        </div>
      )}

      <article className="wiki-article">
        <header className="wiki-art-hd">
          <div className="wiki-breadcrumb">
            {orgName && <span>{orgName}</span>}
            {orgName && <ChevronRight size={10} strokeWidth={2} />}
            <span>People</span>
            <ChevronRight size={10} strokeWidth={2} />
            <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{p.name || p.email}</span>
          </div>
          <h2>
            <span className="name" style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <span className={cn('wiki-mem')} style={{ display: 'inline-flex', padding: 0 }}>
                <span className={cn('av', palette)} style={{ width: 36, height: 36, fontSize: 13 }}>
                  {initials}
                </span>
              </span>
              {p.name || p.email}
            </span>
            <span className={cn('wiki-fresh', freshTone)}>
              <span className="pulse" />
              {freshLabel}
            </span>
          </h2>
          <div className="wiki-meta-row">
            {p.title && <span><b>Title:</b> {p.title}</span>}
            <span><b>Role:</b> <span style={{ textTransform: 'capitalize' }}>{p.role.replace('_', ' ')}</span></span>
            <span><b>Email:</b> {p.email}</span>
            <span><b>Memories authored:</b> {data.authored.length}</span>
            {data.decisions.length > 0 && <span><b>Decisions:</b> {data.decisions.length}</span>}
          </div>
          <div className="wiki-gen-strip">
            <Sparkles size={14} strokeWidth={1.8} />
            <span>
              <b>Auto-summarized</b> from {data.authored.length} memor{data.authored.length === 1 ? 'y' : 'ies'}{data.decisions.length > 0 ? ` and ${data.decisions.length} decision${data.decisions.length === 1 ? '' : 's'}` : ''} · last regen {synced}.
            </span>
          </div>
        </header>

        <div className="wiki-art-body">
          <p className="wiki-summary">{data.summary}</p>

          {(data.departments.length > 0 || data.currentRoles.length > 0) && (
            <>
              <div className="wiki-sec-head">Where they sit</div>
              <div className="wiki-topic-tags">
                {data.departments.filter((d) => d.id && d.name).map((d, i) => (
                  <Link
                    key={d.id! + i}
                    href={`/app/wiki?tab=hierarchy&deptId=${d.id}`}
                    className="wiki-ttag"
                    style={{ fontFamily: 'var(--sans)', textTransform: 'none' }}
                  >
                    <Building2 size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                    {d.name}
                    <span className="ct" style={{ textTransform: 'capitalize' }}>{d.role}</span>
                  </Link>
                ))}
                {data.currentRoles.map((r, i) => (
                  <span key={i} className="wiki-ttag" style={{ fontFamily: 'var(--sans)', textTransform: 'none' }}>
                    <Shield size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                    {r.title}
                  </span>
                ))}
              </div>
            </>
          )}

          {data.decisions.length > 0 && (
            <>
              <div className="wiki-sec-head">
                Decisions they own
                <span className="qmark" title="Decisions where this person is listed as the owner">?</span>
              </div>
              <div className="wiki-dec-list">
                {data.decisions.map((d) => {
                  const klass = decisionStatusClass(d.status)
                  return (
                    <Link key={d.id} href={`/app/memories/${d.id}`} className="wiki-dec-row">
                      <span className="id">ADR</span>
                      <div>
                        <div className="ttl">{d.title}</div>
                        <div className="meta">Decided {fmtShort(d.decidedAt)}</div>
                      </div>
                      <span className={cn('stat', klass)}>
                        {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          <div className="wiki-sec-head">Memories authored</div>
          {data.authored.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>Nothing visible yet.</p>
          ) : (
            <div className="wiki-rec-list">
              {data.authored.slice(0, 12).map((r) => (
                <Link key={r.id} href={`/app/memories/${r.id}`} className="wiki-rec">
                  <span className={cn('pip', r.type)} />
                  <div style={{ minWidth: 0 }}>
                    <div className="ttl">{r.title}</div>
                    <div className="meta" style={{ textTransform: 'capitalize' }}>{r.type}</div>
                  </div>
                  <span className="when">{fmtShort(r.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}

          <TransferHistoryPanel orgId={orgId} userId={userId} />
        </div>
      </article>
    </>
  )
}

function TransferHistoryPanel({ orgId, userId }: { orgId: string; userId: string }) {
  const [events, setEvents] = useState<Array<{
    id: string; reason: string;
    from: { id: string; name: string | null; email: string };
    to: { id: string; name: string | null; email: string } | null;
    role: { id: string; title: string } | null;
    recordsTransferred: number; createdAt: string;
  }>>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/transfers/history?orgId=${orgId}&userId=${userId}`)
        if (res.ok) {
          const d = await res.json()
          setEvents(d.events || [])
        }
      } finally {
        setLoaded(true)
      }
    })()
  }, [orgId, userId])

  if (!loaded || events.length === 0) return null

  return (
    <>
      <div className="wiki-sec-head">
        <History size={11} style={{ marginRight: -4 }} />
        Transfer history
        <span className="qmark" title="Knowledge transfers in/out of this person">?</span>
      </div>
      <div className="wiki-rec-list">
        {events.map((e) => (
          <div key={e.id} className="wiki-rec" style={{ cursor: 'default' }}>
            <Briefcase size={12} style={{ color: 'var(--ink-3)', margin: '0 0 0 4px' }} />
            <div style={{ minWidth: 0 }}>
              <div className="ttl">
                {e.from.name || e.from.email} → {e.to ? (e.to.name || e.to.email) : <span style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>role only</span>}
              </div>
              <div className="meta">
                <span style={{ textTransform: 'capitalize' }}>{e.reason.replace('_', ' ')}</span>
                {e.role && ` · ${e.role.title}`}
                {` · ${e.recordsTransferred} memor${e.recordsTransferred === 1 ? 'y' : 'ies'}`}
              </div>
            </div>
            <span className="when">{fmtShort(e.createdAt)}</span>
          </div>
        ))}
      </div>
    </>
  )
}
