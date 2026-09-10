import { db, schema } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'

/**
 * The org a request should be treated as belonging to.
 *
 * `users.active_context_org_id` is only ever written by two explicit setters
 * (/api/me/active-context and /api/tray/active-context), which normal web
 * usage never calls - so on production 23 of 24 org members had it NULL.
 * Every server path that read the column raw therefore treated a paying org
 * member as a personal free user: the extension gate 402'd, /api/ask billed
 * against their personal (free) subscription and refused to answer, tray
 * captures landed in the personal workspace instead of the team one, and
 * billing status reported "Free" to org admins.
 *
 * Resolution order:
 *   1. the stored context, but only if the user is still a member of it
 *      (a stale pointer must not outlive the membership that justified it)
 *   2. otherwise their actual membership - deterministic by join date, so
 *      repeated calls agree and a multi-org user gets a stable answer
 *   3. otherwise null, which genuinely means "personal account"
 *
 * A user with no memberships is unaffected: still null, same as before.
 */
export async function resolveActiveOrgId(userId: string): Promise<string | null> {
  const row = await db
    .select({ activeContextOrgId: schema.users.activeContextOrgId })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .then((r) => r[0])

  const stored = row?.activeContextOrgId ?? null
  if (stored) {
    const stillAMember = await db
      .select({ organizationId: schema.organizationMembers.organizationId })
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.userId, userId),
        eq(schema.organizationMembers.organizationId, stored),
      ))
      .limit(1)
      .then((r) => r[0])
    if (stillAMember) return stored
  }

  const first = await db
    .select({ organizationId: schema.organizationMembers.organizationId })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.userId, userId))
    .orderBy(asc(schema.organizationMembers.createdAt))
    .limit(1)
    .then((r) => r[0])

  return first?.organizationId ?? null
}
