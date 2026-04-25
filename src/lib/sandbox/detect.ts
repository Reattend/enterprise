// Sandbox detection.
//
// Visitors landing on /sandbox get a cloned demo org + a synthetic user whose
// email ends in '@sandbox.reattend.local' and whose org has slug prefix
// 'sandbox-'. Every AI endpoint checks isSandboxSession() before hitting the
// LLM — sandbox sessions serve pre-canned fixtures instead, so we can showcase
// the product without burning tokens or risking unpredictable output.

const SANDBOX_EMAIL_SUFFIX = '@sandbox.reattend.local'
const SANDBOX_ORG_PREFIX = 'sandbox-'

export function isSandboxEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(SANDBOX_EMAIL_SUFFIX)
}

export function isSandboxOrgSlug(slug: string | null | undefined): boolean {
  if (!slug) return false
  return slug.toLowerCase().startsWith(SANDBOX_ORG_PREFIX)
}

// Accepts a NextAuth session.user and/or an org row; returns true if either
// marker is present. Safe to call with partial/undefined inputs.
export function isSandboxSession(opts: {
  email?: string | null
  orgSlug?: string | null
}): boolean {
  return isSandboxEmail(opts.email) || isSandboxOrgSlug(opts.orgSlug)
}

export { SANDBOX_EMAIL_SUFFIX, SANDBOX_ORG_PREFIX }
