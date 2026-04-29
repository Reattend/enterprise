// GitHub fetcher — uses nango.proxy() to call GitHub REST API.
//
// Strategy: pull the user's most-recently-active repos (public + private
// they've been granted access to), then for each repo fetch recent PRs and
// issues. Each PR/issue becomes one raw_item — title + body + author so
// triage can decide if it's a "decision" worth preserving.
//
// We deliberately skip commits (low signal — most are "WIP", "fix typo")
// and PR review comments (N+1 explosion on busy repos). v2 can layer in
// inline comments via /repos/{}/pulls/{}/comments if triage misses
// signal.

import type { Nango } from '@nangohq/node'
import type { NormalizedRawItem } from '../normalize'

const GITHUB_BASE = 'https://api.github.com'
const GITHUB_HEADERS = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

interface GitHubRepo {
  id: number
  full_name: string                 // 'owner/repo'
  name: string
  private: boolean
  archived?: boolean
  pushed_at?: string
  default_branch?: string
}

interface GitHubUser {
  login: string
  id?: number
  type?: string                     // 'User' | 'Bot'
}

interface GitHubIssueOrPR {
  id: number
  number: number
  title: string
  body?: string | null
  state: 'open' | 'closed'
  user?: GitHubUser
  created_at?: string
  updated_at?: string
  closed_at?: string | null
  html_url?: string
  pull_request?: { url: string; merged_at?: string | null } // present iff this issue is actually a PR
  draft?: boolean
  merged_at?: string | null
  labels?: Array<{ name: string }>
}

export async function fetchGithubItems(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
  opts: {
    maxRepos?: number
    maxPerRepo?: number
    daysPast?: number
    includePrs?: boolean
    includeIssues?: boolean
  } = {},
): Promise<NormalizedRawItem[]> {
  const maxRepos    = opts.maxRepos ?? 10
  const maxPerRepo  = opts.maxPerRepo ?? 25
  const daysPast    = opts.daysPast ?? 30
  const includePrs    = opts.includePrs ?? true
  const includeIssues = opts.includeIssues ?? true
  const since = new Date(Date.now() - daysPast * 86_400_000).toISOString()

  // Step 1: list user's most-recently-pushed repos. `affiliation` covers
  // owner + collaborator + org-member, so we get personal AND work repos
  // in one call.
  const reposRes = await nango.proxy({
    method: 'GET',
    endpoint: '/user/repos',
    providerConfigKey,
    connectionId,
    baseUrlOverride: GITHUB_BASE,
    headers: GITHUB_HEADERS,
    params: {
      affiliation: 'owner,collaborator,organization_member',
      sort: 'pushed',
      direction: 'desc',
      per_page: String(Math.min(maxRepos, 100)),
    },
  })
  const repos: GitHubRepo[] = ((reposRes.data as any) || [])
    .filter((r: GitHubRepo) => !r.archived)
    .slice(0, maxRepos)

  if (repos.length === 0) return []

  const out: NormalizedRawItem[] = []

  for (const repo of repos) {
    // Step 2a: PRs (state=all, sorted by updated, since cutoff).
    if (includePrs) {
      try {
        const prsRes = await nango.proxy({
          method: 'GET',
          endpoint: `/repos/${repo.full_name}/pulls`,
          providerConfigKey,
          connectionId,
          baseUrlOverride: GITHUB_BASE,
          headers: GITHUB_HEADERS,
          params: {
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            per_page: String(maxPerRepo),
          },
        })
        const prs: GitHubIssueOrPR[] = (prsRes.data as any) || []
        for (const pr of prs) {
          if (pr.updated_at && new Date(pr.updated_at).getTime() < new Date(since).getTime()) continue
          if (pr.draft) continue                                  // skip draft PRs
          if (pr.user?.type === 'Bot') continue                   // skip Dependabot/Renovate noise
          const body = (pr.body || '').slice(0, 4000)
          if (!pr.title) continue
          const status = pr.merged_at ? 'merged' : pr.state
          const text = [
            `PR: ${pr.title} (${status})`,
            `Repo: ${repo.full_name}#${pr.number}`,
            pr.user?.login && `Author: @${pr.user.login}`,
            pr.labels?.length && `Labels: ${pr.labels.map((l) => l.name).join(', ')}`,
            body && '',
            body,
          ].filter(Boolean).join('\n').trim()

          out.push({
            externalId: `github:pr:${repo.id}:${pr.number}`,
            occurredAt: pr.updated_at || pr.created_at || null,
            author: pr.user?.login ? { source: 'github', login: pr.user.login } : null,
            text,
            metadata: {
              source: 'github',
              kind: 'pull_request',
              repo: repo.full_name,
              number: pr.number,
              state: pr.state,
              merged: !!pr.merged_at,
              url: pr.html_url || null,
              labels: (pr.labels || []).map((l) => l.name),
            },
          })
        }
      } catch (err) {
        console.error('[github proxy] PRs failed for', repo.full_name, err)
      }
    }

    // Step 2b: issues (excluding PRs — GitHub returns both from the same
    // endpoint, distinguished by the `pull_request` field on each item).
    if (includeIssues) {
      try {
        const issuesRes = await nango.proxy({
          method: 'GET',
          endpoint: `/repos/${repo.full_name}/issues`,
          providerConfigKey,
          connectionId,
          baseUrlOverride: GITHUB_BASE,
          headers: GITHUB_HEADERS,
          params: {
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            since,
            per_page: String(maxPerRepo),
          },
        })
        const items: GitHubIssueOrPR[] = (issuesRes.data as any) || []
        for (const it of items) {
          if (it.pull_request) continue                              // already handled above
          if (it.user?.type === 'Bot') continue
          const body = (it.body || '').slice(0, 4000)
          if (!it.title) continue
          const text = [
            `Issue: ${it.title} (${it.state})`,
            `Repo: ${repo.full_name}#${it.number}`,
            it.user?.login && `Reporter: @${it.user.login}`,
            it.labels?.length && `Labels: ${it.labels.map((l) => l.name).join(', ')}`,
            body && '',
            body,
          ].filter(Boolean).join('\n').trim()

          out.push({
            externalId: `github:issue:${repo.id}:${it.number}`,
            occurredAt: it.updated_at || it.created_at || null,
            author: it.user?.login ? { source: 'github', login: it.user.login } : null,
            text,
            metadata: {
              source: 'github',
              kind: 'issue',
              repo: repo.full_name,
              number: it.number,
              state: it.state,
              url: it.html_url || null,
              labels: (it.labels || []).map((l) => l.name),
            },
          })
        }
      } catch (err) {
        console.error('[github proxy] issues failed for', repo.full_name, err)
      }
    }
  }
  return out
}
