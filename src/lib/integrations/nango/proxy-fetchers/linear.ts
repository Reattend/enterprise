// Linear fetcher — uses nango.proxy() to call Linear's GraphQL API.
//
// Strategy: one POST to /graphql returns the most-recently-updated issues
// across every team the connected user can see. Each issue → one raw_item
// with title + description + state + assignee/creator + project + labels.
//
// Default ceiling: 100 issues per backfill, last 30 days. Tunable via opts.
// Comments deliberately skipped for v1 (would require a per-issue child
// query on the same GraphQL request and inflates payloads on busy teams).

import type { Nango } from '@nangohq/node'
import type { NormalizedRawItem } from '../normalize'

const LINEAR_BASE = 'https://api.linear.app'

interface LinearIssue {
  id: string
  identifier: string         // e.g. "ENG-123"
  title: string
  description?: string | null
  url?: string
  priority?: number
  estimate?: number | null
  createdAt?: string
  updatedAt?: string
  completedAt?: string | null
  archivedAt?: string | null
  state?:    { name: string; type: string }   // type: 'unstarted'|'started'|'completed'|'canceled'|'backlog'
  assignee?: { name?: string; displayName?: string; email?: string } | null
  creator?:  { name?: string; displayName?: string; email?: string } | null
  team?:     { name: string; key: string }
  project?:  { name: string } | null
  labels?:   { nodes: Array<{ name: string }> }
}

const ISSUES_QUERY = `
query Issues($first: Int!, $filter: IssueFilter) {
  issues(first: $first, filter: $filter, orderBy: updatedAt) {
    nodes {
      id
      identifier
      title
      description
      url
      priority
      estimate
      createdAt
      updatedAt
      completedAt
      archivedAt
      state { name type }
      assignee { name displayName email }
      creator  { name displayName email }
      team     { name key }
      project  { name }
      labels   { nodes { name } }
    }
  }
}
`

const PRIORITY_LABEL: Record<number, string> = {
  0: 'no-priority', 1: 'urgent', 2: 'high', 3: 'medium', 4: 'low',
}

export async function fetchLinearIssues(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
  opts: { maxIssues?: number; daysPast?: number } = {},
): Promise<NormalizedRawItem[]> {
  const maxIssues = opts.maxIssues ?? 100
  const daysPast = opts.daysPast ?? 30
  const since = new Date(Date.now() - daysPast * 86_400_000).toISOString()

  const res = await nango.proxy({
    method: 'POST',
    endpoint: '/graphql',
    providerConfigKey,
    connectionId,
    baseUrlOverride: LINEAR_BASE,
    headers: { 'Content-Type': 'application/json' },
    data: {
      query: ISSUES_QUERY,
      variables: {
        first: Math.min(maxIssues, 250),
        filter: { updatedAt: { gte: since } },
      },
    },
  })

  const errors = (res.data as any)?.errors
  if (errors && errors.length > 0) {
    throw new Error(`linear graphql errors: ${JSON.stringify(errors).slice(0, 300)}`)
  }
  const issues: LinearIssue[] = (res.data as any)?.data?.issues?.nodes || []

  const out: NormalizedRawItem[] = []
  for (const it of issues) {
    if (it.archivedAt) continue
    if (!it.title) continue

    const desc = (it.description || '').slice(0, 4000)
    const assignee = it.assignee?.displayName || it.assignee?.name || it.assignee?.email
    const creator  = it.creator?.displayName  || it.creator?.name  || it.creator?.email
    const labels = (it.labels?.nodes || []).map((l) => l.name)
    const priorityLabel = it.priority != null ? PRIORITY_LABEL[it.priority] : null

    const lines = [
      `Issue ${it.identifier}: ${it.title}`,
      it.team && `Team: ${it.team.name}`,
      it.project && `Project: ${it.project.name}`,
      it.state && `Status: ${it.state.name}`,
      priorityLabel && priorityLabel !== 'no-priority' && `Priority: ${priorityLabel}`,
      assignee && `Assignee: ${assignee}`,
      creator && creator !== assignee && `Created by: ${creator}`,
      labels.length > 0 && `Labels: ${labels.join(', ')}`,
      desc && '',
      desc,
    ].filter(Boolean).join('\n').trim()

    out.push({
      externalId: `linear:${it.id}`,
      occurredAt: it.updatedAt || it.createdAt || null,
      author: creator ? { source: 'linear', name: creator, email: it.creator?.email || null } : null,
      text: lines,
      metadata: {
        source: 'linear',
        identifier: it.identifier,
        url: it.url || null,
        team: it.team?.key || null,
        project: it.project?.name || null,
        state: it.state?.name || null,
        stateType: it.state?.type || null,
        priority: priorityLabel,
        labels,
      },
    })
  }
  return out
}
