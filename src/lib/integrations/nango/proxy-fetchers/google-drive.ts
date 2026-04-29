// Google Drive fetcher — uses nango.proxy() to call Drive v3.
//
// Strategy: list the user's most-recently-modified files (excluding folders
// and trash), then for each file extract text content via the appropriate
// path:
//   - Google Docs       → /files/{id}/export?mimeType=text/plain
//   - Google Sheets     → /files/{id}/export?mimeType=text/csv (first ~80 lines)
//   - Google Slides     → /files/{id}/export?mimeType=text/plain
//   - Plain/markdown    → /files/{id}?alt=media (download UTF-8)
//   - PDF               → /files/{id}?alt=media → pdf-parse
//   - Everything else   → skipped (images, videos, archives, binaries)
//
// Default ceiling: 50 files / backfill, 30-day window. Tunable via opts.

import type { Nango } from '@nangohq/node'
import type { NormalizedRawItem } from '../normalize'

const DRIVE_BASE = 'https://www.googleapis.com'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  createdTime?: string
  webViewLink?: string
  owners?: Array<{ displayName?: string; emailAddress?: string }>
  size?: string                      // bytes, as string
}

const MIME_DOC    = 'application/vnd.google-apps.document'
const MIME_SHEET  = 'application/vnd.google-apps.spreadsheet'
const MIME_SLIDES = 'application/vnd.google-apps.presentation'
const MIME_PDF    = 'application/pdf'

function isTextLike(mt: string): boolean {
  return mt === 'text/plain'
      || mt === 'text/markdown'
      || mt === 'text/x-markdown'
      || mt === 'text/csv'
      || mt.startsWith('application/json')
}

function isExtractable(mt: string): boolean {
  return mt === MIME_DOC || mt === MIME_SHEET || mt === MIME_SLIDES || mt === MIME_PDF || isTextLike(mt)
}

// Trim sheet content to the first ~80 lines (header + sample) so we don't
// blow up triage with 10k-row CSVs. The structure is what matters; the
// per-row data isn't usually a memory.
function trimCsv(csv: string, maxLines = 80): string {
  const lines = csv.split('\n')
  if (lines.length <= maxLines) return csv
  return lines.slice(0, maxLines).join('\n') + `\n…(${lines.length - maxLines} more rows)`
}

export async function fetchDriveFiles(
  nango: Nango,
  providerConfigKey: string,
  connectionId: string,
  opts: { maxFiles?: number; daysPast?: number } = {},
): Promise<NormalizedRawItem[]> {
  const maxFiles = opts.maxFiles ?? 50
  const daysPast = opts.daysPast ?? 30
  const sinceIso = new Date(Date.now() - daysPast * 86_400_000).toISOString()

  // Step 1: list files modified within window, excluding folders + trashed.
  const listRes = await nango.proxy({
    method: 'GET',
    endpoint: '/drive/v3/files',
    providerConfigKey,
    connectionId,
    baseUrlOverride: DRIVE_BASE,
    params: {
      q: `trashed = false and mimeType != 'application/vnd.google-apps.folder' and modifiedTime > '${sinceIso}'`,
      orderBy: 'modifiedTime desc',
      pageSize: String(Math.min(maxFiles, 100)),
      fields: 'files(id,name,mimeType,modifiedTime,createdTime,webViewLink,owners,size)',
    },
  })
  const files: DriveFile[] = ((listRes.data as any)?.files || []).slice(0, maxFiles)
  if (files.length === 0) return []

  const out: NormalizedRawItem[] = []

  for (const f of files) {
    if (!isExtractable(f.mimeType)) continue

    let body = ''
    try {
      if (f.mimeType === MIME_DOC || f.mimeType === MIME_SLIDES) {
        const r = await nango.proxy({
          method: 'GET',
          endpoint: `/drive/v3/files/${f.id}/export`,
          providerConfigKey,
          connectionId,
          baseUrlOverride: DRIVE_BASE,
          params: { mimeType: 'text/plain' },
          responseType: 'text',
        })
        body = String(r.data || '').slice(0, 6000)
      } else if (f.mimeType === MIME_SHEET) {
        const r = await nango.proxy({
          method: 'GET',
          endpoint: `/drive/v3/files/${f.id}/export`,
          providerConfigKey,
          connectionId,
          baseUrlOverride: DRIVE_BASE,
          params: { mimeType: 'text/csv' },
          responseType: 'text',
        })
        body = trimCsv(String(r.data || ''), 80).slice(0, 6000)
      } else if (f.mimeType === MIME_PDF) {
        const r = await nango.proxy({
          method: 'GET',
          endpoint: `/drive/v3/files/${f.id}`,
          providerConfigKey,
          connectionId,
          baseUrlOverride: DRIVE_BASE,
          params: { alt: 'media' },
          responseType: 'arraybuffer',
        })
        const buf = Buffer.from(r.data as ArrayBuffer)
        // Skip very large PDFs (>10MB) to keep latency reasonable.
        if (buf.byteLength > 10_000_000) {
          body = '(PDF too large to extract — open in Drive)'
        } else {
          // pdf-parse is CommonJS; default-import dance for ESM compat.
          const pdfMod: any = await import('pdf-parse')
          const pdfParse = pdfMod.default ?? pdfMod
          const parsed = await pdfParse(buf)
          body = String(parsed?.text || '').slice(0, 6000)
        }
      } else if (isTextLike(f.mimeType)) {
        const r = await nango.proxy({
          method: 'GET',
          endpoint: `/drive/v3/files/${f.id}`,
          providerConfigKey,
          connectionId,
          baseUrlOverride: DRIVE_BASE,
          params: { alt: 'media' },
          responseType: 'text',
        })
        body = String(r.data || '').slice(0, 6000)
      }
    } catch (err: any) {
      console.error(`[drive proxy] extract failed for ${f.id} (${f.mimeType}):`, err?.response?.status || err?.message)
      // Fall through with empty body — we'll still emit a title-only memory.
    }

    const owner = f.owners?.[0]
    const text = `# ${f.name}\n\n${body}`.trim()
    if (text.length < 5) continue

    out.push({
      externalId: `gdrive:${f.id}`,
      occurredAt: f.modifiedTime || f.createdTime || null,
      author: owner?.emailAddress
        ? { source: 'google-drive', email: owner.emailAddress, name: owner.displayName || null }
        : null,
      text,
      metadata: {
        source: 'google-drive',
        title: f.name,
        fileId: f.id,
        mimeType: f.mimeType,
        url: f.webViewLink || null,
        sizeBytes: f.size ? Number(f.size) : null,
      },
    })
  }
  return out
}
