import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateApiToken } from '@/lib/auth/token'

export const dynamic = 'force-dynamic'

// GET /api/tray/extension-policy
//
// Returns the union of every org's required-domain list for the user.
// The extension calls this on startup + every 30 min and merges with the
// user's personal whitelist. Admins configure per-org required domains on
// /admin/:orgId/extension; members cannot turn those off.
//
// Response:
//   {
//     requiredDomains: string[],   // must-track, member can't disable
//     recommended: string[],       // suggested but not forced
//     ambient: boolean,            // show related-memory card on these sites
//     orgs: Array<{ id, name, requiredDomains, recommendedDomains }>
//   }

interface OrgExtensionPolicy {
  requiredDomains?: string[]
  recommendedDomains?: string[]
  ambient?: boolean
}

function parsePolicy(settingsJson: string | null): OrgExtensionPolicy {
  if (!settingsJson) return {}
  try {
    const parsed = JSON.parse(settingsJson)
    const pol = parsed?.extensionPolicy
    if (!pol || typeof pol !== 'object') return {}
    return {
      requiredDomains: Array.isArray(pol.requiredDomains) ? pol.requiredDomains : [],
      recommendedDomains: Array.isArray(pol.recommendedDomains) ? pol.recommendedDomains : [],
      ambient: typeof pol.ambient === 'boolean' ? pol.ambient : true,
    }
  } catch {
    return {}
  }
}

export async function GET(req: NextRequest) {
  const auth = await validateApiToken(req.headers.get('authorization'))
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const memberships = await db.select()
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.userId, auth.userId))

  const requiredAll = new Set<string>()
  const recommendedAll = new Set<string>()
  let anyAmbient = false
  const orgs: Array<{ id: string; name: string; requiredDomains: string[]; recommendedDomains: string[] }> = []

  for (const m of memberships) {
    if (m.status !== 'active') continue
    const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, m.organizationId) })
    if (!org) continue
    const policy = parsePolicy(org.settings)
    const required = (policy.requiredDomains || []).filter(Boolean)
    const recommended = (policy.recommendedDomains || []).filter(Boolean)
    for (const d of required) requiredAll.add(d.toLowerCase())
    for (const d of recommended) recommendedAll.add(d.toLowerCase())
    if (policy.ambient !== false) anyAmbient = true
    orgs.push({
      id: org.id,
      name: org.name,
      requiredDomains: required,
      recommendedDomains: recommended,
    })
  }

  return NextResponse.json({
    requiredDomains: Array.from(requiredAll),
    recommended: Array.from(recommendedAll),
    ambient: anyAmbient,
    orgs,
  })
}
