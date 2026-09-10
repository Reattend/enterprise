import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { isPersonalEmail } from '@/lib/enterprise/mode'
import crypto from 'crypto'

type Provider = 'azure_ad' | 'okta' | 'google_workspace' | 'saml_generic' | 'oidc_generic'
const VALID_PROVIDERS: Provider[] = ['azure_ad', 'okta', 'google_workspace', 'saml_generic', 'oidc_generic']

// Redact secrets before sending to the client. Secret value is write-only.
function redact(cfg: typeof schema.ssoConfigs.$inferSelect) {
  return {
    ...cfg,
    clientSecretEncrypted: cfg.clientSecretEncrypted ? '••••••••' : null,
    hasSecret: !!cfg.clientSecretEncrypted,
  }
}

// At-rest secret storage. For a real deployment we'd use a KMS / envelope
// encryption. For now we encrypt with AES-256-GCM using a key derived from
// NEXTAUTH_SECRET - same infra NextAuth already relies on.
function encrypt(plaintext: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-only-fallback-not-for-production'
  const key = crypto.createHash('sha256').update(secret).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.')
}

// GET /api/enterprise/organizations/[orgId]/sso
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const rows = await db
      .select()
      .from(schema.ssoConfigs)
      .where(eq(schema.ssoConfigs.organizationId, orgId))
      .limit(1)
    const cfg = rows[0] ?? null
    return NextResponse.json({ sso: cfg ? redact(cfg) : null })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// PUT /api/enterprise/organizations/[orgId]/sso
// Body: full config object. Upserts (one config per org for now).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const provider = body.provider as Provider | undefined
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'invalid provider' }, { status: 400 })
    }
    const domain = typeof body.domain === 'string'
      ? body.domain.trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      : ''
    if (!domain) return NextResponse.json({ error: 'domain is required' }, { status: 400 })

    // ─── Domain ownership ────────────────────────────────────────────────
    // Until DNS verification exists, the only evidence we have that a caller
    // controls a domain is that they are signed in with an address at it.
    //
    // Without this block the route accepted ANY domain string, and that was a
    // full authentication bypass rather than mere squatting: claim victim.com,
    // point the config at an IdP you control, and /api/sso/callback would
    // check only that the asserted email ends with the domain YOU configured
    // (callback route, "assertedEmail.endsWith"). Your own IdP picks that
    // value, so it asserts ceo@victim.com, the callback finds the real
    // Reattend user with that address and issues them a session ticket.
    // JIT provisioning (on by default) then adds them to your org too.
    //
    // Three conditions, cheapest first:
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
      return NextResponse.json({ error: 'invalid_domain', message: 'Use a bare domain, like acme.com.' }, { status: 400 })
    }

    // 1. Never let anyone claim a public mailbox provider. Claiming gmail.com
    //    would put every consumer-address account in reach at once.
    if (isPersonalEmail(`someone@${domain}`)) {
      return NextResponse.json({
        error: 'public_domain_forbidden',
        message: `${domain} is a public email provider and cannot be used for SSO.`,
      }, { status: 403 })
    }

    // 2. The caller must be signed in at the domain they are claiming.
    const callerDomain = (auth.userEmail || '').split('@')[1]?.toLowerCase() || ''
    if (callerDomain !== domain) {
      return NextResponse.json({
        error: 'domain_not_owned',
        message: `You're signed in as ${auth.userEmail}, so you can only configure SSO for ${callerDomain || 'your own domain'}. To claim ${domain}, sign in with an address at it.`,
      }, { status: 403 })
    }

    // 3. First legitimate claim wins. /api/sso/initiate resolves a domain with
    //    findFirst, so two rows for one domain would make sign-in resolve to
    //    an arbitrary org.
    const claimedElsewhere = await db
      .select({ organizationId: schema.ssoConfigs.organizationId })
      .from(schema.ssoConfigs)
      .where(eq(schema.ssoConfigs.domain, domain))
      .limit(1)
      .then((r) => r[0])
    if (claimedElsewhere && claimedElsewhere.organizationId !== orgId) {
      return NextResponse.json({
        error: 'domain_already_claimed',
        message: `${domain} is already configured for SSO by another organization. Contact support@reattend.com if that is wrong.`,
      }, { status: 409 })
    }

    const existing = await db
      .select()
      .from(schema.ssoConfigs)
      .where(eq(schema.ssoConfigs.organizationId, orgId))
      .limit(1)

    const fields: Partial<typeof schema.ssoConfigs.$inferInsert> = {
      organizationId: orgId,
      provider,
      domain,
      clientId: typeof body.clientId === 'string' ? body.clientId.trim() : null,
      tenantId: typeof body.tenantId === 'string' ? body.tenantId.trim() : null,
      metadataUrl: typeof body.metadataUrl === 'string' ? body.metadataUrl.trim() : null,
      acsUrl: typeof body.acsUrl === 'string' ? body.acsUrl.trim() : null,
      entityId: typeof body.entityId === 'string' ? body.entityId.trim() : null,
      enabled: !!body.enabled,
      justInTimeProvisioning: body.justInTimeProvisioning !== false,
      defaultRole: body.defaultRole === 'guest' ? 'guest' : 'member',
      updatedAt: new Date().toISOString(),
    }

    // Secret: only update if caller provided a new one. Send empty string
    // to clear.
    if (typeof body.clientSecret === 'string') {
      fields.clientSecretEncrypted = body.clientSecret.length > 0 ? encrypt(body.clientSecret) : null
    }

    if (existing[0]) {
      await db.update(schema.ssoConfigs).set(fields).where(eq(schema.ssoConfigs.id, existing[0].id))
    } else {
      await db.insert(schema.ssoConfigs).values(fields as typeof schema.ssoConfigs.$inferInsert)
    }

    auditFromAuth(auth, 'update', {
      resourceType: 'sso_config',
      resourceId: orgId,
      metadata: {
        provider,
        enabled: !!body.enabled,
        domain,
        secretChanged: typeof body.clientSecret === 'string',
      },
    })

    const updated = await db
      .select()
      .from(schema.ssoConfigs)
      .where(eq(schema.ssoConfigs.organizationId, orgId))
      .limit(1)
    return NextResponse.json({ sso: updated[0] ? redact(updated[0]) : null })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// DELETE /api/enterprise/organizations/[orgId]/sso
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    await db
      .delete(schema.ssoConfigs)
      .where(and(eq(schema.ssoConfigs.organizationId, orgId)))
    auditFromAuth(auth, 'update', {
      resourceType: 'sso_config',
      resourceId: orgId,
      metadata: { deleted: true },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
