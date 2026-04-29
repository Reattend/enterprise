// Shared helpers for Atlassian Cloud (Confluence + Jira). Both products
// require a "cloudid" lookup before any data call — Atlassian routes
// requests through a per-tenant URL like /ex/confluence/{cloudid}/...
//
// We fetch the user's accessible Atlassian sites once per backfill and
// take the first match. v2 could let users pick which site to ingest
// when they belong to multiple Atlassian orgs.

import type { Nango } from '@nangohq/node'

const ATLASSIAN_OAUTH_BASE = 'https://api.atlassian.com'

interface AccessibleResource {
  id: string             // the cloudid we need
  url: string            // e.g. "https://acme.atlassian.net"
  name?: string
  scopes?: string[]
}

export async function getAtlassianCloudId(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
): Promise<{ cloudId: string; siteUrl: string; siteName: string | null } | null> {
  const res = await nango.proxy({
    method: 'GET',
    endpoint: '/oauth/token/accessible-resources',
    providerConfigKey,
    connectionId,
    baseUrlOverride: ATLASSIAN_OAUTH_BASE,
  })
  const resources = (res.data as AccessibleResource[]) || []
  if (resources.length === 0) return null
  const first = resources[0]
  return { cloudId: first.id, siteUrl: first.url, siteName: first.name || null }
}

// Strip HTML tags + collapse whitespace. Used for Confluence storage-format
// page bodies which Atlassian returns as HTML-like XML.
export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// Walk an Atlassian Document Format (ADF) tree and concatenate text nodes.
// ADF is the JSON document model used by Jira issue descriptions and
// Confluence v2 page bodies. Tree shape:
//   { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] }
export function adfToText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text' && typeof node.text === 'string') return node.text
  if (Array.isArray(node.content)) {
    const sep = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote'].includes(node.type) ? '\n' : ''
    return node.content.map(adfToText).filter(Boolean).join('') + sep
  }
  return ''
}
