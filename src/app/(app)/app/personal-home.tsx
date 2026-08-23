'use client'

// Personal home - what /app renders for users with zero organization
// memberships (Solo Free tier).
//
// Deliberately a parallel component (not a conditional branch inside
// HomePage) so the org-user experience in page.tsx stays untouched. The
// shape mirrors the team home: greeting → quick actions → recent memories
// → quota / next-step prompts. No org analytics, no Start My Day across
// teammates, no Meeting Prep, no Trending across an org.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, MessageSquare, Database, Sparkles, Zap,
  ArrowUpRight, FileText, Users, Layers,
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

interface RecentRecord {
  id: string
  type: string
  title: string
  summary: string | null
  createdAt: string
}

function greeting(name: string | null) {
  const h = new Date().getHours()
  const phrase = h < 5 ? 'Up early' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const first = (name || 'there').split(/[\s.@]/)[0]
  return { phrase, first: first.charAt(0).toUpperCase() + first.slice(1) }
}

interface Props {
  user: { name: string | null; email: string } | null
}

export default function PersonalHomePage({ user }: Props) {
  const [recent, setRecent] = useState<RecentRecord[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [memoryCount, setMemoryCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    // Recent records - workspace-scoped, no org needed. /api/records returns
    // { records, total } when called with includeTotal=1 (already supported).
    fetch('/api/records?limit=5&includeTotal=1')
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((data) => {
        if (cancelled) return
        if (data?.records) setRecent(data.records.slice(0, 5))
        if (typeof data?.total === 'number') setMemoryCount(data.total)
        else if (data?.records) setMemoryCount(data.records.length)
        setRecentLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const { phrase, first } = greeting(user?.name || user?.email || null)
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ padding: '26px 32px 64px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Greeting */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: 'var(--ink)' }}>
            {phrase}, <em style={{ fontStyle: 'italic', color: 'var(--brand-ink)' }}>{first}</em>.
          </h1>
          <p style={{ color: 'var(--ink-3)', margin: '6px 0 0', fontSize: 14 }}>
            {memoryCount !== null && memoryCount > 0
              ? <>Your memory has {memoryCount} {memoryCount === 1 ? 'entry' : 'entries'} · {todayStr}</>
              : <>Your personal memory layer · {todayStr}</>}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', paddingTop: 4 }}>
          <button
            type="button"
            onClick={() => useAppStore.getState().setCommandOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px',
              borderRadius: 9, fontSize: 13, fontWeight: 550, fontFamily: 'inherit',
              border: '1px solid var(--brand)', background: 'var(--brand)', color: 'white', cursor: 'pointer',
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Capture
          </button>
          <Link
            href="/app/ask"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px',
              borderRadius: 9, fontSize: 13, fontWeight: 550,
              border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink)', textDecoration: 'none',
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Ask
          </Link>
        </div>
      </div>

      {/* Empty-state helper for brand-new accounts */}
      {!recentLoading && recent.length === 0 && (
        <section style={{
          border: '1px solid var(--line)',
          borderRadius: 14,
          background: 'var(--panel)',
          padding: '28px 26px',
          marginBottom: 16,
        }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, margin: '0 0 8px', color: 'var(--ink)' }}>
            Welcome to Reattend.
          </h2>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.55, margin: '0 0 18px', maxWidth: '60ch' }}>
            Capture a thought, paste a meeting transcript, or connect an integration. Your memory grows from day one - and you can ask anything across it the moment there's something to ask about.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/app/brain-dump" style={ctaPrimary}>
              <Sparkles className="h-3.5 w-3.5" /> Start with a brain-dump
            </Link>
            <Link href="/app/integrations" style={ctaGhost}>
              <Zap className="h-3.5 w-3.5" /> Connect Gmail / Notion / Calendar
            </Link>
          </div>
        </section>
      )}

      {/* Stat row - two personal-flavored cards. Quota meter intentionally
          deferred to a follow-up: /api/subscription doesn't yet expose
          aiQueriesThisMonth / tier in a stable shape we can rely on. */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard
          icon={<Database className="h-3.5 w-3.5" />}
          tone="ink"
          cap="Memories"
          val={memoryCount ?? '-'}
          foot={memoryCount === 0 ? 'capture your first below' : 'across your personal workspace'}
        />
        <StatCard
          icon={<Layers className="h-3.5 w-3.5" />}
          tone="green"
          cap="Plan"
          val="Solo"
          foot="free, forever - see /pricing for team plans"
        />
      </section>

      {/* Recent memories */}
      <section style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontWeight: 600, fontSize: 14.5 }}>Recent memories</span>
          {recent.length > 0 && (
            <Link href="/app/memories" style={{ marginLeft: 'auto', color: 'var(--brand-ink)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
              All memories →
            </Link>
          )}
        </div>
        {recentLoading && (
          <div style={{ padding: '24px 18px', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
        )}
        {!recentLoading && recent.length === 0 && (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            No memories yet. <Link href="/app/brain-dump" style={{ color: 'var(--brand-ink)', textDecoration: 'none' }}>Capture your first →</Link>
          </div>
        )}
        {recent.map((r, i) => (
          <Link key={r.id} href={`/app/memories/${r.id}`} style={{
            display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 14,
            padding: '13px 18px',
            borderBottom: i < recent.length - 1 ? '1px solid var(--line-2)' : 'none',
            alignItems: 'flex-start', textDecoration: 'none', color: 'inherit',
          }}>
            <span style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, paddingTop: 2 }}>
              {r.type}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText className="h-3 w-3" style={{ color: 'var(--ink-3)' }} />
                {r.title}
              </div>
              {r.summary && (
                <div style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 2, lineHeight: 1.5, maxWidth: '70ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.summary}
                </div>
              )}
            </div>
          </Link>
        ))}
      </section>

      {/* Bottom: upgrade-to-team prompt - soft, single line */}
      <section style={{
        marginTop: 24,
        padding: '18px 22px',
        border: '1px dashed var(--line)',
        borderRadius: 14,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <Users className="h-4 w-4" style={{ color: 'var(--brand-ink)', flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink-2)' }}>
          Want to use Reattend with your team? Create an organization - adds shared workspaces, decision logs, exit interviews, and the Chrome extension.
        </div>
        <Link
          href="/app/admin/onboarding"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 550,
            border: '1px solid var(--brand)', background: 'transparent', color: 'var(--brand-ink)', textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          Start a team plan <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  )
}

// ─── helpers (kept local - same look as the org HomePage StatCard) ───────────

const ctaPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px',
  borderRadius: 9, fontSize: 13, fontWeight: 550,
  border: '1px solid var(--brand)', background: 'var(--brand)', color: 'white', textDecoration: 'none',
}

const ctaGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px',
  borderRadius: 9, fontSize: 13, fontWeight: 550,
  border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink)', textDecoration: 'none',
}

interface StatCardProps {
  icon: React.ReactNode
  tone: 'ink' | 'accent' | 'green' | 'amber'
  cap: string
  val: number | string
  foot: string
}

function StatCard({ icon, tone, cap, val, foot }: StatCardProps) {
  const toneColor = {
    ink: 'var(--ink-2)',
    accent: 'var(--brand-ink)',
    green: 'var(--green-ink)',
    amber: 'var(--amber-ink)',
  }[tone]
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: toneColor, fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon}
        {cap}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1.1, color: 'var(--ink)', margin: '6px 0 4px' }}>
        {val}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{foot}</div>
    </div>
  )
}
