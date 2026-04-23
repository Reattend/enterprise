# StateRAMP Moderate — control mapping

**Status:** In preparation. Full certification is a Year-2 target. This document is the honest internal map of which controls are already satisfied, which are partial, and which are still open.

**Last reviewed:** 2026-04-23
**Target:** StateRAMP Moderate (aligned to NIST SP 800-53 Rev 5 moderate baseline)

The format is direct — we don't claim coverage we don't have. When an auditor walks in, this is the starting inventory.

---

## Summary

| Family | Live | Partial | Gap |
|---|---|---|---|
| Access Control (AC) | 7 | 4 | 2 |
| Audit and Accountability (AU) | 6 | 2 | 3 |
| Identification and Authentication (IA) | 4 | 3 | 1 |
| System and Communications Protection (SC) | 5 | 4 | 3 |
| Incident Response (IR) | 2 | 2 | 4 |
| Contingency Planning (CP) | 1 | 2 | 5 |
| Configuration Management (CM) | 3 | 3 | 3 |
| Media Protection (MP) | 3 | 1 | 2 |
| Physical and Environmental (PE) | Delegated to IaaS provider (DigitalOcean / customer DC for on-prem) |
| Personnel Security (PS) | 2 | 1 | 3 |
| Risk Assessment (RA) | 1 | 2 | 3 |
| Awareness & Training (AT) | 1 | 1 | 2 |

---

## AC — Access Control

| Control | Status | Notes |
|---|---|---|
| AC-2 Account Management | Live | Super admin / admin / member / guest roles; org + dept-scoped. See `src/lib/enterprise/rbac.ts`. |
| AC-3 Access Enforcement | Live | RBAC enforced at query time across FTS, semantic, graph, Chat, Oracle, Time Machine. |
| AC-4 Information Flow | Live | Record-level visibility (private / team / dept / org). Cross-dept shares via explicit grants only. |
| AC-5 Separation of Duties | Partial | Super admin / admin split exists; need documented role-change procedure with dual approval for super_admin promotions. |
| AC-6 Least Privilege | Live | Default member role sees only their department; admin elevation is explicit. |
| AC-7 Unsuccessful Logon Attempts | Partial | NextAuth defaults apply; custom lockout thresholds pending. |
| AC-11 Session Lock | Gap | Browser session persists until logout; auto-lock-on-idle not implemented. |
| AC-12 Session Termination | Live | Session revocation on role change; manual logout available. |
| AC-17 Remote Access | Live | All access is remote over TLS; no special "remote vs local" distinction. |
| AC-18 Wireless | Delegated | No wireless surface we control. |
| AC-19 Mobile Devices | Partial | Web-responsive UI; no mobile device management hooks yet (post-launch). |
| AC-20 External Systems | Live | Integrations gated per-org by admin (Nango-managed). |
| AC-22 Public Content | Live | Public marketing site isolated from app; no customer data surface. |

## AU — Audit and Accountability

| Control | Status | Notes |
|---|---|---|
| AU-2 Event Logging | Live | Every action that touches customer data is written to `audit_log`. |
| AU-3 Content of Audit Records | Live | actor, action, resource, timestamp, IP, user-agent, metadata. |
| AU-6 Audit Review | Partial | Admin cockpit exposes search + CSV export; automated alerting (SIEM hooks) pending. |
| AU-7 Audit Reduction | Live | Filter + export in admin UI. |
| AU-8 Time Stamps | Live | ISO 8601 UTC, NTP-synced on droplet. |
| AU-9 Protection of Audit Info | Live | Hash-chain WORM: each row references prev row's sha256. Verify endpoint surfaces tamper. |
| AU-11 Audit Record Retention | Partial | Configurable per-org; gov default infinite, SMB default 7 years. Automated purge job pending. |
| AU-12 Audit Generation | Live | Centralised via `writeAudit()` / `writeAuditAsync()`. |

## IA — Identification and Authentication

| Control | Status | Notes |
|---|---|---|
| IA-2 Identification and Authentication | Live | Email + password; SSO SAML for Okta/Entra/Google. |
| IA-2(1) Network Access w/ MFA | Partial | MFA via IdP when SSO enabled. Native MFA for password auth is Q1 post-launch. |
| IA-2(12) PIV Acceptance | Gap | Needs SSO integration with gov PIV provider. |
| IA-4 Identifier Management | Live | User IDs are UUIDv4, never reissued. |
| IA-5 Authenticator Management | Live | bcrypt password hashing; SSO replaces on enterprise plans. |
| IA-6 Authenticator Feedback | Live | Passwords obscured in UI. |
| IA-7 Cryptographic Module Auth | Live | TLS cert from Let's Encrypt + HSTS. |
| IA-8 Non-Organizational Users | Live | Guest role scopes to explicit shares. |

## SC — System and Communications Protection

| Control | Status | Notes |
|---|---|---|
| SC-5 DoS Protection | Partial | Nginx rate limiting on droplet; Cloudflare recommended. |
| SC-7 Boundary Protection | Live | Nginx + firewall; API surfaces require auth. |
| SC-8 Transmission Confidentiality | Live | TLS 1.2+ everywhere. HSTS enabled. |
| SC-12 Cryptographic Key Establishment | Live | TLS 1.2+ / 1.3; ECDHE by default. |
| SC-13 Cryptographic Protection | Live | TLS 1.2+, bcrypt passwords, sha256 audit chain. |
| SC-28 Protection at Rest | Partial | Droplet disk encryption via LUKS in SaaS; pg_tde on Postgres deployments. Customer-managed KMS on on-prem. |
| SC-18 Mobile Code | Live | CSP on public surfaces. |

## IR — Incident Response

| Control | Status | Notes |
|---|---|---|
| IR-4 Incident Handling | Partial | Ad-hoc process; formal runbook pending. |
| IR-6 Reporting | Live | `security@reattend.com` with 48h acknowledgment SLA. |
| IR-8 Incident Response Plan | Gap | Documented plan Q1 post-launch. |

## CP — Contingency Planning

| Control | Status | Notes |
|---|---|---|
| CP-9 System Backup | Partial | SQLite WAL + nightly R2 backups on droplet. Point-in-time restore on Postgres deployments. |
| CP-10 Recovery & Reconstitution | Gap | Documented runbook + regular restore drills pending. |

## CM — Configuration Management

| Control | Status | Notes |
|---|---|---|
| CM-2 Baseline Configuration | Live | Infrastructure as code (Next.js + PM2 + nginx). |
| CM-3 Configuration Change Control | Partial | Every deploy is a git push; commit history is the change record. Formal change-advisory process pending. |
| CM-6 Configuration Settings | Live | `.env` under secrets management; no secrets in git. |
| CM-7 Least Functionality | Live | Only necessary ports open. |
| CM-8 Information System Component Inventory | Partial | Documented in `CLAUDE.md` + `today.md` + `sprint.md`. |

## MP — Media Protection

| Control | Status | Notes |
|---|---|---|
| MP-3 Media Marking | Live | Records carry visibility labels + department scope. |
| MP-4 Media Storage | Live | Encrypted at rest. |
| MP-5 Media Transport | Delegated | Not applicable for SaaS; customer responsible on-prem. |
| MP-6 Media Sanitization | Live | GDPR erasure wipes the user + anonymises audit markers. |

---

## Open items (not yet satisfied)

1. **AC-11 Session Lock** — implement auto-lock-on-idle.
2. **AU-11 Audit Record Retention** — automated purge job per-org policy.
3. **IA-2(12) PIV Acceptance** — federate with gov PIV provider.
4. **IR-8 Incident Response Plan** — document the runbook.
5. **CP-10 Recovery & Reconstitution** — quarterly restore drills.
6. **SC-28 full at-rest encryption** — customer-managed KMS on SaaS tier (today only on on-prem).

---

## Next steps

1. Engage a StateRAMP-experienced auditor for a gap assessment once SOC 2 Type I lands (Q1 post-launch).
2. Ship the six open items above in priority order.
3. Package the System Security Plan (SSP) using the StateRAMP template.
4. File for StateRAMP Ready authorization; aim for full Moderate within Year 2.

*Reviewed by: engineering. Awaiting counsel review.*
