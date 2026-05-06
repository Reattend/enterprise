// Shared helpers for the account-linking feature.
//
// Storage rule: a link between users A and B is stored as ONE row with
// the lexically-smaller userId in user_a_id. Lookups treat the link as
// symmetric — orderPair() canonicalises any pair before reading or
// writing, so callers never need to remember the rule.

export function orderPair(userId1: string, userId2: string): { a: string; b: string } {
  return userId1 < userId2
    ? { a: userId1, b: userId2 }
    : { a: userId2, b: userId1 }
}

// Ticket payload organizationId field is required by issueSsoTicket but
// the sso-ticket NextAuth provider ignores it on verify. Account
// switching doesn't carry an org context — we use this sentinel so it's
// obvious in logs that the ticket was minted for a same-account switch
// rather than a real SSO flow.
export const ACCOUNT_SWITCH_ORG_SENTINEL = ''
