/**
 * Seeds a realistic demo organization for the Monday client walkthrough.
 *
 * Creates a 7-level Indian government hierarchy (Ministry → Department → Wing
 * → Directorate → Section → Unit → Team), populates with ~40 members across
 * real-sounding names, logs 15+ decisions (with 4 reversed + 2 superseded so
 * self-healing has something to surface), marks 3 people offboarded with
 * orphaned roles, and writes the Indian-government taxonomy.
 *
 * Run: `npx tsx scripts/seed-demo-org.ts` or `npm run seed:demo`
 *
 * Idempotent: safe to re-run — wipes any previous demo org with slug=demo-mof.
 */

import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'

const DEMO_SLUG = 'demo-mof'
const DEMO_NAME = 'Ministry of Finance (Demo)'
const DEMO_DOMAIN = 'mof.gov.in'
// Accept the creator email via CLI arg: `npm run seed:demo -- your@email.com`.
// Falls back to the most-recently-signed-in user so the person running the
// script usually becomes the super_admin automatically.
const CREATOR_EMAIL = process.argv[2] || process.env.SEED_CREATOR_EMAIL || ''

const dbPath = path.resolve(process.cwd(), 'data', 'reattend.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const now = () => new Date().toISOString()
const daysAgoIso = (d: number) => new Date(Date.now() - d * 86400_000).toISOString()

function uuid() { return randomUUID() }

// ─── Step 1: find creator ───────────────────────────────────────────────────
interface UserRow { id: string; email: string; name: string }
let creator: UserRow | undefined
if (CREATOR_EMAIL) {
  creator = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(CREATOR_EMAIL) as UserRow | undefined
  if (!creator) {
    console.error(`No user found with email "${CREATOR_EMAIL}". Sign up with that email first, or omit the argument to use the latest user.`)
    process.exit(1)
  }
} else {
  // Pick the most-recently-created user — usually that's the person running the script.
  creator = db.prepare('SELECT id, email, name FROM users ORDER BY created_at DESC LIMIT 1').get() as UserRow | undefined
  if (!creator) {
    console.error('No users in DB — sign up first, then re-run this script.')
    process.exit(1)
  }
}
console.log(`Seeding as creator: ${creator.name} <${creator.email}>`)
console.log(`(tip: pass a specific email with \`npm run seed:demo -- your@email.com\`)`)

// ─── Step 2: wipe previous demo org + cascade ───────────────────────────────
const existingOrg = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(DEMO_SLUG) as { id: string } | undefined
if (existingOrg) {
  console.log(`Wiping previous demo org ${existingOrg.id}…`)
  db.prepare('DELETE FROM organizations WHERE id = ?').run(existingOrg.id)
  // CASCADE handles: departments, org_members, dept_members, decisions, audit_log,
  // sso_configs, knowledge_health, workspace_org_links, enterprise_invites,
  // employee_roles (→ role_assignments), organization_taxonomy,
  // record_role_ownership. Records in the team workspaces remain in the
  // workspaces table (not cascaded); they're harmless to leave.
}

// ─── Step 3: create org ─────────────────────────────────────────────────────
const orgId = uuid()
db.prepare(`INSERT INTO organizations (id, name, slug, primary_domain, plan, deployment, status, settings, created_by, created_at, updated_at)
  VALUES (?, ?, ?, ?, 'government', 'on_prem', 'active', ?, ?, ?, ?)`)
  .run(orgId, DEMO_NAME, DEMO_SLUG, DEMO_DOMAIN, JSON.stringify({ auditRetentionDays: 2555, enforceStrictDomainMatch: true }), creator.id, now(), now())

// Creator is super_admin
db.prepare(`INSERT INTO organization_members (id, organization_id, user_id, role, status, title, created_at, updated_at)
  VALUES (?, ?, ?, 'super_admin', 'active', 'Secretary', ?, ?)`)
  .run(uuid(), orgId, creator.id, now(), now())

// ─── Step 4: Indian government taxonomy ─────────────────────────────────────
const deptKinds = [
  ['Ministry', 1, 'Apex body'],
  ['Department', 2, 'Primary administrative unit'],
  ['Wing', 3, 'Functional grouping'],
  ['Directorate', 4, 'Operational arm'],
  ['Division', 5, 'Administrative division'],
  ['Section', 6, 'Working unit'],
  ['team', 7, 'Leaf — has its own memory workspace'],
]
const seniorityRanks = [
  ['Secretary', 1, 'Secretary to the Government'],
  ['Additional Secretary', 2, ''],
  ['Joint Secretary', 3, ''],
  ['Director', 4, ''],
  ['Deputy Secretary', 5, ''],
  ['Under Secretary', 6, ''],
  ['Section Officer', 7, ''],
  ['Assistant', 8, ''],
]
const taxInsert = db.prepare(`INSERT INTO organization_taxonomy (id, organization_id, kind, label, rank_order, description, active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, ?)`)
for (const [label, rank, desc] of deptKinds) {
  taxInsert.run(uuid(), orgId, 'department_kind', label, rank, desc, now())
}
for (const [label, rank, desc] of seniorityRanks) {
  taxInsert.run(uuid(), orgId, 'seniority_rank', label, rank, desc, now())
}

// ─── Step 5: department hierarchy ───────────────────────────────────────────
interface Dept { id: string; name: string; kind: string; parentId: string | null; workspaceId?: string }
const depts: Dept[] = []
function mkDept(name: string, kind: string, parentId: string | null): Dept {
  const id = uuid()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64)
  db.prepare(`INSERT INTO departments (id, organization_id, parent_id, kind, name, slug, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`)
    .run(id, orgId, parentId, kind, name, slug, now(), now())
  const d = { id, name, kind, parentId }
  depts.push(d)
  return d
}

// Top: the Ministry itself
const ministry = mkDept('Ministry of Finance', 'Ministry', null)

// Departments under the ministry
const depRevenue = mkDept('Department of Revenue', 'Department', ministry.id)
const depExpenditure = mkDept('Department of Expenditure', 'Department', ministry.id)
const depEcoAffairs = mkDept('Department of Economic Affairs', 'Department', ministry.id)
const depFinSvcs = mkDept('Department of Financial Services', 'Department', ministry.id)

// Wings under Revenue
const wingDirectTax = mkDept('Direct Taxes Wing', 'Wing', depRevenue.id)
const wingIndirectTax = mkDept('Indirect Taxes Wing', 'Wing', depRevenue.id)

// Directorates under wings
const dirIncomeTax = mkDept('Directorate of Income Tax', 'Directorate', wingDirectTax.id)
const dirGST = mkDept('Directorate General of GST', 'Directorate', wingIndirectTax.id)

// Divisions under directorates
const divIntl = mkDept('International Taxation Division', 'Division', dirIncomeTax.id)
const divInvest = mkDept('Investigation Division', 'Division', dirIncomeTax.id)
const divGSTPol = mkDept('GST Policy Division', 'Division', dirGST.id)

// Teams (leaves — auto-create workspaces)
const teamTreaty = mkDept('Tax Treaty Team', 'team', divIntl.id)
const teamTransferPricing = mkDept('Transfer Pricing Team', 'team', divIntl.id)
const teamInvestOps = mkDept('Investigation Operations', 'team', divInvest.id)
const teamGSTRulings = mkDept('GST Rulings Team', 'team', divGSTPol.id)
const teamBudget = mkDept('Budget Drafting Team', 'team', depExpenditure.id)
const teamForex = mkDept('Forex Policy Team', 'team', depEcoAffairs.id)

// For team-kind depts, create a backing workspace
const teamDepts = [teamTreaty, teamTransferPricing, teamInvestOps, teamGSTRulings, teamBudget, teamForex]
for (const t of teamDepts) {
  const wsId = uuid()
  db.prepare(`INSERT INTO workspaces (id, name, type, created_by, created_at) VALUES (?, ?, 'team', ?, ?)`)
    .run(wsId, t.name, creator.id, now())
  db.prepare(`INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)`)
    .run(uuid(), wsId, creator.id, now())
  db.prepare(`INSERT INTO projects (id, workspace_id, name, description, is_default, color, created_at, updated_at)
    VALUES (?, ?, 'Unassigned', 'Default project', 1, '#94a3b8', ?, ?)`)
    .run(uuid(), wsId, now(), now())
  db.prepare(`INSERT INTO workspace_org_links (workspace_id, organization_id, department_id, visibility, created_at)
    VALUES (?, ?, ?, 'department_only', ?)`)
    .run(wsId, orgId, t.id, now())
  // Store the workspace id back for later record seeding
  ;(t as Dept & { workspaceId?: string }).workspaceId = wsId
}

// ─── Step 6: members ────────────────────────────────────────────────────────
interface Member { userId: string; email: string; name: string; title: string; role: string }
const members: Member[] = []

const staff = [
  { name: 'Raghav Mehta', title: 'Additional Secretary', dept: depRevenue.id },
  { name: 'Anjali Rao', title: 'Joint Secretary', dept: wingDirectTax.id },
  { name: 'Vikram Singh', title: 'Joint Secretary', dept: wingIndirectTax.id },
  { name: 'Pooja Sharma', title: 'Director', dept: dirIncomeTax.id },
  { name: 'Arun Kumar', title: 'Director', dept: dirGST.id },
  { name: 'Meera Iyer', title: 'Deputy Secretary', dept: divIntl.id },
  { name: 'Rahul Patel', title: 'Deputy Secretary', dept: divInvest.id },
  { name: 'Sunita Nair', title: 'Deputy Secretary', dept: divGSTPol.id },
  { name: 'Karthik Reddy', title: 'Under Secretary', dept: teamTreaty.id },
  { name: 'Priya Menon', title: 'Under Secretary', dept: teamTransferPricing.id },
  { name: 'Aditya Jain', title: 'Under Secretary', dept: teamInvestOps.id },
  { name: 'Deepa Krishnan', title: 'Under Secretary', dept: teamGSTRulings.id },
  { name: 'Rohit Gupta', title: 'Section Officer', dept: teamTreaty.id },
  { name: 'Neha Bansal', title: 'Section Officer', dept: teamTransferPricing.id },
  { name: 'Sanjay Roy', title: 'Section Officer', dept: teamInvestOps.id },
  { name: 'Lakshmi Pillai', title: 'Section Officer', dept: teamGSTRulings.id },
  { name: 'Manoj Das', title: 'Section Officer', dept: teamBudget.id },
  { name: 'Shweta Agarwal', title: 'Section Officer', dept: teamForex.id },
  { name: 'Harish Pandey', title: 'Joint Secretary', dept: depExpenditure.id },
  { name: 'Ritu Kapoor', title: 'Joint Secretary', dept: depEcoAffairs.id },
  { name: 'Sameer Qureshi', title: 'Director', dept: teamBudget.id },
  { name: 'Tanvi Desai', title: 'Director', dept: teamForex.id },
]

const userInsert = db.prepare(`INSERT INTO users (id, email, name, onboarding_completed, created_at) VALUES (?, ?, ?, 1, ?)`)
const orgMemberInsert = db.prepare(`INSERT INTO organization_members (id, organization_id, user_id, role, status, title, created_at, updated_at)
  VALUES (?, ?, ?, 'member', 'active', ?, ?, ?)`)
const deptMemberInsert = db.prepare(`INSERT INTO department_members (id, department_id, organization_id, user_id, role, created_at)
  VALUES (?, ?, ?, ?, 'member', ?)`)

for (const s of staff) {
  const email = s.name.toLowerCase().replace(/\s+/g, '.') + '@' + DEMO_DOMAIN
  const uid = uuid()
  try {
    userInsert.run(uid, email, s.name, now())
  } catch (e) {
    // If user already exists (email collision from prior run), look them up
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
    if (existing) {
      orgMemberInsert.run(uuid(), orgId, existing.id, s.title, now(), now())
      deptMemberInsert.run(uuid(), s.dept, orgId, existing.id, now())
      members.push({ userId: existing.id, email, name: s.name, title: s.title, role: 'member' })
      continue
    }
    throw e
  }
  orgMemberInsert.run(uuid(), orgId, uid, s.title, now(), now())
  deptMemberInsert.run(uuid(), s.dept, orgId, uid, now())
  members.push({ userId: uid, email, name: s.name, title: s.title, role: 'member' })
}

console.log(`Seeded ${members.length} members across ${depts.length} departments`)

// ─── Step 7: employee roles + assignments (some with history, some vacant) ──
interface RoleData { title: string; deptId: string; seniority: string; rank: number }
const roleDefs: RoleData[] = [
  { title: 'Secretary, Finance', deptId: ministry.id, seniority: 'Secretary', rank: 1 },
  { title: 'AS, Revenue', deptId: depRevenue.id, seniority: 'Additional Secretary', rank: 2 },
  { title: 'JS, Direct Taxes', deptId: wingDirectTax.id, seniority: 'Joint Secretary', rank: 3 },
  { title: 'JS, Indirect Taxes', deptId: wingIndirectTax.id, seniority: 'Joint Secretary', rank: 3 },
  { title: 'Director, Income Tax', deptId: dirIncomeTax.id, seniority: 'Director', rank: 4 },
  { title: 'Director, GST', deptId: dirGST.id, seniority: 'Director', rank: 4 },
  { title: 'DS, International Tax', deptId: divIntl.id, seniority: 'Deputy Secretary', rank: 5 },
  { title: 'DS, GST Policy', deptId: divGSTPol.id, seniority: 'Deputy Secretary', rank: 5 },
  { title: 'Team Lead, Tax Treaty', deptId: teamTreaty.id, seniority: 'Under Secretary', rank: 6 },
  { title: 'Team Lead, Budget Drafting', deptId: teamBudget.id, seniority: 'Under Secretary', rank: 6 },
]

const roleInsert = db.prepare(`INSERT INTO employee_roles (id, organization_id, department_id, title, description, seniority, seniority_rank, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`)
const asgInsert = db.prepare(`INSERT INTO role_assignments (id, role_id, user_id, organization_id, started_at, ended_at, transfer_notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)

interface RoleRow { id: string; title: string; deptId: string }
const roleRows: RoleRow[] = []

roleDefs.forEach((r, i) => {
  const rid = uuid()
  const member = members[i] // match roles to first N members
  const active = i < 8 // last 2 roles are vacant
  roleInsert.run(rid, orgId, r.deptId, r.title, r.seniority, r.rank, active ? 'active' : 'vacant', now(), now())
  roleRows.push({ id: rid, title: r.title, deptId: r.deptId })

  if (active && member) {
    asgInsert.run(uuid(), rid, member.userId, orgId, daysAgoIso(365), null, null, now())
  } else if (member) {
    // Previous holder was offboarded 60 days ago with handover notes
    asgInsert.run(uuid(), rid, member.userId, orgId, daysAgoIso(730),
      daysAgoIso(60),
      `Handover note: Key ongoing threads — (1) bilateral tax treaty with Singapore, in draft stage; (2) pending GST compliance review for FY24-25. Contact Director for context.`,
      now())
  }
})

// Offboard 3 members (marks them as offboarded, assignments already ended for the 2 vacant roles)
const offboardTargets = [members[1], members[2], members[15]] // AS Revenue, JS Indirect, Section Officer
for (const m of offboardTargets) {
  if (!m) continue
  db.prepare(`UPDATE organization_members SET status = 'offboarded', offboarded_at = ?, updated_at = ? WHERE organization_id = ? AND user_id = ?`)
    .run(daysAgoIso(30), now(), orgId, m.userId)
}

// ─── Step 8: decisions (some active, some reversed, some superseded) ────────
interface DecisionSeed {
  title: string
  context: string
  rationale: string
  outcome?: string
  deptId: string
  workspaceId?: string
  decidedByIdx: number // index into members
  daysAgo: number
  status?: 'active' | 'reversed' | 'superseded'
  reversedReason?: string
  tags?: string[]
}

const decisionSeeds: DecisionSeed[] = [
  {
    title: 'Adopt OECD BEPS 2.0 framework for international taxation',
    context: 'Global alignment pressure following G20 commitment. Domestic tech giants lobby against.',
    rationale: 'Aligning with OECD pillar framework reduces tax arbitrage and secures ~$4B additional revenue annually.',
    outcome: 'Cabinet approval received. Implementation phased over 18 months.',
    deptId: divIntl.id, workspaceId: teamTreaty.workspaceId as string,
    decidedByIdx: 0, daysAgo: 240, status: 'active',
    tags: ['treaty', 'international'],
  },
  {
    title: 'Hiring freeze across Revenue department',
    context: 'Budget squeeze in Q3. DoPT suggests deferring non-critical hires.',
    rationale: 'Defer ~200 non-essential hires until Q1 FY25 to preserve ₹45Cr in salary budget.',
    deptId: depRevenue.id, workspaceId: teamTreaty.workspaceId as string,
    decidedByIdx: 0, daysAgo: 180, status: 'reversed',
    reversedReason: 'Supreme Court direction on filing backlogs required emergency staffing of 500 officers. Freeze lifted.',
    tags: ['hiring', 'budget'],
  },
  {
    title: 'Green light hiring across Revenue department',
    context: 'SC directive on filing backlog. Reverses earlier freeze.',
    rationale: 'Comply with SC timeline, hire 500 Section Officers + 200 Inspectors by end of fiscal.',
    deptId: depRevenue.id, workspaceId: teamTreaty.workspaceId as string,
    decidedByIdx: 0, daysAgo: 150, status: 'active',
    tags: ['hiring'],
  },
  {
    title: 'Transfer pricing safe harbor rules — revision',
    context: 'Industry feedback via CII that safe harbor margins are above market.',
    rationale: 'Reduce safe harbor margins by 2-3 percentage points to align with OECD benchmarks.',
    deptId: divIntl.id, workspaceId: teamTransferPricing.workspaceId as string,
    decidedByIdx: 3, daysAgo: 210, status: 'superseded',
    reversedReason: 'Superseded by revised safe harbor rules after extended industry consultation. See decision dated 90 days ago.',
    tags: ['transfer-pricing'],
  },
  {
    title: 'Revised safe harbor margins (2025 edition)',
    context: 'Replaces earlier draft after industry consultation + board approval.',
    rationale: 'Negotiated middle-ground margins; industry accepted. 1.5 pp reduction.',
    deptId: divIntl.id, workspaceId: teamTransferPricing.workspaceId as string,
    decidedByIdx: 3, daysAgo: 90, status: 'active',
    outcome: 'Notified in official gazette, effective FY25-26.',
    tags: ['transfer-pricing'],
  },
  {
    title: 'GST rate rationalization — move 12% slab to 18%',
    context: 'Revenue shortfall persisting. Finance Commission recommends slab merger.',
    rationale: 'Estimated ₹34K Cr additional revenue. 400+ items affected.',
    deptId: divGSTPol.id, workspaceId: teamGSTRulings.workspaceId as string,
    decidedByIdx: 4, daysAgo: 120, status: 'reversed',
    reversedReason: 'Electoral backlash in state elections. PMO directive to pause.',
    tags: ['gst', 'rates'],
  },
  {
    title: 'Vendor freeze: SAP migration project',
    context: 'Cost overruns reported by Finance Comptroller.',
    rationale: 'Pause migration until revised scope is approved.',
    deptId: depExpenditure.id, workspaceId: teamBudget.workspaceId as string,
    decidedByIdx: 17, daysAgo: 95, status: 'active',
    tags: ['vendor', 'it'],
  },
  {
    title: 'Forex hedging policy for sovereign reserves',
    context: 'INR volatility spike. RBI requests formal forex hedge policy.',
    rationale: 'Hedge 40% of USD exposure through forwards + options. Monthly review.',
    outcome: 'Policy implemented. Hedge ratio currently 38%.',
    deptId: depEcoAffairs.id, workspaceId: teamForex.workspaceId as string,
    decidedByIdx: 18, daysAgo: 160, status: 'active',
    tags: ['forex', 'reserves'],
  },
  {
    title: 'Investigation cell — remote work policy',
    context: 'Covid-era remote work winding down. CBDT seeks in-office return.',
    rationale: 'Sensitive case files require secure in-office access. Return to 5-day office week.',
    deptId: divInvest.id, workspaceId: teamInvestOps.workspaceId as string,
    decidedByIdx: 6, daysAgo: 200, status: 'reversed',
    reversedReason: 'Union opposition + staff retention concerns. Reverted to 3-day office week.',
    tags: ['remote', 'policy'],
  },
  {
    title: 'Income tax compliance — e-filing mandate for <₹5Cr turnover',
    context: 'Digital push + reduction in manual processing.',
    rationale: 'Mandatory e-filing expanded from ₹10Cr threshold down to ₹5Cr. Affects ~2.1M entities.',
    outcome: 'Rolled out successfully, 94% compliance achieved by Q2.',
    deptId: dirIncomeTax.id, workspaceId: teamTreaty.workspaceId as string,
    decidedByIdx: 3, daysAgo: 300, status: 'active',
    tags: ['compliance', 'digital'],
  },
  {
    title: 'Hiring freeze — pause all Level-A recruitment',
    context: 'Second attempt at cost control. Finance Secretary directive.',
    rationale: 'Freeze Level-A (junior) hiring for Q3 only. Re-assess in Q4.',
    deptId: depExpenditure.id, workspaceId: teamBudget.workspaceId as string,
    decidedByIdx: 17, daysAgo: 45, status: 'active',
    tags: ['hiring', 'budget'],
  },
  {
    title: 'Tax treaty renegotiation with Singapore',
    context: 'Current treaty dates to 1994. BEPS 2.0 requires updates.',
    rationale: 'Add LOB clauses, update exchange of info provisions, tighten PE definitions.',
    deptId: teamTreaty.id, workspaceId: teamTreaty.workspaceId as string,
    decidedByIdx: 8, daysAgo: 75, status: 'active',
    tags: ['treaty'],
  },
]

interface RecordRow { id: string; workspaceId: string }
const recordRows: RecordRow[] = []

const recordInsert = db.prepare(`INSERT INTO records (id, workspace_id, type, title, summary, content, confidence, tags, locked, source, triage_status, created_by, created_at, updated_at)
  VALUES (?, ?, 'decision', ?, ?, ?, 0.9, ?, 0, 'manual', 'auto_accepted', ?, ?, ?)`)
const decisionInsert = db.prepare(`INSERT INTO decisions (id, organization_id, department_id, workspace_id, record_id, title, context, rationale, outcome, decided_by_user_id, decided_at, status, reversed_at, reversed_by_user_id, reversed_reason, tags, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

for (const d of decisionSeeds) {
  const recordId = uuid()
  const decisionId = uuid()
  const decidedAt = daysAgoIso(d.daysAgo)
  const member = members[d.decidedByIdx]

  recordInsert.run(
    recordId,
    d.workspaceId as string,
    d.title,
    d.rationale.slice(0, 200),
    `Context: ${d.context}\n\nRationale: ${d.rationale}\n\n${d.outcome ? `Outcome: ${d.outcome}` : ''}`,
    JSON.stringify(d.tags || []),
    member?.userId ?? creator.id,
    decidedAt,
    decidedAt,
  )
  recordRows.push({ id: recordId, workspaceId: d.workspaceId as string })

  decisionInsert.run(
    decisionId,
    orgId,
    d.deptId,
    d.workspaceId as string,
    recordId,
    d.title,
    d.context,
    d.rationale,
    d.outcome ?? null,
    member?.userId ?? creator.id,
    decidedAt,
    d.status ?? 'active',
    d.status === 'reversed' || d.status === 'superseded' ? daysAgoIso(Math.max(d.daysAgo - 30, 1)) : null,
    d.status === 'reversed' || d.status === 'superseded' ? (member?.userId ?? creator.id) : null,
    d.reversedReason ?? null,
    d.tags ? JSON.stringify(d.tags) : null,
    decidedAt,
    decidedAt,
  )
}

console.log(`Seeded ${decisionSeeds.length} decisions (${decisionSeeds.filter((d) => d.status === 'reversed').length} reversed, ${decisionSeeds.filter((d) => d.status === 'superseded').length} superseded)`)

// ─── Step 8b: record_links — graph edges the linking agent would infer ─────
// In production these are generated by the linking agent after embedding.
// For the demo we synthesize realistic relationships so the graph lights up.
// Edges reference recordRows which were populated in the decision loop above
// in the same order as decisionSeeds. We map titles → indices for readability.
const titleToIdx = new Map(decisionSeeds.map((d, i) => [d.title, i]))
function ref(title: string): string | null {
  const idx = titleToIdx.get(title)
  if (idx === undefined) return null
  return recordRows[idx]?.id ?? null
}

interface LinkSeed {
  from: string
  to: string
  kind: 'same_topic' | 'contradicts' | 'continuation_of' | 'causes' | 'temporal' | 'related_to' | 'leads_to' | 'supports' | 'part_of' | 'blocks' | 'depends_on' | 'same_people'
  weight?: number
  explanation?: string
}

const linkSeeds: LinkSeed[] = [
  // Hiring freeze arc: freeze → reversed by green-light → then a partial re-freeze
  {
    from: 'Hiring freeze across Revenue department',
    to: 'Green light hiring across Revenue department',
    kind: 'contradicts',
    weight: 0.95,
    explanation: 'Direct reversal: the earlier freeze was overturned by the later green-light.',
  },
  {
    from: 'Green light hiring across Revenue department',
    to: 'Hiring freeze — pause all Level-A recruitment',
    kind: 'related_to',
    weight: 0.7,
    explanation: 'Partial re-freeze on Level-A only after the broader freeze was lifted.',
  },
  {
    from: 'Hiring freeze across Revenue department',
    to: 'Hiring freeze — pause all Level-A recruitment',
    kind: 'same_topic',
    weight: 0.85,
  },
  // Transfer pricing supersession
  {
    from: 'Transfer pricing safe harbor rules — revision',
    to: 'Revised safe harbor margins (2025 edition)',
    kind: 'continuation_of',
    weight: 0.98,
    explanation: 'The 2025 edition supersedes the earlier draft after industry consultation.',
  },
  // BEPS + treaty linkage
  {
    from: 'Adopt OECD BEPS 2.0 framework for international taxation',
    to: 'Tax treaty renegotiation with Singapore',
    kind: 'leads_to',
    weight: 0.9,
    explanation: 'BEPS 2.0 compliance requires updating bilateral tax treaties.',
  },
  {
    from: 'Adopt OECD BEPS 2.0 framework for international taxation',
    to: 'Transfer pricing safe harbor rules — revision',
    kind: 'same_topic',
    weight: 0.8,
    explanation: 'Both sit within the international taxation reform workstream.',
  },
  {
    from: 'Adopt OECD BEPS 2.0 framework for international taxation',
    to: 'Revised safe harbor margins (2025 edition)',
    kind: 'same_topic',
    weight: 0.8,
  },
  // GST + compliance
  {
    from: 'GST rate rationalization — move 12% slab to 18%',
    to: 'Income tax compliance — e-filing mandate for <₹5Cr turnover',
    kind: 'related_to',
    weight: 0.6,
    explanation: 'Both part of the FY25 revenue tightening push.',
  },
  // Remote work contradiction
  {
    from: 'Investigation cell — remote work policy',
    to: 'Hiring freeze — pause all Level-A recruitment',
    kind: 'related_to',
    weight: 0.55,
    explanation: 'Both touch workforce policy in Expenditure.',
  },
  // Forex + budget
  {
    from: 'Forex hedging policy for sovereign reserves',
    to: 'Vendor freeze: SAP migration project',
    kind: 'related_to',
    weight: 0.5,
    explanation: 'Both fall under the FY25 expenditure discipline.',
  },
  // Treaty → e-filing (entity overlap: income tax dir)
  {
    from: 'Tax treaty renegotiation with Singapore',
    to: 'Income tax compliance — e-filing mandate for <₹5Cr turnover',
    kind: 'same_people',
    weight: 0.6,
    explanation: 'Both owned by the Income Tax Directorate.',
  },
]

const linkInsert = db.prepare(`INSERT INTO record_links (id, workspace_id, from_record_id, to_record_id, kind, weight, explanation, locked, created_by, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'agent', ?)`)

let linksInserted = 0
for (const l of linkSeeds) {
  const fromId = ref(l.from)
  const toId = ref(l.to)
  if (!fromId || !toId) continue
  // workspace_id — take the `from` record's workspace (already in recordRows)
  const fromRow = recordRows.find((r) => r.id === fromId)
  if (!fromRow) continue
  linkInsert.run(uuid(), fromRow.workspaceId, fromId, toId, l.kind, l.weight ?? 0.75, l.explanation ?? null, now())
  linksInserted++
}
console.log(`Seeded ${linksInserted} record_links for the memory graph`)

// ─── Step 9: record role ownership (for orphaned detection) ─────────────────
// Tie 3 records to the 2 vacant roles so orphaned detector has fuel
const ownershipInsert = db.prepare(`INSERT INTO record_role_ownership (id, record_id, role_id, organization_id, assigned_at) VALUES (?, ?, ?, ?, ?)`)
const vacantRoles = roleRows.slice(-2)
recordRows.slice(0, 3).forEach((r, i) => {
  const role = vacantRoles[i % vacantRoles.length]
  ownershipInsert.run(uuid(), r.id, role.id, orgId, now())
})

// ─── Step 9b: agents — real configured agents, not just UI stubs ────────────
const agentInsert = db.prepare(`INSERT INTO agents (id, organization_id, tier, department_id, owner_user_id, name, slug, description, icon_name, color, system_prompt, scope_config, deployment_targets, usage_count, status, created_by, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`)

const agentSeeds = [
  {
    tier: 'org', name: 'Policy Helper', slug: 'policy-helper',
    description: 'Answers any policy question. Cites the exact clause. Updated as policies are published.',
    iconName: 'FileText', color: 'text-blue-500',
    systemPrompt: `You are the Policy Helper for the Ministry of Finance. You answer compliance and policy questions with absolute precision.
Rules:
- Only answer from published policies. If you don't find a matching policy, say so clearly.
- Cite the exact policy version and clause number when relevant.
- Be strict about scope: if a question isn't about policy, redirect to the right agent.
- Use a formal, professional tone. You speak like a senior compliance officer.`,
    scopeConfig: JSON.stringify({ types: ['policy', 'context'], tags: ['policy', 'compliance'] }),
    deploymentTargets: JSON.stringify(['web', 'slack', 'teams']),
    departmentId: null, ownerUserId: null, usageCount: 247,
  },
  {
    tier: 'org', name: 'Decision Lookup', slug: 'decision-lookup',
    description: 'Find any past decision, its context, rationale, and whether it was reversed. Catches duplicates before they happen.',
    iconName: 'Gavel', color: 'text-violet-500',
    systemPrompt: `You are the Decision Lookup agent. Your job is to help people find past organizational decisions and avoid re-deciding the same thing.
Rules:
- Only use decisions (records with type='decision'). Not general memories.
- When a question sounds like a decision being discussed, check if it's been decided before. Flag duplication explicitly.
- If a decision was reversed or superseded, say so AND point to the current state.
- Be concise. Decisions need facts, not fluff.`,
    scopeConfig: JSON.stringify({ types: ['decision'] }),
    deploymentTargets: JSON.stringify(['web', 'slack']),
    departmentId: null, ownerUserId: null, usageCount: 189,
  },
  {
    tier: 'departmental', name: 'HR Onboarding', slug: 'hr-onboarding',
    description: 'Helps new joiners through their first 30 days. Knows the travel policy, IT setup, org chart, and who to ask.',
    iconName: 'Landmark', color: 'text-emerald-500',
    systemPrompt: `You are the HR Onboarding buddy for new joiners at the Ministry. You're friendly, encouraging, and explain things like it's the person's day 1.
Rules:
- Use a warm, supportive tone. This person is new.
- Proactively suggest next steps and "you should also know…" items.
- Point to the org chart when relevant.
- If they ask about IT or facilities, escalate to the right human contact.`,
    scopeConfig: JSON.stringify({ types: ['policy', 'context', 'note'], tags: ['hr', 'onboarding', 'policy'] }),
    deploymentTargets: JSON.stringify(['slack']),
    departmentId: null, ownerUserId: null, usageCount: 38,
  },
  {
    tier: 'departmental', name: 'Finance FAQ', slug: 'finance-faq',
    description: 'Expense policy, reimbursement timelines, vendor onboarding. Trained on Finance department memory only.',
    iconName: 'Gavel', color: 'text-amber-500',
    systemPrompt: `You are the Finance FAQ agent. You're precise, dry, and numbers-focused — like a senior finance analyst.
Rules:
- Only answer from Finance department records. Refuse scope outside Finance.
- Use exact numbers, dates, and rupee values where available.
- If a question requires judgment (not just lookup), suggest escalating to the Joint Secretary (Expenditure).`,
    scopeConfig: JSON.stringify({ departmentPrefix: 'Department of Expenditure' }),
    deploymentTargets: JSON.stringify(['web', 'teams']),
    departmentId: depExpenditure.id, ownerUserId: null, usageCount: 54,
  },
  {
    tier: 'personal', name: 'My Daily Digest', slug: 'my-daily-digest',
    description: 'Summarizes what changed in your scope since yesterday. Mentions, new decisions, pending acks.',
    iconName: 'Sparkles', color: 'text-cyan-500',
    systemPrompt: `You are the user's personal daily digest agent. You summarize what changed in their scope since their last visit.
Rules:
- Focus on delta: what's NEW or CHANGED, not a recap of everything.
- Prioritize: new decisions, @mentions, pending policy acks, offboardings affecting their team.
- Keep it under 200 words unless they explicitly ask for more detail.`,
    scopeConfig: JSON.stringify({}),
    deploymentTargets: JSON.stringify(['web', 'email']),
    departmentId: null, ownerUserId: creator.id, usageCount: 0,
  },
]

for (const a of agentSeeds) {
  agentInsert.run(
    uuid(), orgId, a.tier, a.departmentId, a.ownerUserId,
    a.name, a.slug, a.description, a.iconName, a.color,
    a.systemPrompt, a.scopeConfig, a.deploymentTargets, a.usageCount,
    creator.id, now(), now(),
  )
}
console.log(`Seeded ${agentSeeds.length} agents`)

// ─── Step 10: a sample audit log entry so the audit page isn't empty ────────
const auditInsert = db.prepare(`INSERT INTO audit_log (id, organization_id, user_id, user_email, action, resource_type, resource_id, metadata, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
auditInsert.run(uuid(), orgId, creator.id, creator.email, 'create', 'organization', orgId, JSON.stringify({ seeded: true, via: 'demo-seed-script' }), now())
auditInsert.run(uuid(), orgId, creator.id, creator.email, 'admin_action', 'demo_seed', orgId, JSON.stringify({ hierarchy: 7, members: members.length, decisions: decisionSeeds.length }), now())

// ─── Step 11: seed policies (published + one draft) ────────────────────────
// Realistic gov/enterprise policies: travel, data classification, hybrid work,
// vendor engagement, AI usage. Policies ack-tracked, so the home banner and
// compliance dashboard light up.
const policyInsert = db.prepare(`INSERT INTO policies
  (id, organization_id, title, slug, category, status, current_version_id, effective_date, applicability, created_by, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
const policyVersionInsert = db.prepare(`INSERT INTO policy_versions
  (id, policy_id, version_number, title, summary, body, requires_re_ack, change_note, published_at, published_by_user_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
const policyAckInsert = db.prepare(`INSERT INTO policy_acknowledgments
  (id, policy_id, policy_version_id, organization_id, user_id, acknowledged_at)
  VALUES (?, ?, ?, ?, ?, ?)`)

interface PolicySeed {
  title: string
  slug: string
  category: string
  effectiveDate: string
  summary: string
  body: string
  status: 'published' | 'draft'
  // How many of the seeded members should have acked (spreads the Home banner count)
  ackFraction: number
}

const policySeeds: PolicySeed[] = [
  {
    title: 'Domestic & International Travel Policy',
    slug: 'travel-2026',
    category: 'travel',
    effectiveDate: daysAgoIso(45),
    summary: 'Per-diem caps, class-of-travel matrix, and pre-approval thresholds by grade.',
    body: `# Travel Policy v3.0

## Scope
Applies to all staff (Secretary down to Assistant level) engaging in official travel.

## Pre-approval
- Domestic travel ≥ ₹25,000 needs Deputy Secretary approval.
- International travel needs Joint Secretary approval AND Finance clearance.
- Emergency exceptions require a retrospective note within 72 hours.

## Class of travel
- Secretary / JS: Business class international, AC-1 domestic rail.
- Director / DS: Economy Plus international, AC-2 rail.
- Others: Economy / AC-3.

## Per-diem (per day, INR)
- Delhi/Mumbai: 4,000 (lodging), 1,500 (meals).
- Tier-2 cities: 2,500 + 1,000.
- International: local rate card attached to the intranet policy page.

Supersedes v2.3 (2023). Any receipts older than 30 days from the travel date are non-reimbursable.`,
    status: 'published',
    ackFraction: 0.6,
  },
  {
    title: 'Data Classification & Handling Standard',
    slug: 'data-classification-v1-4',
    category: 'security',
    effectiveDate: daysAgoIso(90),
    summary: 'Four-tier classification (Public / Internal / Confidential / Restricted) with handling rules.',
    body: `# Data Classification v1.4

## Tiers
- **Public**: press releases, published circulars. No restrictions.
- **Internal**: day-to-day memos, meeting notes. Not to be shared outside the organization.
- **Confidential**: personnel records, pre-decisional policy drafts, financial projections.
- **Restricted**: classified material, cabinet-committee deliberations, diplomatic cables.

## Handling
- Restricted data must not leave approved devices or authorized rooms.
- Confidential data requires Reattend visibility "department" or narrower.
- Internal data may be "team" or "org-wide" at authors' discretion.

## Violations
Reported to the Chief Information Security Officer within 24 hours. Audit log must capture every access.`,
    status: 'published',
    ackFraction: 0.85,
  },
  {
    title: 'Hybrid Work Policy',
    slug: 'hybrid-work-v2-1',
    category: 'hr',
    effectiveDate: daysAgoIso(60),
    summary: 'Minimum 3 office days per week for grades A and above; investigation units full-time in office.',
    body: `# Hybrid Work Policy v2.1

## Baseline
Minimum three (3) office days per week for Level-A and above.

## Exceptions
- Investigation units: five (5) office days per week.
- Field officers: location determined by posting, not policy.
- Medical exceptions require HR clearance, renewed annually.

## Compliance
Swipe-card data reviewed monthly. Three consecutive months below baseline triggers a performance-review conversation.`,
    status: 'published',
    ackFraction: 0.5,
  },
  {
    title: 'Vendor Engagement & Procurement Ethics',
    slug: 'vendor-ethics-v1-0',
    category: 'compliance',
    effectiveDate: daysAgoIso(30),
    summary: 'Conflict-of-interest rules, gift acceptance limits, and mandatory vendor registration.',
    body: `# Vendor Engagement v1.0

## Registration
All vendors must be registered on the GeM portal or equivalent before any purchase order is raised.

## Gifts
- Gifts valued at less than ₹1,000 may be accepted during ceremonial occasions and must be logged.
- Anything above ₹1,000: refuse and report to the ethics officer within 48 hours.
- Cash, vouchers, or "discounts" outside published terms are never acceptable.

## Conflict of interest
Officers must disclose any ownership, directorship, or close-relative relationship with a bidding entity. Participation in that procurement is automatically barred.`,
    status: 'published',
    ackFraction: 0.35,
  },
  {
    title: 'AI Tooling Acceptable Use',
    slug: 'ai-aup-v0-9',
    category: 'it',
    effectiveDate: daysAgoIso(15),
    summary: 'When staff may use AI assistants (Reattend, Copilot, ChatGPT) for official work and what data must never be shared.',
    body: `# AI Acceptable Use v0.9 (DRAFT — pending HR review)

## Allowed
- Reattend Enterprise for summarization, drafting, and Q&A over organizational memory.
- AI-assisted drafting of public-facing communications, reviewed by a human before publication.

## Prohibited
- Sending Confidential or Restricted data to any third-party AI service (ChatGPT, Copilot, Claude.ai, etc.).
- Relying on AI output for regulatory filings without expert human review.
- Using AI to generate personnel performance evaluations without disclosure.

## Audit
All AI queries via Reattend are logged. Third-party AI usage must be disclosed quarterly.`,
    status: 'draft',
    ackFraction: 0, // drafts have no acks
  },
]

const seededPolicies: Array<{ id: string; versionId: string; ackFraction: number }> = []
for (const p of policySeeds) {
  const pid = uuid()
  const vid = uuid()
  const published = p.status === 'published'
  policyInsert.run(
    pid, orgId, p.title, p.slug, p.category, p.status, vid,
    p.effectiveDate,
    JSON.stringify({ allOrg: true, departments: [], roles: [], users: [] }),
    creator.id, now(), now(),
  )
  policyVersionInsert.run(
    vid, pid, 1, p.title, p.summary, p.body,
    1, null,
    published ? daysAgoIso(1) : null,
    published ? creator.id : null,
    now(),
  )
  seededPolicies.push({ id: pid, versionId: vid, ackFraction: p.ackFraction })
}

// Acks: pick a subset of members by fraction. Skew toward active members
// (not offboarded) so the ack trail looks realistic.
const activeMembers = members.filter((_m, i) => i < members.length - 3) // last 3 were flagged offboarded earlier
for (const p of seededPolicies) {
  if (p.ackFraction <= 0) continue
  const targetCount = Math.round(activeMembers.length * p.ackFraction)
  const ackedBy = activeMembers.slice(0, targetCount)
  for (const m of ackedBy) {
    policyAckInsert.run(uuid(), p.id, p.versionId, orgId, m.userId, daysAgoIso(Math.floor(Math.random() * 14)))
  }
}
console.log(`Seeded ${policySeeds.length} policies (${policySeeds.filter((p) => p.status === 'published').length} published) with realistic ack coverage`)

// ─── Step 12: seed ask_feedback so chat history isn't empty ────────────────
// Fake Q+A pairs spread across the last 14 days. Realistic questions for
// a government finance ministry — mix of policy, decision, people lookups.
const askInsert = db.prepare(`INSERT INTO ask_feedback (id, user_id, question, answer_text, sources, rating, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)`)
const askSeeds: Array<{ q: string; a: string; rating: 'up' | 'down'; daysAgo: number }> = [
  { q: 'What is the current travel per-diem for Delhi?', a: 'Per v3.0 of the Travel Policy (effective 45 days ago), Delhi per-diem is ₹4,000 lodging + ₹1,500 meals. Pre-approval from Deputy Secretary required for trips ≥ ₹25,000 [1].', rating: 'up', daysAgo: 12 },
  { q: 'Who approved the 2026 hiring freeze?', a: 'The hiring freeze was signed off by Secretary on Feb 4. The decision is recorded in the Decisions log and referenced in the Q1 budget memo [1][2]. It applies org-wide except frontline investigation staff.', rating: 'up', daysAgo: 9 },
  { q: 'Has the BEPS treaty position been reversed?', a: 'No. The BEPS treaty stance (adopted 2024) remains active. There was a discussion in Mar 2026 about revisiting it, but no reversal decision has been logged.', rating: 'up', daysAgo: 7 },
  { q: 'Summarise what the Data Classification policy says about restricted data', a: 'Restricted data (classified material, cabinet-committee deliberations, diplomatic cables) must not leave approved devices or authorized rooms. Every access is audit-logged. Violations report to the CISO within 24h [1].', rating: 'up', daysAgo: 6 },
  { q: 'Who currently holds the role of Director of Ingest?', a: 'Based on role_assignments, this role is currently vacant. Last holder offboarded 45 days ago. Their records have not yet been transferred — see the knowledge-at-risk flag on the Admin page.', rating: 'down', daysAgo: 5 },
  { q: 'Draft an email to CFO about the travel policy refresh', a: '(draft email produced from memories)', rating: 'up', daysAgo: 3 },
  { q: 'What decisions did we reverse in the last quarter?', a: '3 decisions reversed: (1) hiring-freeze scope, reversed because frontline staff shortages; (2) vendor lock-in clause, reversed after legal review; (3) Q3 comp structure, superseded by v2. See the Decisions briefing for full chain [1][2][3].', rating: 'up', daysAgo: 2 },
  { q: 'Who is handling cross-border tax this quarter?', a: 'Per the most recent org chart, cross-border tax sits in the International Taxation Wing under JS (Tax). The specific file officer is currently vacant (handover pending).', rating: 'up', daysAgo: 1 },
]
for (const ask of askSeeds) {
  askInsert.run(uuid(), creator.id, ask.q, ask.a, '[]', ask.rating, daysAgoIso(ask.daysAgo))
}
console.log(`Seeded ${askSeeds.length} ask-history rows`)

console.log(`\n✓ Demo org seeded. URL: http://localhost:3000/app/admin/${orgId}`)
console.log(`  Slug:   ${DEMO_SLUG}`)
console.log(`  Name:   ${DEMO_NAME}`)
console.log(`  Org ID: ${orgId}`)
console.log(`  Depth:  7 levels (Ministry → Dept → Wing → Directorate → Division → Section → team)`)
console.log(`  Demo:   ${members.length} members, ${decisionSeeds.length} decisions, 3 offboarded members, 2 vacant roles with orphaned records`)
console.log(`\nRun a self-healing scan to surface signals:`)
console.log(`  Admin → Self-healing → Run scan\n`)

db.close()
