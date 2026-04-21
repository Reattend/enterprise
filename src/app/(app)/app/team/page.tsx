'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Users, FolderKanban, Plus, ChevronsUpDown, Check, Loader2, AlertCircle,
  Gavel, Brain, X, Sparkles,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

interface Team {
  teamId: string
  teamName: string
  departmentPath: string
  workspaceId: string
  projects: Array<{ id: string; name: string; isDefault: boolean }>
}

interface TeamStats {
  memberCount: number
  recordCount: number
  decisionCount: number
}

interface Project {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  color: string | null
  recordCount?: number
}

export default function TeamPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)

  const [teams, setTeams] = useState<Team[] | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')

  const selectedTeam = useMemo(
    () => teams?.find((t) => t.teamId === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  )

  async function loadTeams() {
    if (!activeOrgId) return
    setErr(null)
    try {
      const res = await fetch(`/api/enterprise/organizations/${activeOrgId}/teams`)
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      const data = await res.json()
      setTeams(data.teams)
      const storedId = typeof window !== 'undefined' ? localStorage.getItem('active_team_id') : null
      const initial = (storedId && data.teams.some((t: Team) => t.teamId === storedId)) ? storedId : data.teams[0]?.teamId
      setSelectedTeamId(initial || null)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function loadTeamDetail() {
    if (!selectedTeam || !activeOrgId) return
    setProjects(null)
    setStats(null)
    // Fetch project list (already in the teams endpoint) + per-project counts
    const baseProjects: Project[] = selectedTeam.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: null,
      isDefault: p.isDefault,
      color: null,
    }))

    // Records in workspace (for stats)
    try {
      const [recRes, decRes] = await Promise.all([
        fetch(`/api/records?workspaceId=${selectedTeam.workspaceId}&limit=500`),
        fetch(`/api/enterprise/organizations/${activeOrgId}/decisions`),
      ])
      const rec = recRes.ok ? await recRes.json() : { records: [] }
      const dec = decRes.ok ? await decRes.json() : { decisions: [] }

      const recordCount = rec.records?.length ?? 0
      const decisionCount = dec.decisions?.filter((d: { workspaceId: string }) => d.workspaceId === selectedTeam.workspaceId).length ?? 0

      // Attribute record counts to projects (best effort — the /records endpoint doesn't include projectId by default)
      setProjects(baseProjects)
      setStats({
        memberCount: 0, // placeholder — need a team-member endpoint
        recordCount,
        decisionCount,
      })
    } catch {
      setProjects(baseProjects)
      setStats({ memberCount: 0, recordCount: 0, decisionCount: 0 })
    }
  }

  useEffect(() => { loadTeams() }, [activeOrgId]) // eslint-disable-line react-hooks/exhaustive-deps
  // Re-run the detail loader when either the selected team changes OR the
  // underlying teams array mutates (e.g. a project was just created).
  useEffect(() => { loadTeamDetail() }, [selectedTeamId, teams]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchTeam(id: string) {
    setSelectedTeamId(id)
    if (typeof window !== 'undefined') localStorage.setItem('active_team_id', id)
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam || !newProjectName.trim()) return
    setCreating(true)
    setErr(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedTeam.workspaceId,
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined,
        }),
      })
      const body = await res.json().catch(() => ({ error: 'failed' }))
      if (!res.ok) throw new Error(body.error || 'failed')

      // Optimistically append the new project to the current team, then
      // re-fetch for server truth. Both matter: optimistic for snappy UX,
      // re-fetch so subsequent loads don't drift.
      setTeams((prev) => {
        if (!prev) return prev
        return prev.map((t) =>
          t.teamId === selectedTeam.teamId
            ? { ...t, projects: [...t.projects, { id: body.project.id, name: body.project.name, isDefault: false }] }
            : t,
        )
      })
      setNewProjectName('')
      setNewProjectDesc('')
      setShowCreate(false)
      await loadTeams()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  if (teams === null) {
    return (
      <div className="max-w-5xl mx-auto py-6">
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
          Loading teams…
        </Card>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-6">
        <Card className="p-8 text-center">
          <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h2 className="font-display text-2xl mb-1">No team yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Ask an admin to add you to a team, or create one in the admin dashboard.
          </p>
          <Link href="/app/admin/onboarding">
            <Button variant="outline">Go to admin</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      {/* Header: team name + multi-team dropdown */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <Users className="h-3.5 w-3.5" />
            My team
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-4xl tracking-tight leading-none">
              {selectedTeam?.teamName ?? 'No team'}
            </h1>
            {teams.length >= 2 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/60 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                    Switch <ChevronsUpDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Your teams</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {teams.map((t) => (
                    <DropdownMenuItem
                      key={t.teamId}
                      onClick={() => switchTeam(t.teamId)}
                      className="cursor-pointer"
                    >
                      <Users className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{t.teamName}</div>
                        {t.departmentPath && (
                          <div className="text-[10px] text-muted-foreground truncate">{t.departmentPath}</div>
                        )}
                      </div>
                      {t.teamId === selectedTeamId && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {selectedTeam?.departmentPath && (
            <div className="text-xs text-muted-foreground mt-2 font-mono">
              {selectedTeam.departmentPath}
            </div>
          )}
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Brain} label="Memories" value={stats?.recordCount ?? '—'} href={`/app/memories`} />
        <StatCard icon={Gavel} label="Decisions" value={stats?.decisionCount ?? '—'} href={`/app/decisions`} />
        <StatCard icon={FolderKanban} label="Projects" value={projects?.length ?? '—'} />
      </div>

      {/* Projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Projects</h2>
          <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? <><X className="h-3.5 w-3.5 mr-1" /> Cancel</> : <><Plus className="h-3.5 w-3.5 mr-1" /> New project</>}
          </Button>
        </div>

        {showCreate && (
          <Card className="p-4 mb-3">
            <form onSubmit={createProject} className="space-y-2">
              <Input
                placeholder="Project name (e.g. Nike campaign, Q2 launch)"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
                required
              />
              <Textarea
                placeholder="Description (optional)"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                rows={2}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={creating || !newProjectName.trim()} size="sm">
                  {creating ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Creating…</> : 'Create'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {projects === null ? (
          <Card className="p-6 text-sm text-muted-foreground text-center">Loading projects…</Card>
        ) : projects.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground text-center">
            No projects yet. Every team needs an Unassigned project for loose memories.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/app/projects/${p.id}`}>
                <Card className="p-4 hover:border-primary/40 transition-colors cursor-pointer group h-full">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-medium group-hover:text-primary transition-colors truncate">{p.name}</h3>
                        {p.isDefault && <Badge variant="outline" className="text-[10px]">Default</Badge>}
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* AI project suggestions */}
      {selectedTeam && <ProjectSuggestionsCard workspaceId={selectedTeam.workspaceId} onAccepted={loadTeams} />}

      {/* Recent activity callout */}
      <Card className="p-5">
        <h3 className="font-display text-lg mb-1">Team activity</h3>
        <p className="text-xs text-muted-foreground mb-3">
          The memory graph view scoped to this team shows decisions, meetings, and contradictions in context.
        </p>
        <Link href="/app/graph">
          <Button variant="outline" size="sm">View team memory graph →</Button>
        </Link>
      </Card>
    </div>
  )
}

interface Suggestion {
  tag: string
  recordCount: number
  sampleTitles: string[]
  suggestedName: string
  suggestedDescription?: string
  recordIds: string[]
  namedBy?: 'llm' | 'heuristic'
}

function ProjectSuggestionsCard({
  workspaceId,
  onAccepted,
}: { workspaceId: string; onAccepted: () => Promise<void> }) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function suggest() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`/api/enterprise/project-suggestions?workspaceId=${workspaceId}`)
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      const data = await res.json()
      setSuggestions(data.suggestions)
      setUnassignedCount(data.unassignedCount)
    } finally {
      setLoading(false)
    }
  }

  async function accept(s: Suggestion) {
    setAccepting(s.tag)
    try {
      const res = await fetch('/api/enterprise/project-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: s.suggestedName,
          description: s.suggestedDescription,
          recordIds: s.recordIds,
        }),
      })
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      setSuggestions((prev) => prev?.filter((x) => x.tag !== s.tag) ?? [])
      await onAccepted()
    } finally {
      setAccepting(null)
    }
  }

  const anyLlmNamed = (suggestions ?? []).some((s) => s.namedBy === 'llm')

  return (
    <Card className="p-5 border-primary/20 bg-primary/[0.03]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 flex-1">
          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <h3 className="font-display text-lg">Reattend suggests projects</h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Clusters unassigned memories by shared topics + entities, then{' '}
              {anyLlmNamed
                ? <>names the clusters with Claude.</>
                : <>uses Claude naming when the API key is configured; falls back to pattern-based naming.</>}
              {' '}Accept one and matching memories move into the new project automatically.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={suggest} disabled={loading}>
          {loading ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analyzing…</> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Suggest</>}
        </Button>
      </div>

      {err && <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2 mb-3">{err}</div>}

      {suggestions === null ? (
        <p className="text-xs text-muted-foreground">
          Click &quot;Suggest&quot; to analyze this team&apos;s unassigned memories.
        </p>
      ) : suggestions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {unassignedCount === 0
            ? 'No unassigned memories yet. Capture more memories and re-run.'
            : `${unassignedCount} unassigned memor${unassignedCount === 1 ? 'y' : 'ies'}, but no strong clusters found yet.`}
        </p>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((s) => (
            <li key={s.tag} className="flex items-center gap-3 p-3 rounded border border-border bg-background">
              <div className="h-7 w-7 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FolderKanban className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium truncate">{s.suggestedName}</div>
                  {s.namedBy === 'llm' && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">Claude</span>
                  )}
                </div>
                {s.suggestedDescription && (
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">{s.suggestedDescription}</div>
                )}
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {s.recordCount} memories · {s.sampleTitles.slice(0, 2).join(' · ')}
                </div>
              </div>
              <Button size="sm" onClick={() => accept(s)} disabled={accepting === s.tag}>
                {accepting === s.tag ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Accept'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function StatCard({
  icon: Icon, label, value, href,
}: { icon: typeof Users; label: string; value: number | string; href?: string }) {
  const body = (
    <Card className={cn('p-4', href && 'hover:border-primary/40 transition-colors cursor-pointer')}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}
