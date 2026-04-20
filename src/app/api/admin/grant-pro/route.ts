import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireSuperAdmin } from '@/lib/admin/auth'

/**
 * POST /api/admin/grant-pro
 * Manually set a user to active Pro — no payment required.
 * Body: { email }
 */
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const normalizedEmail = email.toLowerCase().trim()

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.userId, user.id),
    })

    if (existingSub) {
      await db.update(schema.subscriptions)
        .set({
          planKey: 'smart',
          status: 'active',
          trialEndsAt: null,
          renewsAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.subscriptions.userId, user.id))
    } else {
      await db.insert(schema.subscriptions).values({
        userId: user.id,
        planKey: 'smart',
        status: 'active',
      })
    }

    return NextResponse.json({
      ok: true,
      message: `${normalizedEmail} is now on Pro.`,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/grant-pro
 * Revoke Pro — move user back to free.
 * Body: { email }
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const normalizedEmail = email.toLowerCase().trim()

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await db.update(schema.subscriptions)
      .set({
        planKey: 'normal',
        status: 'canceled',
        trialEndsAt: null,
        renewsAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.subscriptions.userId, user.id))

    return NextResponse.json({ ok: true, message: `${normalizedEmail} moved back to free.` })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
