import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  parseApplicability,
  userIsSubjectToPolicy,
  getOrgContext,
  extractRequestMeta,
  auditForAllUserOrgs,
} from '@/lib/enterprise'

// POST /api/enterprise/policies/[policyId]/acknowledge
// Records the current user's acknowledgment of the policy's current version.
// Idempotent: if an ack already exists for (user, currentVersionId), return it.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ policyId: string }> },
) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'
    const { policyId } = await params

    const policy = await db.query.policies.findFirst({
      where: eq(schema.policies.id, policyId),
    })
    if (!policy) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (policy.status !== 'published' || !policy.currentVersionId) {
      return NextResponse.json({ error: 'policy is not published' }, { status: 400 })
    }

    const ctx = await getOrgContext(userId, policy.organizationId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const applicability = parseApplicability(policy.applicability)
    const subject = await userIsSubjectToPolicy({
      userId,
      organizationId: policy.organizationId,
      applicability,
    })
    if (!subject) {
      return NextResponse.json({ error: 'not subject to this policy' }, { status: 400 })
    }

    // Idempotent check
    const [existing] = await db.select().from(schema.policyAcknowledgments)
      .where(and(
        eq(schema.policyAcknowledgments.userId, userId),
        eq(schema.policyAcknowledgments.policyVersionId, policy.currentVersionId),
      ))
      .limit(1)
    if (existing) {
      return NextResponse.json({ ack: existing, deduplicated: true })
    }

    const meta = extractRequestMeta(req)
    const [inserted] = await db.insert(schema.policyAcknowledgments).values({
      policyId,
      policyVersionId: policy.currentVersionId,
      organizationId: policy.organizationId,
      userId,
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
    }).returning()

    auditForAllUserOrgs(userId, userEmail, 'update', {
      resourceType: 'policy_ack',
      resourceId: inserted.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { policyId, versionId: policy.currentVersionId, policyTitle: policy.title },
    })

    return NextResponse.json({ ack: inserted })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
