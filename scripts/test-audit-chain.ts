/**
 * Audit hash-chain smoke test.
 *
 * Seeds 5 audit rows, builds an export bundle, verifies the chain, then
 * tampers with one row and re-verifies to prove detection works.
 *
 * Run: `npm run test:audit`
 */

import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'data', 'reattend.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const uuid = () => randomUUID()
const now = () => new Date().toISOString()

const org = db.prepare("SELECT id FROM organizations WHERE slug='demo-mof'").get() as { id: string } | undefined
if (!org) { console.error('No demo-mof org'); process.exit(1) }
const admin = db.prepare(`
  SELECT u.id, u.email FROM organization_members om JOIN users u ON u.id = om.user_id
  WHERE om.organization_id = ? AND om.role='super_admin' LIMIT 1
`).get(org.id) as { id: string; email: string } | undefined
if (!admin) { console.error('No admin'); process.exit(1) }

// Seed 5 fake audit rows marked with a distinctive resource_type so we can
// scope the export to just them.
const MARKER = `chain-smoke-${Date.now()}`
db.prepare("DELETE FROM audit_log WHERE resource_type = 'chain-smoke'").run()
for (let i = 0; i < 5; i++) {
  db.prepare(`INSERT INTO audit_log (id, organization_id, user_id, user_email, action, resource_type, resource_id, created_at)
    VALUES (?, ?, ?, ?, 'read', 'chain-smoke', ?, ?)`)
    .run(uuid(), org.id, admin.id, admin.email, MARKER, new Date(Date.now() - (5 - i) * 1000).toISOString())
}
db.close()

let fail = 0
const check = (name: string, cond: boolean) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) fail++ }

;(async () => {
  const { buildAuditExport, verifyAuditExport, bundleToCsv } = await import('../src/lib/enterprise/audit-export')

  // Build bundle over everything in the org (includes our 5 + any existing)
  const bundle = await buildAuditExport({ organizationId: org.id })
  const smokeRows = bundle.rows.filter((r) => r.resourceType === 'chain-smoke')
  check('5 smoke rows present in export', smokeRows.length === 5)

  // Verify whole bundle
  const firstFailure = verifyAuditExport(bundle)
  check('unmodified bundle verifies', firstFailure === -1)
  check('chain tip present', bundle.chainTip.length === 64)

  // Tamper test: change one row's userEmail AFTER hashing
  const tampered = {
    ...bundle,
    rows: bundle.rows.map((r, i) => i === Math.floor(bundle.rows.length / 2)
      ? { ...r, userEmail: 'tampered@evil.com' }
      : r,
    ),
  }
  const badIdx = verifyAuditExport(tampered)
  check('tampered bundle detected', badIdx >= 0)

  // CSV sanity
  const csv = bundleToCsv(bundle)
  check('CSV includes chain tip comment', csv.includes(`Chain tip (verify this signature): ${bundle.chainTip}`))
  check('CSV has header row', csv.includes('id,created_at,user_email'))

  // Cleanup
  const db2 = new Database(dbPath)
  db2.prepare("DELETE FROM audit_log WHERE resource_type = 'chain-smoke'").run()
  db2.close()

  console.log(`\n${fail === 0 ? 'ALL PASS' : `FAILED (${fail})`} — audit chain tamper-evidence works`)
  process.exit(fail === 0 ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
