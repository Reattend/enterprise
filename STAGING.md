# Test environment — `test.reattend.com`

A parallel deployment of Reattend Enterprise running on its own droplet
with its own database, seeded with a 163-person Indian SaaS enterprise.
Used to validate enterprise features at scale (deep org hierarchy, RBAC
ancestor cascade, multi-department workspaces) without touching
production data, payments, or auth.

This document is the source of truth. If you do something here that
isn't documented, add a section when you're done.

---

## Quick links

| Surface | URL |
|---|---|
| App | https://test.reattend.com |
| Login (seed users only) | https://test.reattend.com/test-login |
| Org slug | `seed-acme-india` |
| Shared password | `reattend-test-2026` |

---

## Infrastructure

| Resource | Value |
|---|---|
| Droplet IP | `143.198.116.94` |
| Droplet size | $12/mo · 2 GB RAM · 1 vCPU · Singapore (SGP1) |
| OS | Ubuntu 24.04 LTS |
| Domain | `test.reattend.com` (A record → droplet IP) |
| TLS | Let's Encrypt, auto-renews via certbot timer |
| App dir | `/var/www/enterprise-test` |
| Database | `/var/www/enterprise-test/data/reattend.db` (SQLite, separate from prod) |
| pm2 process | `enterprise-test` (NOT `enterprise` — that's prod) |
| Swap | 4 GB at `/swapfile` (required so `npm run build` doesn't OOM) |
| nginx site | `/etc/nginx/sites-enabled/enterprise-test` |
| Heap budget | `NODE_OPTIONS=--max-old-space-size=1600` |

---

## Auth — how to log in

The test droplet uses a dedicated NextAuth credentials provider
(`test-password`, see `src/lib/auth/index.ts`) that **only** accepts
`@seed.reattend.local` emails and a single shared password. No OTP,
no Resend, no real inbox.

**Login URL:** https://test.reattend.com/test-login

**Shared password (every seed user):** `reattend-test-2026`

(Stored on the droplet at `/var/www/enterprise-test/.env.local` as
`TEST_LOGIN_PASSWORD`. To rotate, edit that file and run
`pm2 restart enterprise-test --update-env`.)

Two safety layers:
1. Top-level env gate `ALLOW_TEST_PASSWORD_LOGIN=true` — only set on
   the test droplet, never on prod.
2. Domain check inside `authorize` rejects any email not ending in
   `@seed.reattend.local`.

If the env var ever flips on in prod, real users still can't bypass
OTP because their emails don't match the seed domain.

---

## The org structure

`acme-india-test` (slug `seed-acme-india`) — 163 users across 8
top-level departments + 32 sub-departments + sub-sub-departments
(Engineering > Backend > Platform/API/Search; Sales > Enterprise >
APAC/EMEA/NA; Sales > Customer Success > Onboarding/Retention).

```
Acme India (Test)
│
├── Office of the CEO              ★★★★ super_admin × 4 + ◆ × 3 + 1 EA
│   ├── CEO, CTO, COO, CHRO
│   └── Chief of Staff, IR Director, Comms Director, EA
│
├── Engineering                    ◆ VP + 5 sub-depts
│   ├── Backend                    Director + 3 nested teams
│   │   ├── Platform               EM + 4 ICs
│   │   ├── API                    EM + 3 ICs
│   │   └── Search                 EM + 3 ICs
│   ├── Frontend                   Director + EM + 7 ICs
│   ├── Data Platform              Director + EM + 5 ICs
│   ├── DevOps & SRE               Head + 4 ICs
│   └── Quality                    Head + 4 ICs
│
├── Sales                          ◆ VP + 4 sub-depts
│   ├── Enterprise                 Director + 3 regional teams
│   │   ├── APAC                   Regional Manager + 3 AEs
│   │   ├── EMEA                   Regional Manager + 3 AEs
│   │   └── North America          Regional Manager + 3 AEs
│   ├── SMB                        Director + Manager + 7 AEs
│   ├── BDR / Inbound              Head + 5 BDRs
│   └── Customer Success           Director + 2 nested teams
│       ├── Onboarding             Manager + 3 specialists
│       └── Retention              Manager + 4 CSMs
│
├── Marketing                      ◆ VP + 4 sub-depts (Content, Demand Gen, Brand, Product Marketing)
├── Operations                     ◆ Head + 4 sub-depts (Logistics, Procurement, QA, Customer Ops)
├── People                         ◆ Director + 3 sub-depts (Recruiting, L&D, Comp & Benefits)
├── Finance                        ◆ VP + 3 sub-depts (Accounting, FP&A, Treasury)
└── Legal                          ◆ VP + 2 sub-depts (Compliance, Contracts)
```

**Headcount: 163**
**Departments: 41** (8 top-level + 32 nested + 1 synthetic Office of CEO)
**Workspaces: 8** (1 org-wide "Acme — All Hands" + 7 per top-level dept; Office of the CEO is a member of all)

### RBAC roles, by level

- **Org `super_admin`** — CEO, CTO, COO, CHRO. See and edit everything across the company.
- **Org `admin`** — VPs of each top-level dept (7) + Chief of Staff, IR Director, Comms Director, Head of Operations, Director of People Ops. ~12 total.
- **Org `member`** — everyone else (~147).
- **Department `dept_head`** — the named head of every dept (40+). Sees own dept tree.
- **Department `manager`** — sub-dept leads / team managers. Sees own sub-dept only.
- **Department `member`** — ICs.

The 3-deep paths (e.g. Engineering > Backend > Platform) exist
specifically to test the RBAC ancestor cascade — when an Engineering
VP queries memories, they should see Platform memories via inheritance;
when a Frontend Director queries, they shouldn't.

---

## The roster — every email and what it means

**Legend:** ★ super_admin · ◆ admin · · member

### Office of the CEO

```
vikrant.iyer@seed.reattend.local       ★ super_admin   — Chief Executive Officer (Bengaluru)
anika.patel@seed.reattend.local        ★ super_admin   — Chief Technology Officer (Bengaluru)
rajesh.khanna@seed.reattend.local      ★ super_admin   — Chief Operating Officer (Bengaluru)
sundari.pillai@seed.reattend.local     ★ super_admin   — Chief Human Resources Officer (Bengaluru)
karthik.iyer@seed.reattend.local       ◆ admin         — Chief of Staff (Bengaluru)
rohan.deshpande@seed.reattend.local    ◆ admin         — Director of Investor Relations (Mumbai)
arjun.sharma@seed.reattend.local       ◆ admin         — Director of Communications (Gurugram)
aritra.sengupta@seed.reattend.local    ·               — Executive Assistant to CEO (Kolkata)
```

### Engineering

```
lakshmi.ramaswamy@seed.reattend.local  ◆ admin         — VP, Engineering (Bengaluru)

  Engineering / Backend
  aditi.joshi@seed.reattend.local      ·               — Director, Backend (Mumbai)

    Engineering / Backend / Platform
    priya.kapoor@seed.reattend.local   ·               — Engineering Manager, Platform (Gurugram)
    priya.chatterjee@seed.reattend.local                — Platform Engineer (Kolkata)
    aravind.subramanian@seed.reattend.local             — Platform Engineer (Bengaluru)
    kunal.patil@seed.reattend.local                     — Platform Engineer (Mumbai)
    vikram.singh@seed.reattend.local                    — Platform Engineer (Gurugram)

    Engineering / Backend / API
    ananya.ghosh@seed.reattend.local                    — Engineering Manager, API (Kolkata)
    meera.krishnan@seed.reattend.local                  — API Engineer (Bengaluru)
    snehal.kulkarni@seed.reattend.local                 — API Engineer (Mumbai)
    neha.verma@seed.reattend.local                      — API Engineer (Gurugram)

    Engineering / Backend / Search
    soumya.banerjee@seed.reattend.local                 — Engineering Manager, Search (Kolkata)
    suresh.gowda@seed.reattend.local                    — Search Engineer (Bengaluru)
    ishaan.mehta@seed.reattend.local                    — Search Engineer (Mumbai)
    rahul.chopra@seed.reattend.local                    — Search Engineer (Gurugram)

  Engineering / Frontend
  indrajit.bose@seed.reattend.local                     — Director, Frontend (Kolkata)
  bhavana.hegde@seed.reattend.local                     — Engineering Manager, Frontend (Bengaluru)
  diya.shah@seed.reattend.local                         — Frontend Engineer (Mumbai)
  pooja.aggarwal@seed.reattend.local                    — Frontend Engineer (Gurugram)
  rituparna.dasgupta@seed.reattend.local                — Frontend Engineer (Kolkata)
  naveen.bhat@seed.reattend.local                       — Frontend Engineer (Bengaluru)
  aniket.rao@seed.reattend.local                        — Frontend Engineer (Mumbai)
  aman.khurana@seed.reattend.local                      — Frontend Engineer (Gurugram)
  debanjan.mukherjee@seed.reattend.local                — Frontend Engineer (Kolkata)

  Engineering / Data Platform
  anjali.acharya@seed.reattend.local                    — Director, Data (Bengaluru)
  pooja.bhosale@seed.reattend.local                     — Engineering Manager, Data (Mumbai)
  riya.malhotra@seed.reattend.local                     — Data Engineer (Gurugram)
  riya.saha@seed.reattend.local                         — Data Engineer (Kolkata)
  arvind.rao@seed.reattend.local                        — Data Engineer (Bengaluru)
  sameer.gokhale@seed.reattend.local                    — Data Engineer (Mumbai)
  siddharth.tandon@seed.reattend.local                  — Data Engineer (Gurugram)

  Engineering / DevOps & SRE
  subhomoy.roy@seed.reattend.local                      — Head of SRE (Kolkata)
  deepika.shenoy@seed.reattend.local                    — Site Reliability Engineer (Bengaluru)
  vaidehi.karandikar@seed.reattend.local                — Site Reliability Engineer (Mumbai)
  shreya.bhalla@seed.reattend.local                     — Site Reliability Engineer (Gurugram)
  tanushree.dutta@seed.reattend.local                   — Site Reliability Engineer (Kolkata)

  Engineering / Quality
  pranav.pai@seed.reattend.local                        — Head of QA (Bengaluru)
  tushar.phadnis@seed.reattend.local                    — QA Engineer (Mumbai)
  karan.gill@seed.reattend.local                        — QA Engineer (Gurugram)
  arnab.bhattacharya@seed.reattend.local                — QA Engineer (Kolkata)
  sushma.nair@seed.reattend.local                       — QA Engineer (Bengaluru)
```

### Sales

```
manasi.pawar@seed.reattend.local       ◆ admin         — VP, Sales (Mumbai)

  Sales / Enterprise
  sneha.bedi@seed.reattend.local                        — Director, Enterprise Sales (Gurugram)

    Sales / Enterprise / APAC
    mahua.pal@seed.reattend.local                       — Regional Manager, APAC (Kolkata)
    ramya.menon@seed.reattend.local                     — Enterprise AE — APAC (Bengaluru)
    saurabh.chitnis@seed.reattend.local                 — Enterprise AE — APAC (Mumbai)
    aditya.bhardwaj@seed.reattend.local                 — Enterprise AE — APAC (Gurugram)

    Sales / Enterprise / EMEA
    sandip.mitra@seed.reattend.local                    — Regional Manager, EMEA (Kolkata)
    tarun.krishnamurthy@seed.reattend.local             — Enterprise AE — EMEA (Bengaluru)
    rashmi.apte@seed.reattend.local                     — Enterprise AE — EMEA (Mumbai)
    tanisha.sethi@seed.reattend.local                   — Enterprise AE — EMEA (Gurugram)

    Sales / Enterprise / North America
    paromita.ray@seed.reattend.local                    — Regional Manager, NA (Kolkata)
    kavitha.balaji@seed.reattend.local                  — Enterprise AE — NA (Bengaluru)
    ketan.joglekar@seed.reattend.local                  — Enterprise AE — NA (Mumbai)
    yash.anand@seed.reattend.local                      — Enterprise AE — NA (Gurugram)

  Sales / SMB
  aniket.basu@seed.reattend.local                       — Director, SMB Sales (Kolkata)
  manoj.sundaram@seed.reattend.local                    — Sales Manager, SMB (Bengaluru)
  tanvi.sathe@seed.reattend.local                       — SMB Account Executive (Mumbai)
  aarushi.khanna@seed.reattend.local                    — SMB Account Executive (Gurugram)
  sayantani.choudhury@seed.reattend.local               — SMB Account Executive (Kolkata)
  sruthi.venkatesan@seed.reattend.local                 — SMB Account Executive (Bengaluru)
  aaditya.naik@seed.reattend.local                      — SMB Account Executive (Mumbai)
  devansh.goyal@seed.reattend.local                     — SMB Account Executive (Gurugram)
  diptangshu.goswami@seed.reattend.local                — SMB Account Executive (Kolkata)

  Sales / BDR / Inbound
  hari.anantharaman@seed.reattend.local                 — Head of BDR (Bengaluru)
  sonali.marathe@seed.reattend.local                    — Business Development Rep (Mumbai)
  mansi.dhawan@seed.reattend.local                      — Business Development Rep (Gurugram)
  antara.kar@seed.reattend.local                        — Business Development Rep (Kolkata)
  sridhar.iyengar@seed.reattend.local                   — Business Development Rep (Bengaluru)
  hrishikesh.limaye@seed.reattend.local                 — Business Development Rep (Mumbai)

  Sales / Customer Success
  ishan.bhatia@seed.reattend.local                      — Director, Customer Success (Gurugram)

    Sales / Customer Success / Onboarding
    snehasish.roy@seed.reattend.local                   — Manager, Onboarding (Kolkata)
    karan.padmanabhan@seed.reattend.local               — Onboarding Specialist (Bengaluru)
    shruti.bapat@seed.reattend.local                    — Onboarding Specialist (Mumbai)
    niharika.saxena@seed.reattend.local                 — Onboarding Specialist (Gurugram)

    Sales / Customer Success / Retention
    madhumita.sen@seed.reattend.local                   — Manager, Retention (Kolkata)
    divya.srinivasan@seed.reattend.local                — Retention CSM (Bengaluru)
    mihir.vora@seed.reattend.local                      — Retention CSM (Mumbai)
    akshay.nanda@seed.reattend.local                    — Retention CSM (Gurugram)
    tirtharaj.das@seed.reattend.local                   — Retention CSM (Kolkata)
```

### Marketing

```
vivek.murthy@seed.reattend.local       ◆ admin         — VP, Marketing (Bengaluru)

  Marketing / Content
  tarini.desai@seed.reattend.local                      — Head of Content (Mumbai)
  tanya.wadhwa@seed.reattend.local                      — Content Marketer (Gurugram)
  kasturi.pal@seed.reattend.local                       — Content Marketer (Kolkata)
  pooja.kamath@seed.reattend.local                      — Content Marketer (Bengaluru)
  aniruddh.trivedi@seed.reattend.local                  — Content Marketer (Mumbai)

  Marketing / Demand Generation
  pranav.sondhi@seed.reattend.local                     — Head of Demand Gen (Gurugram)
  sourav.lahiri@seed.reattend.local                     — Demand Gen Specialist (Kolkata)
  ramesh.bhat@seed.reattend.local                       — Demand Gen Specialist (Bengaluru)
  krutika.sheth@seed.reattend.local                     — Demand Gen Specialist (Mumbai)
  bhavya.suri@seed.reattend.local                       — Demand Gen Specialist (Gurugram)

  Marketing / Brand
  bidisha.bhowmick@seed.reattend.local                  — Head of Brand (Kolkata)
  sneha.shenoy@seed.reattend.local                      — Brand Designer (Bengaluru)
  yash.modi@seed.reattend.local                         — Brand Designer (Mumbai)
  lavanya.mahajan@seed.reattend.local                   — Brand Designer (Gurugram)

  Marketing / Product Marketing
  hiranmoy.sinha@seed.reattend.local                    — Head of Product Marketing (Kolkata)
  vinod.rao@seed.reattend.local                         — Product Marketing Manager (Bengaluru)
  kavya.patel@seed.reattend.local                       — Product Marketing Manager (Mumbai)
  mohit.aneja@seed.reattend.local                       — Product Marketing Manager (Gurugram)
```

### Operations

```
devjani.chowdhury@seed.reattend.local  ◆ admin         — Head of Operations (Kolkata)

  Operations / Logistics
  nandini.iyer@seed.reattend.local                      — Logistics Manager (Bengaluru)
  rohit.mehta@seed.reattend.local                       — Logistics Specialist (Mumbai)
  saumya.talwar@seed.reattend.local                     — Logistics Specialist (Gurugram)
  anirban.sarkar@seed.reattend.local                    — Logistics Specialist (Kolkata)
  sandeep.nayak@seed.reattend.local                     — Logistics Specialist (Bengaluru)
  smita.shah@seed.reattend.local                        — Logistics Specialist (Mumbai)

  Operations / Procurement
  harsh.bhasin@seed.reattend.local                      — Procurement Manager (Gurugram)
  moushumi.dasgupta@seed.reattend.local                 — Procurement Analyst (Kolkata)
  lalitha.acharya@seed.reattend.local                   — Procurement Analyst (Bengaluru)
  ajay.gupta@seed.reattend.local                        — Procurement Analyst (Mumbai)
  ira.sehgal@seed.reattend.local                        — Procurement Analyst (Gurugram)

  Operations / Quality Assurance
  ujjwal.bose@seed.reattend.local                       — Quality Manager (Kolkata)
  mahesh.bhat@seed.reattend.local                       — QA Auditor (Bengaluru)
  megha.joshi@seed.reattend.local                       — QA Auditor (Mumbai)
  pulkit.lamba@seed.reattend.local                      — QA Auditor (Gurugram)

  Operations / Customer Operations
  krishanu.mitra@seed.reattend.local                    — Customer Ops Manager (Kolkata)
  anitha.pai@seed.reattend.local                        — Customer Ops Specialist (Bengaluru)
  nilesh.kulkarni@seed.reattend.local                   — Customer Ops Specialist (Mumbai)
  ananya.bakshi@seed.reattend.local                     — Customer Ops Specialist (Gurugram)
  satarupa.banerjee@seed.reattend.local                 — Customer Ops Specialist (Kolkata)
  krishna.hegde@seed.reattend.local                     — Customer Ops Specialist (Bengaluru)
```

### People (HR)

```
anushka.naik@seed.reattend.local       ◆ admin         — Director, People Ops (Mumbai)

  People / Recruiting
  sahil.vohra@seed.reattend.local                       — Head of Recruiting (Gurugram)
  surya.ghosh@seed.reattend.local                       — Talent Partner (Kolkata)
  shanti.rao@seed.reattend.local                        — Talent Partner (Bengaluru)
  parth.vakil@seed.reattend.local                       — Talent Partner (Mumbai)
  tara.ahuja@seed.reattend.local                        — Talent Partner (Gurugram)
  indrani.dey@seed.reattend.local                       — Talent Partner (Kolkata)

  People / Learning & Development
  prakash.kulkarni@seed.reattend.local                  — L&D Lead (Bengaluru)
  trupti.pendse@seed.reattend.local                     — L&D Specialist (Mumbai)
  veer.mahindra@seed.reattend.local                     — L&D Specialist (Gurugram)
  saptarshi.roy@seed.reattend.local                     — L&D Specialist (Kolkata)

  People / Compensation & Benefits
  nithya.murthy@seed.reattend.local                     — Comp & Benefits Lead (Bengaluru)
  vishal.karnik@seed.reattend.local                     — Comp Analyst (Mumbai)
  roshni.khosla@seed.reattend.local                     — Comp Analyst (Gurugram)
  lopamudra.pal@seed.reattend.local                     — Comp Analyst (Kolkata)
```

### Finance

```
sumanth.joshi@seed.reattend.local      ◆ admin         — VP, Finance (Bengaluru)

  Finance / Accounting
  pallavi.ranade@seed.reattend.local                    — Controller (Mumbai)
  kabir.bhandari@seed.reattend.local                    — Accountant (Gurugram)
  abhirup.bhowmik@seed.reattend.local                   — Accountant (Kolkata)
  vidya.bhat@seed.reattend.local                        — Accountant (Bengaluru)
  mandar.athavale@seed.reattend.local                   — Accountant (Mumbai)

  Finance / FP&A
  avni.sapra@seed.reattend.local                        — FP&A Director (Gurugram)
  mrinmoyee.saha@seed.reattend.local                    — Financial Analyst (Kolkata)
  anand.krishnan@seed.reattend.local                    — Financial Analyst (Bengaluru)
  aishwarya.bhatkhande@seed.reattend.local              — Financial Analyst (Mumbai)

  Finance / Treasury
  dhruv.tuli@seed.reattend.local                        — Treasurer (Gurugram)
  bivas.chatterjee@seed.reattend.local                  — Treasury Analyst (Kolkata)
  geetha.iyer@seed.reattend.local                       — Treasury Analyst (Bengaluru)
```

### Legal

```
nishant.doshi@seed.reattend.local      ◆ admin         — VP, Legal & Compliance (Mumbai)

  Legal / Compliance
  mira.rastogi@seed.reattend.local                      — Head of Compliance (Gurugram)
  jayashree.mukherjee@seed.reattend.local               — Compliance Officer (Kolkata)
  surya.reddy@seed.reattend.local                       — Compliance Officer (Bengaluru)

  Legal / Contracts
  sanika.phatak@seed.reattend.local                     — Head of Contracts (Mumbai)
  aarav.chadha@seed.reattend.local                      — Contracts Manager (Gurugram)
```

---

## Personas worth testing with

A handful of personas exercise every interesting RBAC + UX boundary.
When you only have time for 4-6, start here:

| Persona | Use to test |
|---|---|
| `vikrant.iyer@seed.reattend.local` (CEO) | Org-wide visibility, super_admin pages, every admin tool |
| `lakshmi.ramaswamy@seed.reattend.local` (VP Engineering) | Top-of-tree dept visibility — should see Backend / Frontend / Data / SRE / QA all under her view |
| `aditi.joshi@seed.reattend.local` (Director, Backend) | Mid-tree dept_head — should see Platform / API / Search but NOT Frontend |
| `priya.kapoor@seed.reattend.local` (EM, Platform) | Leaf-dept manager — should see Platform memories only |
| `meera.krishnan@seed.reattend.local` (Platform Engineer) | Leaf-dept IC — should see own + dept-shared only |
| `manasi.pawar@seed.reattend.local` (VP Sales) | Cross-tree: should NOT see anything in Engineering subtree |
| `mahua.pal@seed.reattend.local` (Regional Manager APAC) | 3-deep nesting test — manager of a sub-sub-dept |
| `aritra.sengupta@seed.reattend.local` (EA to CEO) | Lowest privilege user attached to the highest-value dept |

All passwords: `reattend-test-2026`

---

## AI providers

The test droplet uses **Groq only** (cheaper, sufficient for testing
logic). Production uses Claude for answering + Groq for ingestion.

`getAskLLM()` in `src/lib/ai/llm.ts` falls back to Groq when
`ANTHROPIC_API_KEY` is missing. The reranker silently no-ops (returns
top-K in FTS order). Result: the whole Ask + DeepThink pipeline answers
cleanly with just `GROQ_API_KEY`.

To set the Groq key on the test droplet:

```bash
ssh root@143.198.116.94 "sed -i 's|^GROQ_API_KEY=.*|GROQ_API_KEY=<your-key>|' /var/www/enterprise-test/.env.local && pm2 restart enterprise-test --update-env"
```

**Cost cap:** set the Groq dashboard's monthly spend limit to $20.
A runaway bot is contained at $20, not $2000.

---

## Things that are intentionally OFF on test

- **Paddle billing** — no webhooks, no subscriptions table activity.
  Every seed user has `tier='professional'` baked in.
- **Resend OTP** — the OTP code path is intact but pointless because
  the seed domain (`@seed.reattend.local`) has no inbox.
- **Anthropic / Claude** — `getAskLLM` falls back to Groq.
- **Sentry / GA** — same code paths fire but no traffic shows up
  unless someone configures the env vars.

---

## Visual marker — TEST ENV banner

Every page on `test.reattend.com` has a sticky red bar at the top
reading "TEST ENVIRONMENT — Data is fake, never paste real secrets".
Driven by `NEXT_PUBLIC_ENV=test` on the test droplet. Prod doesn't set
the var, banner doesn't render. See `src/components/test-env-banner.tsx`.

---

## Deploy / update workflow

```bash
ssh root@143.198.116.94 "cd /var/www/enterprise-test && \
  git pull && pm2 stop enterprise-test && rm -rf .next && \
  NODE_OPTIONS='--max-old-space-size=1600' npm run build && \
  pm2 start enterprise-test --update-env"
```

### Re-seeding

```bash
ssh root@143.198.116.94 "cd /var/www/enterprise-test && \
  npx tsx scripts/seed-test-org.ts --reset"
```

`--reset` defers FK checks, drops the org + all seed users + their
workspaces / subscriptions cleanly, then rebuilds. Without `--reset`
the script no-ops if the org already exists.

### Wipe everything (DB + schema + seed)

```bash
ssh root@143.198.116.94 "set -e && \
  cd /var/www/enterprise-test && \
  pm2 stop enterprise-test && \
  rm -f data/reattend.db data/reattend.db-shm data/reattend.db-wal && \
  DATABASE_PATH=/var/www/enterprise-test/data/reattend.db npx drizzle-kit migrate && \
  npx tsx src/lib/db/migrate.ts && \
  npx tsx scripts/seed-test-org.ts && \
  pm2 start enterprise-test --update-env"
```

---

## Common ad-hoc operations

### See pm2 status
```bash
ssh root@143.198.116.94 "pm2 describe enterprise-test | head -20"
```

### Tail live logs
```bash
ssh root@143.198.116.94 "pm2 logs enterprise-test --lines 50 --nostream"
```

### Print full roster from DB
```bash
ssh root@143.198.116.94 "sqlite3 /var/www/enterprise-test/data/reattend.db \
  'SELECT u.email, om.title FROM users u JOIN organization_members om ON om.user_id = u.id JOIN organizations o ON o.id = om.organization_id WHERE o.slug = \"seed-acme-india\" ORDER BY om.title'"
```

### Dept tree
```bash
ssh root@143.198.116.94 "sqlite3 /var/www/enterprise-test/data/reattend.db \
  'WITH RECURSIVE tree(id, name, parent_id, depth, path) AS (
    SELECT id, name, parent_id, 0, name FROM departments WHERE parent_id IS NULL AND organization_id IN (SELECT id FROM organizations WHERE slug=\"seed-acme-india\")
    UNION ALL
    SELECT d.id, d.name, d.parent_id, t.depth + 1, t.path || \" / \" || d.name FROM departments d JOIN tree t ON d.parent_id = t.id
  ) SELECT printf(\"%-4d %s\", depth, path) FROM tree ORDER BY path;'"
```

---

## What was changed in the codebase to support this

These all live in production code but are no-ops there because they're
env-gated:

| File | Purpose |
|---|---|
| `src/lib/auth/index.ts` | Adds `test-password` credentials provider, gated on `ALLOW_TEST_PASSWORD_LOGIN=true` AND `@seed.reattend.local` email |
| `src/lib/ai/llm.ts` | `getAskLLM` falls back to Groq when no Anthropic key |
| `src/app/test-login/page.tsx` | Login form for seed users; 404s on prod via env gate |
| `src/components/test-env-banner.tsx` | Red sticky banner; renders only when `NEXT_PUBLIC_ENV=test` |
| `scripts/seed-test-org.ts` | The 163-user seeder, idempotent with `--reset` |

If any of these breaks on prod, check: did someone accidentally set
`ALLOW_TEST_PASSWORD_LOGIN=true` or `NEXT_PUBLIC_ENV=test` in
`/var/www/enterprise/.env.local`? Both should be absent on prod.

---

## Future cleanups

- Stand up a GitHub Action so every `main` push deploys to test before
  prod sees it. ETA: when test feels stable enough that auto-deploy
  doesn't risk losing dev time to a bad build.
- Add `robots.txt` disallow + `<meta noindex>` so search engines don't
  index the test pages.
- If we ever need real org-wide AI cost telemetry on test, wire
  Anthropic too — the env-fallback in `getAskLLM` will start using it
  the moment the key is present.
