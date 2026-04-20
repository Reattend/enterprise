# Reattend - AI Memory Operating System

An AI-native "shared memory + decision OS" that compounds into a living memory graph over time.

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Local Development

```bash
# Install dependencies
npm install

# Initialize database + seed demo data
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo login:** `demo@reattend.com` / `demo1234`

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
# Auth (required)
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=./data/reattend.db

# AI Provider (mock | openai | anthropic)
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=

# Embedding Provider
EMBEDDING_PROVIDER=mock
EMBEDDING_API_KEY=
EMBEDDING_MODEL=

# App
APP_URL=http://localhost:3000
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Auth | NextAuth.js v5 |
| UI | Tailwind CSS + shadcn/ui + Radix |
| Graph/Board | React Flow (@xyflow/react) |
| Animations | Framer Motion |
| State | Zustand |
| AI | Provider-agnostic (mock mode included) |

## Architecture

```
src/
  app/                     # Next.js App Router
    (auth)/                # Login, Register
    (app)/app/             # Authenticated app routes
    api/                   # API routes
  components/
    app/                   # App shell (sidebar, topbar)
    ui/                    # shadcn/ui components
  lib/
    db/                    # Schema, migrations, seed
    ai/                    # LLM interface, prompts, agents
    jobs/                  # Background job queue
    auth/                  # Auth configuration
  stores/                  # Zustand stores
  types/                   # TypeScript definitions
```

## AI Agent Pipeline

### Ingest Contract

```
POST /api/ingest
Content-Type: application/json

{
  "text": "string (required)",
  "source": "string (default: manual)",
  "workspace_id": "string (required)",
  "occurred_at": "ISO 8601 datetime",
  "author": { "name": "string", "email": "string" },
  "metadata": { ... }
}
```

### Pipeline Flow

1. **Ingest** → Raw item created in inbox
2. **Triage Agent** → Analyzes text, decides store/ignore, extracts entities/tags
3. **Embedding Job** → Generates vector embedding for semantic search
4. **Linking Agent** → Finds similar records, creates graph edges
5. **Project Agent** → Suggests project groupings

### Mock Mode

Set `AI_PROVIDER=mock` for local dev. The mock provider:
- Returns deterministic triage results based on keyword analysis
- Generates consistent 384-dim embeddings from text hashing
- Creates similarity-based links

### Plugging in a Real Provider

Edit `src/lib/ai/llm.ts` and implement the `LLMProvider` interface:

```typescript
interface LLMProvider {
  generateJSON<T>(prompt: string, schema: ZodType<T>): Promise<T>
  generateText(prompt: string): Promise<string>
  embed(text: string): Promise<number[]>
}
```

## Pages

| Route | Description |
|-------|-----------|
| `/` | Landing page |
| `/login` | Authentication |
| `/register` | Account creation (30-day trial) |
| `/app` | Dashboard with daily summary |
| `/app/inbox` | Raw captures + AI triage |
| `/app/memories` | Curated records list + detail |
| `/app/projects` | Project management + AI suggestions |
| `/app/graph` | Interactive memory graph |
| `/app/boards` | Whiteboard canvas (Miro-like) |
| `/app/search` | Semantic + text search |
| `/app/integrations` | 100 integration directory |
| `/app/settings` | Profile, workspace, members, agent logs |
| `/app/billing` | Plan selection, billing stubs |

## Database

SQLite database stored at `data/reattend.db`. Tables:
- `users`, `workspaces`, `workspace_members`, `workspace_invites`
- `sources`, `raw_items` (inbox)
- `records` (curated memories), `entities`, `record_entities`
- `record_links` (graph edges), `embeddings`
- `projects`, `project_records`, `project_suggestions`
- `boards`, `board_nodes`, `board_edges`
- `comments`, `activity_log`
- `plans`, `subscriptions`
- `integrations_catalog` (100 items), `integrations_connections`
- `job_queue`, `inbox_notifications`

### Reset Database

```bash
rm data/reattend.db
npm run db:seed
```

## Features

- Multi-tenant workspaces (personal + team)
- Dark mode + light mode
- AI triage with entity extraction
- Semantic search via embeddings
- Interactive memory graph with filters
- Whiteboard/canvas with sticky notes
- 100 integration stubs
- Billing stubs with 30-day trial
- Invite team members by email
- Agent activity logs
- Ask AI (conversational Q&A over memories)
- Notification inbox
