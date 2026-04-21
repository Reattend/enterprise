import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
  validateEnterpriseInviteEmail,
  auditFromAuth,
} from '@/lib/enterprise'
import { sendEnterpriseInviteEmail } from '@/lib/email'

const INVITE_TOKEN_BYTES = 24
const INVITE_TTL_DAYS = 14

type OrgRole = 'super_admin' | 'admin' | 'member' | 'guest'
type DeptRole = 'dept_head' | 'manager' | 'member' | 'viewer'

interface BulkRow {
  email: string
  role?: OrgRole
  title?: string
  departmentId?: string | null
  deptRole?: DeptRole
}

interface ProcessedRow {
  email: string
  status: 'invited' | 'added' | 'skipped' | 'failed'
  reason?: string
  acceptUrl?: string
  emailDelivered?: boolean
}

// POST /api/enterprise/organizations/[orgId]/members/bulk
// Body: { rows: BulkRow[], dryRun?: boolean }
// Accepts up to 200 invites in one call. Returns per-row outcome so the UI
// can show "42 invited, 3 failed, 5 skipped (already members)".
//
// dryRun=true validates without writing to DB or sending emails — used by
// the CSV preview step before the admin hits Commit.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const rows = Array.isArray(body.rows) ? (body.rows as BulkRow[]) : []
    const dryRun = !!body.dryRun
    if (rows.length === 0) {
      return NextResponse.json({ error: 'rows required (non-empty array)' }, { status: 400 })
    }
    if (rows.length > 200) {
      return NextResponse.json({ error: 'max 200 rows per call' }, { status: 400 })
    }

    // Pre-fetch org for domain enforcement + email sender context
    const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1)
    const primaryDomain = org?.primaryDomain ?? null

    // Valid dept ids (must belong to this org)
    const deptRows = await db.select({ id: schema.departments.id })
      .from(schema.departments)
      .where(eq(schema.departments.organizationId, orgId))
    const validDeptIds = new Set(deptRows.map((d) => d.id))

    const inviter = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, auth.userId)).limit(1)
    const inviterName = inviter[0]?.name ?? 'An admin'

    const VALID_ORG_ROLES: OrgRole[] = ['super_admin', 'admin', 'member', 'guest']
    const VALID_DEPT_ROLES: DeptRole[] = ['dept_head', 'manager', 'member', 'viewer']

    const results: ProcessedRow[] = []
    const summary = { invited: 0, added: 0, skipped: 0, failed: 0 }
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    for (const raw of rows) {
      const email = String(raw.email || '').toLowerCase().trim()
      if (!email || !email.includes('@')) {
        results.push({ email: raw.email || '(blank)', status: 'failed', reason: 'invalid email' })
        summary.failed++
        continue
      }

      // Role defaults + validation
      const role: OrgRole = raw.role && VALID_ORG_ROLES.includes(raw.role) ? raw.role : 'member'
      if (role === 'super_admin' && auth.orgCtx.orgRole !== 'super_admin') {
        results.push({ email, status: 'failed', reason: 'only super_admin can invite super_admin' })
        summary.failed++
        continue
      }

      // Work-email policy + domain match
      const validation = validateEnterpriseInviteEmail(email, primaryDomain)
      if (!validation.ok) {
        results.push({ email, status: 'failed', reason: validation.message })
        summary.failed++
        continue
      }

      // Dept validation
      let departmentId: string | null = raw.departmentId ?? null
      if (departmentId && !validDeptIds.has(departmentId)) {
        results.push({ email, status: 'failed', reason: 'invalid departmentId' })
        summary.failed++
        continue
      }
      const deptRole: DeptRole | null = raw.deptRole && VALID_DEPT_ROLES.includes(raw.deptRole) ? raw.deptRole : null

      if (dryRun) {
        // Preview path — just mark as "would invite" and move on.
        results.push({ email, status: 'invited' })
        summary.invited++
        continue
      }

      // Existing user → add membership directly
      const userRow = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
      const existingUser = userRow[0]

      if (existingUser) {
        // Already a member?
        const existingMembership = await db.query.organizationMembers.findFirst({
          where: and(
            eq(schema.organizationMembers.organizationId, orgId),
            eq(schema.organizationMembers.userId, existingUser.id),
          ),
        })
        if (existingMembership && existingMembership.status === 'active') {
          results.push({ email, status: 'skipped', reason: 'already a member' })
          summary.skipped++
          continue
        }
        if (existingMembership) {
          await db.update(schema.organizationMembers).set({
            status: 'active', role, title: raw.title ?? existingMembership.title,
            updatedAt: new Date().toISOString(),
          }).where(eq(schema.organizationMembers.id, existingMembership.id))
        } else {
          await db.insert(schema.organizationMembers).values({
            organizationId: orgId, userId: existingUser.id, role, title: raw.title ?? null,
            status: 'active',
          })
        }
        if (departmentId) {
          const existingDeptMember = await db.query.departmentMembers.findFirst({
            where: and(
              eq(schema.departmentMembers.departmentId, departmentId),
              eq(schema.departmentMembers.userId, existingUser.id),
            ),
          })
          if (!existingDeptMember) {
            await db.insert(schema.departmentMembers).values({
              departmentId, organizationId: orgId, userId: existingUser.id,
              role: deptRole ?? 'member',
            })
          }
        }
        results.push({ email, status: 'added' })
        summary.added++
        continue
      }

      // New user → issue an invite (dedupes on pending)
      const existingInvite = await db.query.enterpriseInvites.findFirst({
        where: and(
          eq(schema.enterpriseInvites.organizationId, orgId),
          eq(schema.enterpriseInvites.email, email),
          eq(schema.enterpriseInvites.status, 'pending'),
        ),
      })
      const token = existingInvite?.token ?? crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex')
      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString()

      if (existingInvite) {
        await db.update(schema.enterpriseInvites).set({
          role, title: raw.title ?? existingInvite.title,
          departmentId, deptRole: deptRole ?? existingInvite.deptRole,
          invitedByUserId: auth.userId, expiresAt,
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.enterpriseInvites.id, existingInvite.id))
      } else {
        await db.insert(schema.enterpriseInvites).values({
          organizationId: orgId, email, role, title: raw.title ?? null,
          departmentId, deptRole,
          token, status: 'pending', invitedByUserId: auth.userId, expiresAt,
        })
      }

      // Email send — best effort, never fails the row
      let emailDelivered = false
      let deptName: string | null = null
      if (departmentId) {
        const d = await db.select({ name: schema.departments.name }).from(schema.departments).where(eq(schema.departments.id, departmentId)).limit(1)
        deptName = d[0]?.name ?? null
      }
      try {
        await sendEnterpriseInviteEmail({
          toEmail: email,
          orgName: org?.name ?? 'your organization',
          inviterName,
          inviterEmail: auth.userEmail,
          role,
          acceptUrl: `${appUrl}/enterprise-invite/${token}`,
          expiresAt,
          departmentName: deptName,
        })
        emailDelivered = true
      } catch (e) {
        // Swallow — the invite is valid, admin can copy the link manually
        console.warn('[bulk invite] email send failed for', email, e)
      }

      results.push({
        email, status: 'invited',
        acceptUrl: `${appUrl}/enterprise-invite/${token}`,
        emailDelivered,
      })
      summary.invited++
    }

    if (!dryRun) {
      auditFromAuth(auth, 'member_invite', {
        resourceType: 'org_members_bulk',
        resourceId: orgId,
        metadata: { total: rows.length, ...summary },
      })
    }

    return NextResponse.json({
      dryRun,
      summary,
      results,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
