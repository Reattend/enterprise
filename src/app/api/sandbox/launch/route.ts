import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, like, sql } from 'drizzle-orm'
import { issueSsoTicket } from '@/lib/sso/oidc'
import { handleEnterpriseError } from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// POST /api/sandbox/launch
// Body: { role: 'super_admin' | 'admin' | 'dept_head' | 'member' | 'guest' }
//
// No auth required — this is the public "try it now" door. Each call:
//   1. Clones the seeded demo org (slug='demo-mof') into a fresh sandbox org
//   2. Creates a sandbox user with the requested role
//   3. Issues an SSO-style 60s ticket the browser trades for a session cookie
//   4. Returns { ticket } — the client calls signIn('sso-ticket', ...) with it
//
// Cleanup is handled by a cron at /api/sandbox/cleanup that drops orgs
// matching slug LIKE 'sandbox-%' older than 1 hour.

const ROLE_LABELS: Record<string, { name: string; title: string }> = {
  super_admin: { name: 'Aarti Mehta',   title: 'Secretary · Super Admin' },
  admin:       { name: 'Vikram Rao',    title: 'Joint Secretary · Admin' },
  dept_head:   { name: 'Rajiv Sharma',  title: 'Director, International Taxation' },
  member:      { name: 'Priya Iyer',    title: 'Deputy Director, Cross-Border Tax' },
  guest:       { name: 'Sanjay Verma',  title: 'External Legal Advisor (Guest)' },
}

const VALID_ROLES = new Set(['super_admin', 'admin', 'dept_head', 'member', 'guest'])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const role = (body.role as string) || 'super_admin'
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'invalid role' }, { status: 400 })
    }

    // Find the canonical seed org. Demo org seeder uses slug='demo-mof'.
    const seed = await db.query.organizations.findFirst({
      where: eq(schema.organizations.slug, 'demo-mof'),
    })
    if (!seed) {
      return NextResponse.json({
        error: 'demo org not seeded — admin must run npm run seed:demo first',
      }, { status: 503 })
    }

    // Clone the org with a brand-new id + sandbox slug
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

    // Create the sandbox user. Email-suffix '@sandbox.reattend.local' is the
    // canonical marker — middleware reads this to disable AI features.
    const persona = ROLE_LABELS[role]
    const userId = crypto.randomUUID()
    const userEmail = `sb-${sandboxSuffix}@sandbox.reattend.local`
    await db.insert(schema.users).values({
      id: userId,
      email: userEmail,
      name: persona.name,
      onboardingCompleted: true,
    })

    // Map our role keys to org membership roles.
    const orgRole: 'super_admin' | 'admin' | 'member' | 'guest' =
      role === 'super_admin' ? 'super_admin'
      : role === 'admin' ? 'admin'
      : role === 'guest' ? 'guest'
      : 'member'

    await db.insert(schema.organizationMembers).values({
      id: crypto.randomUUID(),
      organizationId: newOrgId,
      userId,
      role: orgRole,
      status: 'active',
      title: persona.title,
    })

    // Clone seeded data — departments, workspaces, members (as observers),
    // records, decisions, policies, OCR jobs, exit interviews, etc. We do
    // a shallow copy keyed off org_id, remapping ids as we go. Tables we
    // skip: api_tokens (sandbox doesn't get tokens), audit_log (sandbox
    // makes its own), sandbox-specific stuff.
    await cloneOrgData(seed.id, newOrgId, userId, orgRole, role)

    // Issue a 60-sec ticket the browser trades for a session
    const secret = process.env.NEXTAUTH_SECRET || 'dev-fallback-do-not-use'
    const ticket = await issueSsoTicket({
      userId,
      email: userEmail,
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

// Shallow clone of org-scoped data: depts → workspaces → records → decisions
// → policies → exit interviews → ocr jobs → announcements → calendar → prompts.
// Records keyed by old id → new id so cross-references rewrite correctly.
async function cloneOrgData(srcOrgId: string, dstOrgId: string, sandboxUserId: string, orgRole: string, roleKey: string) {
  // ─── Departments ─────────────────────────────────────────
  const oldDepts = await db.select().from(schema.departments).where(eq(schema.departments.organizationId, srcOrgId))
  const deptIdMap = new Map<string, string>()
  // First pass: create with null parent so we can resolve in second pass
  for (const d of oldDepts) {
    const newId = crypto.randomUUID()
    deptIdMap.set(d.id, newId)
  }
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

  // ─── Workspaces + workspace_org_links ────────────────────
  const oldLinks = await db.select().from(schema.workspaceOrgLinks).where(eq(schema.workspaceOrgLinks.organizationId, srcOrgId))
  const wsIdMap = new Map<string, string>()
  for (const l of oldLinks) {
    const oldWs = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, l.workspaceId) })
    if (!oldWs) continue
    const newWsId = crypto.randomUUID()
    wsIdMap.set(l.workspaceId, newWsId)
    await db.insert(schema.workspaces).values({
      id: newWsId,
      name: `[Sandbox] ${oldWs.name}`,
      type: oldWs.type,
      createdBy: sandboxUserId,
    })
    await db.insert(schema.workspaceMembers).values({
      id: crypto.randomUUID(),
      workspaceId: newWsId,
      userId: sandboxUserId,
      role: 'owner',
    })
    await db.insert(schema.workspaceOrgLinks).values({
      workspaceId: newWsId,
      organizationId: dstOrgId,
      departmentId: l.departmentId ? (deptIdMap.get(l.departmentId) ?? null) : null,
      visibility: l.visibility,
    })
  }

  // ─── Department membership for sandbox user ──────────────
  // Give super_admin / admin access to every dept; member to a single dept;
  // dept_head to the seeded "International Taxation" dept; guest to nothing.
  if (orgRole === 'super_admin' || orgRole === 'admin') {
    for (const d of oldDepts) {
      const newDeptId = deptIdMap.get(d.id)!
      await db.insert(schema.departmentMembers).values({
        id: crypto.randomUUID(),
        departmentId: newDeptId,
        organizationId: dstOrgId,
        userId: sandboxUserId,
        role: orgRole === 'super_admin' ? 'dept_head' : 'manager',
      }).catch(() => { /* tolerated */ })
    }
  } else if (roleKey === 'dept_head' || roleKey === 'member') {
    // Pick the largest dept (most descendants) so they have stuff to look at
    const target = oldDepts.find((d) => d.name.toLowerCase().includes('taxation') || d.name.toLowerCase().includes('finance')) || oldDepts[0]
    if (target) {
      await db.insert(schema.departmentMembers).values({
        id: crypto.randomUUID(),
        departmentId: deptIdMap.get(target.id)!,
        organizationId: dstOrgId,
        userId: sandboxUserId,
        role: roleKey === 'dept_head' ? 'dept_head' : 'member',
      }).catch(() => { /* tolerated */ })
    }
  }

  // ─── Records ─────────────────────────────────────────────
  const recordIdMap = new Map<string, string>()
  if (wsIdMap.size > 0) {
    const oldWsIds = Array.from(wsIdMap.keys())
    const oldRecords = oldWsIds.length > 0
      ? await db.select().from(schema.records).where(sql`${schema.records.workspaceId} IN (${sql.join(oldWsIds.map((id) => sql`${id}`), sql`, `)})`)
      : []
    for (const r of oldRecords) {
      const newId = crypto.randomUUID()
      recordIdMap.set(r.id, newId)
      const newWsId = wsIdMap.get(r.workspaceId)
      if (!newWsId) continue
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
        verifiedByUserId: null,
        legalHold: r.legalHold,
        retentionUntil: r.retentionUntil,
        ocrConfidence: r.ocrConfidence,
        createdBy: sandboxUserId, // re-attribute to sandbox user
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
      decidedByUserId: sandboxUserId,
      decidedByRoleId: null,
      decidedAt: d.decidedAt,
      status: d.status,
      reversedAt: d.reversedAt,
      reversedByUserId: d.reversedByUserId ? sandboxUserId : null,
      reversedReason: d.reversedReason,
      tags: d.tags,
    })
  }

  // ─── Policies (+ versions, ack rows are skipped — fresh sandbox) ─────
  const oldPolicies = await db.select().from(schema.policies).where(eq(schema.policies.organizationId, srcOrgId))
  const policyIdMap = new Map<string, string>()
  const versionIdMap = new Map<string, string>()
  for (const p of oldPolicies) {
    const newPolicyId = crypto.randomUUID()
    policyIdMap.set(p.id, newPolicyId)
    // Versions
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
        publishedByUserId: v.publishedByUserId ? sandboxUserId : null,
      })
    }
    await db.insert(schema.policies).values({
      id: newPolicyId,
      organizationId: dstOrgId,
      title: p.title,
      slug: p.slug,
      category: p.category,
      iconName: p.iconName,
      status: p.status,
      currentVersionId: newCurrentVersionId,
      effectiveDate: p.effectiveDate,
      applicability: p.applicability,
      createdBy: sandboxUserId,
    })
  }

  // ─── Agents ──────────────────────────────────────────────
  const oldAgents = await db.select().from(schema.agents).where(eq(schema.agents.organizationId, srcOrgId))
  for (const a of oldAgents) {
    await db.insert(schema.agents).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      tier: a.tier,
      departmentId: a.departmentId ? (deptIdMap.get(a.departmentId) ?? null) : null,
      ownerUserId: sandboxUserId,
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
      createdBy: sandboxUserId,
    })
  }

  // ─── Announcements ───────────────────────────────────────
  const oldAnnouncements = await db.select().from(schema.announcements).where(eq(schema.announcements.organizationId, srcOrgId))
  for (const a of oldAnnouncements) {
    await db.insert(schema.announcements).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      createdByUserId: sandboxUserId,
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
      createdByUserId: sandboxUserId,
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
      createdBy: sandboxUserId,
    })
  }

  // ─── Exit interviews + handoff doc ───────────────────────
  const oldInterviews = await db.select().from(schema.exitInterviews).where(eq(schema.exitInterviews.organizationId, srcOrgId))
  for (const i of oldInterviews) {
    await db.insert(schema.exitInterviews).values({
      id: crypto.randomUUID(),
      organizationId: dstOrgId,
      departingUserId: sandboxUserId,
      initiatedByUserId: sandboxUserId,
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
        createdBy: sandboxUserId,
        batchId: j.batchId,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
      })
    }
  }
}
