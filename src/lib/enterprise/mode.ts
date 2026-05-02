// ─── Enterprise deployment mode ─────────────────────────────────────────────
// This codebase is Reattend, deployed to reattend.com (canonical) and
// enterprise.reattend.com (legacy host, redirects to canonical). It was
// originally forked from Reattend Personal; the Personal product is being
// sunset and a future Personal product will fork back from this codebase.
//
// All Personal/Team workspace concepts are vestigial here, inherited from the
// fork. The UI should never surface them. The only identity in this product
// is the Organization.
//
// Users here must sign in with an organization-provided email. Personal email
// providers (gmail, hotmail, yahoo, etc.) are rejected at invite-create and
// signup-time. If the inviter's organization has a `primaryDomain` set, the
// invited email must match that domain.

// Major personal email providers. Not exhaustive — add as users report
// rejections. Every entry lowercased.
export const PERSONAL_EMAIL_DOMAINS = new Set([
  // Google
  'gmail.com', 'googlemail.com',
  // Microsoft
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
  'outlook.com', 'outlook.in', 'outlook.co.uk',
  'live.com', 'live.co.uk', 'msn.com',
  // Yahoo
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.in',
  'ymail.com', 'rocketmail.com',
  // Apple
  'icloud.com', 'me.com', 'mac.com',
  // AOL
  'aol.com', 'aim.com',
  // Proton
  'protonmail.com', 'proton.me', 'pm.me',
  // Others
  'zoho.com', 'mail.com', 'gmx.com', 'gmx.net',
  'fastmail.com', 'fastmail.fm',
  'yandex.com', 'yandex.ru',
  // Indian personal providers
  'rediffmail.com', 'indiatimes.com',
])

export function isPersonalEmail(email: string): boolean {
  const lower = email.trim().toLowerCase()
  const at = lower.lastIndexOf('@')
  if (at === -1 || at === lower.length - 1) return false
  const domain = lower.slice(at + 1)
  return PERSONAL_EMAIL_DOMAINS.has(domain)
}

export function emailDomain(email: string): string | null {
  const lower = email.trim().toLowerCase()
  const at = lower.lastIndexOf('@')
  if (at === -1 || at === lower.length - 1) return null
  return lower.slice(at + 1)
}

// True if `email` matches the org's declared primary domain, or any subdomain
// of it. So for primaryDomain='acme.com', both alice@acme.com and
// alice@us.acme.com pass.
export function emailMatchesOrgDomain(email: string, primaryDomain: string | null | undefined): boolean {
  if (!primaryDomain) return true // no restriction set
  const d = emailDomain(email)
  if (!d) return false
  const org = primaryDomain.trim().toLowerCase()
  return d === org || d.endsWith('.' + org)
}

export interface InviteValidation {
  ok: true
  reason?: never
}
export interface InviteRejection {
  ok: false
  reason: 'personal_email' | 'wrong_domain' | 'invalid_email'
  message: string
}

// Invite policy:
//   - Always reject syntactically-invalid emails.
//   - If the org has declared a primaryDomain, enforce it (reject personal
//     providers AND anything not matching the domain).
//   - If the org has NO primaryDomain set (starter orgs, small teams), accept
//     any address — including personal gmail/hotmail. Many real 10-person
//     startups run on founders' personal email.
export function validateEnterpriseInviteEmail(
  email: string,
  primaryDomain: string | null | undefined,
): InviteValidation | InviteRejection {
  const e = email.trim().toLowerCase()
  if (!e.includes('@') || e.length < 5) {
    return { ok: false, reason: 'invalid_email', message: 'invalid email format' }
  }
  // No org-level restriction set → allow any valid email.
  if (!primaryDomain) {
    return { ok: true }
  }
  // primaryDomain set → strict: both personal-provider AND mismatched-domain fail.
  if (!emailMatchesOrgDomain(e, primaryDomain)) {
    if (isPersonalEmail(e)) {
      return {
        ok: false,
        reason: 'personal_email',
        message: `This organization requires work emails. Ask the recipient to use their @${primaryDomain.replace(/^@/, '')} address.`,
      }
    }
    return {
      ok: false,
      reason: 'wrong_domain',
      message: `This organization only accepts emails ending in @${primaryDomain.replace(/^@/, '')}.`,
    }
  }
  return { ok: true }
}
