# Reattend Enterprise

**Organizational memory that never forgets. Self-healing knowledge for companies and government.**

Forked from Reattend Personal (~/Desktop/Final Reattend/reattend/). Shares the core ingestion pipeline, ask engine, and DeepThink. Adds enterprise layers on top.

---

## What this solves

Organizations lose $31.5B/year from poor knowledge sharing. 42% of institutional knowledge lives only in individual employees' heads. When someone leaves, transfers, or retires — their context goes with them.

Reattend Enterprise ensures **nothing is ever lost**. Every decision, every context, every piece of institutional knowledge is captured, linked, and accessible — regardless of who joins or leaves.

## How it's different from Glean

| | Glean | Reattend Enterprise |
|---|---|---|
| Core | Search across tools | Memory graph with temporal reasoning |
| When someone leaves | Their docs are searchable | Their decisions + context are preserved as institutional memory |
| Analytics | Search analytics | **Decision analytics** — what was decided, by whom, was it reversed |
| On-premise | No | Yes — Rabbit on their servers |
| Self-healing | No | Auto-detects stale policies, contradictions, knowledge gaps |
| Price | $25/user/month | $8/user/month |

## Architecture

```
enterprise.reattend.com (SaaS control plane)
  ├── Admin console (org setup, users, roles, analytics)
  ├── Connector management (which tools to sync)
  └── Billing & licensing

Customer's infrastructure (on-prem or private cloud)
  ├── Rabbit v2.1 (ingestion) — their GPU or managed
  ├── Memory graph (Postgres + pgvector)
  ├── Claude API or Rabbit (answering)
  └── SSO/SAML integration
```

## What's inherited from personal Reattend

- [x] Ingestion pipeline (Groq primary, Rabbit batch)
- [x] Ask engine (Claude Sonnet for answering)
- [x] DeepThink (strategic thinking partner)
- [x] FTS5 full-text search
- [x] FastEmbed local embeddings
- [x] Workspace system (already supports teams)
- [x] Invite flow (email invite → accept → join)
- [x] Role system (owner/admin/member)

## What needs to be built

### Phase 1: Foundation (Week 1-2)
- [ ] Org hierarchy: Organization → Department → Division → Team
- [ ] Enhanced RBAC: who sees what, at what level
- [ ] Audit trail: every query logged, every access tracked
- [ ] Admin dashboard: usage, health, member management
- [ ] SSO/SAML integration (Azure AD, Okta, Google Workspace)

### Phase 2: Enterprise Features (Week 3-4)
- [ ] Decision tracking: who decided, when, context, outcome, was it reversed
- [ ] Transfer protocol: when employee leaves, knowledge stays with the role
- [ ] Self-healing: auto-detect stale policies, contradicting documents, orphaned knowledge
- [ ] Knowledge gap detection: "Department X has no documented decisions for 6 months"
- [ ] Enterprise connectors: SharePoint, Teams, Confluence, SAP

### Phase 3: Analytics (Week 5-6)
- [ ] Decision analytics: "This decision was made 3 times and reversed each time"
- [ ] Knowledge health score per department
- [ ] Turnover impact analysis: "When Officer A left, 47% of project context had no successor"
- [ ] Compliance tracking: which policies are referenced vs outdated
- [ ] Export/reporting for leadership

## Pricing

| Tier | Users | Price | Features |
|------|-------|-------|----------|
| Starter | 10-50 | $3/user/month | Core memory, 5 connectors, basic analytics |
| Business | 50-500 | $8/user/month | Full memory graph, all connectors, advanced analytics |
| Enterprise | 500+ | Custom | On-prem, SSO/SAML, audit trail, dedicated support |
| Government | Department | Custom | Fully on-prem, air-gapped, Hindi support |

## Infrastructure

| Component | SaaS | On-prem |
|-----------|------|---------|
| Ingestion | Groq (Llama 3.3 70B) | Rabbit v2.1 (customer's GPU) |
| Answering | Claude Sonnet | Rabbit v2.1 |
| Embeddings | FastEmbed (local) | FastEmbed (local) |
| Database | SQLite → Postgres | Postgres |
| Vector search | sqlite-vec → pgvector | pgvector |
| Auth | NextAuth + SSO | SSO/SAML only |
| Hosting | DigitalOcean droplet | Customer's servers |

## Team

- **Partha (Product)**: Builds the product with AI
- **Cofounder 2 (Marketing)**: Reattend personal marketing + Reddit + user acquisition
- **Cofounder 3 (Enterprise Sales)**: Enterprise client acquisition, government relationships

## Key files from personal Reattend

These are the core files that power the enterprise version:

```
src/lib/ai/llm.ts          — LLM provider factory (Groq, Claude, Rabbit)
src/lib/ai/agents.ts        — Ingestion pipeline (triage, extract, embed, link)
src/lib/ai/prompts.ts       — Triage prompts
src/lib/db/index.ts          — Database + FTS5 + vec search
src/lib/db/schema.ts         — Drizzle schema (workspaces, members, records, etc.)
src/lib/jobs/worker.ts       — Job queue with retry/backoff
src/app/api/ask/route.ts     — Ask endpoint (Claude answering)
src/app/api/deepthink/route.ts — DeepThink strategic advisor
src/app/api/records/route.ts  — Memory CRUD
src/app/api/upload/route.ts   — File upload + bulk import
```

## Environment variables needed

```
# Ingestion (Groq — primary)
GROQ_API_KEY=

# Answering (Claude)
ANTHROPIC_API_KEY=

# Rabbit (batch re-enrichment, on-prem)
RABBIT_API_URL=
RABBIT_API_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Database
DATABASE_URL=

# Email
RESEND_API_KEY=
```
