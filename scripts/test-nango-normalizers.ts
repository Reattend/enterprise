/**
 * Unit-tests each Nango normalizer with synthetic Nango records that mirror
 * the real sync script output shapes. Verifies:
 *  - required fields are populated (externalId, text)
 *  - externalId is namespaced per source (no collision between sources)
 *  - occurredAt parses to ISO or null (never the raw source string)
 *  - unknown/empty records are rejected (return null)
 *
 * Run: `npx tsx scripts/test-nango-normalizers.ts`
 */

import { normalizeGmail } from '../src/lib/integrations/nango/providers/gmail'
import { normalizeGoogleDrive } from '../src/lib/integrations/nango/providers/google-drive'
import { normalizeSlack } from '../src/lib/integrations/nango/providers/slack'
import { normalizeNotion } from '../src/lib/integrations/nango/providers/notion'
import { normalizeConfluence } from '../src/lib/integrations/nango/providers/confluence'

type Case = { name: string; ok: boolean; detail?: string }
const cases: Case[] = []

function check(name: string, cond: boolean, detail = '') {
  cases.push({ name, ok: cond, detail: cond ? '' : detail })
}

// ─── Gmail ────────────────────────────────────────────────
{
  const out = normalizeGmail({
    id: 'abc123',
    subject: 'Approved: 2026 comp plan',
    from: 'ceo@acme.com',
    body: 'Full text of the thread here.',
    date: '2025-11-04T12:34:56Z',
  })
  check('gmail: happy path', !!out && out.text.includes('Approved') && out.externalId === 'gmail:abc123')
  check('gmail: occurredAt parsed', out?.occurredAt === '2025-11-04T12:34:56.000Z')
  check('gmail: author populated', !!out?.author && (out.author as any).from === 'ceo@acme.com')
}
{
  const empty = normalizeGmail({})
  check('gmail: empty → null', empty === null)
}
{
  const noBody = normalizeGmail({ id: 'x', subject: 'Ping' })
  check('gmail: subject-only still works', !!noBody && noBody.text.includes('Ping'))
}

// ─── Google Drive ──────────────────────────────────────────
{
  const out = normalizeGoogleDrive({
    id: 'file-1',
    name: 'Q3 Roadmap',
    content: 'We decided to ship the new feature in November.',
    modifiedTime: '2025-11-03T09:00:00Z',
    mimeType: 'application/vnd.google-apps.document',
    webViewLink: 'https://docs.google.com/document/d/file-1',
  })
  check('gdrive: happy path', !!out && out.externalId === 'gdrive:file-1')
  check('gdrive: title in text', !!out && out.text.startsWith('Title: Q3'))
  check('gdrive: url in metadata', (out?.metadata as any)?.url?.includes('docs.google.com'))
}

// ─── Slack ─────────────────────────────────────────────────
{
  const out = normalizeSlack({
    id: 'msg-1',
    ts: '1730000000.000100',
    text: 'Ok let\'s go with option B',
    user: 'alice',
    channel: 'eng-leads',
  })
  check('slack: happy path', !!out && out.externalId === 'slack:msg-1')
  check('slack: channel + user in text', !!out && out.text.includes('#eng-leads') && out.text.includes('@alice'))
}
{
  const out = normalizeSlack({ id: 'm2', text: '' })
  check('slack: empty text → null', out === null)
}

// ─── Notion ────────────────────────────────────────────────
{
  const out = normalizeNotion({
    id: 'page-1',
    title: 'Eng wiki home',
    content: 'We document decisions here.',
    last_edited_time: '2025-11-05T00:00:00Z',
  })
  check('notion: happy path', !!out && out.externalId === 'notion:page-1')
  check('notion: title as heading', !!out && out.text.startsWith('# Eng wiki home'))
}

// ─── Confluence ────────────────────────────────────────────
{
  const out = normalizeConfluence({
    id: '12345',
    title: 'Security policy',
    body: 'All passwords must rotate every 90 days.',
    space_key: 'SEC',
    updated_at: '2025-10-20T08:00:00Z',
  })
  check('confluence: happy path', !!out && out.externalId === 'confluence:12345')
  check('confluence: space in text', !!out && out.text.includes('Space: SEC'))
}

// ─── Cross-source collision check ──────────────────────────
{
  const g = normalizeGmail({ id: 'same-id', subject: 'x' })
  const s = normalizeSlack({ id: 'same-id', text: 'x' })
  check('no collision: gmail vs slack externalId', g?.externalId !== s?.externalId)
}

// ─── Report ────────────────────────────────────────────────
let fail = 0
console.log('')
for (const c of cases) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
  if (!c.ok) fail++
}
console.log('')
if (fail > 0) {
  console.log(`FAILED — ${fail}/${cases.length}`)
  process.exit(1)
}
console.log(`ALL PASS — ${cases.length}/${cases.length} normalizer checks`)
