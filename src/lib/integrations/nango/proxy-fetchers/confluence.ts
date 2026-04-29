// Confluence Cloud fetcher — uses nango.proxy() to call Atlassian REST.
//
// Strategy:
// 1. Discover cloudid (per-tenant routing key) via /oauth/token/accessible-resources
// 2. List recent pages via REST v1 (CQL search), expanding body.storage so we
//    get the full page content in one request
// 3. Strip HTML to plain text → one raw_item per page
//
// We use REST v1 over v2 here because v1 supports CQL filtering by lastmodified
// and inline body expansion in a single call. v2 would need per-page body
// fetches (N+1 explosion on large spaces).

import type { Nango } from '@nangohq/node'
import type { NormalizedRawItem } from '../normalize'
import { getAtlassianCloudId, stripHtml } from './atlassian-shared'

const ATLASSIAN_BASE = 'https://api.atlassian.com'

interface ConfluencePage {
  id: string
  type: string
  title: string
  space?: { key: string; name?: string }
  body?: { storage?: { value: string } }
  version?: { number?: number; when?: string; by?: { displayName?: string; accountId?: string; email?: string } }
  history?: { createdDate?: string; createdBy?: { displayName?: string; email?: string } }
  _links?: { webui?: string }
}

export async function fetchConfluencePages(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
  opts: { maxPages?: number; daysPast?: number } = {},
): Promise<NormalizedRawItem[]> {
  const maxPages = opts.maxPages ?? 50
  const daysPast = opts.daysPast ?? 90        // Confluence pages change less often than tickets
  const sinceDate = new Date(Date.now() - daysPast * 86_400_000)
  const sinceCql = sinceDate.toISOString().slice(0, 10) // YYYY-MM-DD for CQL

  const tenant = await getAtlassianCloudId(nango, providerConfigKey, connectionId)
  if (!tenant) {
    console.warn('[confluence proxy] no accessible Atlassian sites for this connection')
    return []
  }

  const res = await nango.proxy({
    method: 'GET',
    endpoint: `/ex/confluence/${tenant.cloudId}/wiki/rest/api/content/search`,
    providerConfigKey,
    connectionId,
    baseUrlOverride: ATLASSIAN_BASE,
    params: {
      cql: `type=page AND lastmodified >= "${sinceCql}" ORDER BY lastmodified DESC`,
      limit: String(Math.min(maxPages, 100)),
      expand: 'body.storage,version,history,space',
    },
  })

  const pages: ConfluencePage[] = ((res.data as any)?.results || []).slice(0, maxPages)
  const out: NormalizedRawItem[] = []

  for (const p of pages) {
    if (!p.title) continue
    const html = p.body?.storage?.value || ''
    const body = stripHtml(html).slice(0, 6000)

    const author =
      p.version?.by?.displayName ||
      p.version?.by?.email ||
      p.history?.createdBy?.displayName ||
      p.history?.createdBy?.email ||
      null

    const text = `# ${p.title}\n\n${body}`.trim()
    if (text.length < 5) continue

    out.push({
      externalId: `confluence:${tenant.cloudId}:${p.id}`,
      occurredAt: p.version?.when || p.history?.createdDate || null,
      author: author ? { source: 'confluence', name: author } : null,
      text,
      metadata: {
        source: 'confluence',
        title: p.title,
        pageId: p.id,
        spaceKey: p.space?.key || null,
        spaceName: p.space?.name || null,
        version: p.version?.number ?? null,
        url: p._links?.webui ? `${tenant.siteUrl}/wiki${p._links.webui}` : null,
        site: { cloudId: tenant.cloudId, name: tenant.siteName, url: tenant.siteUrl },
      },
    })
  }
  return out
}
