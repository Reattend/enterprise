import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getKeyStatus, saveKey, removeKey, testProviderKey, type ByokProviderName } from '@/lib/ai/byok'

export const dynamic = 'force-dynamic'

// The current user's own key. Scope is derived from activeContextOrgId:
//   - has an active org  -> this is a per-user override within that org
//   - no active org      -> Personal mode, this is a pure personal key
// Either way it's the same row shape (organizationId nullable), so one
// route handles both - the resolver in lib/ai/byok.ts already treats them
// identically (user-scoped key beats org default, personal has no org to
// default to).

async function getActiveOrgId(userId: string): Promise<string | null> {
  const row = await db.select({ activeContextOrgId: schema.users.activeContextOrgId })
    .from(schema.users).where(eq(schema.users.id, userId)).then(r => r[0])
  return row?.activeContextOrgId ?? null
}

export async function GET() {
  try {
    const { userId } = await requireAuth()
    const orgId = await getActiveOrgId(userId)
    const status = await getKeyStatus(orgId, userId)
    return NextResponse.json({ key: status, scope: orgId ? 'org_override' : 'personal' })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = await getActiveOrgId(userId)

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
      userId,
      provider,
      apiKey,
      createdBy: userId,
      status: 'valid',
    })

    return NextResponse.json({ ok: true, key: await getKeyStatus(orgId, userId), scope: orgId ? 'org_override' : 'personal' })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { userId } = await requireAuth()
    const orgId = await getActiveOrgId(userId)
    await removeKey(orgId, userId)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
