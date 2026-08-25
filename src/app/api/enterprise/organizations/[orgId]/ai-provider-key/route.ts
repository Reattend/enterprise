import { NextRequest, NextResponse } from 'next/server'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { getOrgKeyDetail, saveKey, removeKey, setOrgKeyRateLimit, testProviderKey, type ByokProviderName } from '@/lib/ai/byok'

export const dynamic = 'force-dynamic'

// Org-wide default BYOK key - the only key scope left besides legacy
// Personal (see lib/ai/byok.ts). Admin-only end to end, as of 2026-08-25:
// regular members never see this, not even read-only ("employees need not
// see the API part" - explicit product call). Lives in the Control Room
// (/app/admin/[orgId]/settings), not member Settings.

export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const key = await getOrgKeyDetail(orgId)
    return NextResponse.json({ key })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json() as { provider?: string; apiKey?: string; rateLimitPerMonth?: number | null }
    const provider = body.provider as ByokProviderName
    const apiKey = (body.apiKey || '').trim()

    if (!['anthropic', 'openai', 'gemini'].includes(provider)) {
      return NextResponse.json({ error: 'invalid provider' }, { status: 400 })
    }
    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json({ error: 'apiKey looks too short to be real' }, { status: 400 })
    }
    const rateLimitPerMonth = typeof body.rateLimitPerMonth === 'number' && body.rateLimitPerMonth > 0 ? Math.floor(body.rateLimitPerMonth) : null

    const test = await testProviderKey(provider, apiKey)
    if (!test.ok) {
      return NextResponse.json({ error: 'key_validation_failed', message: test.error }, { status: 422 })
    }

    await saveKey({
      organizationId: orgId,
      userId: null,
      provider,
      apiKey,
      createdBy: auth.userId,
      status: 'valid',
    })
    if (rateLimitPerMonth !== null) {
      await setOrgKeyRateLimit(orgId, rateLimitPerMonth)
    }

    auditFromAuth(auth, 'integration_connect', { resourceType: 'ai_provider_key', resourceId: orgId, metadata: { provider, scope: 'org_default' } })

    return NextResponse.json({ ok: true, key: await getOrgKeyDetail(orgId) })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// Rate-limit-only update, doesn't touch the key. Body: { rateLimitPerMonth: number | null }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json() as { rateLimitPerMonth?: number | null }
    const rateLimitPerMonth = typeof body.rateLimitPerMonth === 'number' && body.rateLimitPerMonth > 0 ? Math.floor(body.rateLimitPerMonth) : null

    const ok = await setOrgKeyRateLimit(orgId, rateLimitPerMonth)
    if (!ok) return NextResponse.json({ error: 'no key configured yet' }, { status: 404 })

    auditFromAuth(auth, 'update', { resourceType: 'ai_provider_key_rate_limit', resourceId: orgId, metadata: { rateLimitPerMonth } })

    return NextResponse.json({ ok: true, key: await getOrgKeyDetail(orgId) })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    await removeKey(orgId, null)
    auditFromAuth(auth, 'integration_disconnect', { resourceType: 'ai_provider_key', resourceId: orgId, metadata: { scope: 'org_default' } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
