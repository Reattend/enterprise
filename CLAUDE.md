# Project: Reattend.com

## Vision
Reattend is an AI-native "shared memory + decision OS" that compounds into a living memory graph over time. Users capture raw moments (notes, decisions, snippets). An AI agent decides what to store, enriches it, assigns it to projects, and links it into a memory graph. Users explore the graph and use a whiteboard/canvas to spatially organize memories.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: SQLite via better-sqlite3 + Drizzle ORM (cheap, zero-infra)
- **Auth**: NextAuth.js v5 (Auth.js) with credentials + magic link stubs
- **UI**: Tailwind CSS + shadcn/ui + Radix UI primitives
- **Graph**: React Flow (for both graph visualization and whiteboard)
- **Animations**: Framer Motion
- **State**: Zustand for client state
- **AI**: Provider-agnostic LLM interface with mock mode
- **Embeddings**: Local vector similarity (cosine) on SQLite; upgrade path to pgvector
- **Jobs**: SQLite-backed job queue with in-process worker

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
