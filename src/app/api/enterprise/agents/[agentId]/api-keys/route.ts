import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
} from '@/lib/enterprise'

// GET /api/enterprise/agents/[agentId]/api-keys — list existing keys (masked)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { userId } = await requireAuth()
    const { agentId } = await params

    const agent = await db.query.agents.findFirst({ where: eq(schema.agents.id, agentId) })
    if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, agent.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'agents.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const rows = await db.query.agentApiKeys.findMany({
      where: eq(schema.agentApiKeys.agentId, agentId),
    })
    return NextResponse.json({
      keys: rows.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        revokedAt: k.revokedAt,
      })),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/agents/[agentId]/api-keys
// Body: { name }
// Returns the plaintext key ONCE — server stores only sha256 hash.
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { userId } = await requireAuth()
    const { agentId } = await params
    const { name } = await req.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const agent = await db.query.agents.findFirst({ where: eq(schema.agents.id, agentId) })
    if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, agent.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'agents.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Key format: `ak_live_<24 random hex>` — 32 total after prefix. Prefix
    // is shown in the list so admins can identify a key later.
    const secret = crypto.randomBytes(24).toString('hex')
    const plaintext = `ak_live_${secret}`
    const keyHash = crypto.createHash('sha256').update(plaintext).digest('hex')
    const keyPrefix = plaintext.slice(0, 12) // "ak_live_xxxx"

    const [inserted] = await db.insert(schema.agentApiKeys).values({
      agentId,
      organizationId: agent.organizationId,
      name,
      keyHash,
      keyPrefix,
      createdByUserId: userId,
    }).returning()

    return NextResponse.json({
      key: {
        id: inserted.id,
        name: inserted.name,
        keyPrefix: inserted.keyPrefix,
        createdAt: inserted.createdAt,
      },
      plaintext, // SHOWN ONCE — UI must make this clear
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// DELETE /api/enterprise/agents/[agentId]/api-keys?keyId=...
// Soft-revokes — keeps the row so audit trail + lastUsedAt survive.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { userId } = await requireAuth()
    const { agentId } = await params
    const keyId = req.nextUrl.searchParams.get('keyId')
    if (!keyId) return NextResponse.json({ error: 'keyId required' }, { status: 400 })

    const agent = await db.query.agents.findFirst({ where: eq(schema.agents.id, agentId) })
    if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, agent.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'agents.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    await db.update(schema.agentApiKeys)
      .set({ revokedAt: new Date().toISOString() })
      .where(and(
        eq(schema.agentApiKeys.id, keyId),
        eq(schema.agentApiKeys.agentId, agentId),
      ))
    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
