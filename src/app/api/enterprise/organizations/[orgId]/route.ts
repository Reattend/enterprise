import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireOrgAuth, isAuthResponse, auditFromAuth, handleEnterpriseError } from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const rows = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1)
    if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

    return NextResponse.json({ organization: rows[0], myRole: auth.orgCtx.orgRole })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// Basic domain format check — matches `acme.com`, `sub.acme.co.uk`, etc.
// Rejects anything with protocol, path, whitespace, or leading @.
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

// PATCH /api/enterprise/organizations/[orgId] — update settings (super_admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const allowed: Record<string, unknown> = {}

    if (typeof body.name === 'string') {
      const n = body.name.trim()
      if (n.length < 2) return NextResponse.json({ error: 'name must be at least 2 characters' }, { status: 400 })
      allowed.name = n
    }

    // primaryDomain: '' or undefined clears; otherwise validate and normalize
    if (typeof body.primaryDomain === 'string') {
      const d = body.primaryDomain.trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      if (d.length === 0) {
        allowed.primaryDomain = null
      } else if (!DOMAIN_RE.test(d)) {
        return NextResponse.json({ error: 'invalid domain format — expected acme.com' }, { status: 400 })
      } else {
        allowed.primaryDomain = d
      }
    } else if (body.primaryDomain === null) {
      allowed.primaryDomain = null
    }

    if (typeof body.plan === 'string' && ['starter', 'business', 'enterprise', 'government'].includes(body.plan)) {
      allowed.plan = body.plan
    }
    if (typeof body.deployment === 'string' && ['saas', 'on_prem', 'air_gapped'].includes(body.deployment)) {
      allowed.deployment = body.deployment
    }
    if (typeof body.onPremRabbitUrl === 'string') {
      const u = body.onPremRabbitUrl.trim()
      allowed.onPremRabbitUrl = u.length === 0 ? null : u
    } else if (body.onPremRabbitUrl === null) {
      allowed.onPremRabbitUrl = null
    }

    if (typeof body.seatLimit === 'number' && body.seatLimit >= 1) {
      allowed.seatLimit = Math.floor(body.seatLimit)
    } else if (body.seatLimit === null || body.seatLimit === undefined) {
      if ('seatLimit' in body) allowed.seatLimit = null
    }

    // Settings: merge into existing JSON so partial updates don't clobber others.
    if (body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)) {
      // Validate audit retention if present
      const s = body.settings as Record<string, unknown>
      if ('auditRetentionDays' in s) {
        const d = Number(s.auditRetentionDays)
        if (!Number.isFinite(d) || d < 30 || d > 3650) {
          return NextResponse.json({ error: 'auditRetentionDays must be between 30 and 3650' }, { status: 400 })
        }
      }
      const current = await db
        .select({ settings: schema.organizations.settings })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
        .limit(1)
      let merged: Record<string, unknown> = {}
      if (current[0]?.settings) {
        try { merged = JSON.parse(current[0].settings) } catch { /* ignore */ }
      }
      merged = { ...merged, ...s }
      allowed.settings = JSON.stringify(merged)
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'no updatable fields provided' }, { status: 400 })
    }

    allowed.updatedAt = new Date().toISOString()

    await db.update(schema.organizations).set(allowed).where(eq(schema.organizations.id, orgId))

    auditFromAuth(auth, 'update', {
      resourceType: 'organization',
      resourceId: orgId,
      metadata: { changedFields: Object.keys(allowed).filter((k) => k !== 'updatedAt') },
    })

    const updated = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1)
    return NextResponse.json({ organization: updated[0] })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
