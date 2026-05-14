/**
 * Seeds the test-droplet's full-shape organization.
 *
 * Creates `acme-india-test` (slug: seed-acme-india) — a 150-person Indian
 * SaaS enterprise with a proper hierarchical org structure:
 *
 *   Org (Acme India)
 *   └── Office of the CEO          ← C-suite + chiefs of staff
 *   └── Engineering                ← VP + 5 sub-depts, two with deeper nesting
 *       ├── Backend                ← Platform, API, Search
 *       ├── Frontend
 *       ├── Data Platform
 *       ├── DevOps / SRE
 *       └── Quality
 *   └── Sales                      ← VP + 4 sub-depts, Enterprise nested 3-deep
 *       ├── Enterprise → APAC, EMEA, NA
 *       ├── SMB
 *       ├── BDR / Inbound
 *       └── Customer Success → Onboarding, Retention
 *   └── Marketing                  ← VP + 4 sub-depts
 *       ├── Content
 *       ├── Demand Gen
 *       ├── Brand
 *       └── Product Marketing
 *   └── Operations                 ← Head + 4 sub-depts
 *   └── People (HR)                ← CHRO + 3 sub-depts
 *   └── Finance                    ← VP + 3 sub-depts
 *   └── Legal                      ← VP + 2 sub-depts
 *
 * Total: 9 top-level depts + 25 leaf depts (some 2-deep, some 3-deep).
 *
 * Users:
 *   - Org-level super_admin: CEO, CTO, COO, CHRO         (4)
 *   - Org-level admin:        VPs and chiefs of staff     (12)
 *   - Org-level member:       everyone else               (~134)
 *
 *   Per-department roles:
 *   - dept_head:  the named head of that dept
 *   - manager:    sub-dept lead or team manager
 *   - member:     individual contributor
 *
 * All users use @seed.reattend.local (RFC-reserved .local TLD).
 * Shared password lives in TEST_LOGIN_PASSWORD env var on the droplet.
 *
 * Idempotent. Re-runnable with --reset.
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

// ─── Name pools ──────────────────────────────────────────────────────────
// Wide pools so we can generate ~150 distinct emails. Each user gets a
// (city, region) tag for variety in titles even though departments are
// functional, not regional.

interface NamePool { city: string; names: string[][] }

const POOL_BENGALURU: NamePool = { city: 'Bengaluru', names: [
  ['Karthik', 'Iyer'], ['Lakshmi', 'Ramaswamy'], ['Aravind', 'Subramanian'], ['Meera', 'Krishnan'],
  ['Suresh', 'Gowda'], ['Bhavana', 'Hegde'], ['Naveen', 'Bhat'], ['Anjali', 'Acharya'],
  ['Arvind', 'Rao'], ['Deepika', 'Shenoy'], ['Pranav', 'Pai'], ['Sushma', 'Nair'],
  ['Ramya', 'Menon'], ['Tarun', 'Krishnamurthy'], ['Kavitha', 'Balaji'], ['Manoj', 'Sundaram'],
  ['Sruthi', 'Venkatesan'], ['Hari', 'Anantharaman'], ['Sridhar', 'Iyengar'], ['Karan', 'Padmanabhan'],
  ['Divya', 'Srinivasan'], ['Vivek', 'Murthy'], ['Pooja', 'Kamath'], ['Ramesh', 'Bhat'],
  ['Sneha', 'Shenoy'], ['Vinod', 'Rao'], ['Nandini', 'Iyer'], ['Sandeep', 'Nayak'],
  ['Lalitha', 'Acharya'], ['Mahesh', 'Bhat'], ['Anitha', 'Pai'], ['Krishna', 'Hegde'],
  ['Shanti', 'Rao'], ['Prakash', 'Kulkarni'], ['Nithya', 'Murthy'], ['Sumanth', 'Joshi'],
  ['Vidya', 'Bhat'], ['Anand', 'Krishnan'], ['Geetha', 'Iyer'], ['Surya', 'Reddy'],
]}
const POOL_MUMBAI: NamePool = { city: 'Mumbai', names: [
  ['Rohan', 'Deshpande'], ['Aditi', 'Joshi'], ['Kunal', 'Patil'], ['Snehal', 'Kulkarni'],
  ['Ishaan', 'Mehta'], ['Diya', 'Shah'], ['Aniket', 'Rao'], ['Pooja', 'Bhosale'],
  ['Sameer', 'Gokhale'], ['Vaidehi', 'Karandikar'], ['Tushar', 'Phadnis'], ['Manasi', 'Pawar'],
  ['Saurabh', 'Chitnis'], ['Rashmi', 'Apte'], ['Ketan', 'Joglekar'], ['Tanvi', 'Sathe'],
  ['Aaditya', 'Naik'], ['Sonali', 'Marathe'], ['Hrishikesh', 'Limaye'], ['Shruti', 'Bapat'],
  ['Mihir', 'Vora'], ['Tarini', 'Desai'], ['Aniruddh', 'Trivedi'], ['Krutika', 'Sheth'],
  ['Yash', 'Modi'], ['Kavya', 'Patel'], ['Rohit', 'Mehta'], ['Smita', 'Shah'],
  ['Ajay', 'Gupta'], ['Megha', 'Joshi'], ['Nilesh', 'Kulkarni'], ['Anushka', 'Naik'],
  ['Parth', 'Vakil'], ['Trupti', 'Pendse'], ['Vishal', 'Karnik'], ['Pallavi', 'Ranade'],
  ['Mandar', 'Athavale'], ['Aishwarya', 'Bhatkhande'], ['Nishant', 'Doshi'], ['Sanika', 'Phatak'],
]}
const POOL_DELHI: NamePool = { city: 'Gurugram', names: [
  ['Arjun', 'Sharma'], ['Priya', 'Kapoor'], ['Vikram', 'Singh'], ['Neha', 'Verma'],
  ['Rahul', 'Chopra'], ['Pooja', 'Aggarwal'], ['Aman', 'Khurana'], ['Riya', 'Malhotra'],
  ['Siddharth', 'Tandon'], ['Shreya', 'Bhalla'], ['Karan', 'Gill'], ['Sneha', 'Bedi'],
  ['Aditya', 'Bhardwaj'], ['Tanisha', 'Sethi'], ['Yash', 'Anand'], ['Aarushi', 'Khanna'],
  ['Devansh', 'Goyal'], ['Mansi', 'Dhawan'], ['Ishan', 'Bhatia'], ['Niharika', 'Saxena'],
  ['Akshay', 'Nanda'], ['Tanya', 'Wadhwa'], ['Pranav', 'Sondhi'], ['Bhavya', 'Suri'],
  ['Lavanya', 'Mahajan'], ['Mohit', 'Aneja'], ['Saumya', 'Talwar'], ['Harsh', 'Bhasin'],
  ['Ira', 'Sehgal'], ['Pulkit', 'Lamba'], ['Ananya', 'Bakshi'], ['Sahil', 'Vohra'],
  ['Tara', 'Ahuja'], ['Veer', 'Mahindra'], ['Roshni', 'Khosla'], ['Kabir', 'Bhandari'],
  ['Avni', 'Sapra'], ['Dhruv', 'Tuli'], ['Mira', 'Rastogi'], ['Aarav', 'Chadha'],
]}
const POOL_KOLKATA: NamePool = { city: 'Kolkata', names: [
  ['Aritra', 'Sengupta'], ['Priya', 'Chatterjee'], ['Ananya', 'Ghosh'], ['Soumya', 'Banerjee'],
  ['Indrajit', 'Bose'], ['Rituparna', 'Dasgupta'], ['Debanjan', 'Mukherjee'], ['Riya', 'Saha'],
  ['Subhomoy', 'Roy'], ['Tanushree', 'Dutta'], ['Arnab', 'Bhattacharya'], ['Mahua', 'Pal'],
  ['Sandip', 'Mitra'], ['Paromita', 'Ray'], ['Aniket', 'Basu'], ['Sayantani', 'Choudhury'],
  ['Diptangshu', 'Goswami'], ['Antara', 'Kar'], ['Snehasish', 'Roy'], ['Madhumita', 'Sen'],
  ['Tirtharaj', 'Das'], ['Kasturi', 'Pal'], ['Sourav', 'Lahiri'], ['Bidisha', 'Bhowmick'],
  ['Hiranmoy', 'Sinha'], ['Devjani', 'Chowdhury'], ['Anirban', 'Sarkar'], ['Moushumi', 'Dasgupta'],
  ['Ujjwal', 'Bose'], ['Krishanu', 'Mitra'], ['Satarupa', 'Banerjee'], ['Surya', 'Ghosh'],
  ['Indrani', 'Dey'], ['Saptarshi', 'Roy'], ['Lopamudra', 'Pal'], ['Abhirup', 'Bhowmik'],
  ['Mrinmoyee', 'Saha'], ['Bivas', 'Chatterjee'], ['Jayashree', 'Mukherjee'], ['Anasuya', 'Ray'],
]}

const POOLS = [POOL_BENGALURU, POOL_MUMBAI, POOL_DELHI, POOL_KOLKATA]
let poolCursor = 0

function nextName(): { first: string; last: string; city: string } {
  // Round-robin across pools so the directory looks geographically distributed.
  for (let attempts = 0; attempts < POOLS.length * 50; attempts++) {
    const pool = POOLS[poolCursor % POOLS.length]
    poolCursor++
    if (pool.names.length === 0) continue
    const [first, last] = pool.names.shift()!
    return { first, last, city: pool.city }
  }
  // Should never happen if pools are sized appropriately.
  throw new Error('Name pool exhausted — expand the regional pools.')
}

interface SeedUser {
  id: string
  email: string
  name: string
  city: string
  orgRole: 'super_admin' | 'admin' | 'member'
  title: string
  // Department this user belongs to (deepest-leaf for ICs, the dept they
  // lead for heads, the sub-dept for managers).
  deptPath: string[]      // e.g. ['Engineering', 'Backend', 'Platform']
  deptRole: 'dept_head' | 'manager' | 'member'
}

const roster: SeedUser[] = []

function makeUser(opts: {
  orgRole: SeedUser['orgRole']
  title: string
  deptPath: string[]
  deptRole: SeedUser['deptRole']
  reusableEmail?: string  // for the C-suite where we know exact emails up front
  reusableName?: { first: string; last: string; city: string }
}): SeedUser {
  const n = opts.reusableName || nextName()
  const baseSlug = `${slugify(n.first)}.${slugify(n.last)}`
  let email = opts.reusableEmail || `${baseSlug}@${SEED_EMAIL_DOMAIN}`
  // Defensive: if a name collision ever happened across pools, suffix with a number.
  let i = 2
  while (roster.some((u) => u.email === email)) {
    email = `${baseSlug}${i}@${SEED_EMAIL_DOMAIN}`
    i++
  }
  const u: SeedUser = {
    id: uuid(), email, name: `${n.first} ${n.last}`, city: n.city,
    orgRole: opts.orgRole, title: opts.title,
    deptPath: opts.deptPath, deptRole: opts.deptRole,
  }
  roster.push(u)
  return u
}

// ─── Department tree ─────────────────────────────────────────────────────
// Define the entire org tree as nested data, then walk it.

interface DeptSpec {
  name: string
  kind?: string          // 'Department' | 'Team' etc. for display
  description?: string
  // The named head's title (e.g. "VP Engineering" vs "Director of Quality")
  headTitle: string
  // How many ICs to seed at THIS level (0 if all ICs live in sub-depts)
  icCount: number
  icTitle: string        // e.g. "Backend Engineer" — title each IC gets
  managers?: { count: number; title: string }  // optional middle layer at THIS level
  children?: DeptSpec[]
}

const TREE: DeptSpec[] = [
  {
    name: 'Engineering',
    headTitle: 'VP, Engineering',
    icCount: 0,
    icTitle: 'Software Engineer',
    children: [
      {
        name: 'Backend', headTitle: 'Director, Backend', icCount: 0, icTitle: 'Backend Engineer',
        children: [
          { name: 'Platform', headTitle: 'Engineering Manager, Platform', icCount: 4, icTitle: 'Platform Engineer' },
          { name: 'API', headTitle: 'Engineering Manager, API', icCount: 3, icTitle: 'API Engineer' },
          { name: 'Search', headTitle: 'Engineering Manager, Search', icCount: 3, icTitle: 'Search Engineer' },
        ],
      },
      { name: 'Frontend', headTitle: 'Director, Frontend', icCount: 7, icTitle: 'Frontend Engineer',
        managers: { count: 1, title: 'Engineering Manager, Frontend' } },
      { name: 'Data Platform', headTitle: 'Director, Data', icCount: 5, icTitle: 'Data Engineer',
        managers: { count: 1, title: 'Engineering Manager, Data' } },
      { name: 'DevOps & SRE', headTitle: 'Head of SRE', icCount: 4, icTitle: 'Site Reliability Engineer' },
      { name: 'Quality', headTitle: 'Head of QA', icCount: 4, icTitle: 'QA Engineer' },
    ],
  },
  {
    name: 'Sales',
    headTitle: 'VP, Sales',
    icCount: 0,
    icTitle: 'Sales',
    children: [
      {
        name: 'Enterprise', headTitle: 'Director, Enterprise Sales', icCount: 0, icTitle: 'Enterprise AE',
        children: [
          { name: 'APAC', headTitle: 'Regional Manager, APAC', icCount: 3, icTitle: 'Enterprise AE — APAC' },
          { name: 'EMEA', headTitle: 'Regional Manager, EMEA', icCount: 3, icTitle: 'Enterprise AE — EMEA' },
          { name: 'North America', headTitle: 'Regional Manager, NA', icCount: 3, icTitle: 'Enterprise AE — NA' },
        ],
      },
      { name: 'SMB', headTitle: 'Director, SMB Sales', icCount: 7, icTitle: 'SMB Account Executive',
        managers: { count: 1, title: 'Sales Manager, SMB' } },
      { name: 'BDR / Inbound', headTitle: 'Head of BDR', icCount: 5, icTitle: 'Business Development Rep' },
      {
        name: 'Customer Success', headTitle: 'Director, Customer Success', icCount: 0, icTitle: 'CSM',
        children: [
          { name: 'Onboarding', headTitle: 'Manager, Onboarding', icCount: 3, icTitle: 'Onboarding Specialist' },
          { name: 'Retention', headTitle: 'Manager, Retention', icCount: 4, icTitle: 'Retention CSM' },
        ],
      },
    ],
  },
  {
    name: 'Marketing',
    headTitle: 'VP, Marketing',
    icCount: 0,
    icTitle: 'Marketing',
    children: [
      { name: 'Content', headTitle: 'Head of Content', icCount: 4, icTitle: 'Content Marketer' },
      { name: 'Demand Generation', headTitle: 'Head of Demand Gen', icCount: 4, icTitle: 'Demand Gen Specialist' },
      { name: 'Brand', headTitle: 'Head of Brand', icCount: 3, icTitle: 'Brand Designer' },
      { name: 'Product Marketing', headTitle: 'Head of Product Marketing', icCount: 3, icTitle: 'Product Marketing Manager' },
    ],
  },
  {
    name: 'Operations',
    headTitle: 'Head of Operations',
    icCount: 0,
    icTitle: 'Ops',
    children: [
      { name: 'Logistics', headTitle: 'Logistics Manager', icCount: 5, icTitle: 'Logistics Specialist' },
      { name: 'Procurement', headTitle: 'Procurement Manager', icCount: 4, icTitle: 'Procurement Analyst' },
      { name: 'Quality Assurance', headTitle: 'Quality Manager', icCount: 3, icTitle: 'QA Auditor' },
      { name: 'Customer Operations', headTitle: 'Customer Ops Manager', icCount: 5, icTitle: 'Customer Ops Specialist' },
    ],
  },
  {
    name: 'People',
    headTitle: 'Director, People Ops',  // CHRO sits at org level, this is the operational head
    icCount: 0,
    icTitle: 'People',
    children: [
      { name: 'Recruiting', headTitle: 'Head of Recruiting', icCount: 5, icTitle: 'Talent Partner' },
      { name: 'Learning & Development', headTitle: 'L&D Lead', icCount: 3, icTitle: 'L&D Specialist' },
      { name: 'Compensation & Benefits', headTitle: 'Comp & Benefits Lead', icCount: 3, icTitle: 'Comp Analyst' },
    ],
  },
  {
    name: 'Finance',
    headTitle: 'VP, Finance',
    icCount: 0,
    icTitle: 'Finance',
    children: [
      { name: 'Accounting', headTitle: 'Controller', icCount: 4, icTitle: 'Accountant' },
      { name: 'FP&A', headTitle: 'FP&A Director', icCount: 3, icTitle: 'Financial Analyst' },
      { name: 'Treasury', headTitle: 'Treasurer', icCount: 2, icTitle: 'Treasury Analyst' },
    ],
  },
  {
    name: 'Legal',
    headTitle: 'VP, Legal & Compliance',
    icCount: 0,
    icTitle: 'Legal',
    children: [
      { name: 'Compliance', headTitle: 'Head of Compliance', icCount: 2, icTitle: 'Compliance Officer' },
      { name: 'Contracts', headTitle: 'Head of Contracts', icCount: 1, icTitle: 'Contracts Manager' },
    ],
  },
]

// ─── Step 1: nuke previous seed ──────────────────────────────────────────
// Order matters: many tables reference users with ON DELETE NO ACTION
// (subscriptions, workspaces.created_by, departments.head_user_id, ...).
// We defer FK checks for the duration of the wipe so we can drop rows in
// any order; SQLite re-validates at COMMIT time.
const existingOrg = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(ORG_SLUG) as { id: string } | undefined
const seedUsers = db.prepare('SELECT id FROM users WHERE email LIKE ?').all(`%@${SEED_EMAIL_DOMAIN}`) as Array<{ id: string }>

if (existingOrg || seedUsers.length > 0) {
  if (!RESET) {
    console.log(`Org "${ORG_SLUG}" or stale seed users already exist. Pass --reset to nuke + rebuild.`)
    process.exit(0)
  }
  console.log(`Wiping existing org + ${seedUsers.length} seed users…`)

  const wipe = db.transaction(() => {
    db.pragma('defer_foreign_keys = ON')

    // Drop the org first — cascades through organization_members,
    // departments, department_members, workspace_org_links, agents, etc.
    if (existingOrg) {
      db.prepare('DELETE FROM organizations WHERE id = ?').run(existingOrg.id)
    }

    // Now collect every workspace the seed users created (they might be
    // personal workspaces or HQ-created team workspaces). Cascade-delete
    // wipes workspace_members, projects, records, etc. that hang off them.
    const seedIds = seedUsers.map((u) => u.id)
    if (seedIds.length > 0) {
      const placeholders = seedIds.map(() => '?').join(',')
      const wsToDrop = db.prepare(
        `SELECT id FROM workspaces WHERE created_by IN (${placeholders})`
      ).all(...seedIds) as Array<{ id: string }>
      for (const w of wsToDrop) {
        db.prepare('DELETE FROM workspaces WHERE id = ?').run(w.id)
      }

      // Subscriptions, workspace_members rows for the seed users.
      // Both have ON DELETE CASCADE on user_id — but the user delete itself
      // is what would fire CASCADE. Doing them explicitly here makes the
      // wipe transactional and observable.
      db.prepare(`DELETE FROM subscriptions WHERE user_id IN (${placeholders})`).run(...seedIds)
      db.prepare(`DELETE FROM workspace_members WHERE user_id IN (${placeholders})`).run(...seedIds)

      // Finally the users.
      db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...seedIds)
    }
  })
  wipe()
  console.log('Wipe complete.')
}

// ─── Step 2: roster — C-suite first ──────────────────────────────────────
// CEO is super_admin and we use them as the org's `created_by` FK. The
// other three C-suite members are also super_admin. They're assigned to
// the synthetic "Office of the CEO" department.

const ceo = makeUser({
  orgRole: 'super_admin',
  title: 'Chief Executive Officer',
  deptPath: ['Office of the CEO'],
  deptRole: 'dept_head',
  reusableName: { first: 'Vikrant', last: 'Iyer', city: 'Bengaluru' },
})
const cto = makeUser({
  orgRole: 'super_admin', title: 'Chief Technology Officer',
  deptPath: ['Office of the CEO'], deptRole: 'member',
  reusableName: { first: 'Anika', last: 'Patel', city: 'Bengaluru' },
})
const coo = makeUser({
  orgRole: 'super_admin', title: 'Chief Operating Officer',
  deptPath: ['Office of the CEO'], deptRole: 'member',
  reusableName: { first: 'Rajesh', last: 'Khanna', city: 'Bengaluru' },
})
const chro = makeUser({
  orgRole: 'super_admin', title: 'Chief Human Resources Officer',
  deptPath: ['Office of the CEO'], deptRole: 'member',
  reusableName: { first: 'Sundari', last: 'Pillai', city: 'Bengaluru' },
})

// Chiefs of staff / EAs — round out the office of the CEO.
makeUser({ orgRole: 'admin', title: 'Chief of Staff', deptPath: ['Office of the CEO'], deptRole: 'member' })
makeUser({ orgRole: 'admin', title: 'Director of Investor Relations', deptPath: ['Office of the CEO'], deptRole: 'member' })
makeUser({ orgRole: 'admin', title: 'Director of Communications', deptPath: ['Office of the CEO'], deptRole: 'member' })
makeUser({ orgRole: 'member', title: 'Executive Assistant to CEO', deptPath: ['Office of the CEO'], deptRole: 'member' })

// ─── Step 3: walk the dept tree, generating users at each level ──────────
function populateDept(spec: DeptSpec, parentPath: string[]) {
  const path = [...parentPath, spec.name]
  const isTopLevel = parentPath.length === 0

  // The named head: org-role admin if top-level (VPs), else member.
  makeUser({
    orgRole: isTopLevel ? 'admin' : 'member',
    title: spec.headTitle,
    deptPath: path,
    deptRole: 'dept_head',
  })

  // Optional middle layer of managers.
  if (spec.managers) {
    for (let i = 0; i < spec.managers.count; i++) {
      makeUser({
        orgRole: 'member',
        title: spec.managers.title,
        deptPath: path,
        deptRole: 'manager',
      })
    }
  }

  // ICs at this level.
  for (let i = 0; i < spec.icCount; i++) {
    makeUser({ orgRole: 'member', title: spec.icTitle, deptPath: path, deptRole: 'member' })
  }

  // Recurse into children.
  if (spec.children) {
    for (const child of spec.children) populateDept(child, path)
  }
}

for (const top of TREE) populateDept(top, [])

console.log(`Built roster: ${roster.length} users across ${TREE.length + 1} top-level depts`)

// ─── Step 4: insert all users + their personal infra ─────────────────────
const insertUser = db.prepare(`
  INSERT INTO users (id, email, name, created_at)
  VALUES (?, ?, ?, ?)
`)
const insertWorkspace = db.prepare(`
  INSERT INTO workspaces (id, name, type, created_by, created_at)
  VALUES (?, ?, ?, ?, ?)
`)
const insertWorkspaceMember = db.prepare(`
  INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
  VALUES (?, ?, ?, ?, ?)
`)
const insertSubscription = db.prepare(`
  INSERT INTO subscriptions (id, user_id, plan_key, status, tier, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)
const insertProject = db.prepare(`
  INSERT INTO projects (id, workspace_id, name, description, is_default, color, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const insertManyUsers = db.transaction((users: SeedUser[]) => {
  for (const u of users) {
    const ts = now()
    insertUser.run(u.id, u.email, u.name, ts)
    const wsId = uuid()
    insertWorkspace.run(wsId, 'Personal', 'personal', u.id, ts)
    insertWorkspaceMember.run(uuid(), wsId, u.id, 'owner', ts)
    insertProject.run(uuid(), wsId, 'Unassigned', 'Memories not yet assigned to a project', 1, '#94a3b8', ts, ts)
    insertSubscription.run(uuid(), u.id, 'normal', 'active', 'professional', ts, ts)
  }
})
insertManyUsers(roster)
console.log(`Inserted ${roster.length} users.`)

// ─── Step 5: org row ──────────────────────────────────────────────────────
const realUser = db.prepare('SELECT id FROM users WHERE email NOT LIKE ? ORDER BY created_at DESC LIMIT 1').get(`%@${SEED_EMAIL_DOMAIN}`) as { id: string } | undefined
const orgId = uuid()
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

// ─── Step 6: org membership ──────────────────────────────────────────────
const insertOrgMember = db.prepare(`
  INSERT INTO organization_members (id, organization_id, user_id, role, status, title, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
for (const u of roster) {
  insertOrgMember.run(uuid(), orgId, u.id, u.orgRole, 'active', u.title, now(), now())
}
console.log(`Inserted ${roster.length} organization_members.`)

// ─── Step 7: insert the dept tree, recording id-by-path ─────────────────
const deptIdByPath = new Map<string, string>()
const insertDept = db.prepare(`
  INSERT INTO departments (id, organization_id, parent_id, kind, name, slug, description, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

function insertDeptRow(name: string, parentPath: string[], kind: string, description: string) {
  const pathKey = [...parentPath, name].join(' / ')
  const parentId = parentPath.length === 0 ? null : deptIdByPath.get(parentPath.join(' / ')) || null
  const id = uuid()
  insertDept.run(id, orgId, parentId, kind, name, slugify(pathKey), description, now(), now())
  deptIdByPath.set(pathKey, id)
}

// Synthetic Office of the CEO at the top.
insertDeptRow('Office of the CEO', [], 'Department', 'C-suite + chiefs of staff')

function walkAndInsert(spec: DeptSpec, parentPath: string[]) {
  insertDeptRow(spec.name, parentPath, spec.kind || 'Department', spec.description || '')
  if (spec.children) {
    for (const child of spec.children) walkAndInsert(child, [...parentPath, spec.name])
  }
}
for (const top of TREE) walkAndInsert(top, [])
console.log(`Inserted ${deptIdByPath.size} departments (1 synthetic + ${deptIdByPath.size - 1} from tree).`)

// ─── Step 8: department membership ───────────────────────────────────────
const insertDeptMember = db.prepare(`
  INSERT INTO department_members (id, department_id, organization_id, user_id, role, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`)
for (const u of roster) {
  const deptId = deptIdByPath.get(u.deptPath.join(' / '))
  if (!deptId) {
    console.warn(`No dept found for ${u.email} at path ${u.deptPath.join(' / ')}`)
    continue
  }
  insertDeptMember.run(uuid(), deptId, orgId, u.id, u.deptRole, now())
}
console.log(`Inserted ${roster.length} department_members.`)

// ─── Step 9: workspaces — one per top-level dept + an org-wide ──────────
const insertOrgLink = db.prepare(`
  INSERT INTO workspace_org_links (workspace_id, organization_id, department_id, visibility, created_at)
  VALUES (?, ?, ?, ?, ?)
`)

// Org-wide workspace (everyone is a member). Holds memories for company-wide content.
const orgWideWsId = uuid()
insertWorkspace.run(orgWideWsId, 'Acme — All Hands', 'team', ceo.id, now())
insertOrgLink.run(orgWideWsId, orgId, null, 'org_wide', now())
insertProject.run(uuid(), orgWideWsId, 'Unassigned', 'Default project', 1, '#94a3b8', now(), now())
for (const u of roster) {
  let wsRole: 'owner' | 'admin' | 'member' = 'member'
  if (u.orgRole === 'super_admin') wsRole = 'owner'
  else if (u.orgRole === 'admin') wsRole = 'admin'
  insertWorkspaceMember.run(uuid(), orgWideWsId, u.id, wsRole, now())
}

// One workspace per top-level dept (8 of them). Members of that dept tree
// are all auto-added; HQ stays a member of all so they can read across.
for (const top of TREE) {
  const wsId = uuid()
  const deptId = deptIdByPath.get(top.name)!
  insertWorkspace.run(wsId, `${top.name}`, 'team', ceo.id, now())
  insertOrgLink.run(wsId, orgId, deptId, 'department_only', now())
  insertProject.run(uuid(), wsId, 'Unassigned', 'Default project', 1, '#94a3b8', now(), now())

  // Find every roster member whose deptPath starts with this top dept.
  for (const u of roster) {
    const isInTree = u.deptPath[0] === top.name
    const isHQ = u.deptPath[0] === 'Office of the CEO'
    if (!isInTree && !isHQ) continue
    let wsRole: 'owner' | 'admin' | 'member' = 'member'
    if (u.orgRole === 'super_admin') wsRole = 'owner'
    else if (u.deptRole === 'dept_head') wsRole = 'admin'
    insertWorkspaceMember.run(uuid(), wsId, u.id, wsRole, now())
  }
}
console.log(`Inserted ${TREE.length + 1} team workspaces (1 org-wide + ${TREE.length} per-dept).`)

// ─── Step 10: print roster summary for STAGING.md ─────────────────────────
console.log(`\n✅ Seeded "${ORG_NAME}" (${ORG_SLUG}) with ${roster.length} users.`)
console.log(`   ${TREE.length + 1} top-level departments, ${deptIdByPath.size} departments total.`)
console.log(`   ${TREE.length + 1} team workspaces.`)

const byDept: Record<string, SeedUser[]> = {}
for (const u of roster) {
  const key = u.deptPath.join(' / ')
  if (!byDept[key]) byDept[key] = []
  byDept[key].push(u)
}

console.log('\n─── ROSTER (paste into STAGING.md) ───')
for (const path of Object.keys(byDept).sort()) {
  console.log(`\n## ${path}`)
  // Sort users within a dept: dept_head first, then managers, then members.
  const order = { dept_head: 0, manager: 1, member: 2 }
  const sorted = [...byDept[path]].sort((a, b) => order[a.deptRole] - order[b.deptRole])
  for (const u of sorted) {
    const tag = u.orgRole === 'super_admin' ? '★ super_admin'
              : u.orgRole === 'admin'       ? '◆ admin'
              :                               '·'
    console.log(`  ${u.email.padEnd(54)} ${tag.padEnd(15)} — ${u.title} (${u.city})`)
  }
}

db.close()
