'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bot, Sparkles, Users as UsersIcon, Building2, Plus, Info, MessageSquare,
  FileText, Gavel, Landmark, Loader2, Activity,
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
  third_party: { label: 'Third-party', desc: 'Imported from OpenAI / Claude Projects / etc.', icon: Bot },
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
            <div className="flex items-center justify-between rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Build a custom agent</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Name, system prompt, knowledge scope, and a live test chat — all in one page.
                  </p>
                </div>
              </div>
              <Button size="sm" asChild>
                <Link href={`/app/admin/${activeOrgId}/agents/new`}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> New agent
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
                      Coming soon: import OpenAI GPTs, Claude Projects, or connect your own LangGraph/CrewAI agents.
                    </p>
                  </div>
                </div>
              </Card>
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

function AgentCard({ agent, onOpen, canAuthor, orgId }: { agent: Agent; onOpen: () => void; canAuthor: boolean; orgId: string | null }) {
  const Icon = ICONS[agent.iconName ?? 'Bot'] ?? Bot
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
    <Card className="p-4 hover:border-primary/40 transition-colors group h-full">
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0', agent.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium">{agent.name}</h3>
            {agent.usageCount > 100 && (
              <Badge variant="outline" className="text-[10px]">Popular</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{agent.description}</p>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground mb-3 pb-3 border-b border-border">
        <div className="truncate"><span className="text-muted-foreground/70">Scope:</span> {scopeLabel}</div>
        {agent.usageCount > 0 && (
          <div className="mt-1"><span className="text-muted-foreground/70">Used:</span> {agent.usageCount} times</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {agent.deploymentTargets.map((d) => (
            <Badge key={d} variant="outline" className="text-[10px] capitalize">{d}</Badge>
          ))}
          {agent.status === 'draft' && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">Draft</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {canAuthor && orgId && (
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/app/admin/${orgId}/agents/${agent.id}/edit`}>Edit</Link>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onOpen}>
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Chat
          </Button>
        </div>
      </div>
    </Card>
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

