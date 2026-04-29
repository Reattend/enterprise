// Notion fetcher — uses nango.proxy() to call the Notion API.
//
// Strategy: Notion's "Public integration" model means the integration only
// sees pages/databases the user has explicitly shared with it (via the
// "Add connections" picker on each page). We use the search endpoint to
// list every page the integration can see, then fetch the block tree for
// each and concatenate to plain text. One raw_item per page.
//
// Page-content extraction is best-effort: we walk the top-level blocks and
// pull rich_text from common types (paragraph, headings, lists, todo,
// callout, quote). Skipping deeply-nested children keeps this from N+1ing
// the Notion API on large pages — they get the page title + first ~2000
// chars of text, which is plenty for triage to make a keep/skip decision.

import type { Nango } from '@nangohq/node'
import type { NormalizedRawItem } from '../normalize'

interface NotionRichText {
  plain_text?: string
}
interface NotionBlock {
  id: string
  type: string
  has_children?: boolean
  paragraph?:    { rich_text: NotionRichText[] }
  heading_1?:    { rich_text: NotionRichText[] }
  heading_2?:    { rich_text: NotionRichText[] }
  heading_3?:    { rich_text: NotionRichText[] }
  bulleted_list_item?: { rich_text: NotionRichText[] }
  numbered_list_item?: { rich_text: NotionRichText[] }
  to_do?:        { rich_text: NotionRichText[]; checked?: boolean }
  callout?:      { rich_text: NotionRichText[] }
  quote?:        { rich_text: NotionRichText[] }
  toggle?:       { rich_text: NotionRichText[] }
  code?:         { rich_text: NotionRichText[]; language?: string }
}

interface NotionPage {
  id: string
  object: 'page' | 'database'
  created_time?: string
  last_edited_time?: string
  url?: string
  archived?: boolean
  properties?: Record<string, any>
  parent?: { type: string; database_id?: string; page_id?: string; workspace?: boolean }
  created_by?: { id: string }
  last_edited_by?: { id: string }
}

const NOTION_BASE = 'https://api.notion.com'
const NOTION_VERSION = '2022-06-28'

function blockToText(b: NotionBlock): string {
  const pickRich = (rt?: NotionRichText[]) => (rt ?? []).map((r) => r.plain_text || '').join('').trim()
  switch (b.type) {
    case 'paragraph':           return pickRich(b.paragraph?.rich_text)
    case 'heading_1':           return `# ${pickRich(b.heading_1?.rich_text)}`
    case 'heading_2':           return `## ${pickRich(b.heading_2?.rich_text)}`
    case 'heading_3':           return `### ${pickRich(b.heading_3?.rich_text)}`
    case 'bulleted_list_item':  return `• ${pickRich(b.bulleted_list_item?.rich_text)}`
    case 'numbered_list_item':  return `1. ${pickRich(b.numbered_list_item?.rich_text)}`
    case 'to_do': {
      const t = pickRich(b.to_do?.rich_text)
      return `${b.to_do?.checked ? '[x]' : '[ ]'} ${t}`
    }
    case 'callout':             return `> ${pickRich(b.callout?.rich_text)}`
    case 'quote':               return `> ${pickRich(b.quote?.rich_text)}`
    case 'toggle':              return pickRich(b.toggle?.rich_text)
    case 'code':                return '```\n' + pickRich(b.code?.rich_text) + '\n```'
    default:                    return ''
  }
}

// Extract the page title from properties. Title can live under different
// key names depending on whether the page is in a database or standalone.
function pageTitle(page: NotionPage): string {
  const props = page.properties || {}
  for (const v of Object.values(props)) {
    if (v?.type === 'title' && Array.isArray(v.title) && v.title.length > 0) {
      return (v.title as NotionRichText[]).map((r) => r.plain_text || '').join('').trim()
    }
  }
  return '(untitled)'
}

export async function fetchNotionPages(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
  opts: { maxPages?: number; maxBlocksPerPage?: number; daysPast?: number } = {},
): Promise<NormalizedRawItem[]> {
  const maxPages = opts.maxPages ?? 50
  const maxBlocks = opts.maxBlocksPerPage ?? 60
  const daysPast = opts.daysPast ?? 365 // Notion docs change less often — wider window
  const cutoff = Date.now() - daysPast * 86_400_000

  // Step 1: search for accessible pages, sorted most-recently-edited first.
  const searchRes = await nango.proxy({
    method: 'POST',
    endpoint: '/v1/search',
    providerConfigKey,
    connectionId,
    baseUrlOverride: NOTION_BASE,
    headers: { 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    data: {
      filter: { property: 'object', value: 'page' },
      sort: { timestamp: 'last_edited_time', direction: 'descending' },
      page_size: Math.min(maxPages, 100),
    },
  })
  const pages: NotionPage[] = ((searchRes.data as any)?.results || [])
    .filter((p: NotionPage) => p.object === 'page' && !p.archived)
    .filter((p: NotionPage) => {
      if (!p.last_edited_time) return true
      return new Date(p.last_edited_time).getTime() >= cutoff
    })
    .slice(0, maxPages)

  if (pages.length === 0) return []

  const out: NormalizedRawItem[] = []

  // Step 2: for each page, pull its top-level blocks and serialize to text.
  for (const page of pages) {
    try {
      const blocksRes = await nango.proxy({
        method: 'GET',
        endpoint: `/v1/blocks/${page.id}/children`,
        providerConfigKey,
        connectionId,
        baseUrlOverride: NOTION_BASE,
        headers: { 'Notion-Version': NOTION_VERSION },
        params: { page_size: String(maxBlocks) },
      })
      const blocks: NotionBlock[] = (blocksRes.data as any)?.results || []
      const bodyLines = blocks.map(blockToText).filter(Boolean)
      const title = pageTitle(page)

      // Combine title + body. Cap body at ~4000 chars so triage isn't fed
      // novellas; rich_text from very long pages truncates cleanly here.
      const body = bodyLines.join('\n').slice(0, 4000)
      const text = `# ${title}\n\n${body}`.trim()
      if (text.length < 10) continue // skip empty pages

      out.push({
        externalId: `notion:${page.id}`,
        occurredAt: page.last_edited_time || page.created_time || null,
        author: page.last_edited_by ? { source: 'notion', userId: page.last_edited_by.id } : null,
        text,
        metadata: {
          source: 'notion',
          title,
          pageId: page.id,
          url: page.url || null,
          parent: page.parent || null,
          lastEditedTime: page.last_edited_time || null,
          createdTime: page.created_time || null,
        },
      })
    } catch (err) {
      console.error('[notion proxy] fetch page failed', page.id, err)
    }
  }
  return out
}
