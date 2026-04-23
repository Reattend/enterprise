// PII redaction — first-pass regex pipeline.
//
// Intentional v1 scope: SSN, US phone, email, credit card (Luhn),
// ABA routing + bank account numbers, DOB-looking dates, IP, US street
// address (very rough). Each pattern replaces with a typed token:
//   [REDACTED:SSN] [REDACTED:PHONE] [REDACTED:EMAIL] etc.
//
// This is defense-in-depth, NOT a forensic redactor. For true legal
// redaction (government requirement), pair with a trained model + a
// human review step before publication. Gov clients are also expected
// to run their own sensitivity review — we never claim "fully redacted."
//
// Returns both the redacted text and a count of redactions per kind so
// the OCR worker can audit it properly.

export type RedactionKind = 'ssn' | 'phone' | 'email' | 'credit_card' | 'routing' | 'account' | 'dob' | 'ip' | 'address'

export interface RedactionResult {
  text: string
  counts: Record<RedactionKind, number>
  total: number
}

const PATTERNS: Array<{ kind: RedactionKind; re: RegExp; replace: (m: string) => string; filter?: (m: string) => boolean }> = [
  // US SSN — 9 digits in XXX-XX-XXXX or XXXXXXXXX form
  { kind: 'ssn', re: /\b(?!000|666|9\d\d)\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g, replace: () => '[REDACTED:SSN]' },
  // US phone — flexible
  { kind: 'phone', re: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replace: () => '[REDACTED:PHONE]' },
  // Email
  { kind: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: () => '[REDACTED:EMAIL]' },
  // Credit card — 13-19 digits, Luhn verify
  { kind: 'credit_card', re: /\b(?:\d[ -]?){13,19}\b/g, replace: () => '[REDACTED:CARD]', filter: (m) => luhn(m.replace(/\D/g, '')) },
  // ABA routing — 9 digits with ABA checksum
  { kind: 'routing', re: /\b\d{9}\b/g, replace: () => '[REDACTED:ROUTING]', filter: (m) => abaValid(m) },
  // Account numbers — 8-17 digits (not SSN, not routing) — generic bank account
  { kind: 'account', re: /\b(?:account|acct|a\/c)[\s#:]*([0-9]{8,17})\b/gi, replace: () => 'account [REDACTED:ACCT]' },
  // DOB — MM/DD/YYYY or DD Mon YYYY near "DOB" / "birth"
  { kind: 'dob', re: /\b(?:DOB|date of birth|born on)[:\s]*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,}\s+[0-9]{2,4})\b/gi, replace: () => 'DOB [REDACTED:DOB]' },
  // IPv4 — public concern is narrower, but we redact blanket
  { kind: 'ip', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replace: () => '[REDACTED:IP]', filter: (m) => m.split('.').every((p) => parseInt(p, 10) <= 255) },
  // US street address — very rough: "<number> <words>" followed by common suffixes
  { kind: 'address', re: /\b\d{1,5}\s+(?:[NSEW]\.?\s+)?[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Rd|Road|Dr(?:ive)?|Ln|Lane|Ct|Court|Way|Pl(?:ace)?|Pkwy|Parkway|Hwy|Highway|Cir(?:cle)?)\.?\b/g, replace: () => '[REDACTED:ADDRESS]' },
]

export function redactPII(text: string): RedactionResult {
  if (!text) return emptyResult()
  let out = text
  const counts: Record<RedactionKind, number> = {
    ssn: 0, phone: 0, email: 0, credit_card: 0, routing: 0,
    account: 0, dob: 0, ip: 0, address: 0,
  }
  for (const p of PATTERNS) {
    out = out.replace(p.re, (match) => {
      if (p.filter && !p.filter(match)) return match
      counts[p.kind] += 1
      return p.replace(match)
    })
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { text: out, counts, total }
}

function emptyResult(): RedactionResult {
  return {
    text: '',
    counts: { ssn: 0, phone: 0, email: 0, credit_card: 0, routing: 0, account: 0, dob: 0, ip: 0, address: 0 },
    total: 0,
  }
}

function luhn(s: string): boolean {
  if (s.length < 13 || s.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = s.length - 1; i >= 0; i--) {
    let n = parseInt(s.charAt(i), 10)
    if (isNaN(n)) return false
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

// ABA routing-number checksum:
// 3*(d1+d4+d7) + 7*(d2+d5+d8) + (d3+d6+d9) ≡ 0 (mod 10)
function abaValid(s: string): boolean {
  if (!/^\d{9}$/.test(s)) return false
  const d = s.split('').map((c) => parseInt(c, 10))
  const check = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])
  return check % 10 === 0
}
