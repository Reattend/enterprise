/**
 * Seeds the test-droplet's 100-person organization.
 *
 * Creates `acme-india-test` (slug: seed-acme-india) — a fake 100-employee
 * Indian enterprise mirroring the structure used to demo enterprise RBAC:
 *
 *   Level 1 (HQ, Bengaluru):    CEO, CTO, COO, CHRO                   (4)
 *   Level 2 (Divisional VPs):    East/West/South/North × 2 VPs each   (8)
 *   Level 3 (Dept Heads):        region × Sales/IT/Ops/HR              (16)
 *   Level 4 (Managers):          region × 4 functions × 2              (32)
 *   Level 5 (Individual Contribs): scattered across sub-divisions      (40)
 *
 * All users use @seed.reattend.local (RFC-reserved .local TLD — no real
 * inbox exists). The shared password lives in env var TEST_LOGIN_PASSWORD
 * on the test droplet; this script doesn't touch it.
 *
 * The org is pre-set to tier='professional' so every paid-feature gate
 * (desktop, extension, ambient, oracle) opens without Paddle involvement.
 *
 * Usage:
 *   npx tsx scripts/seed-test-org.ts          # idempotent: re-runnable
 *   npx tsx scripts/seed-test-org.ts --reset  # nukes + rebuilds the org
 *
 * Intended to run on the test droplet only. The seed users use the
 * @seed.reattend.local domain so they're invisible to OTP (no inbox) and
 * can only be reached via the env-gated /test-login page.
 */

import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'

const ORG_SLUG = 'seed-acme-india'
const ORG_NAME = 'Acme India (Test)'
const ORG_DOMAIN = 'seed.reattend.local'
const SEED_EMAIL_DOMAIN = 'seed.reattend.local'

const RESET = process.argv.includes('--reset')

const dbPath = path.resolve(process.cwd(), 'data', 'reattend.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const now = () => new Date().toISOString()
function uuid() { return randomUUID() }
function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

// ─── Name pools by region ────────────────────────────────────────────────
// Match names to the regional flavor of each division so the directory
// looks authentic in the admin UI. These are common Indian names; no real
// person is implied.

const NAMES_EAST = [ // Bengali / Eastern
  ['Aritra', 'Sengupta'], ['Priya', 'Chatterjee'], ['Ananya', 'Ghosh'], ['Soumya', 'Banerjee'],
  ['Indrajit', 'Bose'], ['Rituparna', 'Dasgupta'], ['Debanjan', 'Mukherjee'], ['Riya', 'Saha'],
  ['Subhomoy', 'Roy'], ['Tanushree', 'Dutta'], ['Arnab', 'Bhattacharya'], ['Mahua', 'Pal'],
  ['Sandip', 'Mitra'], ['Paromita', 'Ray'], ['Aniket', 'Basu'], ['Sayantani', 'Choudhury'],
  ['Diptangshu', 'Goswami'], ['Antara', 'Kar'], ['Snehasish', 'Roy'], ['Madhumita', 'Sen'],
  ['Tirtharaj', 'Das'], ['Kasturi', 'Pal'], ['Sourav', 'Lahiri'], ['Bidisha', 'Bhowmick'],
  ['Hiranmoy', 'Sinha'],
]

const NAMES_WEST = [ // Marathi / Gujarati
  ['Rohan', 'Deshpande'], ['Aditi', 'Joshi'], ['Kunal', 'Patil'], ['Snehal', 'Kulkarni'],
  ['Ishaan', 'Mehta'], ['Diya', 'Shah'], ['Aniket', 'Rao'], ['Pooja', 'Bhosale'],
  ['Sameer', 'Gokhale'], ['Vaidehi', 'Karandikar'], ['Tushar', 'Phadnis'], ['Manasi', 'Pawar'],
  ['Saurabh', 'Chitnis'], ['Rashmi', 'Apte'], ['Ketan', 'Joglekar'], ['Tanvi', 'Sathe'],
  ['Aaditya', 'Naik'], ['Sonali', 'Marathe'], ['Hrishikesh', 'Limaye'], ['Shruti', 'Bapat'],
  ['Mihir', 'Vora'], ['Tarini', 'Desai'], ['Aniruddh', 'Trivedi'], ['Krutika', 'Sheth'],
  ['Yash', 'Modi'],
]

const NAMES_SOUTH = [ // Kannada / Tamil / Telugu
  ['Karthik', 'Iyer'], ['Lakshmi', 'Ramaswamy'], ['Aravind', 'Subramanian'], ['Meera', 'Krishnan'],
  ['Rohith', 'Reddy'], ['Nivedita', 'Rajan'], ['Vignesh', 'Murali'], ['Aishwarya', 'Pillai'],
  ['Suresh', 'Gowda'], ['Bhavana', 'Hegde'], ['Naveen', 'Bhat'], ['Anjali', 'Acharya'],
  ['Arvind', 'Rao'], ['Deepika', 'Shenoy'], ['Pranav', 'Pai'], ['Sushma', 'Nair'],
  ['Ramya', 'Menon'], ['Tarun', 'Krishnamurthy'], ['Kavitha', 'Balaji'], ['Manoj', 'Sundaram'],
  ['Sruthi', 'Venkatesan'], ['Hari', 'Anantharaman'], ['Ramya', 'Iyengar'], ['Karan', 'Padmanabhan'],
  ['Divya', 'Srinivasan'],
]

const NAMES_NORTH = [ // Hindi / Punjabi
  ['Arjun', 'Sharma'], ['Priya', 'Kapoor'], ['Vikram', 'Singh'], ['Neha', 'Verma'],
  ['Rahul', 'Chopra'], ['Pooja', 'Aggarwal'], ['Aman', 'Khurana'], ['Riya', 'Malhotra'],
  ['Siddharth', 'Tandon'], ['Shreya', 'Bhalla'], ['Karan', 'Gill'], ['Sneha', 'Bedi'],
  ['Aditya', 'Bhardwaj'], ['Tanisha', 'Sethi'], ['Yash', 'Anand'], ['Aarushi', 'Khanna'],
  ['Devansh', 'Goyal'], ['Mansi', 'Dhawan'], ['Ishan', 'Bhatia'], ['Niharika', 'Saxena'],
  ['Akshay', 'Nanda'], ['Tanya', 'Wadhwa'], ['Pranav', 'Sondhi'], ['Bhavya', 'Suri'],
  ['Lavanya', 'Mahajan'],
]

const NAMES_HQ = [
  ['Vikrant', 'Iyer'],     // CEO
  ['Anika', 'Patel'],      // CTO
  ['Rajesh', 'Khanna'],    // COO
  ['Sundari', 'Pillai'],   // CHRO
]

const REGIONS = ['East', 'West', 'South', 'North'] as const
const FUNCTIONS = ['Sales', 'IT', 'Operations', 'HR'] as const
const REGION_CITY: Record<string, string> = {
  East: 'Kolkata', West: 'Mumbai', South: 'Bengaluru', North: 'Gurugram',
}

interface SeedUser {
  id: string
  email: string
  name: string
  region: typeof REGIONS[number] | 'HQ'
  level: 1 | 2 | 3 | 4 | 5
  function?: typeof FUNCTIONS[number] | 'All'
  title: string
}

// ─── Step 1: nuke previous seed ───────────────────────────────────────────
const existingOrg = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(ORG_SLUG) as { id: string } | undefined
if (existingOrg) {
  if (!RESET) {
    console.log(`Org "${ORG_SLUG}" already exists. Pass --reset to nuke + rebuild.`)
    process.exit(0)
  }
  console.log(`Wiping existing org "${ORG_SLUG}"…`)
  // Foreign keys cascade through departments, organization_members, workspace_org_links, etc.
  db.prepare('DELETE FROM organizations WHERE id = ?').run(existingOrg.id)
}

// Also wipe any leftover @seed.reattend.local users from prior runs that
// weren't attached to the org row above (defensive).
const wipedUsers = db.prepare('DELETE FROM users WHERE email LIKE ?').run(`%@${SEED_EMAIL_DOMAIN}`)
if (wipedUsers.changes > 0) {
  console.log(`Wiped ${wipedUsers.changes} stale seed users from previous runs.`)
}

// ─── Step 2: create the org ──────────────────────────────────────────────
const orgId = uuid()
// Pick the most-recently-signed-in real user as nominal `created_by`, so the
// org row has a non-null FK. If no real user exists yet we use the future
// CEO's id (created below).
const realUser = db.prepare('SELECT id FROM users WHERE email NOT LIKE ? ORDER BY created_at DESC LIMIT 1').get(`%@${SEED_EMAIL_DOMAIN}`) as { id: string } | undefined

// ─── Step 3: build the user roster ───────────────────────────────────────

const roster: SeedUser[] = []

// Level 1 — HQ (4)
const hqTitles = ['CEO', 'CTO', 'COO', 'CHRO']
NAMES_HQ.forEach(([first, last], i) => {
  roster.push({
    id: uuid(),
    email: `${slugify(first)}.${slugify(last)}@${SEED_EMAIL_DOMAIN}`,
    name: `${first} ${last}`,
    region: 'HQ',
    level: 1,
    function: 'All',
    title: hqTitles[i],
  })
})

// Build per-region rosters. Each region gets:
//   2 VPs (level 2)
//   4 dept heads (level 3) — one per function
//   8 managers (level 4) — two per function
//   10 ICs (level 5) — scattered across functions
const namesByRegion: Record<typeof REGIONS[number], string[][]> = {
  East: NAMES_EAST, West: NAMES_WEST, South: NAMES_SOUTH, North: NAMES_NORTH,
}

for (const region of REGIONS) {
  const pool = [...namesByRegion[region]]
  const take = () => {
    const [first, last] = pool.shift()!
    return {
      first, last,
      email: `${slugify(first)}.${slugify(last)}@${SEED_EMAIL_DOMAIN}`,
      name: `${first} ${last}`,
    }
  }

  // 2 VPs
  for (let i = 0; i < 2; i++) {
    const p = take()
    roster.push({
      id: uuid(), email: p.email, name: p.name,
      region, level: 2, function: 'All',
      title: `VP, ${region} Division`,
    })
  }

  // 4 dept heads (one per function)
  for (const fn of FUNCTIONS) {
    const p = take()
    roster.push({
      id: uuid(), email: p.email, name: p.name,
      region, level: 3, function: fn,
      title: `Head of ${fn}, ${region}`,
    })
  }

  // 8 managers (two per function)
  for (const fn of FUNCTIONS) {
    for (let i = 0; i < 2; i++) {
      const p = take()
      roster.push({
        id: uuid(), email: p.email, name: p.name,
        region, level: 4, function: fn,
        title: `Manager, ${fn} ${region}`,
      })
    }
  }

  // 10 ICs (spread across functions: Sales 3, Ops 3, IT 2, HR 2)
  const icSplit: Array<[typeof FUNCTIONS[number], number]> = [
    ['Sales', 3], ['Operations', 3], ['IT', 2], ['HR', 2],
  ]
  for (const [fn, count] of icSplit) {
    for (let i = 0; i < count; i++) {
      const p = take()
      roster.push({
        id: uuid(), email: p.email, name: p.name,
        region, level: 5, function: fn,
        title: `${fn} Associate, ${REGION_CITY[region]}`,
      })
    }
  }
}

console.log(`Built roster: ${roster.length} users`)
if (roster.length !== 100) {
  console.warn(`Expected 100, got ${roster.length} — check the regional pools have ≥25 names each.`)
}

// ─── Step 4: insert users ────────────────────────────────────────────────
const insertUser = db.prepare(`
  INSERT INTO users (id, email, name, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`)
const insertWorkspace = db.prepare(`
  INSERT INTO workspaces (id, name, type, created_by, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`)
const insertWorkspaceMember = db.prepare(`
  INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
  VALUES (?, ?, ?, ?)
`)
const insertSubscription = db.prepare(`
  INSERT INTO subscriptions (id, user_id, plan_key, status, tier, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)
const insertProject = db.prepare(`
  INSERT INTO projects (workspace_id, name, description, is_default, color, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const insertManyUsers = db.transaction((users: SeedUser[]) => {
  for (const u of users) {
    const ts = now()
    insertUser.run(u.id, u.email, u.name, ts, ts)
    // Each user gets a personal workspace as the (app)/layout expects one.
    const wsId = uuid()
    insertWorkspace.run(wsId, 'Personal', 'personal', u.id, ts, ts)
    insertWorkspaceMember.run(wsId, u.id, 'owner', ts)
    insertProject.run(wsId, 'Unassigned', 'Memories not yet assigned to a project', 1, '#94a3b8', ts)
    // tier=professional so every paid-feature gate opens; status=active so
    // billing UI is calm.
    insertSubscription.run(uuid(), u.id, 'normal', 'active', 'professional', ts, ts)
  }
})
insertManyUsers(roster)
console.log(`Inserted ${roster.length} users.`)

// ─── Step 5: insert the org ───────────────────────────────────────────────
const ceo = roster.find((u) => u.title === 'CEO')!
db.prepare(`
  INSERT INTO organizations (id, name, slug, primary_domain, plan, deployment, status, settings, created_by, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  orgId,
  ORG_NAME, ORG_SLUG, ORG_DOMAIN,
  'enterprise', 'saas', 'active',
  JSON.stringify({ test_org: true }),
  realUser?.id || ceo.id,
  now(), now(),
)

// ─── Step 6: org membership (super_admin / admin / member) ───────────────
const insertOrgMember = db.prepare(`
  INSERT INTO organization_members (id, organization_id, user_id, role, status, title, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
for (const u of roster) {
  let orgRole: 'super_admin' | 'admin' | 'member'
  if (u.level === 1) orgRole = 'super_admin'      // CEO/CTO/COO/CHRO
  else if (u.level === 2) orgRole = 'admin'        // Divisional VPs
  else orgRole = 'member'
  insertOrgMember.run(uuid(), orgId, u.id, orgRole, 'active', u.title, now(), now())
}
console.log(`Inserted ${roster.length} organization_members.`)

// ─── Step 7: 16 departments (region × function) ──────────────────────────
const deptByKey: Record<string, string> = {} // "East::Sales" → dept id
const insertDept = db.prepare(`
  INSERT INTO departments (id, organization_id, parent_id, kind, name, slug, description, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

// Optional: one top-level department per region (Level 2 home for the VPs).
// Keeps the flat-16 model but gives VPs a place that isn't a function dept.
const regionDept: Record<typeof REGIONS[number], string> = {} as any
for (const region of REGIONS) {
  const id = uuid()
  insertDept.run(id, orgId, null, 'Region', `${region} Division`, slugify(`${region}-division`),
    `${region} regional division (${REGION_CITY[region]})`, now(), now())
  regionDept[region] = id
}

for (const region of REGIONS) {
  for (const fn of FUNCTIONS) {
    const id = uuid()
    const key = `${region}::${fn}`
    insertDept.run(id, orgId, regionDept[region], 'Department', `${region} ${fn}`,
      slugify(`${region}-${fn}`), `${fn} team for ${region} division`, now(), now())
    deptByKey[key] = id
  }
}
console.log(`Inserted ${REGIONS.length} region depts + ${REGIONS.length * FUNCTIONS.length} function depts.`)

// ─── Step 8: department membership (dept_head / manager / member) ────────
const insertDeptMember = db.prepare(`
  INSERT INTO department_members (id, department_id, organization_id, user_id, role, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`)
for (const u of roster) {
  if (u.region === 'HQ') continue // HQ executives stay org-scope only

  // VPs slot into the region dept as dept_head
  if (u.level === 2) {
    insertDeptMember.run(uuid(), regionDept[u.region], orgId, u.id, 'dept_head', now())
    continue
  }

  if (!u.function || u.function === 'All') continue
  const deptId = deptByKey[`${u.region}::${u.function}`]
  if (!deptId) continue

  let deptRole: 'dept_head' | 'manager' | 'member'
  if (u.level === 3) deptRole = 'dept_head'
  else if (u.level === 4) deptRole = 'manager'
  else deptRole = 'member'

  insertDeptMember.run(uuid(), deptId, orgId, u.id, deptRole, now())
}
console.log('Inserted department_members.')

// ─── Step 9: 4 regional workspaces (one per region) ──────────────────────
const insertOrgLink = db.prepare(`
  INSERT INTO workspace_org_links (workspace_id, organization_id, department_id, visibility, created_at)
  VALUES (?, ?, ?, ?, ?)
`)
for (const region of REGIONS) {
  const wsId = uuid()
  insertWorkspace.run(wsId, `${region} Memory`, 'team', ceo.id, now(), now())
  insertOrgLink.run(wsId, orgId, regionDept[region], 'department_only', now())
  insertProject.run(wsId, 'Unassigned', 'Default project', 1, '#94a3b8', now())

  // Every user in this region (plus HQ) becomes a workspace_member so they
  // can see + write into the regional workspace. Members get 'member' role;
  // VPs/heads get 'admin'; HQ execs get 'owner'.
  for (const u of roster) {
    if (u.region !== region && u.region !== 'HQ') continue
    let wsRole: 'owner' | 'admin' | 'member'
    if (u.level === 1) wsRole = 'owner'
    else if (u.level <= 3) wsRole = 'admin'
    else wsRole = 'member'
    insertWorkspaceMember.run(wsId, u.id, wsRole, now())
  }
}
console.log(`Inserted ${REGIONS.length} regional workspaces + members.`)

// ─── Done ────────────────────────────────────────────────────────────────
console.log(`\n✅ Seeded "${ORG_NAME}" (${ORG_SLUG}) with ${roster.length} users.`)
console.log('\nSample logins (all share the same password — TEST_LOGIN_PASSWORD env var):')
const samples = [
  roster.find((u) => u.title === 'CEO'),
  roster.find((u) => u.title.startsWith('VP, East')),
  roster.find((u) => u.title.startsWith('Head of Sales, East')),
  roster.find((u) => u.title.startsWith('Manager, IT West')),
  roster.find((u) => u.title.startsWith('Sales Associate, Bengaluru')),
].filter(Boolean) as SeedUser[]
for (const u of samples) {
  console.log(`  ${u.email.padEnd(48)} — ${u.title}`)
}

db.close()
