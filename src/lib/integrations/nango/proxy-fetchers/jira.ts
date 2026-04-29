// Jira Cloud fetcher — uses nango.proxy() to call Atlassian REST.
//
// Strategy:
// 1. Discover cloudid via shared helper
// 2. JQL search recent issues (updated in last 30d, ordered by updated desc)
// 3. Each issue → one raw_item with summary + description + status + assignee
//
// Jira Cloud's description field is in ADF (Atlassian Document Format) — a
// JSON tree we walk via the shared adfToText helper.

import type { Nango } from '@nangohq/node'
import type { NormalizedRawItem } from '../normalize'
import { getAtlassianCloudId, adfToText } from './atlassian-shared'

const ATLASSIAN_BASE = 'https://api.atlassian.com'

interface JiraUser {
  accountId?: string
  displayName?: string
  emailAddress?: string
}

interface JiraIssue {
  id: string
  key: string                 // e.g. "ENG-123"
  fields: {
    summary: string
    description?: any         // ADF tree
    status?: { name: string; statusCategory?: { key: string } }
    priority?: { name: string }
    issuetype?: { name: string }
    project?: { key: string; name: string }
    assignee?: JiraUser | null
    reporter?: JiraUser | null
    creator?: JiraUser | null
    labels?: string[]
    created?: string
    updated?: string
    resolutiondate?: string | null
  }
}

export async function fetchJiraIssues(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
  opts: { maxIssues?: number; daysPast?: number } = {},
): Promise<NormalizedRawItem[]> {
  const maxIssues = opts.maxIssues ?? 100
  const daysPast = opts.daysPast ?? 30

  const tenant = await getAtlassianCloudId(nango, providerConfigKey, connectionId)
  if (!tenant) {
    console.warn('[jira proxy] no accessible Atlassian sites for this connection')
    return []
  }

  const res = await nango.proxy({
    method: 'GET',
    endpoint: `/ex/jira/${tenant.cloudId}/rest/api/3/search`,
    providerConfigKey,
    connectionId,
    baseUrlOverride: ATLASSIAN_BASE,
    params: {
      jql: `updated >= -${daysPast}d ORDER BY updated DESC`,
      maxResults: String(Math.min(maxIssues, 100)),
      fields: 'summary,description,status,priority,issuetype,project,assignee,reporter,creator,labels,created,updated,resolutiondate',
    },
  })

  const issues: JiraIssue[] = ((res.data as any)?.issues || []).slice(0, maxIssues)
  const out: NormalizedRawItem[] = []

  for (const it of issues) {
    if (!it.fields?.summary) continue
    const f = it.fields

    const description = adfToText(f.description).trim().slice(0, 4000)
    const assignee = f.assignee?.displayName || f.assignee?.emailAddress
    const reporter = f.reporter?.displayName || f.reporter?.emailAddress
    const creator  = f.creator?.displayName  || f.creator?.emailAddress

    const lines = [
      `${it.key}: ${f.summary}`,
      f.project && `Project: ${f.project.key} (${f.project.name})`,
      f.issuetype && `Type: ${f.issuetype.name}`,
      f.status && `Status: ${f.status.name}`,
      f.priority && f.priority.name && f.priority.name !== 'Medium' && `Priority: ${f.priority.name}`,
      assignee && `Assignee: ${assignee}`,
      reporter && reporter !== assignee && `Reporter: ${reporter}`,
      f.labels && f.labels.length > 0 && `Labels: ${f.labels.join(', ')}`,
      description && '',
      description,
    ].filter(Boolean).join('\n').trim()

    out.push({
      externalId: `jira:${tenant.cloudId}:${it.id}`,
      occurredAt: f.updated || f.created || null,
      author: (creator || reporter) ? { source: 'jira', name: creator || reporter || null } : null,
      text: lines,
      metadata: {
        source: 'jira',
        key: it.key,
        project: f.project ? { key: f.project.key, name: f.project.name } : null,
        status: f.status?.name || null,
        statusCategory: f.status?.statusCategory?.key || null,
        priority: f.priority?.name || null,
        issueType: f.issuetype?.name || null,
        labels: f.labels || [],
        url: `${tenant.siteUrl}/browse/${it.key}`,
        resolved: !!f.resolutiondate,
        site: { cloudId: tenant.cloudId, name: tenant.siteName, url: tenant.siteUrl },
      },
    })
  }
  return out
}
