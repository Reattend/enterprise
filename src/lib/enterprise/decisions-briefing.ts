// Decisions briefing exporter.
//
// Produces a handover-ready markdown document listing every active decision
// in scope plus the supersession / reversal chains. The target reader is
// the next role-holder, a new exec joining, or the board quarterly review.
//
// This is the amnesia-cure artifact: instead of "ask around and pray",
// the incoming person gets the complete decision trail for the scope they
// inherit.

import { db, schema } from '../db'
import { and, eq, gte, lte, inArray, desc, or } from 'drizzle-orm'

export interface BriefingScope {
  organizationId: string
  departmentId?: string | null
  roleId?: string | null
  userId?: string | null   // for "hand Partha's decisions to Aditi" briefings
  fromIso?: string | null
  toIso?: string | null
}

export interface BriefingResult {
  markdown: string
  rowCount: number
  activeCount: number
  reversedCount: number
  supersededCount: number
}

function escapeMd(s: string | null | undefined): string {
  if (!s) return ''
  // Minimal escape: pipe + backtick + brackets. Enough for the fields we use.
  return String(s).replace(/\|/g, '\\|').replace(/`/g, '\\`')
}

export async function buildDecisionsBriefing(scope: BriefingScope): Promise<BriefingResult> {
  // Build the where-clause
  const conds = [eq(schema.decisions.organizationId, scope.organizationId)]
  if (scope.departmentId) conds.push(eq(schema.decisions.departmentId, scope.departmentId))
  if (scope.userId) conds.push(eq(schema.decisions.decidedByUserId, scope.userId))
  if (scope.roleId) conds.push(eq(schema.decisions.decidedByRoleId, scope.roleId))
  if (scope.fromIso) conds.push(gte(schema.decisions.decidedAt, scope.fromIso))
  if (scope.toIso) conds.push(lte(schema.decisions.decidedAt, scope.toIso))

  const rows = await db
    .select()
    .from(schema.decisions)
    .where(and(...conds))
    .orderBy(desc(schema.decisions.decidedAt))

  // Resolve org, dept, role, user labels in batch
  const [orgRow] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, scope.organizationId)).limit(1)

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.decidedByUserId, r.reversedByUserId].filter((x): x is string => !!x))))
  const users = userIds.length
    ? await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
        .from(schema.users).where(inArray(schema.users.id, userIds))
    : []
  const userById = new Map(users.map((u) => [u.id, u]))

  const roleIds = Array.from(new Set(rows.map((r) => r.decidedByRoleId).filter((x): x is string => !!x)))
  const roles = roleIds.length
    ? await db.select({ id: schema.employeeRoles.id, title: schema.employeeRoles.title })
        .from(schema.employeeRoles).where(inArray(schema.employeeRoles.id, roleIds))
    : []
  const roleById = new Map(roles.map((r) => [r.id, r]))

  const deptIds = Array.from(new Set(rows.map((r) => r.departmentId).filter((x): x is string => !!x)))
  const depts = deptIds.length
    ? await db.select({ id: schema.departments.id, name: schema.departments.name })
        .from(schema.departments).where(inArray(schema.departments.id, deptIds))
    : []
  const deptById = new Map(depts.map((d) => [d.id, d]))

  // Supersession map: decisionId → the decision it was superseded by
  const supersededBy = new Map<string, string>()
  for (const r of rows) {
    if (r.supersededById) supersededBy.set(r.id, r.supersededById)
  }

  // Partition by status
  const active = rows.filter((r) => r.status === 'active')
  const reversed = rows.filter((r) => r.status === 'reversed')
  const superseded = rows.filter((r) => r.status === 'superseded')
  const archived = rows.filter((r) => r.status === 'archived')

  const scopeLabel = describeScope(scope, {
    orgName: orgRow?.name || 'Organization',
    deptName: scope.departmentId ? deptById.get(scope.departmentId)?.name : null,
    roleName: scope.roleId ? roleById.get(scope.roleId)?.title : null,
    userName: scope.userId ? (userById.get(scope.userId)?.name || userById.get(scope.userId)?.email) : null,
  })

  const today = new Date().toISOString().slice(0, 10)

  const md: string[] = []
  md.push(`# Decision briefing — ${scopeLabel}`)
  md.push(``)
  md.push(`_Generated ${today} · ${orgRow?.name || scope.organizationId}_`)
  md.push(``)
  md.push(`Summary: **${active.length} active**, ${reversed.length} reversed, ${superseded.length} superseded, ${archived.length} archived. Total: ${rows.length}.`)
  md.push(``)
  if (rows.length === 0) {
    md.push(`_No decisions in scope. This is either a young team or the scope is too narrow. Widen the date range or lift the filter._`)
    return resultFromMd(md, rows, active, reversed, superseded)
  }

  // ── Active ─────────────────────────────────────────────
  if (active.length > 0) {
    md.push(`## Active decisions (still in force)`)
    md.push(``)
    for (const d of active) {
      md.push(renderDecision(d, { userById, roleById, deptById, supersededBy }))
      md.push(``)
    }
  }

  // ── Reversed ─────────────────────────────────────────────
  if (reversed.length > 0) {
    md.push(`## Reversed decisions`)
    md.push(`Decisions we once made and then walked back. Read the reason — it's usually where the institutional lesson lives.`)
    md.push(``)
    for (const d of reversed) {
      md.push(renderDecision(d, { userById, roleById, deptById, supersededBy }))
      md.push(``)
    }
  }

  // ── Superseded ─────────────────────────────────────────
  if (superseded.length > 0) {
    md.push(`## Superseded decisions`)
    md.push(`Replaced by a newer decision. Useful to scan for historical context.`)
    md.push(``)
    for (const d of superseded) {
      md.push(renderDecision(d, { userById, roleById, deptById, supersededBy }))
      md.push(``)
    }
  }

  // ── Archived ───────────────────────────────────────────
  if (archived.length > 0) {
    md.push(`## Archived decisions`)
    md.push(``)
    for (const d of archived) {
      md.push(`- ${escapeMd(d.title)} — ${d.decidedAt.slice(0, 10)}`)
    }
    md.push(``)
  }

  // ── Footer ──────────────────────────────────────────────
  md.push(`---`)
  md.push(`_This briefing was auto-assembled from Reattend Enterprise. Every decision is cited in the source memory trail._`)
  return resultFromMd(md, rows, active, reversed, superseded)
}

function renderDecision(
  d: typeof schema.decisions.$inferSelect,
  ctx: {
    userById: Map<string, { id: string; name: string | null; email: string }>
    roleById: Map<string, { id: string; title: string }>
    deptById: Map<string, { id: string; name: string }>
    supersededBy: Map<string, string>
  },
): string {
  const lines: string[] = []
  lines.push(`### ${escapeMd(d.title)}`)
  const meta: string[] = [`Decided ${d.decidedAt.slice(0, 10)}`]
  if (d.decidedByUserId) {
    const u = ctx.userById.get(d.decidedByUserId)
    if (u) meta.push(`by ${u.name || u.email}`)
  }
  if (d.decidedByRoleId) {
    const r = ctx.roleById.get(d.decidedByRoleId)
    if (r) meta.push(`holding ${r.title}`)
  }
  if (d.departmentId) {
    const dept = ctx.deptById.get(d.departmentId)
    if (dept) meta.push(`in ${dept.name}`)
  }
  lines.push(`_${meta.join(' · ')}_`)
  lines.push(``)
  if (d.context) {
    lines.push(`**Context.** ${escapeMd(d.context)}`)
    lines.push(``)
  }
  if (d.rationale) {
    lines.push(`**Rationale.** ${escapeMd(d.rationale)}`)
    lines.push(``)
  }
  if (d.outcome) {
    lines.push(`**Outcome.** ${escapeMd(d.outcome)}`)
    lines.push(``)
  }
  if (d.status === 'reversed') {
    const by = d.reversedByUserId ? ctx.userById.get(d.reversedByUserId) : null
    lines.push(`**Reversed** ${d.reversedAt?.slice(0, 10) || ''} ${by ? `by ${by.name || by.email}` : ''}`)
    if (d.reversedReason) lines.push(`_Reason: ${escapeMd(d.reversedReason)}_`)
    lines.push(``)
  }
  if (d.status === 'superseded' && d.supersededById) {
    lines.push(`**Superseded by** decision \`${d.supersededById.slice(0, 8)}\``)
    lines.push(``)
  }
  return lines.join('\n')
}

function describeScope(scope: BriefingScope, labels: {
  orgName: string; deptName: string | null | undefined;
  roleName: string | null | undefined; userName: string | null | undefined;
}): string {
  const parts: string[] = []
  if (labels.userName) parts.push(labels.userName)
  if (labels.roleName) parts.push(`${labels.roleName}`)
  if (labels.deptName) parts.push(labels.deptName)
  if (parts.length === 0) parts.push(labels.orgName)
  if (scope.fromIso || scope.toIso) {
    parts.push(`${scope.fromIso?.slice(0, 10) || 'beginning'} → ${scope.toIso?.slice(0, 10) || 'today'}`)
  }
  return parts.join(' · ')
}

function resultFromMd(md: string[], rows: typeof schema.decisions.$inferSelect[], active: any[], reversed: any[], superseded: any[]): BriefingResult {
  return {
    markdown: md.join('\n'),
    rowCount: rows.length,
    activeCount: active.length,
    reversedCount: reversed.length,
    supersededCount: superseded.length,
  }
}
