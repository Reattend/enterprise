import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getKeyStatus, saveKey, removeKey, testProviderKey, type ByokProviderName } from '@/lib/ai/byok'

export const dynamic = 'force-dynamic'

// Legacy-personal-only, as of 2026-08-25. Per-user override inside an org
// was killed ("employees need not see the API part" - explicit product
// call, see today.md) - this route now 409s for anyone with an active
// org. Org keys live exclusively in the Control Room
// (/api/enterprise/organizations/[orgId]/ai-provider-key), admin-only.
//
// The only legitimate callers left are the ~14 pre-2026-08-25 accounts
// that have no org at all. New signups always get an org, so they can
// never reach this path.

async function getActiveOrgId(userId: string): Promise<string | null> {
  const row = await db.select({ activeContextOrgId: schema.users.activeContextOrgId })
    .from(schema.users).where(eq(schema.users.id, userId)).then(r => r[0])
  return row?.activeContextOrgId ?? null
}

export async function GET() {
  try {
    const { userId } = await requireAuth()
    const orgId = await getActiveOrgId(userId)
    if (orgId) {
      return NextResponse.json({ error: 'not_available', message: 'AI keys for organization accounts are managed by an admin in the Control Room, not here.' }, { status: 409 })
    }
    const status = await getKeyStatus(null, userId)
    return NextResponse.json({ key: status, scope: 'personal' })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = await getActiveOrgId(userId)
    if (orgId) {
      return NextResponse.json({ error: 'not_available', message: 'AI keys for organization accounts are managed by an admin in the Control Room, not here.' }, { status: 409 })
    }

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
      organizationId: null,
      userId,
      provider,
      apiKey,
      createdBy: userId,
      status: 'valid',
    })

    return NextResponse.json({ ok: true, key: await getKeyStatus(null, userId), scope: 'personal' })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { userId } = await requireAuth()
    const orgId = await getActiveOrgId(userId)
    if (orgId) {
      return NextResponse.json({ error: 'not_available', message: 'AI keys for organization accounts are managed by an admin in the Control Room, not here.' }, { status: 409 })
    }
    await removeKey(null, userId)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
