/**
 * Knowledge Transfer Protocol smoke test.
 *
 * Builds a disposable scenario: creates a "Partha-test" user, anchors them
 * to a new Test Role in demo-mof, has them author a handful of records,
 * then runs the transfer flow → records anchor to the role → Aditi-test
 * becomes the successor and sees them in the at-risk list as resolved.
 *
 * Run: `npm run test:transfer`
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
if (!org) { console.error('Need demo-mof org — run npm run seed:demo'); process.exit(1) }

// Cleanup prior runs — several FK chains reference users without cascade.
const priorUsers = db.prepare("SELECT id FROM users WHERE email LIKE 'transfer-test-%'").all() as Array<{ id: string }>
for (const u of priorUsers) {
  db.prepare('DELETE FROM transfer_events WHERE from_user_id = ? OR to_user_id = ? OR initiated_by_user_id = ?').run(u.id, u.id, u.id)
  db.prepare('DELETE FROM record_role_ownership WHERE assigned_by_user_id = ?').run(u.id)
  // Records authored by the test user — delete them and their dependents
  db.prepare(`DELETE FROM record_role_ownership WHERE record_id IN (SELECT id FROM records WHERE created_by = ?)`).run(u.id)
  db.prepare('DELETE FROM records WHERE created_by = ?').run(u.id)
  db.prepare('DELETE FROM role_assignments WHERE user_id = ?').run(u.id)
  db.prepare('DELETE FROM organization_members WHERE user_id = ?').run(u.id)
  db.prepare('DELETE FROM users WHERE id = ?').run(u.id)
}
db.prepare("DELETE FROM employee_roles WHERE title = 'Test Role (transfer smoke)'").run()

let fail = 0
const check = (name: string, ok: boolean) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) fail++ }

// Create two users
const parthaId = uuid()
const aditiId = uuid()
db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
  .run(parthaId, 'transfer-test-partha@test.local', 'Partha Test', now())
db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
  .run(aditiId, 'transfer-test-aditi@test.local', 'Aditi Test', now())

// Add both to the org as members
for (const u of [parthaId, aditiId]) {
  db.prepare(`INSERT INTO organization_members (id, organization_id, user_id, role, status, created_at, updated_at)
    VALUES (?, ?, ?, 'member', 'active', ?, ?)`)
    .run(uuid(), org.id, u, now(), now())
}

// Create a role, assign Partha
const roleId = uuid()
db.prepare(`INSERT INTO employee_roles (id, organization_id, title, status, created_at, updated_at)
  VALUES (?, ?, 'Test Role (transfer smoke)', 'active', ?, ?)`)
  .run(roleId, org.id, now(), now())
db.prepare(`INSERT INTO role_assignments (id, role_id, user_id, organization_id, started_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?)`)
  .run(uuid(), roleId, parthaId, org.id, now(), now())

// Find a workspace in the org to land records in
const ws = db.prepare(`
  SELECT workspace_id FROM workspace_org_links WHERE organization_id = ? LIMIT 1
`).get(org.id) as { workspace_id: string } | undefined
if (!ws) { console.error('No org-linked workspace'); process.exit(1) }

// Author 3 records by Partha
const recordIds: string[] = []
for (let i = 0; i < 3; i++) {
  const id = uuid()
  recordIds.push(id)
  db.prepare(`INSERT INTO records (id, workspace_id, type, title, content, confidence, tags, triage_status, visibility, created_by, created_at, updated_at)
    VALUES (?, ?, 'note', ?, 'content', 0.9, '[]', 'auto_accepted', 'team', ?, ?, ?)`)
    .run(id, ws.workspace_id, `Transfer test record ${i}`, parthaId, now(), now())
}

// Pre-check
const authoredBefore = db.prepare(`SELECT COUNT(*) c FROM records WHERE created_by = ?`).get(parthaId) as { c: number }
check('Partha authored 3 records', authoredBefore.c === 3)

const ownedBefore = db.prepare(`SELECT COUNT(*) c FROM record_role_ownership WHERE role_id = ?`).get(roleId) as { c: number }
check('role owns 0 records before transfer', ownedBefore.c === 0)

db.close()

;(async () => {
// Now run the transfer via the lib (simulates API call path)
const { performTransfer, computeAtRisk } = await import('../src/lib/enterprise/transfer')

const snapshot = await computeAtRisk(org.id, parthaId)
check('computeAtRisk surfaces 3 unanchored records', snapshot?.atRiskRecords === 3)

const result = await performTransfer({
  organizationId: org.id,
  fromUserId: parthaId,
  toUserId: aditiId,
  roleId,
  reason: 'offboard',
  transferNotes: 'Handing off role to Aditi',
  initiatedByUserId: parthaId, // simulating self-initiated
  markOffboarded: true,
})

check('transfer reports 3 records moved', result.recordsTransferred === 3)

// Post-check
const db2 = new Database(dbPath)
const ownedAfter = db2.prepare(`SELECT COUNT(*) c FROM record_role_ownership WHERE role_id = ?`).get(roleId) as { c: number }
check('role now owns 3 records', ownedAfter.c === 3)

const parthaAssign = db2.prepare(`SELECT ended_at FROM role_assignments WHERE user_id = ? AND role_id = ?`).get(parthaId, roleId) as { ended_at: string | null }
check('Partha role assignment ended', !!parthaAssign.ended_at)

const aditiAssign = db2.prepare(`SELECT ended_at FROM role_assignments WHERE user_id = ? AND role_id = ?`).get(aditiId, roleId) as { ended_at: string | null } | undefined
check('Aditi now holds the role (no ended_at)', !!aditiAssign && !aditiAssign.ended_at)

const parthaStatus = db2.prepare(`SELECT status, offboarded_at FROM organization_members WHERE user_id = ? AND organization_id = ?`).get(parthaId, org.id) as { status: string; offboarded_at: string | null }
check('Partha marked offboarded', parthaStatus.status === 'offboarded' && !!parthaStatus.offboarded_at)

const event = db2.prepare(`SELECT records_transferred, reason FROM transfer_events WHERE from_user_id = ? ORDER BY created_at DESC LIMIT 1`).get(parthaId) as { records_transferred: number; reason: string }
check('transfer_event logged', event.records_transferred === 3 && event.reason === 'offboard')

// Re-compute at-risk should now show 0 unanchored records
const snap2 = await computeAtRisk(org.id, parthaId)
check('at-risk recomputed: 0 unanchored after transfer', snap2?.atRiskRecords === 0)

// Cleanup — transfer_events has a notnull FK to users (no cascade, on purpose:
// we keep audit history across user deletions in prod). For the test we
// cascade manually to keep the script idempotent.
for (const u of [parthaId, aditiId]) {
  db2.prepare('DELETE FROM transfer_events WHERE from_user_id = ? OR to_user_id = ? OR initiated_by_user_id = ?').run(u, u, u)
  db2.prepare('DELETE FROM record_role_ownership WHERE assigned_by_user_id = ?').run(u)
  db2.prepare(`DELETE FROM record_role_ownership WHERE record_id IN (SELECT id FROM records WHERE created_by = ?)`).run(u)
  db2.prepare('DELETE FROM records WHERE created_by = ?').run(u)
  db2.prepare('DELETE FROM role_assignments WHERE user_id = ?').run(u)
  db2.prepare('DELETE FROM organization_members WHERE user_id = ?').run(u)
  db2.prepare('DELETE FROM users WHERE id = ?').run(u)
}
db2.prepare('DELETE FROM employee_roles WHERE id = ?').run(roleId)
db2.close()

console.log(`\n${fail === 0 ? 'ALL PASS' : `FAILED (${fail})`} — knowledge transfer protocol works`)
process.exit(fail === 0 ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
