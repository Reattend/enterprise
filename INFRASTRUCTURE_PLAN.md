# Reattend — Infrastructure Plan
> Written: 2026-03-27
> Goal: Become the memory infrastructure layer for AI tools, teams, and developers.

---

## The Thesis

**Reattend = Segment for AI context.**

Segment convinced developers: *"Don't build your own analytics pipeline — route all your user data through us."* Every tool that needed user data connected to Segment.

Reattend's version: *"Don't build your own memory layer for your AI product — route user context through Reattend."* Every AI tool that needs persistent, cross-session, cross-platform memory connects to Reattend.

The unlock is **MCP + public API**. Once those exist, Reattend becomes the memory backend for Claude Desktop, Cursor, custom AI agents, and internal tools — without any of those products needing to build memory infrastructure themselves.

---

## Part 1 — Capture Pipelines

### What's already built
- Gmail (Chrome extension content script)
- Slack (Chrome extension content script)
- Notion, Linear, Jira, Google Docs (Chrome extension content scripts)
- Google Meet, Zoom, Teams (tab audio capture → AssemblyAI transcription)
- Manual save via extension sidebar

### What's missing — input side

| Pipeline | How it works | Effort |
|---|---|---|
| **Email forward** | `save@reattend.com` — forward any email, it's processed and saved. Zero friction, works on any device. | Low |
| **Calendar auto-capture** | Connect Google Calendar. Every meeting gets a memory slot created before it starts. Post-meeting: auto-fill from transcript if recorded. Pre-meeting: surface what you know about attendees. | Medium |
| **Fireflies / Otter / Fathom webhooks** | Users already use these. When meeting ends, webhook fires → Reattend ingests transcript automatically. No recording needed. | Medium |
| **Browser bookmarks** | Extension intercepts saves/bookmarks → extract key content → triage → memory. | Low |
| **Telegram / WhatsApp bot** | Send a message to @ReattendBot → saved to your memory. Works for quick captures on mobile without a native app. | Medium |
| **Mobile share sheet** | iOS/Android "Share → Reattend" for articles, screenshots, voice notes. Requires a mobile app or PWA with share target. | High |
| **`/remember` Slack bot** | Type `/remember [anything]` in Slack → saved instantly. Different from the content capture — this is intentional saves from within Slack. | Low |

### What's missing — processing side

Currently the pipeline is: **capture → triage → embeddings → recall (on demand)**

What's missing: **proactive push**

Instead of only answering questions, Reattend surfaces relevant memories at the right moment:
- *"You're joining a call with Acme Corp in 10 minutes — here's what you last discussed with them."*
- *"You asked about this in a meeting 3 weeks ago — here's the answer that surfaced since."*
- *"This Slack message matches a decision you made last month."*

This changes Reattend from reactive (user asks → answer) to **ambient infrastructure** (Reattend watches → surfaces). That's what makes it feel like a true memory layer rather than a search tool.

---

## Part 2 — Developer Platform

This is where "becoming infra" actually happens.

### Tier 1 — Do this now (low effort, high leverage)

**Public REST API docs**
- Expose `/v1/memories`, `/v1/ask`, `/v1/capture` with proper docs.
- The routes already exist (`/api/tray/ask`, `/api/tray/proxy/`). This is versioning + documentation.
- Host at `reattend.com/docs/api` or `docs.reattend.com`.
- Once docs exist, developers start building integrations without you doing anything.

**Webhooks**
- Fire events on: `memory.created`, `memory.updated`, `memory.flagged`, `memory.rejected`
- Developers subscribe to these and react in their own systems.
- Zapier, Make, n8n integrations follow immediately — they connect to webhooks with zero code on your side.
- This is the fastest path to ecosystem.

**OAuth app flow**
- Third-party apps can request scoped access to a user's Reattend memory.
- Same pattern as "Connect your Google account" — but for memory.
- Enables: other AI tools, automation platforms, custom internal tools to plug in.
- Required before any serious B2B developer adoption.

### Tier 2 — Medium effort, platform-defining

**MCP Server** *(highest priority — see Part 3 for full detail)*
- Model Context Protocol: the standard for giving AI assistants access to external tools and data.
- Supported by: Claude Desktop, Cursor, Windsurf, Continue, and most serious AI coding tools.
- A Reattend MCP server means: connect once, every AI tool you use has your full memory context.
- Open source on GitHub. Publish to npm. List on mcp.so. This is the developer distribution engine.

**SDK**
```
npm install @reattend/sdk
pip install reattend
```
- `reattend.capture(text, context?)` — save to memory
- `reattend.ask(question)` — query memory
- `reattend.search(query)` — semantic search
- `reattend.recent(limit?)` — last N memories
- Trivially easy to add Reattend to any AI app, agent, or automation.

**Developer API keys + usage dashboard**
- `rat_` tokens already exist. Add a proper dev portal:
  - Create/revoke API keys
  - See usage per key
  - Set rate limits
  - View webhook delivery logs
- This is what separates "we have an API" from "we have a developer platform."

### Tier 3 — The platform play

**Memory-as-a-Service for AI apps**
- Developers building AI products don't want to build persistent memory themselves.
- They use Reattend as the memory backend.
- *"Your AI app remembers users across sessions"* — powered by Reattend.
- Pricing: per-user-per-month on top of the developer's subscription.
- This is the B2B2C model. The developer pays, their users get memory.

**Embeddable `<Ask />` widget**
- Drop-in chat widget: `<ReattendAsk workspaceId="..." />`
- Deployable on any website or internal tool.
- Like how Stripe has embeddable checkout — Reattend has embeddable memory search.
- Use cases: internal docs site, customer support portal, personal knowledge base published to the web.

**Workspace API**
- Team memory, not just personal memory.
- Developer builds a product, users connect their Reattend workspace → shared knowledge accumulates automatically.
- This is the enterprise and team tier entry point.

---

## Part 3 — MCP Server (Full Plan)

### What MCP is

Model Context Protocol (MCP) is an open standard (created by Anthropic) that lets AI assistants call external tools and data sources. Think of it like a USB-C port for AI — any tool that speaks MCP can plug into any AI that supports it.

Supported today: Claude Desktop, Cursor, Windsurf, Continue.dev, and any agent framework that implements the spec.

### What Reattend's MCP server exposes

```
Tools:
  search_memories(query: string)
    → semantic search, returns top N relevant memories

  ask(question: string)
    → full AI-generated answer from memory, with sources

  capture(content: string, context?: string)
    → save something to memory immediately

  recent(limit?: number)
    → last N captures across all sources
```

### How a user sets it up

One-time setup in Claude Desktop `config.json`:
```json
{
  "mcpServers": {
    "reattend": {
      "command": "npx",
      "args": ["@reattend/mcp", "--token", "rat_xxxxxxxxxxxxxxxxx"]
    }
  }
}
```

After this:
- *"What did I decide in my last Acme meeting?"* → Claude calls `search_memories("Acme meeting decisions")` → answers from real memory
- *"Remember that I prefer TypeScript over JavaScript"* → Claude calls `capture("User preference: TypeScript over JavaScript")`
- *"What have I been working on this week?"* → Claude calls `recent(20)` → summarizes

No copy-paste. No context window stuffing. The memory is always there.

### GitHub structure

```
github.com/reattend/
  reattend-mcp          ← open source MCP server (MIT)
  reattend-sdk          ← JS + Python SDK
  examples/             ← integration examples
    claude-desktop/
    cursor/
    langchain/
    custom-agent/
```

### npm package

`@reattend/mcp` — the MCP server package
`@reattend/sdk` — the developer SDK

### Submission targets

| Directory | URL | Status |
|---|---|---|
| mcp.so | mcp.so/servers | Submit when live |
| Anthropic community MCP list | github.com/anthropics/mcp/... | Submit when live |
| Cursor plugin store | When it opens | Watch |
| Glama.ai MCP registry | glama.ai | Submit when live |

---

## Part 4 — Developer Virality Tactics

These are the specific moves that create organic developer discovery today.

### 1. Dotfiles virality (highest leverage, zero cost)

Developers publish their dotfiles on GitHub. When a developer puts this in their `claude_desktop_config.json` and commits it:
```json
"reattend": { "command": "npx", "args": ["@reattend/mcp", "--token", "..."] }
```

Other developers see it, google `@reattend/mcp`, find the repo, install it. This is how developer tools spread organically. Every MCP-using developer is a potential distribution node.

**Action**: Make the npm package name obvious. Make the README the best 60-second explanation of Reattend that exists.

### 2. Show HN post

*"Show HN: Reattend MCP — give Claude/Cursor memory from your meetings, Slack, and notes"*

Timing: post Monday–Tuesday 9–11am ET (peak HN traffic).

One good Show HN can drive 500–2,000 signups in 48 hours for a developer tool that works. The MCP angle is novel and timely.

### 3. GitHub README as product page

The `reattend-mcp` README is not documentation — it's a product pitch to a developer audience. Structure:
1. One sentence: what it does
2. 30-second install (one command)
3. GIF or screenshot of it working in Claude Desktop
4. What it connects to (Slack, meetings, Gmail, etc.)
5. Link to sign up

### 4. Dev Twitter / X thread

*"I got tired of re-explaining context to Claude every conversation. So I built a memory server for it. Here's how it works..."*

Show the MCP config, show it working, link to the repo. Dev Twitter spreads tools like this fast.

### 5. r/LocalLLaMA, r/ClaudeAI, r/cursor

Post when the MCP server is live. These communities actively look for MCP servers. Reattend would be one of the few that provides *personal* memory (vs. database connectors or code tools).

### 6. Cursor / Claude Discord servers

Both have channels for plugins/tools/MCPs. Post there when live.

### 7. Integration examples in the repo

```
examples/
  daily-standup-agent/      ← agent that reads recent memories, drafts standup
  meeting-prep-agent/       ← pulls context on attendees before a call
  langchain-memory/         ← use Reattend as LangChain memory backend
  autogen-memory/           ← use Reattend with AutoGen agents
```

These examples make Reattend feel like serious infrastructure. They also rank on Google for searches like "langchain persistent memory" or "claude memory layer".

### 8. "Powered by Reattend" badge

When developers build something on the Reattend API:
```markdown
[![Memory by Reattend](https://reattend.com/badge.svg)](https://reattend.com)
```

Like "Powered by Stripe" or "Deployed on Vercel" — creates backlinks and discovery.

---

## Part 5 — Product Additions (Non-Developer)

**Proactive digests**
- Weekly email: "Here's what you captured, here's what's coming up based on your calendar."
- Keeps Reattend top-of-mind without the user opening the app.
- Low effort. High retention impact.

**Evolved sharing**
- Currently: share a single memory via token link.
- Evolve: share a digest, share a meeting summary, share a curated set of memories as a "briefing."
- Every share link = organic marketing. Someone receives a Reattend-generated briefing → asks "what is this?" → discovery.

**Templates**
- Opinionated workspace setups for common use cases:
  - *Sales memory* — tracks every client interaction, auto-surfaces before calls
  - *Investor memo tracker* — captures every update, searchable by portfolio company
  - *Research notebook* — captures papers, conversations, insights
  - *Engineering decisions log* — captures ADRs, discussions, why things were built
- Templates lower onboarding friction and make the value proposition obvious immediately.

**Mobile app**
- Right now capture is Chrome-dependent.
- Mobile unlocks: voice notes, camera capture, share sheet from any app.
- Can start as a PWA with share target before building native.

---

## Part 6 — Business Tiers

| Tier | Target | Price | What they get |
|---|---|---|---|
| **Free** | Individual | $0 | 10 AI queries/day, 2 recordings/day, Chrome extension |
| **Pro** | Power user | $9/mo | Unlimited queries, unlimited recordings, API access |
| **Developer** | Builders | $19/mo | Higher API rate limits, webhook support, SDK access, usage dashboard |
| **Teams** | Small teams | $7/user/mo | Shared workspace, team memory, admin controls |
| **Enterprise** | Companies | Custom | SSO, custom data retention, SLA, on-prem option |

Developer tier is what unlocks the platform flywheel. It sits between Pro and Teams.

---

## Part 7 — Launch Sequence

| Stage | User count | What to ship | Why |
|---|---|---|---|
| **Now** | 0–100 | MCP server (open source) | Attracts developers before you have users |
| **Phase 2** | 100–500 | Public API docs + versioning | Legitimizes the platform |
| **Phase 3** | 500–1000 | Webhooks + Zapier listing | Ecosystem starts forming |
| **Phase 4** | 1000+ | SDK + OAuth app flow + Developer tier | Platform becomes self-sustaining |
| **Phase 5** | 2000+ | Memory-as-a-Service, embeddable widget | B2B2C revenue layer |

> Rule: Don't wait for users to build developer infra. MCP and API docs are marketing, not just product. Build them now.

---

## Near-Term Priority Order

1. **MCP server** — open source on GitHub, published to npm, submitted to mcp.so. Biggest distribution multiplier with the least effort.
2. **Webhooks** — `memory.created/updated/flagged` events. Unlocks Zapier/Make without building integrations yourself.
3. **Public API docs** — document and version the existing routes. Makes the platform real.
4. **Show HN post** — once MCP works end-to-end.
5. **SDK** — JS first, then Python. Makes adoption trivially easy.
6. **Zapier listing** — once webhooks exist, submit to Zapier.
7. **Developer tier** — pricing + usage dashboard for API keys.

---

## The Flywheel

```
Developer finds reattend-mcp on GitHub / HN / mcp.so
              ↓
Installs it. Works in 2 minutes.
              ↓
Their dotfiles repo references it → other devs discover it
              ↓
Stars the repo → GitHub trending (if enough)
              ↓
Needs more captures/sources → signs up for Pro or Developer tier
              ↓
Builds something on top → uses the API → becomes paying customer
              ↓
"Powered by Reattend" badge on their product → new users discover Reattend
              ↓
More developers → more integrations → more capture sources → more value → more users
```

This is the infrastructure flywheel. Every new developer is both a user and a distribution channel.

---

> **One sentence version:** Build the MCP server first, open source it, post on Hacker News, and let the developer community pull everything else forward.
