import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  diffLines,
  getOrgContext,
} from '@/lib/enterprise'

// GET /api/enterprise/policies/[policyId]/diff?from=<versionId>&to=<versionId>
// Returns line-level diff of two versions. If from/to not given, compares
// current version against the immediately preceding one.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ policyId: string }> },
) {
  try {
    const { userId } = await requireAuth()
    const { policyId } = await params
    const fromId = req.nextUrl.searchParams.get('from')
    const toId = req.nextUrl.searchParams.get('to')

    const policy = await db.query.policies.findFirst({
      where: eq(schema.policies.id, policyId),
    })
    if (!policy) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, policy.organizationId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const versions = await db.query.policyVersions.findMany({
      where: eq(schema.policyVersions.policyId, policyId),
    })
    versions.sort((a, b) => a.versionNumber - b.versionNumber)

    let from = fromId ? versions.find((v) => v.id === fromId) : null
    let to = toId ? versions.find((v) => v.id === toId) : null

    if (!to && policy.currentVersionId) {
      to = versions.find((v) => v.id === policy.currentVersionId) || null
    }
    if (!from && to) {
      const idx = versions.findIndex((v) => v.id === to!.id)
      from = idx > 0 ? versions[idx - 1] : null
    }

    if (!to) return NextResponse.json({ error: 'no version to diff' }, { status: 400 })

    const beforeBody = from?.body ?? ''
    const afterBody = to.body

    const bodyDiff = diffLines(beforeBody, afterBody)
    const titleChanged = (from?.title ?? '') !== to.title
    const summaryChanged = (from?.summary ?? '') !== (to.summary ?? '')

    return NextResponse.json({
      from: from ? {
        id: from.id, versionNumber: from.versionNumber, title: from.title,
        summary: from.summary, publishedAt: from.publishedAt,
      } : null,
      to: {
        id: to.id, versionNumber: to.versionNumber, title: to.title,
        summary: to.summary, publishedAt: to.publishedAt,
        changeNote: to.changeNote,
      },
      titleChanged,
      summaryChanged,
      bodyDiff,
      added: bodyDiff.filter((d) => d.kind === 'add').length,
      removed: bodyDiff.filter((d) => d.kind === 'del').length,
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
