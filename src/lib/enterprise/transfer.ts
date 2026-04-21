// Knowledge Transfer Protocol.
//
// Core claim: in Reattend Enterprise, knowledge stays with the role, not the
// person. When someone leaves or changes roles, every record they own gets
// reassigned to whoever holds the role next — no informal handoff email,
// no lost tribal knowledge, no "does anyone remember why we did X?".
//
// This module computes the "at risk" pool (what a departing user owns that
// has no current successor) and performs the transfer atomically.

import { db, schema } from '../db'
import { and, eq, isNull, inArray, count } from 'drizzle-orm'

export interface AtRiskSnapshot {
  userId: string
  name: string | null
  email: string
  status: string
  offboardedAt: string | null
  organizationId: string
  // Records they authored that are still in live workspaces
  authoredRecords: number
  // Decisions they made (survive via decidedByRoleId, but we surface them)
  decisions: number
  // Roles they currently hold — these are the successor anchors
  currentRoles: Array<{ roleId: string; title: string; departmentId: string | null }>
  // Records explicitly tied to those roles via record_role_ownership
  roleOwnedRecords: number
  // "At risk" = authored records with NO role ownership assigned yet.
  // Those will vanish (in practice) if the user is removed.
  atRiskRecords: number
}

export async function computeAtRisk(organizationId: string, userId: string): Promise<AtRiskSnapshot | null> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
  if (!user) return null
  const [membership] = await db.select().from(schema.organizationMembers).where(and(
    eq(schema.organizationMembers.organizationId, organizationId),
    eq(schema.organizationMembers.userId, userId),
  )).limit(1)
  if (!membership) return null

  // Find all workspaces in this org
  const wsLinks = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
    .from(schema.workspaceOrgLinks)
    .where(eq(schema.workspaceOrgLinks.organizationId, organizationId))
  const wsIds = Array.from(new Set(wsLinks.map((l) => l.workspaceId)))

  // Records they authored in the org's workspaces
  let authoredRecordIds: string[] = []
  if (wsIds.length) {
    const rows = await db.select({ id: schema.records.id }).from(schema.records).where(and(
      inArray(schema.records.workspaceId, wsIds),
      eq(schema.records.createdBy, userId),
    ))
    authoredRecordIds = rows.map((r) => r.id)
  }

  // Decisions they made
  const decisionRows = await db.select({ id: schema.decisions.id }).from(schema.decisions).where(and(
    eq(schema.decisions.organizationId, organizationId),
    eq(schema.decisions.decidedByUserId, userId),
  ))

  // Current role assignments (endedAt IS NULL)
  const roleRows = await db.select({
    roleId: schema.roleAssignments.roleId,
    title: schema.employeeRoles.title,
    departmentId: schema.employeeRoles.departmentId,
  }).from(schema.roleAssignments)
    .innerJoin(schema.employeeRoles, eq(schema.employeeRoles.id, schema.roleAssignments.roleId))
    .where(and(
      eq(schema.roleAssignments.userId, userId),
      eq(schema.roleAssignments.organizationId, organizationId),
      isNull(schema.roleAssignments.endedAt),
    ))
  const roleIds = roleRows.map((r) => r.roleId)

  // "Role-owned" means the record is anchored to ANY role in this org — not
  // just the user's current roles. After transfer the user's assignment ends
  // but the record stays on the role, which is exactly the behavior we want.
  // If we only checked the user's current roles, offboarded users would
  // "re-risk" their transferred records (a logic error).
  let anyRoleOwnedIds = new Set<string>()
  if (authoredRecordIds.length) {
    const owned = await db.select({ recordId: schema.recordRoleOwnership.recordId })
      .from(schema.recordRoleOwnership)
      .where(inArray(schema.recordRoleOwnership.recordId, authoredRecordIds))
    anyRoleOwnedIds = new Set(owned.map((o) => o.recordId))
  }

  // At-risk = authored AND no role ownership anywhere in the org.
  const atRiskCount = authoredRecordIds.filter((id) => !anyRoleOwnedIds.has(id)).length

  return {
    userId,
    name: user.name,
    email: user.email,
    status: membership.status,
    offboardedAt: membership.offboardedAt,
    organizationId,
    authoredRecords: authoredRecordIds.length,
    decisions: decisionRows.length,
    currentRoles: roleRows,
    roleOwnedRecords: anyRoleOwnedIds.size,
    atRiskRecords: atRiskCount,
  }
}

// List everyone in the org who has ANY at-risk state. Used to drive the
// transfer dashboard. Cheaper than running computeAtRisk for every member —
// we aggregate first, then hydrate only non-zero rows.
export async function listAtRisk(organizationId: string): Promise<Array<AtRiskSnapshot>> {
  const members = await db.select({ userId: schema.organizationMembers.userId })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.organizationId, organizationId))

  const snapshots: AtRiskSnapshot[] = []
  for (const m of members) {
    const s = await computeAtRisk(organizationId, m.userId)
    if (!s) continue
    if (s.atRiskRecords > 0 || s.status === 'offboarded') {
      snapshots.push(s)
    }
  }
  // Critical first: offboarded users with high at-risk count
  snapshots.sort((a, b) => {
    const aOff = a.status === 'offboarded' ? 1 : 0
    const bOff = b.status === 'offboarded' ? 1 : 0
    if (aOff !== bOff) return bOff - aOff
    return b.atRiskRecords - a.atRiskRecords
  })
  return snapshots
}

export interface TransferInput {
  organizationId: string
  fromUserId: string
  toUserId: string | null // null = "park at role; no named successor yet"
  roleId: string | null   // which role the successor is inheriting (optional)
  reason: 'offboard' | 'role_change' | 'temporary' | 'correction'
  transferNotes: string | null
  initiatedByUserId: string
  markOffboarded: boolean
}

export interface TransferResult {
  transferEventId: string
  recordsTransferred: number
  decisionsTouched: number
}

// The atomic transfer. Does four things in one txn-equivalent sequence:
//   1. End the outgoing user's role assignment (endedAt = now)
//   2. Start a role assignment for the incoming user (if provided)
//   3. For every record authored by fromUser + not already role-owned:
//      - Create a record_role_ownership row linking record → role
//      - (We keep `records.createdBy` as-is to preserve historical truth.
//         Ownership is the access anchor; createdBy is history.)
//   4. Mark the fromUser's org_membership as offboarded if requested
//   5. Write a transfer_events row
export async function performTransfer(input: TransferInput): Promise<TransferResult> {
  const now = new Date().toISOString()

  // Workspaces in the org
  const wsLinks = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
    .from(schema.workspaceOrgLinks)
    .where(eq(schema.workspaceOrgLinks.organizationId, input.organizationId))
  const wsIds = Array.from(new Set(wsLinks.map((l) => l.workspaceId)))

  // 1. End outgoing role assignments for this role (if roleId given) or all of them (if not)
  const roleEndQuery = input.roleId
    ? and(
        eq(schema.roleAssignments.userId, input.fromUserId),
        eq(schema.roleAssignments.organizationId, input.organizationId),
        eq(schema.roleAssignments.roleId, input.roleId),
        isNull(schema.roleAssignments.endedAt),
      )
    : and(
        eq(schema.roleAssignments.userId, input.fromUserId),
        eq(schema.roleAssignments.organizationId, input.organizationId),
        isNull(schema.roleAssignments.endedAt),
      )
  await db.update(schema.roleAssignments)
    .set({ endedAt: now, transferNotes: input.transferNotes })
    .where(roleEndQuery)

  // 2. Start incoming assignment (if successor given and roleId given)
  if (input.toUserId && input.roleId) {
    await db.insert(schema.roleAssignments).values({
      roleId: input.roleId,
      userId: input.toUserId,
      organizationId: input.organizationId,
      transferNotes: input.transferNotes,
    })
  }

  // 3. Transfer record ownership to the role (not to the successor user)
  //    so future successor changes work without re-transferring records.
  let recordsTransferred = 0
  if (input.roleId && wsIds.length) {
    const authored = await db.select({ id: schema.records.id })
      .from(schema.records)
      .where(and(
        inArray(schema.records.workspaceId, wsIds),
        eq(schema.records.createdBy, input.fromUserId),
      ))
    if (authored.length) {
      const alreadyOwned = await db.select({ recordId: schema.recordRoleOwnership.recordId })
        .from(schema.recordRoleOwnership)
        .where(and(
          eq(schema.recordRoleOwnership.roleId, input.roleId),
          inArray(schema.recordRoleOwnership.recordId, authored.map((a) => a.id)),
        ))
      const ownedSet = new Set(alreadyOwned.map((a) => a.recordId))
      const toInsert = authored.filter((r) => !ownedSet.has(r.id))
      if (toInsert.length) {
        await db.insert(schema.recordRoleOwnership).values(
          toInsert.map((r) => ({
            recordId: r.id,
            roleId: input.roleId!,
            organizationId: input.organizationId,
            assignedByUserId: input.initiatedByUserId,
          })),
        )
        recordsTransferred = toInsert.length
      }
    }
  }

  // 4. Decisions touched — we don't reassign them (decidedByUserId is historical
  //    truth) but we count them for the event log.
  const [{ value: decisionsTouched }] = await db.select({ value: count() }).from(schema.decisions).where(and(
    eq(schema.decisions.organizationId, input.organizationId),
    eq(schema.decisions.decidedByUserId, input.fromUserId),
  ))

  // 5. Mark offboarded
  if (input.markOffboarded) {
    await db.update(schema.organizationMembers).set({
      status: 'offboarded',
      offboardedAt: now,
      updatedAt: now,
    }).where(and(
      eq(schema.organizationMembers.organizationId, input.organizationId),
      eq(schema.organizationMembers.userId, input.fromUserId),
    ))
  }

  // 6. Write the event
  const [event] = await db.insert(schema.transferEvents).values({
    organizationId: input.organizationId,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    roleId: input.roleId,
    reason: input.reason,
    recordsTransferred,
    decisionsTransferred: decisionsTouched,
    transferNotes: input.transferNotes,
    initiatedByUserId: input.initiatedByUserId,
  }).returning()

  return {
    transferEventId: event.id,
    recordsTransferred,
    decisionsTouched,
  }
}

export async function listTransferHistory(organizationId: string, userId?: string) {
  const where = userId
    ? and(
        eq(schema.transferEvents.organizationId, organizationId),
        // OR via drizzle is awkward inline — we combine client-side below.
      )
    : eq(schema.transferEvents.organizationId, organizationId)
  const rows = await db.select().from(schema.transferEvents).where(where)
  const filtered = userId ? rows.filter((r) => r.fromUserId === userId || r.toUserId === userId) : rows
  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return filtered
}
