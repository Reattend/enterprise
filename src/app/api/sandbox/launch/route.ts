import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { issueSsoTicket } from '@/lib/sso/oidc'
import { handleEnterpriseError } from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// POST /api/sandbox/launch
// Body: { role: 'super_admin' | 'admin' | 'dept_head' | 'member' | 'guest' }
//
// Public door. For each visitor we:
//   1. Clone the seeded demo org (slug='demo-mof') into a fresh sandbox org
//   2. Clone the demo's users as ghost authors so records keep their original
//      authorship (sandbox visitor doesn't accidentally pass Rule 2 "creator
//      sees own" on records they didn't create)
//   3. Create a sandbox login user, add them to the org with the requested
//      role and to dept_members per role's reach
//   4. Wire workspace_members per role's accessible departments only
//   5. Issue a 60-second SSO ticket the browser trades for a session cookie
//
// RBAC follows the live system without bypasses:
//   super_admin / admin → Rule 1 short-circuit (sees all)
//   dept_head           → only the International Taxation tree
//   member              → only the International Taxation tree, no manage
//   guest               → no dept access, no workspace_members; sees only
//                         records explicitly shared via record_shares (none
//                         seeded), so the org appears mostly empty — exactly
//                         what a guest should see
//
// Sandbox users live in the sandbox org only; their email suffix
// '@sandbox.reattend.local' triggers AI fixture mode in every endpoint.
//
// Cleanup at /api/sandbox/cleanup nukes orgs LIKE 'sandbox-%' older than 1h.

const ROLE_LABELS: Record<string, { name: string; title: string }> = {
  super_admin: { name: 'Aarti Mehta',     title: 'Secretary · Super Admin' },
  admin:       { name: 'Hiroshi Tanaka',  title: 'Joint Secretary · Admin' },
  dept_head:   { name: 'Adaeze Okonkwo',  title: 'Director, International Taxation' },
  member:      { name: 'Sofia Martinez',  title: 'Deputy Director, Cross-Border Tax' },
  guest:       { name: 'Daniel Schwartz', title: 'External Legal Advisor (Guest)' },
}

const VALID_ROLES = new Set(['super_admin', 'admin', 'dept_head', 'member', 'guest'])

// Identifies the dept the dept_head/member personas land in. Has to match
// something in the demo seed; "International Taxation" is the demo's
// most decision-rich department.
const SCOPED_DEPT_HINT = /taxation|finance/i

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const role = (body.role as string) || 'super_admin'
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'invalid role' }, { status: 400 })
    }

    const seed = await db.query.organizations.findFirst({
      where: eq(schema.organizations.slug, 'demo-mof'),
    })
    if (!seed) {
      return NextResponse.json({
        error: 'demo org not seeded — admin must run npm run seed:demo first',
      }, { status: 503 })
    }

    const sandboxSuffix = crypto.randomUUID().slice(0, 8)
    const newOrgId = crypto.randomUUID()
    const newSlug = `sandbox-${sandboxSuffix}`
    const sandboxName = `${seed.name} (Sandbox)`

    await db.insert(schema.organizations).values({
      id: newOrgId,
      name: sandboxName,
      slug: newSlug,
      primaryDomain: null,
      plan: seed.plan,
      deployment: seed.deployment,
      onPremRabbitUrl: null,
      seatLimit: null,
      status: 'active',
      settings: seed.settings,
      createdBy: seed.createdBy,
    })

    const persona = ROLE_LABELS[role]
    const sandboxUserId = crypto.randomUUID()
    const sandboxUserEmail = `sb-${sandboxSuffix}@sandbox.reattend.local`
    await db.insert(schema.users).values({
      id: sandboxUserId,
      email: sandboxUserEmail,
      name: persona.name,
      onboardingCompleted: true,
    })

    const orgRole: 'super_admin' | 'admin' | 'member' | 'guest' =
      role === 'super_admin' ? 'super_admin'
      : role === 'admin' ? 'admin'
      : role === 'guest' ? 'guest'
      : 'member'

    await db.insert(schema.organizationMembers).values({
      id: crypto.randomUUID(),
      organizationId: newOrgId,
      userId: sandboxUserId,
      role: orgRole,
      status: 'active',
      title: persona.title,
    })

    // Personal workspace — required by requireAuth(). Not linked to the org,
    // so it doesn't leak the visitor any enterprise visibility. Guests would
    // otherwise have zero workspace_members rows and fail auth at the door.
    const personalWsId = crypto.randomUUID()
    await db.insert(schema.workspaces).values({
      id: personalWsId,
      name: `${persona.name.split(' ')[0]}'s Personal`,
      type: 'personal',
      createdBy: sandboxUserId,
    })
    await db.insert(schema.workspaceMembers).values({
      id: crypto.randomUUID(),
      workspaceId: personalWsId,
      userId: sandboxUserId,
      role: 'owner',
    })

    await cloneOrgData({
      srcOrgId: seed.id,
      dstOrgId: newOrgId,
      sandboxUserId,
      orgRole,
      roleKey: role,
    })

    const secret = process.env.NEXTAUTH_SECRET || 'dev-fallback-do-not-use'
    const ticket = await issueSsoTicket({
      userId: sandboxUserId,
      email: sandboxUserEmail,
      organizationId: newOrgId,
      secret,
    })

    return NextResponse.json({
      ticket,
      sandboxOrgId: newOrgId,
      personaName: persona.name,
      personaTitle: persona.title,
      role,
    }, { status: 201 })
  } catch (err) {
    console.error('[sandbox launch]', err)
    return handleEnterpriseError(err)
  }
}

interface CloneArgs {
  srcOrgId: string
  dstOrgId: string
  sandboxUserId: string
  orgRole: string
  roleKey: string
}

async function cloneOrgData(args: CloneArgs) {
  const { srcOrgId, dstOrgId, sandboxUserId, orgRole, roleKey } = args

  // ─── Ghost authors: clone every user referenced by the source org ──
  // We need their rows so records.createdBy / decisions.decidedByUserId etc
  // continue to point at "real authors". Without this, every cloned record
  // would be attributed to the sandbox login user, granting them visibility
  // via Rule 2 (creator always sees) and bypassing dept-level RBAC.
  const userIdMap = new Map<string, string>()

  // Source org members + the source org's own creator
  const srcMembers = await db.select({ userId: schema.organizationMembers.userId })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.organizationId, srcOrgId))
  const srcOrg = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, srcOrgId) })
  const ghostIds = new Set<string>(srcMembers.map((m) => m.userId))
  if (srcOrg?.createdBy) ghostIds.add(srcOrg.createdBy)

  if (ghostIds.size > 0) {
    const srcUsers = await db.select()
      .from(schema.users)
      .where(inArray(schema.users.id, Array.from(ghostIds)))

    for (const u of srcUsers) {
      const newId = crypto.randomUUID()
      userIdMap.set(u.id, newId)
      // Email needs to be unique across all users; suffix with sandbox tag
      const ghostEmail = `ghost-${dstOrgId.slice(0, 8)}-${u.id.slice(0, 8)}@sandbox.reattend.local`
      await db.insert(schema.users).values({
        id: newId,
        email: ghostEmail,
        name: u.name,
        avatarUrl: u.avatarUrl,
        onboardingCompleted: true,
      })
    }
  }

  // Helper: rewrite an old user id to its ghost; null if unmapped
  const mapU = (oldId: string | null | undefined): string | null => {
    if (!oldId) return null
    return userIdMap.get(oldId) ?? null
  }

  // ─── Departments (two-pass for parent_id) ────────────────
  const oldDepts = await db.select().from(schema.departments).where(eq(schema.departments.organizationId, srcOrgId))
  const deptIdMap = new Map<string, string>()
  for (const d of oldDepts) deptIdMap.set(d.id, crypto.randomUUID())
  for (const d of oldDepts) {
    await db.insert(schema.departments).values({
      id: deptIdMap.get(d.id)!,
      organizationId: dstOrgId,
      parentId: d.parentId ? (deptIdMap.get(d.parentId) ?? null) : null,
      kind: d.kind,
      name: d.name,
      slug: d.slug,
      description: d.description,
    })
  }

  // ─── Pick a "scoped dept" for dept_head / member personas ──
  // International Taxation tree if found, else first dept.
  const scopedDeptOld = oldDepts.find((d) => SCOPED_DEPT_HINT.test(d.name)) || oldDepts[0]
  const scopedDeptId = scopedDeptOld ? deptIdMap.get(scopedDeptOld.id)! : null

  // Compute the set of accessible department ids for this role
  const accessibleDeptIds = new Set<string>()
  if (orgRole === 'super_admin' || orgRole === 'admin') {
    // Admins see everything; this set is informational only since RBAC
    // short-circuits on org role for them.
    for (const d of oldDepts) accessibleDeptIds.add(deptIdMap.get(d.id)!)
  } else if ((roleKey === 'dept_head' || roleKey === 'member') && scopedDeptOld) {
    // Add the scoped dept + all descendants so Rule 4 (team via dept fallback)
    // and Rule 5 (department visibility) work for the whole subtree.
    const descendants = computeDescendantIds(oldDepts, scopedDeptOld.id)
    descendants.forEach((oid) => {
      const newId = deptIdMap.get(oid)
      if (newId) accessibleDeptIds.add(newId)
    })
  }
  // guest: empty set on purpose

  // ─── Clone source's department_members so the org tree shows people ──
  // We re-attribute each row to its ghost user. This makes the sandbox org
  // feel populated when the visitor opens /admin/<orgId>/members.
  const srcDeptMembers = await db.select()
    .from(schema.departmentMembers)
    .where(eq(schema.departmentMembers.organizationId, srcOrgId))
  for (const dm of srcDeptMembers) {
    const ghost = mapU(dm.userId)
    const newDeptId = deptIdMap.get(dm.departmentId)
    if (!ghost || !newDeptId) continue
    await db.insert(schema.departmentMembers).values({
      id: crypto.randomUUID(),
      departmentId: newDeptId,
      organizationId: dstOrgId,
      userId: ghost,
      role: dm.role,
    }).catch(() => { /* tolerated dupe */ })
  }

  // Same for organization_members of the source — populates the people list.
  const srcOrgMembers = await db.select()
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.organizationId, srcOrgId))
  for (const om of srcOrgMembers) {
    const ghost = mapU(om.userId)
    if (!ghost) continue
    await db.insert(schema.organizationMembers).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      userId: ghost,
      role: om.role,
      status: om.status,
      title: om.title,
    }).catch(() => { /* sandbox user already inserted; ghosts shouldn't collide */ })
  }

  // ─── Add the sandbox login user to dept_members per role ──
  if (orgRole === 'super_admin' || orgRole === 'admin') {
    // dept_members not strictly needed (Rule 1 covers them) but seed one
    // entry on the scoped dept so /admin/<orgId>/members shows them anchored.
    if (scopedDeptId) {
      await db.insert(schema.departmentMembers).values({
        id: crypto.randomUUID(),
        departmentId: scopedDeptId,
        organizationId: dstOrgId,
        userId: sandboxUserId,
        role: orgRole === 'super_admin' ? 'dept_head' : 'manager',
      }).catch(() => {})
    }
  } else if (roleKey === 'dept_head' || roleKey === 'member') {
    if (scopedDeptId) {
      await db.insert(schema.departmentMembers).values({
        id: crypto.randomUUID(),
        departmentId: scopedDeptId,
        organizationId: dstOrgId,
        userId: sandboxUserId,
        role: roleKey === 'dept_head' ? 'dept_head' : 'member',
      }).catch(() => {})
    }
  }
  // guest: nothing

  // ─── Workspaces + workspace_org_links ────────────────────
  const oldLinks = await db.select().from(schema.workspaceOrgLinks).where(eq(schema.workspaceOrgLinks.organizationId, srcOrgId))
  const wsIdMap = new Map<string, string>()
  // The seed creator is the canonical workspace.createdBy author
  const ghostCreator = srcOrg?.createdBy ? userIdMap.get(srcOrg.createdBy)! : sandboxUserId

  for (const l of oldLinks) {
    const oldWs = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, l.workspaceId) })
    if (!oldWs) continue
    const newWsId = crypto.randomUUID()
    wsIdMap.set(l.workspaceId, newWsId)
    await db.insert(schema.workspaces).values({
      id: newWsId,
      name: `[Sandbox] ${oldWs.name}`,
      type: oldWs.type,
      createdBy: ghostCreator,
    })
    await db.insert(schema.workspaceOrgLinks).values({
      workspaceId: newWsId,
      organizationId: dstOrgId,
      departmentId: l.departmentId ? (deptIdMap.get(l.departmentId) ?? null) : null,
      visibility: l.visibility,
    })
    // Workspace_members: scope per role.
    //   super_admin / admin: skip — Rule 1 short-circuits in RBAC.
    //   dept_head / member: only workspaces linked to their accessible depts,
    //     OR org_wide visibility workspaces (which Rule applies via list).
    //   guest: never.
    const newDeptForWs = l.departmentId ? deptIdMap.get(l.departmentId) : null
    let shouldJoinWs = false
    if (orgRole === 'super_admin' || orgRole === 'admin') {
      // Don't add — Rule 1 covers it. Workspace listing for admins ignores
      // workspace_members and uses the org links directly.
      shouldJoinWs = false
    } else if (roleKey === 'dept_head' || roleKey === 'member') {
      if (l.visibility === 'org_wide') {
        shouldJoinWs = true
      } else if (newDeptForWs && accessibleDeptIds.has(newDeptForWs)) {
        shouldJoinWs = true
      }
    }
    // guest: no workspace_members at all
    if (shouldJoinWs) {
      await db.insert(schema.workspaceMembers).values({
        id: crypto.randomUUID(),
        workspaceId: newWsId,
        userId: sandboxUserId,
        role: roleKey === 'dept_head' ? 'admin' : 'member',
      }).catch(() => {})
    }
  }

  // ─── Records ─────────────────────────────────────────────
  const recordIdMap = new Map<string, string>()
  if (wsIdMap.size > 0) {
    const oldWsIds = Array.from(wsIdMap.keys())
    const oldRecords = await db.select().from(schema.records)
      .where(sql`${schema.records.workspaceId} IN (${sql.join(oldWsIds.map((id) => sql`${id}`), sql`, `)})`)

    for (const r of oldRecords) {
      const newId = crypto.randomUUID()
      recordIdMap.set(r.id, newId)
      const newWsId = wsIdMap.get(r.workspaceId)
      if (!newWsId) continue
      // Re-attribute to the ghost author. Falls back to the org's seed creator
      // ghost if the original createdBy wasn't an org member (rare).
      const author = mapU(r.createdBy) ?? ghostCreator
      await db.insert(schema.records).values({
        id: newId,
        workspaceId: newWsId,
        rawItemId: null,
        type: r.type,
        title: r.title,
        summary: r.summary,
        content: r.content,
        confidence: r.confidence,
        tags: r.tags,
        locked: r.locked,
        source: r.source,
        sourceId: null,
        occurredAt: r.occurredAt,
        meta: r.meta,
        triageStatus: r.triageStatus,
        visibility: r.visibility,
        verifyEveryDays: r.verifyEveryDays,
        lastVerifiedAt: r.lastVerifiedAt,
        verifiedByUserId: mapU(r.verifiedByUserId),
        legalHold: r.legalHold,
        retentionUntil: r.retentionUntil,
        ocrConfidence: r.ocrConfidence,
        createdBy: author,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })
    }
  }

  // ─── Decisions ───────────────────────────────────────────
  const oldDecisions = await db.select().from(schema.decisions).where(eq(schema.decisions.organizationId, srcOrgId))
  for (const d of oldDecisions) {
    const newWsId = d.workspaceId ? wsIdMap.get(d.workspaceId) : null
    if (!newWsId) continue
    await db.insert(schema.decisions).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      departmentId: d.departmentId ? (deptIdMap.get(d.departmentId) ?? null) : null,
      workspaceId: newWsId,
      recordId: d.recordId ? (recordIdMap.get(d.recordId) ?? null) : null,
      title: d.title,
      context: d.context,
      rationale: d.rationale,
      outcome: d.outcome,
      decidedByUserId: mapU(d.decidedByUserId) ?? ghostCreator,
      decidedByRoleId: null,
      decidedAt: d.decidedAt,
      status: d.status,
      reversedAt: d.reversedAt,
      reversedByUserId: mapU(d.reversedByUserId),
      reversedReason: d.reversedReason,
      tags: d.tags,
    })
  }

  // ─── Policies (+ versions) ───────────────────────────────
  const oldPolicies = await db.select().from(schema.policies).where(eq(schema.policies.organizationId, srcOrgId))
  const policyIdMap = new Map<string, string>()
  const versionIdMap = new Map<string, string>()
  for (const p of oldPolicies) {
    const newPolicyId = crypto.randomUUID()
    policyIdMap.set(p.id, newPolicyId)
    // 1. Insert policy with currentVersionId=null first
    await db.insert(schema.policies).values({
      id: newPolicyId,
      organizationId: dstOrgId,
      title: p.title,
      slug: p.slug,
      category: p.category,
      iconName: p.iconName,
      status: p.status,
      currentVersionId: null,
      effectiveDate: p.effectiveDate,
      applicability: p.applicability,
      createdBy: mapU(p.createdBy) ?? ghostCreator,
    })
    // 2. Insert versions
    const oldVersions = await db.select().from(schema.policyVersions).where(eq(schema.policyVersions.policyId, p.id))
    let newCurrentVersionId: string | null = null
    for (const v of oldVersions) {
      const newVId = crypto.randomUUID()
      versionIdMap.set(v.id, newVId)
      if (v.id === p.currentVersionId) newCurrentVersionId = newVId
      await db.insert(schema.policyVersions).values({
        id: newVId,
        policyId: newPolicyId,
        versionNumber: v.versionNumber,
        title: v.title,
        summary: v.summary,
        body: v.body,
        requiresReAck: v.requiresReAck,
        changeNote: v.changeNote,
        supersedesVersionId: v.supersedesVersionId ? versionIdMap.get(v.supersedesVersionId) ?? null : null,
        publishedAt: v.publishedAt,
        publishedByUserId: mapU(v.publishedByUserId),
      })
    }
    // 3. Patch currentVersionId
    if (newCurrentVersionId) {
      await db.update(schema.policies)
        .set({ currentVersionId: newCurrentVersionId })
        .where(eq(schema.policies.id, newPolicyId))
    }
  }

  // ─── Agents ──────────────────────────────────────────────
  const oldAgents = await db.select().from(schema.agents).where(eq(schema.agents.organizationId, srcOrgId))
  for (const a of oldAgents) {
    await db.insert(schema.agents).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      tier: a.tier,
      departmentId: a.departmentId ? (deptIdMap.get(a.departmentId) ?? null) : null,
      ownerUserId: mapU(a.ownerUserId) ?? ghostCreator,
      name: a.name,
      slug: a.slug,
      description: a.description,
      iconName: a.iconName,
      color: a.color,
      systemPrompt: a.systemPrompt,
      scopeConfig: a.scopeConfig,
      deploymentTargets: a.deploymentTargets,
      usageCount: a.usageCount,
      status: a.status,
      createdBy: mapU(a.createdBy) ?? ghostCreator,
    })
  }

  // ─── Announcements ───────────────────────────────────────
  const oldAnnouncements = await db.select().from(schema.announcements).where(eq(schema.announcements.organizationId, srcOrgId))
  for (const a of oldAnnouncements) {
    await db.insert(schema.announcements).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      createdByUserId: mapU(a.createdByUserId) ?? ghostCreator,
      title: a.title,
      body: a.body,
      tone: a.tone,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      active: a.active,
    })
  }

  // ─── Prompt library ──────────────────────────────────────
  const oldPrompts = await db.select().from(schema.promptLibrary).where(eq(schema.promptLibrary.organizationId, srcOrgId))
  for (const p of oldPrompts) {
    await db.insert(schema.promptLibrary).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      createdByUserId: mapU(p.createdByUserId) ?? ghostCreator,
      title: p.title,
      body: p.body,
      tags: p.tags,
      usageCount: p.usageCount,
    })
  }

  // ─── Calendar events ─────────────────────────────────────
  const oldEvents = await db.select().from(schema.calendarEvents).where(eq(schema.calendarEvents.organizationId, srcOrgId))
  for (const e of oldEvents) {
    const newWsId = e.workspaceId ? wsIdMap.get(e.workspaceId) : null
    await db.insert(schema.calendarEvents).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      workspaceId: newWsId ?? null,
      title: e.title,
      startAt: e.startAt,
      endAt: e.endAt,
      attendeeEmails: e.attendeeEmails,
      location: e.location,
      description: e.description,
      source: e.source,
      createdBy: mapU(e.createdBy) ?? ghostCreator,
    })
  }

  // ─── Exit interviews + handoff doc ───────────────────────
  const oldInterviews = await db.select().from(schema.exitInterviews).where(eq(schema.exitInterviews.organizationId, srcOrgId))
  for (const i of oldInterviews) {
    await db.insert(schema.exitInterviews).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      departingUserId: mapU(i.departingUserId) ?? ghostCreator,
      initiatedByUserId: mapU(i.initiatedByUserId) ?? ghostCreator,
      roleTitle: i.roleTitle,
      status: i.status,
      questions: i.questions,
      handoffDoc: i.handoffDoc,
      handoffRecordId: i.handoffRecordId ? (recordIdMap.get(i.handoffRecordId) ?? null) : null,
      completedAt: i.completedAt,
    })
  }

  // ─── OCR jobs ────────────────────────────────────────────
  if (wsIdMap.size > 0) {
    const oldOcr = await db.select().from(schema.ocrJobs).where(eq(schema.ocrJobs.organizationId, srcOrgId))
    for (const j of oldOcr) {
      const newWsId = wsIdMap.get(j.workspaceId)
      if (!newWsId) continue
      await db.insert(schema.ocrJobs).values({
        id: crypto.randomUUID(),
        organizationId: dstOrgId,
        workspaceId: newWsId,
        fileName: j.fileName,
        fileSize: j.fileSize,
        mimeType: j.mimeType,
        sourceHash: j.sourceHash,
        language: j.language,
        status: j.status,
        pageCount: j.pageCount,
        avgConfidence: j.avgConfidence,
        redactionCount: j.redactionCount,
        extractedTextLength: j.extractedTextLength,
        resultRecordId: j.resultRecordId ? (recordIdMap.get(j.resultRecordId) ?? null) : null,
        errorMessage: j.errorMessage,
        createdBy: mapU(j.createdBy) ?? ghostCreator,
        batchId: j.batchId,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
      })
    }
  }
}

// Returns the set of department ids in the subtree rooted at `rootId`.
// Used to expand a dept_head/member's accessible-dept set so descendants
// roll up cleanly under Rule 4/5.
function computeDescendantIds(
  depts: Array<{ id: string; parentId: string | null }>,
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string, string[]>()
  for (const d of depts) {
    if (!d.parentId) continue
    const list = childrenByParent.get(d.parentId) ?? []
    list.push(d.id)
    childrenByParent.set(d.parentId, list)
  }
  const result = new Set<string>([rootId])
  const queue = [rootId]
  while (queue.length) {
    const cur = queue.shift()!
    const kids = childrenByParent.get(cur) ?? []
    for (const k of kids) {
      if (!result.has(k)) {
        result.add(k)
        queue.push(k)
      }
    }
  }
  return result
}
