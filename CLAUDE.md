# Project: Reattend Enterprise

## Vision
Reattend Enterprise is an organizational memory platform that solves corporate amnesia. When employees leave, transfer, or retire, their institutional knowledge stays. Every decision, every context, every piece of organizational knowledge is captured, linked, and accessible — forever.

**This is a fork of Reattend Personal** (`~/Desktop/Final Reattend/reattend/`). Read `ENTERPRISE.md` for the full architecture, pricing, and build plan.

## What's different from Personal Reattend
- **Org hierarchy**: Organization → Department → Division → Team (not just workspaces)
- **RBAC**: Department-level access control (HR sees HR, Engineering sees Engineering)
- **Decision tracking**: Who decided what, when, context, outcome, was it reversed
- **Transfer protocol**: Knowledge stays with the role, not the person
- **Self-healing**: Auto-detects stale policies, contradictions, knowledge gaps
- **Admin dashboard**: Usage analytics, health scores, member management
- **Audit trail**: Every query logged, every access tracked
- **Enterprise connectors**: SharePoint, Teams, Confluence, SAP
- **On-premise**: Rabbit runs on customer's servers. Zero data leaves the org.
- **Enterprise theme**: Professional, dense, MS Teams-like. Not consumer-friendly.

## Competitors
- **Glean** ($200M ARR, $7.2B valuation): Cloud-only search, $25/user. No temporal reasoning, no on-prem.
- **Guru** ($250/mo min): Manual curation wiki. Not AI-native.
- **Confluence**: Static docs. No AI. No temporal reasoning.
- **Microsoft Copilot**: Locked to M365 stack. No cross-tool memory.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: SQLite via better-sqlite3 + Drizzle ORM (migrate to Postgres for production enterprise)
- **Auth**: NextAuth.js v5 + SSO/SAML for enterprise
- **UI**: Tailwind CSS + shadcn/ui + Radix UI primitives
- **Animations**: Framer Motion
- **State**: Zustand for client state
- **AI Ingestion**: Groq Llama 3.3 70B (SaaS) or Rabbit v2.1 (on-prem)
- **AI Answering**: Claude Sonnet (SaaS) or Rabbit v2.1 (on-prem)
- **Embeddings**: FastEmbed BGE-Base-EN-v1.5 (local, always)
- **Search**: FTS5 full-text + sqlite-vec ANN vector search
- **Jobs**: SQLite-backed job queue with retry/backoff

## Architecture
```
src/
  app/                    # Next.js App Router pages
    (marketing)/          # Public pages (landing)
    (auth)/               # Auth pages (login, register)
    (app)/                # Authenticated app pages
      app/                # All /app/* routes
  components/             # Shared UI components
    ui/                   # shadcn/ui components
  lib/                    # Core libraries
    db/                   # Database schema, migrations, queries
    ai/                   # AI pipeline (llm, prompts, agents)
    jobs/                 # Background job runner
    auth/                 # Auth configuration
  hooks/                  # Custom React hooks
  stores/                 # Zustand stores
  types/                  # TypeScript type definitions
docs/
  progress.md             # Session progress tracking
```

## Data Model (Core Tables)
workspaces, workspace_members, users, sources, raw_items, records, entities, record_entities, record_links, embeddings, projects, project_records, project_suggestions, boards, board_nodes, board_edges, comments, activity_log, plans, subscriptions, integrations_catalog, integrations_connections, job_queue

## AI Pipeline
1. **Triage Agent**: raw_items → should_store? → create record + entities + tags
2. **Embedding Job**: new records → generate embeddings → store vectors
3. **Linking Agent**: after embedding → find similar records → create record_links
4. **Project Agent**: suggest project groupings → user approval flow

## Ground Rules
- You are a senior product developer. Think before building.
- Before starting any session, read docs/progress.md
- Break all work into small, completable chunks
- After completing any feature, immediately update docs/progress.md
- When told "pause and save", update progress.md with:
  1. What is fully done
  2. What is half-done and where we stopped
  3. The EXACT next step to resume
  4. Any decisions or context a future session needs
- When told "resume", read docs/progress.md and continue from where we left off

## Key Features
- Multi-tenant workspaces (personal + team)
- Inbox with raw item capture + AI triage
- Memories/Records with rich metadata, entities, tags
- Projects (lightweight grouping, AI-suggested)
- Memory Graph (interactive, filterable, temporal + causal edges)
- Whiteboard/Boards (Miro-like canvas overlay)
- Global search with semantic/embedding search
- Integrations directory (100 "Coming Soon" items)
- Billing stubs (free/pro plans, no real payments)
- Dark mode + light mode
- "Start Today" daily continuity machine
- Memory analysis
- Ask AI (conversational Q&A over memories)
- Inbox notifications (todos, pending decisions)

## Pages
- / (landing)
- /login, /register
- /app (dashboard)
- /app/inbox
- /app/memories, /app/memories/:id
- /app/projects, /app/projects/:id
- /app/graph
- /app/boards, /app/boards/:id
- /app/search
- /app/integrations
- /app/settings
- /app/billing
