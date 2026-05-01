'use client'

// Home — daily briefing dashboard.
//
// Visual: claude.ai/design Home.html (tokens + classes in dashboard.css).
// Data wiring:
//   /api/user                              greeting name
//   /api/enterprise/analytics/home         stat row + recent ingestion count
//   /api/records?limit=5                   recent memories
//   /api/integrations/nango/status         sync status panel
//   /api/enterprise/meeting-prep           next meeting block

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, MessageSquare, Calendar as CalendarIcon, ChevronRight,
  Eye, Clock, Flame, FileText, CheckCircle2, AlertTriangle,
  Database, UsersRound, ArrowLeftRight, ShieldCheck, Download,
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

interface AnalyticsTotals {
  activeMembers: number
  memories: number
  recentMemories: number
  decisions: number
  policies: number
  staleMemories: number
}

interface RecentRecord {
  id: string
  type: string
  title: string
  summary: string | null
  createdAt: string
}

interface SyncProvider {
  key: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  lastSyncedAt: string | null
  syncError: string | null
}

interface NextMeeting {
  id: string
  title: string
  startsAt: string
  attendees: number
}

const PROVIDER_LABEL: Record<string, string> = {
  'gmail-nango': 'Gmail',
  'google-calendar-nango': 'Google Calendar',
  'google-drive-nango': 'Google Drive',
  'slack-nango': 'Slack',
  'notion-nango': 'Notion',
  'github-nango': 'GitHub',
  'linear-nango': 'Linear',
  'confluence-nango': 'Confluence',
  'jira-nango': 'Jira',
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`
  return `${Math.floor(ms / 86_400_000)}d`
}

function greeting(name: string | null) {
  const h = new Date().getHours()
  const phrase = h < 5 ? 'Up early' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const first = (name || 'there').split(/[\s.@]/)[0]
  return { phrase, first: first.charAt(0).toUpperCase() + first.slice(1) }
}

export default function HomePage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const enterpriseOrgs = useAppStore((s) => s.enterpriseOrgs)
  const activeOrg = enterpriseOrgs.find((o) => o.orgId === activeOrgId)

  const [user, setUser] = useState<{ name: string | null; email: string } | null>(null)
  const [totals, setTotals] = useState<AnalyticsTotals | null>(null)
  const [recent, setRecent] = useState<RecentRecord[]>([])
  const [sync, setSync] = useState<SyncProvider[]>([])
  const [nextMeeting, setNextMeeting] = useState<NextMeeting | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeOrgId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetch('/api/user').then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/enterprise/analytics/home?orgId=${activeOrgId}`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/records?limit=5').then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/integrations/nango/status').then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/enterprise/meeting-prep?orgId=${activeOrgId}`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([userData, analyticsData, recordsData, nangoData, meetingData]) => {
      if (cancelled) return
      if (userData?.user) setUser(userData.user)
      if (analyticsData?.totals) setTotals(analyticsData.totals)
      if (recordsData?.records) setRecent(recordsData.records.slice(0, 5))
      if (nangoData?.providers) setSync(nangoData.providers)
      if (meetingData?.next) setNextMeeting(meetingData.next)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [activeOrgId])

  const { phrase, first } = greeting(user?.name || user?.email || null)
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  const orgName = activeOrg?.orgName || 'your organization'

  return (
    <div style={{ padding: '26px 32px 64px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      {/* Greeting + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: 'var(--ink)' }}>
            {phrase}, <em style={{ fontStyle: 'italic', color: 'var(--accent-ink)' }}>{first}</em>.
          </h1>
          <p style={{ color: 'var(--ink-3)', margin: '6px 0 0', fontSize: 14 }}>
            Here&apos;s what needs your attention in <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{orgName}</b> · {todayStr}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', paddingTop: 4 }}>
          <button
            type="button"
            onClick={() => useAppStore.getState().setCommandOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px',
              borderRadius: 9, fontSize: 13, fontWeight: 550, fontFamily: 'inherit',
              border: '1px solid var(--accent)', background: 'var(--accent)', color: 'white', cursor: 'pointer',
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
            <MessageSquare className="h-3.5 w-3.5" /> Ask Lattice
          </Link>
        </div>
      </div>

      {/* Stat row */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard
          icon={<UsersRound className="h-3.5 w-3.5" />}
          tone="accent"
          cap="Active members"
          val={totals?.activeMembers ?? (loading ? '—' : 0)}
          foot={(totals && totals.activeMembers > 0) ? `${totals.activeMembers} ${totals.activeMembers === 1 ? 'member' : 'members'}` : 'no members yet'}
        />
        <StatCard
          icon={<Database className="h-3.5 w-3.5" />}
          tone="ink"
          cap="Memories"
          val={totals?.memories ?? (loading ? '—' : 0)}
          foot={totals ? `+${totals.recentMemories.toLocaleString()} this week` : ''}
        />
        <StatCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="green"
          cap="Decisions"
          val={totals?.decisions ?? (loading ? '—' : 0)}
          foot={totals && totals.decisions > 0 ? 'logged in this org' : 'none yet'}
        />
        <StatCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          tone="amber"
          cap="Stale"
          val={totals?.staleMemories ?? (loading ? '—' : 0)}
          foot="over 90 days untouched"
        />
      </section>

      {/* Meeting block */}
      <section style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div style={{ flex: 1 }}>
            {nextMeeting ? (
              <>
                <h4 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{nextMeeting.title}</h4>
                <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 13 }}>
                  {new Date(nextMeeting.startsAt).toLocaleString()} · {nextMeeting.attendees} {nextMeeting.attendees === 1 ? 'attendee' : 'attendees'}
                </p>
              </>
            ) : (
              <>
                <h4 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>No meetings on deck in the next 8 hours</h4>
                <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 13 }}>
                  When you have one, Lattice will brief you 15 minutes ahead with context from memory.
                </p>
              </>
            )}
          </div>
          <button type="button" onClick={() => useAppStore.getState().setCommandOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px',
            borderRadius: 9, fontSize: 13, fontWeight: 550, fontFamily: 'inherit',
            border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink)', cursor: 'pointer',
          }}>
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </section>

      {/* Trending — sourced from recent records as a placeholder; replace with
          a real /api/records/trending endpoint when one ships. */}
      {recent.length > 0 && (
        <section style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <Flame className="h-3.5 w-3.5" style={{ color: 'var(--amber-ink)' }} />
            <span style={{ fontWeight: 600, fontSize: 14.5 }}>Trending</span>
            <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>— most recent in your org</span>
          </div>
          {recent.slice(0, 3).map((r, i) => (
            <Link key={r.id} href={`/app/memories/${r.id}`} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 14,
              padding: '12px 18px',
              borderBottom: i < 2 ? '1px solid var(--line-2)' : 'none',
              alignItems: 'flex-start', textDecoration: 'none', color: 'inherit',
            }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1, color: 'var(--amber-ink)', textAlign: 'right' }}>{i + 1}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText className="h-3 w-3" style={{ color: 'var(--ink-3)' }} />
                  {r.title}
                </div>
                {r.summary && (
                  <div style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 2, lineHeight: 1.5, maxWidth: '60ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.summary}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4, paddingTop: 4 }}>
                <Eye className="h-3 w-3" /> {r.type}
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Two-col: recent memories + quick actions/sync */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
        {/* Recent memories */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontWeight: 600, fontSize: 14.5 }}>Recent memories</span>
            <Link href="/app/memories" style={{ marginLeft: 'auto', color: 'var(--accent-ink)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
              All memories →
            </Link>
          </div>
          {recent.length === 0 && !loading && (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              No memories yet. <Link href="/app/brain-dump" style={{ color: 'var(--accent-ink)', textDecoration: 'none' }}>Capture your first →</Link>
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
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.title}</div>
                {r.summary && (
                  <div style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 2, lineHeight: 1.5, maxWidth: '60ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.summary}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', paddingTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock className="h-2.5 w-2.5" /> {timeAgo(r.createdAt)}
              </div>
            </Link>
          ))}
        </div>

        <div>
          {/* Quick actions */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>Quick actions</span>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <QuickAction icon={<ArrowLeftRight className="h-3.5 w-3.5" />} label="Knowledge transfer" href={activeOrgId ? `/app/admin/${activeOrgId}/handoff` : '#'} />
              <QuickAction icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Self-healing scan" href={activeOrgId ? `/app/admin/${activeOrgId}/health` : '#'} />
              <QuickAction icon={<Download className="h-3.5 w-3.5" />} label="Download briefing" href={activeOrgId ? `/api/enterprise/organizations/${activeOrgId}/decisions/briefing?format=markdown` : '#'} external />
              <QuickAction icon={<MessageSquare className="h-3.5 w-3.5" />} label="Ask Lattice" href="/app/ask" />
            </div>
          </div>

          {/* Sync status */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>Sync status</span>
              <Link href="/app/integrations" style={{ marginLeft: 'auto', color: 'var(--accent-ink)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
                Manage →
              </Link>
            </div>
            {sync.length === 0 && !loading && (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                No connectors yet. <Link href="/app/integrations" style={{ color: 'var(--accent-ink)', textDecoration: 'none' }}>Connect one →</Link>
              </div>
            )}
            {sync.map((p, i) => {
              const dotClass = p.status === 'connected' && !p.syncError ? 'ok'
                : p.syncError ? 'warn' : 'idle'
              return (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: i < sync.length - 1 ? '1px solid var(--line-2)' : 'none', fontSize: 13 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flex: 'none',
                    background: dotClass === 'ok' ? 'var(--green)' : dotClass === 'warn' ? 'var(--amber)' : 'var(--ink-4)',
                    boxShadow: dotClass === 'ok' ? '0 0 0 3px oklch(0.62 0.13 155 / 0.18)'
                      : dotClass === 'warn' ? '0 0 0 3px oklch(0.78 0.13 75 / 0.18)' : 'none',
                  }} />
                  <span style={{ fontWeight: 500, color: p.status === 'connected' ? 'var(--ink)' : 'var(--ink-3)' }}>
                    {PROVIDER_LABEL[p.key] || p.name}
                    {p.syncError && <span style={{ color: 'var(--amber-ink)', fontSize: 11, marginLeft: 6 }}>· error</span>}
                    {p.status !== 'connected' && <span style={{ fontSize: 11, marginLeft: 6 }}>· not connected</span>}
                  </span>
                  <span style={{ marginLeft: 'auto', color: 'var(--ink-3)', fontSize: 12 }}>
                    {p.lastSyncedAt ? timeAgo(p.lastSyncedAt) + ' ago'
                      : <Link href="/app/integrations" style={{ color: 'var(--accent-ink)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>Connect</Link>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center', marginTop: 34, color: 'var(--ink-3)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        <span>Cited</span> &nbsp;·&nbsp; <span>Auditable</span> &nbsp;·&nbsp; <span>Live</span> &nbsp;·&nbsp; <span style={{ color: 'var(--ink-4)' }}>Reattend Enterprise</span>
      </div>
    </div>
  )
}

function StatCard({ icon, tone, cap, val, foot }: {
  icon: React.ReactNode
  tone: 'accent' | 'amber' | 'green' | 'ink'
  cap: string
  val: number | string
  foot: string
}) {
  const bg = tone === 'accent' ? 'var(--accent-soft)'
    : tone === 'amber' ? 'var(--amber-soft)'
    : tone === 'green' ? 'var(--green-soft)'
    : 'oklch(0.95 0.005 270)'
  const fg = tone === 'accent' ? 'var(--accent-ink)'
    : tone === 'amber' ? 'var(--amber-ink)'
    : tone === 'green' ? 'oklch(0.4 0.12 155)'
    : 'var(--ink)'
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)', padding: '16px 18px 18px', minHeight: 112, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: bg, color: fg, flex: 'none' }}>
          {icon}
        </div>
        <span style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>{cap}</span>
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 1, letterSpacing: '-0.02em', marginTop: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
        {typeof val === 'number' ? val.toLocaleString() : val}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{foot}</div>
    </div>
  )
}

function QuickAction({ icon, label, href, external }: {
  icon: React.ReactNode; label: string; href: string; external?: boolean
}) {
  const styles = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
    borderRadius: 9, color: 'var(--ink)', textDecoration: 'none',
    fontSize: 13.5, fontWeight: 500,
  } as const
  const inner = (
    <>
      <span style={{ color: 'var(--accent)' }}>{icon}</span>
      {label}
      <ChevronRight className="h-3 w-3" style={{ marginLeft: 'auto', color: 'var(--ink-4)' }} />
    </>
  )
  return external
    ? <a href={href} style={styles} target="_blank" rel="noopener noreferrer">{inner}</a>
    : <Link href={href} style={styles}>{inner}</Link>
}
