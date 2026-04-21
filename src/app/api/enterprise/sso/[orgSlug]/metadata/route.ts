import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

// GET /api/enterprise/sso/[orgSlug]/metadata
// Returns the SP (service provider) metadata XML that the customer uploads
// to their IdP to configure the trust. Public — no auth — but scoped to
// the slug so you can only reach enabled orgs.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  try {
    const { orgSlug } = await params
    const orgRows = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, orgSlug))
      .limit(1)
    const org = orgRows[0]
    if (!org) return new NextResponse('org not found', { status: 404 })

    const ssoRows = await db
      .select()
      .from(schema.ssoConfigs)
      .where(eq(schema.ssoConfigs.organizationId, org.id))
      .limit(1)
    const sso = ssoRows[0]
    if (!sso || !sso.enabled) return new NextResponse('SSO not enabled', { status: 404 })

    const base = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const entityId = sso.entityId || `${base}/api/enterprise/sso/${orgSlug}`
    const acsUrl = sso.acsUrl || `${base}/api/enterprise/sso/${orgSlug}/acs`

    // Minimal SAML 2.0 SP metadata. For production we'd include SigningKeyInfo.
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${escapeXml(entityId)}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService
      index="0"
      isDefault="true"
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${escapeXml(acsUrl)}" />
  </SPSSODescriptor>
</EntityDescriptor>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `inline; filename="reattend-${orgSlug}-sp-metadata.xml"`,
      },
    })
  } catch (err) {
    console.error('[sso metadata]', err)
    return new NextResponse('internal error', { status: 500 })
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
