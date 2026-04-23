# CJIS addendum

For customers with Criminal Justice Information (CJI) in scope. Written against CJIS Security Policy v5.9.4.

**Status:** Addendum document — available on request for law-enforcement-adjacent clients. Full CJIS-compliant deployment requires on-premise and is customer-operated inside their CJIS-approved environment.

---

## What we commit to

1. **No CJI on our SaaS tier.** Reattend SaaS is not a CJIS environment. Any CJI must land on the on-premise deployment running inside the customer's CJIS-approved network.
2. **On-premise stack runs entirely inside your perimeter.** App server + database + LLM (on-prem Rabbit) all run on hardware you control. No outbound telemetry, no model-training data flow.
3. **Background-checked personnel.** Reattend engineers who touch CJIS-adjacent deployments complete CJIS security awareness training and pass fingerprint-based CHRIs where required by the customer's policy.
4. **Signed agreements.** CJIS Management Control Agreement (MCA) available. Customer's CJIS Systems Officer (CSO) signs off on deployment.

---

## Control mapping (summary)

| CJIS 5.x Area | Coverage | Notes |
|---|---|---|
| 5.1 Information Exchange Agreements | Customer-owned | We execute required addenda. |
| 5.2 Security Awareness Training | Our engineers | Annual CJIS Level 2/3 training for anyone with admin access to CJIS-adjacent deployments. |
| 5.3 Incident Response | Partial | `security@reattend.com` + 24/7 paging; customer's CJIS incident workflow takes precedence. |
| 5.4 Auditing and Accountability | Live | Hash-chain WORM audit log; tamper-detection verified on request. |
| 5.5 Access Control | Live | Two-tier RBAC; session termination on role change. |
| 5.6 Identification and Authentication | Partial | MFA via SSO on enterprise plans; PIV/CAC card support is a customer IdP responsibility. |
| 5.7 Configuration Management | Live | Every change is a git commit; deployment is reproducible from source. |
| 5.8 Media Protection | Live | At-rest encryption; GDPR-style erasure wipes on-prem too. |
| 5.9 Physical Protection | Customer | Customer controls the physical environment for on-prem deployments. |
| 5.10 System and Comms Protection | Live | TLS 1.2+ in transit; app-layer segmentation. |
| 5.11 Formal Audits | Customer | Customer is subject to CJIS audits; we support evidence collection. |
| 5.12 Personnel Security | Partial | Background checks for Reattend engineers with deployment access; customer manages their own end-user checks. |
| 5.13 Mobile Devices | Deferred | No mobile apps yet; when they ship, they'll honor FIPS-validated crypto. |

---

## Deployment model for CJIS clients

1. Customer provides hardware inside their CJIS-approved environment.
2. Reattend installs the on-prem stack (Next.js + Postgres + Rabbit) and hands root access to the customer's IT.
3. Reattend engineers have read-only access for support (via customer-initiated screenshare / VPN); zero persistent access.
4. All model inference happens on the customer's hardware — no inference traffic leaves the CJIS environment.
5. Software updates delivered as signed tarballs; customer reviews + applies on their own cadence.

---

## Open items

- FIPS 140-2 / 140-3 validated crypto modules are currently TLS via OpenSSL. For FIPS-mode deployments we switch to a FIPS-validated OpenSSL build as part of installation; customer validation required.
- PIV/CAC card auth is SSO-provider-dependent; we integrate with what the customer's IdP offers.
- Reattend does not hold a standalone CJIS compliance certificate; compliance is a property of the customer's deployment and their environment.

---

*For a detailed policy-by-policy mapping or to request the MCA template, email [trust@reattend.com](mailto:trust@reattend.com).*
