/**
 * Verifies record-level RBAC end-to-end against the live DB.
 *
 * Builds a tiny disposable org with two departments (Engineering and HR),
 * two users (an Eng member and an HR member), drops a record into each
 * department, and checks that `filterToAccessibleRecords` only returns
 * records the user can actually see under all 8 access rules.
 *
 * Pass criteria: every scenario prints PASS. One FAIL = Sprint 2 is broken.
 *
 * Run: `npx tsx scripts/test-rbac.ts`
 *
 * Idempotent: wipes its own test org + users on every run.
 */

import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'

const dbPath = path.resolve(process.cwd(), 'data', 'reattend.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const now = () => new Date().toISOString()
const uuid = () => randomUUID()

// ─── 1. Tear down any previous test state ──────────────────────────────────
const TEST_ORG_SLUG = 'rbac-test-org'
const TEST_EMAIL_ENG = 'rbac-eng@test.local'
const TEST_EMAIL_HR = 'rbac-hr@test.local'
const TEST_EMAIL_ADMIN = 'rbac-admin@test.local'
const TEST_EMAIL_OUTSIDER = 'rbac-outsider@test.local'

const prevOrg = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(TEST_ORG_SLUG) as { id: string } | undefined
if (prevOrg) {
  db.prepare('DELETE FROM organizations WHERE id = ?').run(prevOrg.id)
}
// Disable foreign keys during teardown so we don't have to enumerate every
// table that references users (new ones keep landing). Re-enabled below.
db.pragma('foreign_keys = OFF')
for (const email of [TEST_EMAIL_ENG, TEST_EMAIL_HR, TEST_EMAIL_ADMIN, TEST_EMAIL_OUTSIDER]) {
  const u = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
  if (u) {
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id)
  }
}
db.pragma('foreign_keys = ON')

// ─── 2. Create users ───────────────────────────────────────────────────────
function createUser(email: string, name: string): string {
  const id = uuid()
  db.prepare(`INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)`)
    .run(id, email, name, now())
  return id
}
const engUserId = createUser(TEST_EMAIL_ENG, 'Eng Person')
const hrUserId = createUser(TEST_EMAIL_HR, 'HR Person')
const adminUserId = createUser(TEST_EMAIL_ADMIN, 'Org Admin')
const outsiderUserId = createUser(TEST_EMAIL_OUTSIDER, 'Outside Person')

// ─── 3. Create org + two departments ───────────────────────────────────────
const orgId = uuid()
db.prepare(`INSERT INTO organizations
  (id, name, slug, primary_domain, plan, deployment, status, settings, created_by, created_at, updated_at)
  VALUES (?, 'RBAC Test Org', ?, 'test.local', 'enterprise', 'cloud', 'active', '{}', ?, ?, ?)`)
  .run(orgId, TEST_ORG_SLUG, adminUserId, now(), now())

db.prepare(`INSERT INTO organization_members (id, organization_id, user_id, role, status, created_at, updated_at)
  VALUES (?, ?, ?, 'admin', 'active', ?, ?)`)
  .run(uuid(), orgId, adminUserId, now(), now())
db.prepare(`INSERT INTO organization_members (id, organization_id, user_id, role, status, created_at, updated_at)
  VALUES (?, ?, ?, 'member', 'active', ?, ?)`)
  .run(uuid(), orgId, engUserId, now(), now())
db.prepare(`INSERT INTO organization_members (id, organization_id, user_id, role, status, created_at, updated_at)
  VALUES (?, ?, ?, 'member', 'active', ?, ?)`)
  .run(uuid(), orgId, hrUserId, now(), now())

const engDeptId = uuid()
const hrDeptId = uuid()
db.prepare(`INSERT INTO departments (id, organization_id, name, slug, kind, parent_id, created_at, updated_at)
  VALUES (?, ?, 'Engineering', 'eng', 'department', NULL, ?, ?)`)
  .run(engDeptId, orgId, now(), now())
db.prepare(`INSERT INTO departments (id, organization_id, name, slug, kind, parent_id, created_at, updated_at)
  VALUES (?, ?, 'HR', 'hr', 'department', NULL, ?, ?)`)
  .run(hrDeptId, orgId, now(), now())

// Dept memberships
db.prepare(`INSERT INTO department_members (id, department_id, organization_id, user_id, role, created_at)
  VALUES (?, ?, ?, ?, 'member', ?)`)
  .run(uuid(), engDeptId, orgId, engUserId, now())
db.prepare(`INSERT INTO department_members (id, department_id, organization_id, user_id, role, created_at)
  VALUES (?, ?, ?, ?, 'member', ?)`)
  .run(uuid(), hrDeptId, orgId, hrUserId, now())

// ─── 4. Two workspaces, each linked to a dept ──────────────────────────────
const engWsId = uuid()
const hrWsId = uuid()
db.prepare(`INSERT INTO workspaces (id, name, type, created_by, created_at)
  VALUES (?, 'Engineering WS', 'team', ?, ?)`)
  .run(engWsId, engUserId, now())
db.prepare(`INSERT INTO workspaces (id, name, type, created_by, created_at)
  VALUES (?, 'HR WS', 'team', ?, ?)`)
  .run(hrWsId, hrUserId, now())

// Direct WS membership
db.prepare(`INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)`)
  .run(uuid(), engWsId, engUserId, now())
db.prepare(`INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)`)
  .run(uuid(), hrWsId, hrUserId, now())

// Link workspaces to their depts
db.prepare(`INSERT INTO workspace_org_links (workspace_id, organization_id, department_id, visibility, created_at)
  VALUES (?, ?, ?, 'department_only', ?)`).run(engWsId, orgId, engDeptId, now())
db.prepare(`INSERT INTO workspace_org_links (workspace_id, organization_id, department_id, visibility, created_at)
  VALUES (?, ?, ?, 'department_only', ?)`).run(hrWsId, orgId, hrDeptId, now())

// ─── 5. Records with every visibility level ────────────────────────────────
function createRecord(workspaceId: string, createdBy: string, visibility: string, label: string): string {
  const id = uuid()
  db.prepare(`INSERT INTO records (id, workspace_id, type, title, content, confidence, tags, triage_status, visibility, created_by, created_at, updated_at)
    VALUES (?, ?, 'note', ?, 'test content', 0.9, '[]', 'auto_accepted', ?, ?, ?, ?)`)
    .run(id, workspaceId, label, visibility, createdBy, now(), now())
  return id
}

// Eng records
const engPrivate = createRecord(engWsId, engUserId, 'private', 'ENG private')
const engTeam = createRecord(engWsId, engUserId, 'team', 'ENG team')
const engDept = createRecord(engWsId, engUserId, 'department', 'ENG department')
const engOrg = createRecord(engWsId, engUserId, 'org', 'ENG org-wide')

// HR records
const hrPrivate = createRecord(hrWsId, hrUserId, 'private', 'HR private')
const hrTeam = createRecord(hrWsId, hrUserId, 'team', 'HR team')
const hrDept = createRecord(hrWsId, hrUserId, 'department', 'HR department')
const hrOrg = createRecord(hrWsId, hrUserId, 'org', 'HR org-wide')

// A shared record: HR-owned team-scoped, but explicitly shared to Eng dept
const hrSharedToEng = createRecord(hrWsId, hrUserId, 'team', 'HR shared to ENG dept')
db.prepare(`INSERT INTO record_shares (id, record_id, workspace_id, organization_id, user_id, department_id, role_id, shared_by, shared_at)
  VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, ?)`)
  .run(uuid(), hrSharedToEng, hrWsId, orgId, engDeptId, hrUserId, now())

// Close the sqlite handle so the drizzle one below doesn't collide.
db.close()

// ─── 6. Run the actual RBAC logic ──────────────────────────────────────────
async function runChecks() {
  const { buildAccessContext, filterToAccessibleRecords } = await import('../src/lib/enterprise/rbac-records')

  const allIds = [
    engPrivate, engTeam, engDept, engOrg,
    hrPrivate, hrTeam, hrDept, hrOrg,
    hrSharedToEng,
  ]

  const label: Record<string, string> = {
    [engPrivate]: 'ENG private',
    [engTeam]: 'ENG team',
    [engDept]: 'ENG department',
    [engOrg]: 'ENG org',
    [hrPrivate]: 'HR private',
    [hrTeam]: 'HR team',
    [hrDept]: 'HR department',
    [hrOrg]: 'HR org',
    [hrSharedToEng]: 'HR→ENG shared',
  }

  let fail = 0

  async function expect(actor: string, userId: string, expected: Record<string, boolean>) {
    const ctx = await buildAccessContext(userId)
    const allowed = await filterToAccessibleRecords(ctx, allIds)
    console.log(`\n── ${actor} ─────────────────────────────`)
    for (const id of allIds) {
      const got = allowed.has(id)
      const want = expected[id]
      const ok = got === want
      if (!ok) fail++
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label[id].padEnd(18)} got=${got ? 'Y' : 'N'}  want=${want ? 'Y' : 'N'}`)
    }
  }

  // HR user — can see HR's stuff they created, team-scoped records in their
  // workspace, dept-scoped HR records via dept access, org-scoped anything.
  // Crucially: NO Eng private/team/department records. (Outsider to those.)
  await expect('HR user (eng outsider)', hrUserId, {
    [engPrivate]: false, // rule 3
    [engTeam]: false,    // rule 4: not in eng WS, not in eng dept
    [engDept]: false,    // rule 5: not in eng dept
    [engOrg]: true,      // rule 6: org-wide
    [hrPrivate]: true,   // rule 2: creator
    [hrTeam]: true,      // rule 2: creator
    [hrDept]: true,      // rule 2: creator
    [hrOrg]: true,       // rule 2: creator
    [hrSharedToEng]: true, // rule 2: creator
  })

  // Eng user — creator of eng records, outside hr dept so blocked from hr
  // team/dept, but allowed to see org-wide HR AND the explicitly shared one.
  await expect('Eng user (hr outsider, receives share)', engUserId, {
    [engPrivate]: true,  // creator
    [engTeam]: true,     // creator
    [engDept]: true,     // creator
    [engOrg]: true,      // creator
    [hrPrivate]: false,  // rule 3
    [hrTeam]: false,     // rule 4: not in hr ws, not in hr dept
    [hrDept]: false,     // rule 5: not in hr dept
    [hrOrg]: true,       // rule 6: org-wide
    [hrSharedToEng]: true, // rule 7: shared to eng dept
  })

  // Org admin — rule 1, sees everything regardless of private/team.
  await expect('Org admin', adminUserId, Object.fromEntries(allIds.map((id) => [id, true])) as Record<string, boolean>)

  // Outsider — not in org at all. Should see nothing.
  await expect('Outsider (no org membership)', outsiderUserId, Object.fromEntries(allIds.map((id) => [id, false])) as Record<string, boolean>)

  console.log('\n─────────────────────────────────────')
  if (fail > 0) {
    console.log(`FAILED — ${fail} assertion(s) wrong`)
    process.exit(1)
  }
  console.log('ALL PASS — record-level RBAC is enforcing all 8 rules correctly.')
}

runChecks().catch((e) => {
  console.error(e)
  process.exit(1)
})
