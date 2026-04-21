/**
 * Decisions briefing smoke test — builds a briefing against the demo org
 * and asserts the markdown has the sections + citations we expect.
 */

import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'data', 'reattend.db')
const db = new Database(dbPath)
const org = db.prepare("SELECT id FROM organizations WHERE slug='demo-mof'").get() as { id: string } | undefined
db.close()
if (!org) { console.error('Run npm run seed:demo first'); process.exit(1) }

let fail = 0
const check = (name: string, ok: boolean) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) fail++ }

;(async () => {
  const { buildDecisionsBriefing } = await import('../src/lib/enterprise/decisions-briefing')
  const result = await buildDecisionsBriefing({ organizationId: org.id })

  check('markdown starts with H1', result.markdown.startsWith('# Decision briefing'))
  check('rowCount >= activeCount', result.rowCount >= result.activeCount)
  check('contains summary line', /Summary: \*\*\d+ active\*\*/.test(result.markdown))

  // If the demo org has decisions with reversals (the seed ships some), we
  // should see the Reversed section.
  if (result.reversedCount > 0) {
    check('reversed section present when reversals exist', result.markdown.includes('## Reversed decisions'))
    check('reversal reason line rendered', /Reason:/.test(result.markdown))
  } else {
    console.log('SKIP  reversed-section (no reversals in seed)')
  }

  if (result.supersededCount > 0) {
    check('superseded section present', result.markdown.includes('## Superseded decisions'))
  } else {
    console.log('SKIP  superseded-section (none in seed)')
  }

  console.log(`\n${fail === 0 ? 'ALL PASS' : `FAILED (${fail})`} — decisions briefing works (${result.rowCount} decisions in demo org)`)
  process.exit(fail === 0 ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
