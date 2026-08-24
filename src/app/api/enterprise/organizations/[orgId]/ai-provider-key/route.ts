import { NextRequest, NextResponse } from 'next/server'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { getKeyStatus, saveKey, removeKey, testProviderKey, type ByokProviderName } from '@/lib/ai/byok'

export const dynamic = 'force-dynamic'

// Org-wide default BYOK key. Any org member without a personal override
// falls back to this one (see lib/ai/byok.ts resolution order). Admin-only
// to write, any member can read the status (not the key itself - we never
// return the plaintext key after save).

export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const status = await getKeyStatus(orgId, null)
    return NextResponse.json({ key: status })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json() as { provider?: string; apiKey?: string }
    const provider = body.provider as ByokProviderName
    const apiKey = (body.apiKey || '').trim()

    if (!['anthropic', 'openai', 'gemini'].includes(provider)) {
      return NextResponse.json({ error: 'invalid provider' }, { status: 400 })
    }
    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json({ error: 'apiKey looks too short to be real' }, { status: 400 })
    }

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

    auditFromAuth(auth, 'integration_connect', { resourceType: 'ai_provider_key', resourceId: orgId, metadata: { provider, scope: 'org_default' } })

    return NextResponse.json({ ok: true, key: await getKeyStatus(orgId, null) })
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
