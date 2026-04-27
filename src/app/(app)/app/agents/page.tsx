'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bot, Sparkles, Users as UsersIcon, Building2, Plus, Info, MessageSquare,
  FileText, Gavel, Landmark, Loader2, Activity, Mail, Megaphone, Zap,
  SendHorizonal, CalendarPlus, FileEdit, Ticket, LineChart, ArrowRight, Clock,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { AgentChatDrawer } from '@/components/enterprise/agent-chat-drawer'

// Map server icon names → lucide components
const ICONS: Record<string, typeof Bot> = {
  Bot, Sparkles, FileText, Gavel, Landmark, MessageSquare,
}

interface Agent {
  id: string
  name: string
  slug: string
  description: string | null
  tier: 'org' | 'departmental' | 'personal' | 'third_party'
  iconName: string | null
  color: string | null
  systemPrompt: string
  scopeConfig: Record<string, unknown>
  deploymentTargets: string[]
  usageCount: number
  status: string
}

const TIER_META: Record<Agent['tier'], { label: string; desc: string; icon: typeof Bot }> = {
  org: { label: 'Organization', desc: 'Available to everyone in the org', icon: Building2 },
  departmental: { label: 'Departmental', desc: 'Scoped to a department\'s knowledge', icon: UsersIcon },
  personal: { label: 'Personal', desc: 'Just for you', icon: Sparkles },
  third_party: { label: 'Third-party', desc: 'Imported from external AI agent platforms', icon: Bot },
}

type Tab = 'agents' | 'activity'

export default function AgentsPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [canAuthor, setCanAuthor] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('agents')
  const [openAgentId, setOpenAgentId] = useState<string | null>(null)

  useEffect(() => {
    if (!activeOrgId) return
    ;(async () => {
      setErr(null)
      const res = await fetch(`/api/enterprise/agents?orgId=${activeOrgId}&includeDrafts=true`)
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      const data = await res.json()
      setAgents(data.agents)
      setCanAuthor(!!data.canAuthor)
    })()
  }, [activeOrgId])

  const tiers: Agent['tier'][] = ['org', 'departmental', 'personal']

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <Bot className="h-3.5 w-3.5" />
          Agents
        </div>
        <h1 className="font-display text-4xl tracking-tight mb-1">AI agents for your org</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Each agent is Chat with a specific knowledge scope and persona.
          Policy Helper answers only from policies. Decision Lookup finds past decisions.
          HR Onboarding talks like a friendly buddy. Deploy to Slack, Teams, or the web.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-border">
        <TabButton active={tab === 'agents'} onClick={() => setTab('agents')} label="Agents" count={agents?.length} />
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} label="Activity" icon={Activity} />
      </div>

      {err && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">{err}</div>
      )}

      {/* Agents tab */}
      {tab === 'agents' && (
        <>
          {/* Builder CTA */}
          {canAuthor && activeOrgId && (
            <div className="flex items-center justify-between rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-transparent p-5 hover:from-violet-500/10 hover:via-fuchsia-500/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md ring-2 ring-violet-500/30 shrink-0">
                  <Sparkles className="h-5 w-5 text-white" strokeWidth={2.25} />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold tracking-tight">Build a custom agent</div>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    Name, system prompt, knowledge scope, and a live test chat. All in one page.
                  </p>
                </div>
              </div>
              <Button asChild className="rounded-full h-9 px-5 shadow-sm">
                <Link href={`/app/admin/${activeOrgId}/agents/new`}>
                  <Plus className="h-4 w-4 mr-1" /> New agent
                </Link>
              </Button>
            </div>
          )}

          {agents === null ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Loading agents…
            </Card>
          ) : agents.length === 0 ? (
            <Card className="p-8 text-center">
              <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm font-medium mb-1">No agents yet</div>
              <p className="text-xs text-muted-foreground">Ask an admin to set up agents for your org.</p>
            </Card>
          ) : (
            <>
              {tiers.map((tier) => {
                const meta = TIER_META[tier]
                const Icon = meta.icon
                const ags = agents.filter((a) => a.tier === tier)
                if (ags.length === 0) return null
                return (
                  <section key={tier}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h2 className="font-display text-xl">{meta.label}</h2>
                      <span className="text-xs text-muted-foreground">· {meta.desc}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ags.map((a) => (
                        <AgentCard key={a.id} agent={a} onOpen={() => setOpenAgentId(a.id)} canAuthor={canAuthor} orgId={activeOrgId} />
                      ))}
                    </div>
                  </section>
                )
              })}

              {/* Third-party slot */}
              <Card className="p-5 border-dashed">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">Third-party agents</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Coming soon: import third-party AI agents and connect your own custom agent runtimes.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Action agents — distinct from chat agents. These DO things
                  (draft, send, create) instead of just answering. v1 is two
                  live action agents + 6 coming-soon; real send-integrations
                  land with Nango in Sprint P. */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-display text-xl">Action agents</h2>
                  <span className="text-xs text-muted-foreground">· agents that DO things, not just answer</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ActionAgentCard
                    icon={Mail}
                    title="Draft email reply"
                    desc="Paste an email thread. The AI drafts a memory-grounded reply. Copy out when happy."
                    href="/app/compose/email-reply"
                    status="live"
                    tone="from-amber-500/10 to-orange-500/5 border-amber-500/20"
                  />
                  <ActionAgentCard
                    icon={Megaphone}
                    title="Draft team broadcast"
                    desc="Pick a decision or name a topic. The AI drafts Slack + email versions of the announcement."
                    href="/app/compose/broadcast"
                    status="live"
                    tone="from-violet-500/10 to-purple-500/5 border-violet-500/20"
                  />
                  <ActionAgentCard icon={SendHorizonal} title="Send to Slack channel" desc="Post a message to a channel. Needs Nango." status="soon" />
                  <ActionAgentCard icon={Ticket} title="Create Linear / Jira ticket" desc="File a ticket from a decision or memory. Needs Nango." status="soon" />
                  <ActionAgentCard icon={CalendarPlus} title="Schedule follow-up" desc="Book a calendar event off a decision. Needs Nango." status="soon" />
                  <ActionAgentCard icon={FileEdit} title="Update Notion page" desc="Push memory content into an existing Notion doc. Needs Nango." status="soon" />
                  <ActionAgentCard icon={FileText} title="Draft policy amendment" desc="Compose a delta against a published policy." status="soon" />
                  <ActionAgentCard icon={LineChart} title="Weekly team report" desc="Auto-compile what's shipped, what's pending, what's stuck." status="soon" />
                </div>
              </section>
            </>
          )}
        </>
      )}

      {/* Activity tab */}
      {tab === 'activity' && <ActivityTab />}

      {/* Agent chat drawer — slide-in from the right */}
      <AgentChatDrawer agentId={openAgentId} onClose={() => setOpenAgentId(null)} />
    </div>
  )
}

// Eight vibrant gradients keyed off a deterministic hash of the agent's id.
// Each agent gets a distinct visual identity so the page reads like a roster
// of characters instead of a list of grey rectangles.
const AGENT_PALETTE: Array<{ from: string; to: string; ring: string }> = [
  { from: 'from-violet-500',  to: 'to-fuchsia-500', ring: 'ring-violet-500/30' },
  { from: 'from-amber-500',   to: 'to-orange-600',  ring: 'ring-amber-500/30' },
  { from: 'from-emerald-500', to: 'to-teal-600',    ring: 'ring-emerald-500/30' },
  { from: 'from-blue-500',    to: 'to-indigo-600',  ring: 'ring-blue-500/30' },
  { from: 'from-rose-500',    to: 'to-pink-600',    ring: 'ring-rose-500/30' },
  { from: 'from-cyan-500',    to: 'to-blue-600',    ring: 'ring-cyan-500/30' },
  { from: 'from-lime-500',    to: 'to-emerald-600', ring: 'ring-lime-500/30' },
  { from: 'from-purple-500',  to: 'to-indigo-600',  ring: 'ring-purple-500/30' },
]

function paletteFor(seed: string): typeof AGENT_PALETTE[number] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AGENT_PALETTE[Math.abs(h) % AGENT_PALETTE.length]
}

function AgentCard({ agent, onOpen, canAuthor, orgId }: { agent: Agent; onOpen: () => void; canAuthor: boolean; orgId: string | null }) {
  const Icon = ICONS[agent.iconName ?? 'Bot'] ?? Bot
  const palette = useMemo(() => paletteFor(agent.id), [agent.id])
  const scopeLabel = useMemo(() => {
    const s = agent.scopeConfig
    if (!s || Object.keys(s).length === 0) return 'All accessible memory'
    const parts: string[] = []
    if (s.types && Array.isArray(s.types) && s.types.length > 0) parts.push(`Types: ${(s.types as string[]).join(', ')}`)
    if (s.tags && Array.isArray(s.tags) && s.tags.length > 0) parts.push(`Tags: ${(s.tags as string[]).slice(0, 3).join(', ')}`)
    if (s.departmentPrefix) parts.push(`Department: ${s.departmentPrefix}`)
    if (s.departmentIds && Array.isArray(s.departmentIds) && s.departmentIds.length > 0) parts.push(`${(s.departmentIds as string[]).length} departments`)
    return parts.length > 0 ? parts.join(' · ') : 'All accessible memory'
  }, [agent.scopeConfig])

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group h-full flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        <div className={cn(
          'h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br shadow-md ring-2',
          palette.from, palette.to, palette.ring,
        )}>
          <Icon className="h-7 w-7 text-white drop-shadow-sm" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base text-foreground tracking-tight">{agent.name}</h3>
            {agent.usageCount > 100 && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Popular</Badge>
            )}
            {agent.status === 'draft' && (
              <Badge variant="outline" className="text-[10px]">Draft</Badge>
            )}
          </div>
          {agent.description && (
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{agent.description}</p>
          )}
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground space-y-1 mb-4 flex-1">
        <div className="flex gap-1.5">
          <span className="text-muted-foreground/60 shrink-0">Scope</span>
          <span className="text-foreground/80 truncate">{scopeLabel}</span>
        </div>
        {agent.usageCount > 0 && (
          <div className="flex gap-1.5">
            <span className="text-muted-foreground/60 shrink-0">Used</span>
            <span className="text-foreground/80">{agent.usageCount.toLocaleString()} time{agent.usageCount === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
        <div className="flex items-center gap-1 flex-wrap">
          {agent.deploymentTargets.map((d) => (
            <Badge key={d} variant="outline" className="text-[10px] capitalize">{d}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {canAuthor && <AgentRunNowButton agentId={agent.id} />}
          {canAuthor && orgId && (
            <Button
              size="sm"
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-8 rounded-full"
            >
              <Link href={`/app/admin/${orgId}/agents/${agent.id}/edit`}>Edit</Link>
            </Button>
          )}
          <Button
            size="sm"
            onClick={onOpen}
            className="bg-foreground text-background hover:bg-foreground/90 h-8 rounded-full px-4"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Chat
          </Button>
        </div>
      </div>
    </div>
  )
}

function AgentRunNowButton({ agentId }: { agentId: string }) {
  const [running, setRunning] = useState(false)
  async function run() {
    setRunning(true)
    try {
      const res = await fetch(`/api/enterprise/agents/${agentId}/run`, { method: 'POST' })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        alert(b.error || 'Agent run failed')
        return
      }
      const data = await res.json()
      alert(`Ran over ${data.corpusSize} memories. Result saved to Memory.`)
      if (data.recordId) {
        window.open(`/app/memories/${data.recordId}`, '_blank')
      }
    } finally {
      setRunning(false)
    }
  }
  // Labeled pill instead of a bare lightning icon — the user shouldn't have to
  // hover to figure out what it does. "Run now" admin-fires the agent against
  // recent memory; the result lands as a new memory record.
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={run}
      disabled={running}
      className="h-8 rounded-full px-3 gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300"
      title="Trigger this agent over the org's recent memory; result saves as a new memory record"
    >
      {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">Run now</span>
    </Button>
  )
}

// Per-card vibrant gradient for action-agent avatars. Live ones get full
// color; "soon" ones desaturate. Maps the tone hints used by the existing
// callers so the Email / Broadcast cards keep their amber / violet feel.
const ACTION_PALETTE: Record<string, { from: string; to: string }> = {
  amber:  { from: 'from-amber-500',  to: 'to-orange-600' },
  violet: { from: 'from-violet-500', to: 'to-fuchsia-500' },
  emerald:{ from: 'from-emerald-500', to: 'to-teal-600' },
  sky:    { from: 'from-sky-500',    to: 'to-blue-600' },
  rose:   { from: 'from-rose-500',   to: 'to-pink-600' },
  default:{ from: 'from-slate-500',  to: 'to-slate-600' },
}

function actionPaletteFor(tone?: string): typeof ACTION_PALETTE[string] {
  if (!tone) return ACTION_PALETTE.default
  for (const key of Object.keys(ACTION_PALETTE)) {
    if (tone.includes(key)) return ACTION_PALETTE[key]
  }
  return ACTION_PALETTE.default
}

function ActionAgentCard({
  icon: Icon, title, desc, href, status, tone,
}: {
  icon: any
  title: string
  desc: string
  href?: string
  status: 'live' | 'soon'
  tone?: string
}) {
  const isLive = status === 'live'
  const palette = actionPaletteFor(tone)
  const Wrapper: any = isLive && href ? Link : 'div'
  const wrapperProps = isLive && href ? { href } : {}
  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'rounded-2xl border bg-card p-5 transition-all flex flex-col',
        isLive
          ? 'shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
          : 'opacity-60',
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ring-2',
          isLive
            ? `bg-gradient-to-br ${palette.from} ${palette.to} ring-foreground/10`
            : 'bg-muted text-muted-foreground ring-transparent',
        )}>
          <Icon className={cn('h-5 w-5', isLive ? 'text-white drop-shadow-sm' : '')} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
            {isLive
              ? <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Live</Badge>
              : <Badge variant="outline" className="text-[9px] bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/30">Coming soon</Badge>}
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
          {isLive && (
            <div className="mt-3 text-[12px] font-medium text-primary inline-flex items-center gap-1">
              Open <ArrowRight className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  )
}

function TabButton({ active, onClick, label, count, icon: Icon }: { active: boolean; onClick: () => void; label: string; count?: number; icon?: typeof Bot }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
        active ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      {count != null && <span className="text-xs text-muted-foreground">({count})</span>}
    </button>
  )
}

// ─── Activity tab ──────────────────────────────────────────────────────────

interface ActivityEvent {
  id: string
  type: string
  status: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  result: string | null
  error: string | null
  workspaceId: string
}

function ActivityTab() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch('/api/enterprise/agents/activity')
      if (cancelled) return
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      const data = await res.json()
      setEvents(data.events)
    }
    load()
    const t = setInterval(load, 8000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const byType = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of events ?? []) m.set(e.type, (m.get(e.type) ?? 0) + 1)
    return m
  }, [events])

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">What the AI is doing (last 100 events)</div>
        <div className="flex items-center gap-4 flex-wrap text-sm">
          {['triage', 'ingest', 'embed', 'link', 'project_suggest'].map((t) => (
            <div key={t}>
              <span className="font-semibold tabular-nums">{byType.get(t) ?? 0}</span>
              <span className="text-muted-foreground ml-1.5 capitalize">{t.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </Card>

      {err && <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">{err}</div>}

      {events === null ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Loading activity…
        </Card>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center">
          <Activity className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <div className="text-sm font-medium mb-1">Nothing running right now</div>
          <p className="text-xs text-muted-foreground">As memories get captured, you&apos;ll see triage, linking, and clustering runs here in real time.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="p-3 flex items-center gap-3 text-sm">
                <div className={cn(
                  'h-2 w-2 rounded-full shrink-0',
                  e.status === 'completed' ? 'bg-emerald-500' :
                  e.status === 'failed' ? 'bg-rose-500' :
                  e.status === 'running' ? 'bg-amber-500 animate-pulse' :
                  'bg-muted-foreground/40',
                )} />
                <span className="capitalize font-medium text-foreground">{e.type.replace('_', ' ')}</span>
                <span className="text-muted-foreground flex-1 truncate">
                  {e.status === 'completed' ? (e.result || 'completed') : e.status === 'failed' ? (e.error || 'failed') : e.status}
                </span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

