import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq, sql } from 'drizzle-orm'
import { requireOrgAuth, isAuthResponse, handleEnterpriseError } from '@/lib/enterprise'
import { getHotCacheForOrg, regenerateHotCache } from '@/lib/enterprise/hot-cache'

// GET /api/enterprise/organizations/[orgId]/hot-cache
// Returns the current org-scoped Hot Cache content + freshness metadata.
// Org members can read; the cache is shown on the admin overview / settings.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const rows = await db
      .select()
      .from(schema.hotCache)
      .where(and(
        eq(schema.hotCache.organizationId, orgId),
        eq(schema.hotCache.scope, 'org'),
        sql`scope_id IS NULL`,
      ))
      .limit(1)

    const row = rows[0]
    if (!row) {
      return NextResponse.json({
        content: null,
        message: 'No hot cache yet — the worker regenerates hourly.',
      })
    }

    return NextResponse.json({
      content: row.content,
      generatedAt: row.generatedAt,
      generatedFromRecordCount: row.generatedFromRecordCount,
      source: row.source,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/organizations/[orgId]/hot-cache
// Regenerate now (admin-only). Useful right after a bulk import or when
// debugging Ask answers — don't wait for the hourly cron.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const content = await regenerateHotCache(orgId)
    return NextResponse.json({
      ok: true,
      content,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// Force the read helper to be referenced so tree-shaking doesn't drop it
// when only this file imports from hot-cache.ts (defensive — Next.js bundles
// per route, this is a no-op at runtime).
void getHotCacheForOrg
