'use client'

// Topic detail — same data shape as before, restyled to match the design's
// article layout: breadcrumb, serif h2 with topic name, freshness pill,
// meta row, auto-gen strip, summary, "Appears in" dept chips, recent records.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Loader2, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TopicDetailData = {
  topic: string
  summary: string
  summaryCached: boolean
  summaryGeneratedAt: string
  stale: boolean
  lastRecordAt: string | null
  recordCount: number
  records: Array<{ id: string; title: string; summary: string | null; type: string; createdAt: string }>
  departments: Array<{ id: string; name: string; kind: string; recordCount: number }>
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

export function TopicDetail({ orgId, topic, orgName }: { orgId: string; topic: string; orgName?: string }) {
  const [data, setData] = useState<TopicDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/wiki/topic/${encodeURIComponent(topic)}?orgId=${orgId}`)
        if (!res.ok) { if (!cancelled) setData(null); return }
        const d = await res.json()
        if (!cancelled) setData(d)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orgId, topic])

  if (loading) {
    return (
      <div className="wiki-article" style={{ padding: 32, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13 }}>
        <Loader2 size={14} className="animate-spin" /> Loading topic…
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
          <span>Topics</span>
          <ChevronRight size={10} strokeWidth={2} />
          <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>#{data.topic}</span>
        </div>
        <h2>
          <span className="name">#{data.topic}</span>
          <span className={cn('wiki-fresh', freshTone)}>
            <span className="pulse" />
            {data.stale ? `stale · last record ${fmtShort(data.lastRecordAt)}` : `live · synced ${synced}`}
          </span>
        </h2>
        <div className="wiki-meta-row">
          <span><b>Memories:</b> {data.recordCount.toLocaleString()}</span>
          <span><b>Departments:</b> {data.departments.length}</span>
          {data.lastRecordAt && <span><b>Last touched:</b> {fmtShort(data.lastRecordAt)}</span>}
        </div>
        <div className="wiki-gen-strip">
          <Sparkles size={14} strokeWidth={1.8} />
          <span>
            <b>Auto-summarized</b> from {data.recordCount.toLocaleString()} memor{data.recordCount === 1 ? 'y' : 'ies'} across {data.departments.length} department{data.departments.length === 1 ? '' : 's'} · last regen {synced}.
          </span>
          <span className="right">
            <Link
              href={`/app/memories?tag=${encodeURIComponent(data.topic)}`}
              style={{ color: 'var(--accent-ink)', fontSize: 11.5, fontWeight: 600, textDecoration: 'none' }}
            >
              See memories →
            </Link>
          </span>
        </div>
      </header>

      <div className="wiki-art-body">
        <p className="wiki-summary">{data.summary}</p>

        {data.departments.length > 0 && (
          <>
            <div className="wiki-sec-head">Appears in</div>
            <div className="wiki-topic-tags">
              {data.departments.map((d) => (
                <Link
                  key={d.id}
                  href={`/app/wiki?tab=hierarchy&deptId=${d.id}`}
                  className="wiki-ttag"
                  style={{ fontFamily: 'var(--sans)', textTransform: 'none' }}
                >
                  {d.name}<span className="ct">{d.recordCount}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="wiki-sec-head">Recent records</div>
        {data.records.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>No memories yet.</p>
        ) : (
          <div className="wiki-rec-list">
            {data.records.slice(0, 12).map((r) => (
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
              <div className="title" style={{ color: 'var(--mem-amber-ink)' }}>This topic has gone quiet</div>
              <div className="desc">No new mentions in the last 90 days. May be obsolete.</div>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
