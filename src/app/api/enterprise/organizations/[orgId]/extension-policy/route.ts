import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// Admin-side of the extension policy. Reads/writes the 'extensionPolicy' key
// on organizations.settings (JSON). Members read via /api/tray/extension-policy
// (bearer auth); admins write here (session auth).

function normDomain(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) })
    if (!org) return NextResponse.json({ error: 'not found' }, { status: 404 })

    let policy: any = {}
    if (org.settings) {
      try { policy = JSON.parse(org.settings)?.extensionPolicy ?? {} } catch { /* ignore */ }
    }

    return NextResponse.json({
      requiredDomains: Array.isArray(policy.requiredDomains) ? policy.requiredDomains : [],
      recommendedDomains: Array.isArray(policy.recommendedDomains) ? policy.recommendedDomains : [],
      ambient: typeof policy.ambient === 'boolean' ? policy.ambient : true,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const required = Array.isArray(body.requiredDomains) ? body.requiredDomains.map(String).map(normDomain).filter(Boolean) : []
    const recommended = Array.isArray(body.recommendedDomains) ? body.recommendedDomains.map(String).map(normDomain).filter(Boolean) : []
    const ambient = typeof body.ambient === 'boolean' ? body.ambient : true

    const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) })
    if (!org) return NextResponse.json({ error: 'not found' }, { status: 404 })

    let settings: Record<string, any> = {}
    if (org.settings) { try { settings = JSON.parse(org.settings) } catch { settings = {} } }
    settings.extensionPolicy = {
      requiredDomains: Array.from(new Set(required)),
      recommendedDomains: Array.from(new Set(recommended)),
      ambient,
    }

    await db.update(schema.organizations)
      .set({ settings: JSON.stringify(settings), updatedAt: new Date().toISOString() })
      .where(eq(schema.organizations.id, orgId))

    auditFromAuth(auth, 'admin_action', {
      resourceType: 'extension_policy',
      resourceId: orgId,
      metadata: { required: required.length, recommended: recommended.length, ambient },
    })

    return NextResponse.json({ ok: true, ...settings.extensionPolicy })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
