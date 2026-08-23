import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { generateApiToken, listApiTokens, revokeApiToken } from '@/lib/auth/token'
import { getOrCreateSubscription, hasFeature } from '@/lib/billing/gates'

// List all API tokens for the authenticated user
export async function GET() {
  try {
    const { userId } = await requireAuth()
    const tokens = await listApiTokens(userId)
    return NextResponse.json({ tokens })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Generate a new API token
export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth()

    // Gate: extension is a Professional+ feature. Block token issuance for
    // Solo Free users so they can't even create an extension token. Existing
    // Free users with already-issued tokens get blocked at request time by
    // requireExtensionAccess() in each tray route.
    const sub = await getOrCreateSubscription(userId)
    if (!hasFeature(sub, 'chromeExtensionAutoIngest')) {
      return NextResponse.json(
        {
          error: 'extension_requires_paid_plan',
          message: 'The Reattend extension is a Professional plan feature. Upgrade to enable it.',
          upgradeUrl: 'https://reattend.com/pricing',
        },
        { status: 402 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const name = body.name || 'Desktop App'

    const result = await generateApiToken(userId, workspaceId, name)

    return NextResponse.json({
      id: result.id,
      token: result.token, // Only returned once at creation
      prefix: result.prefix,
      message: 'Save this token - it will not be shown again.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Revoke an API token
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Token id is required' }, { status: 400 })
    }

    const success = await revokeApiToken(id, userId)
    if (!success) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
