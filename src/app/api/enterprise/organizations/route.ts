import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  writeAuditAsync,
  extractRequestMeta,
  handleEnterpriseError,
  isPersonalEmail,
  emailMatchesOrgDomain,
} from '@/lib/enterprise'

// Strict domain regex — rejects emails, URLs, and malformed input.
// Accepts acme.com, sub.acme.co.uk, etc.
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

// Local-dev bypass: when NEXT_PUBLIC_ENTERPRISE_MODE is not 'strict', allow
// personal emails to create orgs (so dev/demo can proceed without a real
// work email). In production (strict), we enforce work emails.
const STRICT_MODE = process.env.ENTERPRISE_STRICT_ONBOARDING === 'true'

// GET /api/enterprise/organizations — list orgs the current user belongs to
export async function GET() {
  try {
    const { userId } = await requireAuth()

    const memberships = await db
      .select({
        orgId: schema.organizationMembers.organizationId,
        role: schema.organizationMembers.role,
        status: schema.organizationMembers.status,
        title: schema.organizationMembers.title,
        orgName: schema.organizations.name,
        orgSlug: schema.organizations.slug,
        orgPlan: schema.organizations.plan,
        orgDeployment: schema.organizations.deployment,
        orgStatus: schema.organizations.status,
        primaryDomain: schema.organizations.primaryDomain,
      })
      .from(schema.organizationMembers)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMembers.organizationId))
      .where(and(
        eq(schema.organizationMembers.userId, userId),
        eq(schema.organizationMembers.status, 'active'),
      ))

    return NextResponse.json({ organizations: memberships })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/organizations — create a new org, caller becomes super_admin
export async function POST(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const callerEmail = (session?.user?.email ?? '').toLowerCase()
    const body = await req.json()
    const { name, slug, primaryDomain, plan, deployment } = body as {
      name?: string
      slug?: string
      primaryDomain?: string
      plan?: 'starter' | 'business' | 'enterprise' | 'government'
      deployment?: 'saas' | 'on_prem' | 'air_gapped'
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // Normalize + strictly validate primaryDomain. Must look like acme.com
    // — no `@`, no protocol, no path, no whitespace.
    let normalizedDomain: string | null = null
    if (primaryDomain && typeof primaryDomain === 'string') {
      const d = primaryDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      if (d.length === 0) {
        normalizedDomain = null
      } else if (d.includes('@') || !DOMAIN_RE.test(d)) {
        return NextResponse.json(
          { error: 'invalid domain format — use acme.com (no @, no https://, just the domain)' },
          { status: 400 },
        )
      } else {
        normalizedDomain = d
      }
    }

    // Creator email should match the org's primary domain (if set). In strict
    // mode (production), block on mismatch. In dev, allow through with a
    // warning so onboarding isn't gated by local test emails.
    if (STRICT_MODE) {
      if (isPersonalEmail(callerEmail)) {
        return NextResponse.json({
          error: 'personal_email_forbidden',
          message: 'Reattend Enterprise requires a work email. Sign in with your organization address.',
        }, { status: 403 })
      }
      if (normalizedDomain && !emailMatchesOrgDomain(callerEmail, normalizedDomain)) {
        return NextResponse.json({
          error: 'email_domain_mismatch',
          message: `You're signed in as ${callerEmail}, which doesn't match the domain ${normalizedDomain}. Sign in with an @${normalizedDomain} address, or remove the domain restriction.`,
        }, { status: 403 })
      }
    } else if (normalizedDomain && !emailMatchesOrgDomain(callerEmail, normalizedDomain)) {
      console.warn(`[org create] dev mode: creator ${callerEmail} does not match primaryDomain ${normalizedDomain} — allowing`)
    }

    // Slug: auto-generate from name if not provided. Slugs are globally unique.
    const finalSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 64)
    if (!/^[a-z0-9][a-z0-9-]*$/.test(finalSlug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }

    const existing = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, finalSlug)).limit(1)
    if (existing[0]) {
      return NextResponse.json({ error: 'slug already taken' }, { status: 409 })
    }

    const orgId = crypto.randomUUID()

    await db.insert(schema.organizations).values({
      id: orgId,
      name: name.trim(),
      slug: finalSlug,
      primaryDomain: normalizedDomain,
      plan: plan || 'starter',
      deployment: deployment || 'saas',
      status: 'active',
      createdBy: userId,
    })

    // Founding super_admin
    await db.insert(schema.organizationMembers).values({
      organizationId: orgId,
      userId,
      role: 'super_admin',
      status: 'active',
    })

    const userRow = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    const email = userRow[0]?.email ?? 'unknown'
    const meta = extractRequestMeta(req)

    writeAuditAsync({
      organizationId: orgId,
      userId,
      userEmail: email,
      action: 'create',
      resourceType: 'organization',
      resourceId: orgId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { name, slug: finalSlug, plan: plan || 'starter', deployment: deployment || 'saas' },
    })

    return NextResponse.json({
      organization: {
        id: orgId,
        name: name.trim(),
        slug: finalSlug,
        primaryDomain: normalizedDomain,
        plan: plan || 'starter',
        deployment: deployment || 'saas',
        status: 'active',
      },
    }, { status: 201 })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
