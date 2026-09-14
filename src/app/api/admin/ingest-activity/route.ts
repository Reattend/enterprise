import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/ingest-activity
//
// Where memories are coming from: the last memory ingested, a recent feed,
// and per-channel activity. Provenance only - never titles or content. For
// web captures it exposes the page's hostname, nothing more.
//
// How a channel is worked out, most specific first:
//   1. raw item linked to a named source      -> that source (Notion, Linear)
//   2. raw item metadata.channel              -> extension / mcp / desktop / API
//      (recorded from 2026-09-14; older captures only say capturedBy: tray)
//   3. raw item capturedBy: tray, no channel  -> "Extension / desktop (untagged)"
//   4. records.source                         -> brain dump, voice, document...
//   5. otherwise                              -> "In app"
// Sandbox orgs and sandbox visitors are excluded so demos do not look like
// real usage.

interface Row {
  id: string
  created_at: string
  record_source: string | null
  raw_metadata: string | null
  source_kind: string | null
  source_label: string | null
  email: string | null
  org_name: string | null
}

const CHANNEL_NAMES: Record<string, string> = {
  extension: 'Chrome extension',
  mcp: 'MCP (AI assistant)',
  tray: 'Desktop app or API',
  api: 'Capture API',
}
const RECORD_SOURCES: Record<string, string> = {
  'brain-dump': 'Brain dump',
  voice: 'Voice capture',
  document: 'Document upload',
  ocr: 'OCR scan',
  manual: 'Manual entry',
  'exit-interview': 'Exit interview',
  transcript: 'Transcript',
}

function titleCase(s: string) {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function describe(row: Row): { channel: string; where: string | null } {
  let meta: Record<string, unknown> = {}
  try { meta = row.raw_metadata ? JSON.parse(row.raw_metadata) : {} } catch { /* malformed metadata is not fatal */ }

  let where: string | null = null
  if (typeof meta.url === 'string') {
    try { where = new URL(meta.url).hostname.replace(/^www\./, '') } catch { /* not a URL */ }
  }

  if (row.source_label) return { channel: row.source_label, where }
  if (typeof meta.channel === 'string' && meta.channel) {
    return { channel: CHANNEL_NAMES[meta.channel] || `Capture API (${meta.channel})`, where }
  }
  if (typeof meta.source === 'string' && meta.source) return { channel: titleCase(meta.source), where }
  if (meta.capturedBy === 'tray') {
    return { channel: meta.capture_type === 'screen' ? 'Desktop app (screen)' : 'Extension / desktop (untagged)', where }
  }
  if (row.record_source) return { channel: RECORD_SOURCES[row.record_source] || titleCase(row.record_source), where }
  return { channel: 'In app', where }
}

export async function GET() {
  try {
    await requireAdminAuth()

    const rows = sqlite.prepare(`
      SELECT r.id, r.created_at, r.source AS record_source,
             ri.metadata AS raw_metadata, s.kind AS source_kind, s.label AS source_label,
             u.email, o.name AS org_name
      FROM records r
      LEFT JOIN raw_items ri ON ri.id = r.raw_item_id
      LEFT JOIN sources s ON s.id = ri.source_id
      LEFT JOIN users u ON u.id = r.created_by
      LEFT JOIN workspace_org_links l ON l.workspace_id = r.workspace_id
      LEFT JOIN organizations o ON o.id = l.organization_id
      WHERE (o.slug IS NULL OR o.slug NOT LIKE 'sandbox-%')
        AND (u.email IS NULL OR u.email NOT LIKE '%@sandbox.reattend.local')
      ORDER BY r.created_at DESC
      LIMIT 5000
    `).all() as Row[]

    const now = Date.now()
    const DAY = 86_400_000
    const items = rows.map((row) => {
      const { channel, where } = describe(row)
      return {
        at: row.created_at,
        channel,
        where,
        account: row.org_name ? row.org_name : 'Personal',
        user: row.email,
      }
    })

    const byChannel = new Map<string, { channel: string; last: string; last24h: number; last7d: number; total: number }>()
    for (const it of items) {
      const age = now - new Date(it.at).getTime()
      const c = byChannel.get(it.channel) || { channel: it.channel, last: it.at, last24h: 0, last7d: 0, total: 0 }
      if (it.at > c.last) c.last = it.at
      c.total++
      if (age <= DAY) c.last24h++
      if (age <= 7 * DAY) c.last7d++
      byChannel.set(it.channel, c)
    }

    return NextResponse.json({
      last: items[0] || null,
      recent: items.slice(0, 15),
      channels: Array.from(byChannel.values()).sort((a, b) => (a.last < b.last ? 1 : -1)),
      scanned: items.length,
    })
  } catch (error: unknown) {
    const msg = (error as Error).message
    if (msg === 'Unauthorized' || msg === 'Forbidden') {
      return NextResponse.json({ error: msg }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
