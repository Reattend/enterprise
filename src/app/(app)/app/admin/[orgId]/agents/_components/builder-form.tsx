'use client'

// Shared agent builder — used for both /new and /edit.
// Left pane: config. Right pane: live test-chat. Test-chat drafts are saved
// every time the user edits the system prompt or scope, so hitting "Publish"
// is just a status change. Drafts are isolated per user.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  Save,
  Loader2,
  Send,
  Sparkles,
  Shield,
  Building2,
  Tag,
  Archive,
  Trash2,
  Key,
  Plus,
  Copy,
  Check,
  BarChart3,
  Rocket,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

type ScopeConfig = {
  types?: string[]
  departmentIds?: string[]
  recordIds?: string[]
  tags?: string[]
}

export type AgentFormInitial = {
  id?: string
  name: string
  description: string | null
  systemPrompt: string
  iconName: string | null
  color: string | null
  tier: 'org' | 'departmental'
  departmentId: string | null
  scopeConfig: ScopeConfig
  deploymentTargets: string[]
  status?: 'draft' | 'active' | 'archived'
}

const RECORD_TYPES = ['decision', 'insight', 'meeting', 'idea', 'context', 'tasklike', 'note', 'transcript']

const PROMPT_TEMPLATES: Record<string, string> = {
  blank: '',
  hr: `You are the HR Assistant for the organization. You help employees understand company policies, benefits, leave rules, and compliance obligations.

Tone: warm, precise, professional. Never make up rules — always cite the policy or memory you're drawing from.

When a question is ambiguous, ask a clarifying question before answering.`,
  legal: `You are the Legal Assistant. You help employees understand contract clauses, compliance obligations, and company legal positions taken in past decisions.

Rules:
- Never give personal legal advice. Frame responses as "the organization's position, based on the memories and decisions on record".
- Always cite the specific decision or record.
- If a question requires external counsel, say so and recommend escalation.`,
  finance: `You are the Finance Assistant. You answer questions about budgets, spending authorities, reimbursement rules, and historical financial decisions.

Always cite specific policies and numbers exactly as they appear. If a figure in the memory looks outdated, flag it.`,
}

export function AgentBuilderForm({
  orgId,
  initial,
  mode,
}: {
  orgId: string
  initial: AgentFormInitial
  mode: 'new' | 'edit'
}) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description || '')
  const [systemPrompt, setSystemPrompt] = useState(initial.systemPrompt)
  const [tier, setTier] = useState<'org' | 'departmental'>(initial.tier)
  const [departmentId, setDepartmentId] = useState<string | null>(initial.departmentId)
  const [scope, setScope] = useState<ScopeConfig>(initial.scopeConfig)
  const [depts, setDepts] = useState<Array<{ id: string; name: string; kind: string }>>([])
  const [saving, setSaving] = useState(false)
  const [id, setId] = useState<string | undefined>(initial.id)
  const [status, setStatus] = useState(initial.status || 'draft')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/organizations/${orgId}/departments`)
        if (res.ok) {
          const d = await res.json()
          setDepts(d.departments || [])
        }
      } catch { /* non-fatal */ }
    })()
  }, [orgId])

  const save = async (opts: { publish?: boolean; archive?: boolean } = {}) => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error('Name and system prompt are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        orgId, name, description: description || null,
        systemPrompt, tier, departmentId: tier === 'departmental' ? departmentId : null,
        scopeConfig: scope, deploymentTargets: ['web'],
        publish: opts.publish, archive: opts.archive,
      }
      if (mode === 'new' && !id) {
        const res = await fetch('/api/enterprise/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || 'Save failed')
          return
        }
        const data = await res.json()
        setId(data.agent.id)
        setStatus(data.agent.status)
        toast.success(opts.publish ? 'Published' : 'Draft saved')
        router.replace(`/app/admin/${orgId}/agents/${data.agent.id}/edit`)
      } else if (id) {
        const res = await fetch(`/api/enterprise/agents/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || 'Save failed')
          return
        }
        const data = await res.json()
        setStatus(data.agent.status)
        toast.success(opts.publish ? 'Published' : opts.archive ? 'Archived' : 'Saved')
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleType = (t: string) => setScope((s) => ({
    ...s,
    types: s.types?.includes(t) ? s.types.filter((x) => x !== t) : [...(s.types || []), t],
  }))
  const toggleDept = (d: string) => setScope((s) => ({
    ...s,
    departmentIds: s.departmentIds?.includes(d) ? s.departmentIds.filter((x) => x !== d) : [...(s.departmentIds || []), d],
  }))
  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const v = (e.target as HTMLInputElement).value.trim().toLowerCase()
      if (!v) return
      setScope((s) => ({ ...s, tags: Array.from(new Set([...(s.tags || []), v])) }))
      ;(e.target as HTMLInputElement).value = ''
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5">
      {/* Left: configuration */}
      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/agents"><ArrowLeft className="h-4 w-4 mr-1" /> Agents</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>
            <Button variant="outline" size="sm" onClick={() => save({})} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save
            </Button>
            {status !== 'active' ? (
              <Button size="sm" onClick={() => save({ publish: true })} disabled={saving}>
                <Rocket className="h-3.5 w-3.5 mr-1" /> Publish
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => save({ archive: true })} disabled={saving}>
                <Archive className="h-3.5 w-3.5 mr-1" /> Archive
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Agent identity</div>
              <div className="text-xs text-muted-foreground">Name + one-line purpose.</div>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HR Assistant" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown on the agent list" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Visibility tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as 'org' | 'departmental')}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="org" className="text-sm">Org-wide</SelectItem>
                  <SelectItem value="departmental" className="text-sm">Departmental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tier === 'departmental' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Department</Label>
                <Select value={departmentId || ''} onValueChange={(v) => setDepartmentId(v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pick…" /></SelectTrigger>
                  <SelectContent>
                    {depts.map((d) => <SelectItem key={d.id} value={d.id} className="text-sm">{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">System prompt</div>
              <div className="text-xs text-muted-foreground">How the agent should behave.</div>
            </div>
            <Select onValueChange={(v) => {
              if (PROMPT_TEMPLATES[v]) setSystemPrompt(PROMPT_TEMPLATES[v])
            }}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Template…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blank" className="text-xs">Blank</SelectItem>
                <SelectItem value="hr" className="text-xs">HR</SelectItem>
                <SelectItem value="legal" className="text-xs">Legal</SelectItem>
                <SelectItem value="finance" className="text-xs">Finance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are the HR Assistant…"
            rows={10} className="font-mono text-xs"
          />
        </div>

        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Knowledge scope</div>
              <div className="text-xs text-muted-foreground">Filter which memories the agent draws from. Empty = all accessible.</div>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Record types ({scope.types?.length || 0})</Label>
            <div className="flex flex-wrap gap-1.5">
              {RECORD_TYPES.map((t) => {
                const picked = scope.types?.includes(t) ?? false
                return (
                  <button
                    key={t} type="button" onClick={() => toggleType(t)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1"><Building2 className="h-3 w-3" /> Departments ({scope.departmentIds?.length || 0})</Label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto rounded border p-2">
              {depts.length === 0 ? <span className="text-xs text-muted-foreground italic">No departments visible.</span> : depts.map((d) => {
                const picked = scope.departmentIds?.includes(d.id) ?? false
                return (
                  <button
                    key={d.id} type="button" onClick={() => toggleDept(d.id)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                  >
                    {d.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1"><Tag className="h-3 w-3" /> Tags ({scope.tags?.length || 0})</Label>
            <Input placeholder="Type a tag + Enter" onKeyDown={handleTagKey} className="h-8 text-xs mb-2" />
            <div className="flex flex-wrap gap-1.5">
              {(scope.tags || []).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] gap-1">
                  {t}
                  <button onClick={() => setScope((s) => ({ ...s, tags: s.tags?.filter((x) => x !== t) }))} className="hover:text-destructive">
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* API keys + analytics only visible after initial save */}
        {id && (
          <ApiKeysCard agentId={id} orgId={orgId} />
        )}
        {id && <AnalyticsCard agentId={id} />}
      </div>

      {/* Right: test chat */}
      <div className="lg:sticky lg:top-4 lg:self-start min-w-0">
        <TestChat agentId={id} systemPrompt={systemPrompt} scope={scope} />
      </div>
    </div>
  )
}

// ─── Test chat panel ───────────────────────────────────────
function TestChat({ agentId, systemPrompt, scope }: { agentId?: string; systemPrompt: string; scope: ScopeConfig }) {
  const [q, setQ] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const question = q.trim()
    if (!question || sending) return
    if (!systemPrompt.trim()) {
      toast.error('Add a system prompt to test this agent')
      return
    }
    setQ('')
    setMessages((m) => [...m, { role: 'user', content: question }])
    setSending(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, agentId: agentId || undefined }),
      })
      if (!res.ok || !res.body) {
        toast.error('Test chat failed')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      setMessages((m) => [...m, { role: 'assistant', content: '' }])
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages((m) => {
          const copy = m.slice()
          copy[copy.length - 1] = { role: 'assistant', content: acc }
          return copy
        })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-2xl border bg-card h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/20 flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Test chat</div>
        <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto">
          {agentId ? 'logged' : 'ephemeral'}
        </Badge>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Ask anything to preview how your agent will answer.
          </div>
        ) : messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.content || '…'}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-3 flex items-center gap-2">
        <Input
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask the agent…"
          disabled={sending}
          className="flex-1 h-9 text-sm"
        />
        <Button size="icon" onClick={send} disabled={sending || !q.trim()} className="h-9 w-9">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

// ─── API Keys card ─────────────────────────────────────────
function ApiKeysCard({ agentId, orgId }: { agentId: string; orgId: string }) {
  const [keys, setKeys] = useState<Array<{ id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }>>([])
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [justCreated, setJustCreated] = useState<{ keyPrefix: string; plaintext: string } | null>(null)
  const [copied, setCopied] = useState(false)
  void orgId

  const load = async () => {
    const res = await fetch(`/api/enterprise/agents/${agentId}/api-keys`)
    if (!res.ok) return
    const data = await res.json()
    setKeys(data.keys || [])
  }
  useEffect(() => { load() }, [agentId])

  const create = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`/api/enterprise/agents/${agentId}/api-keys`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Create failed')
        return
      }
      const data = await res.json()
      setJustCreated({ keyPrefix: data.key.keyPrefix, plaintext: data.plaintext })
      setName('')
      load()
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm('Revoke this key? Clients using it will stop working immediately.')) return
    const res = await fetch(`/api/enterprise/agents/${agentId}/api-keys?keyId=${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
          <Key className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">API keys</div>
          <div className="text-xs text-muted-foreground">For Slack bot / Teams bot / external clients.</div>
        </div>
      </div>

      {justCreated && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mb-3 flex items-start gap-2">
          <EyeOff className="h-3.5 w-3.5 mt-0.5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-amber-900 dark:text-amber-200">
              Copy this key now — it won't be shown again
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono flex-1 truncate">{justCreated.plaintext}</code>
              <Button variant="outline" size="sm" className="h-7 shrink-0" onClick={() => {
                navigator.clipboard.writeText(justCreated.plaintext)
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              }}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => setJustCreated(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g. Slack bot)" className="h-8 text-xs" />
        <Button size="sm" onClick={create} disabled={creating || !name.trim()} className="h-8">
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
      </div>

      {keys.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">No keys yet.</div>
      ) : (
        <div className="space-y-1.5">
          {keys.map((k) => (
            <div key={k.id} className={`flex items-center gap-2 rounded border px-2 py-1.5 ${k.revokedAt ? 'opacity-50' : ''}`}>
              <Key className="h-3 w-3 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{k.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{k.keyPrefix}…</div>
              </div>
              {k.revokedAt ? (
                <Badge variant="outline" className="text-[9px] h-4 px-1">Revoked</Badge>
              ) : (
                <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-destructive" onClick={() => revoke(k.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Analytics card ────────────────────────────────────────
function AnalyticsCard({ agentId }: { agentId: string }) {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/enterprise/agents/${agentId}/analytics?days=14`)
      if (res.ok) setData(await res.json())
    })()
  }, [agentId])

  const maxDay = useMemo(() => {
    if (!data?.sparkline) return 1
    return Math.max(1, ...data.sparkline.map((s: any) => s.count))
  }, [data])

  if (!data) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-2" /> Loading analytics…
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Last 14 days</div>
          <div className="text-xs text-muted-foreground">
            {data.totalQueries} {data.totalQueries === 1 ? 'query' : 'queries'} · {data.uniqueUsers} user{data.uniqueUsers === 1 ? '' : 's'}
            {data.avgRating !== null && ` · ${(data.avgRating * 100).toFixed(0)}% 👍 (${data.ratedCount} rated)`}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-0.5 h-14 mb-3">
        {data.sparkline.map((s: any) => (
          <div key={s.day} className="flex-1 bg-emerald-500/60 rounded-t" style={{ height: `${(s.count / maxDay) * 100}%`, minHeight: s.count ? '2px' : '0' }} title={`${s.day}: ${s.count}`} />
        ))}
      </div>

      {data.topQuestions.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Top questions</div>
          <div className="space-y-1">
            {data.topQuestions.slice(0, 5).map((q: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">{q.count}×</Badge>
                <span className="truncate text-muted-foreground">{q.question}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
