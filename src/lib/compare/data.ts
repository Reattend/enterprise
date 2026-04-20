export interface CompareFeature {
 name: string
 reattend: string | boolean
 competitor: string | boolean
}


export interface Competitor {
 slug: string
 name: string
 tagline: string
 description: string
 icon: string
 features: CompareFeature[]
 reattendWins: string[]
 competitorWins: string[]
 bestFor: { reattend: string; competitor: string }
}


export const COMPETITORS: Competitor[] = [
 {
   slug: 'reattend-vs-notion',
   name: 'Notion',
   tagline: 'Reattend vs Notion - AI Memory vs Docs & Wikis',
   description:
     'Notion is a powerful docs-and-wikis workspace. Reattend is an AI-powered memory layer that captures, enriches, and connects your knowledge automatically. Compare the two.',
   icon: 'notion',
   features: [
     { name: 'AI auto-capture & triage', reattend: true, competitor: false },
     { name: 'Memory graph (linked knowledge)', reattend: true, competitor: false },
     { name: 'Semantic search (AI embeddings)', reattend: true, competitor: false },
     { name: 'Ask AI over your knowledge', reattend: true, competitor: 'Limited (add-on)' },
     { name: 'Auto entity extraction', reattend: true, competitor: false },
     { name: 'Whiteboard / canvas', reattend: true, competitor: false },
     { name: 'Docs & wikis', reattend: false, competitor: true },
     { name: 'Databases & spreadsheets', reattend: false, competitor: true },
     { name: 'Project management (Kanban)', reattend: 'Basic (projects)', competitor: true },
     { name: 'Gmail / Slack integrations', reattend: true, competitor: true },
     { name: 'Team workspaces', reattend: true, competitor: true },
     { name: 'Free plan', reattend: true, competitor: true },
   ],
   reattendWins: [
     'AI captures and organizes knowledge automatically - no manual structuring',
     'Memory graph surfaces hidden connections between ideas, people, and decisions',
     'Semantic search finds relevant context even when you can\'t remember exact words',
     'Purpose-built for "remembering" - not another docs tool you have to maintain',
   ],
   competitorWins: [
     'Full-featured document editor with databases and formulas',
     'Massive template gallery and community ecosystem',
     'Kanban boards and project management built-in',
     'More mature product with broader feature set',
   ],
   bestFor: {
     reattend:
       'Teams that lose context across meetings, Slack, and email. Knowledge workers who want an AI that remembers everything without manual organizing.',
     competitor:
       'Teams that need a structured wiki, database-driven workflows, and extensive document editing.',
   },
 },
 {
   slug: 'reattend-vs-confluence',
   name: 'Confluence',
   tagline: 'Reattend vs Confluence - AI Memory vs Enterprise Wiki',
   description:
     'Confluence is Atlassian\'s enterprise wiki for documentation. Reattend is an AI memory layer that automatically captures and connects team knowledge. See how they compare.',
   icon: 'confluence',
   features: [
     { name: 'AI auto-capture & triage', reattend: true, competitor: false },
     { name: 'Memory graph (linked knowledge)', reattend: true, competitor: false },
     { name: 'Semantic search (AI embeddings)', reattend: true, competitor: false },
     { name: 'Ask AI over your knowledge', reattend: true, competitor: 'Limited (Atlassian Intelligence)' },
     { name: 'Auto entity extraction', reattend: true, competitor: false },
     { name: 'Whiteboard / canvas', reattend: true, competitor: true },
     { name: 'Page trees & spaces', reattend: false, competitor: true },
     { name: 'Jira integration', reattend: false, competitor: true },
     { name: 'Inline comments & reviews', reattend: false, competitor: true },
     { name: 'Gmail / Slack integrations', reattend: true, competitor: true },
     { name: 'Team workspaces', reattend: true, competitor: true },
     { name: 'Free plan', reattend: true, competitor: true },
   ],
   reattendWins: [
     'Zero-effort knowledge capture - AI does the organizing, not you',
     'Memory graph links decisions, meetings, and context across projects',
     'Lightning-fast semantic search vs Confluence\'s notoriously slow search',
     'Lightweight and modern - no enterprise bloat or complex permission models',
   ],
   competitorWins: [
     'Deep Atlassian ecosystem integration (Jira, Bitbucket, Trello)',
     'Mature page hierarchies and spaces for large-scale documentation',
     'Enterprise compliance features (audit logs, data residency)',
     'Industry standard for large organizations',
   ],
   bestFor: {
     reattend:
       'Small-to-medium teams frustrated with Confluence\'s complexity. Teams that want knowledge captured automatically, not written in wikis nobody reads.',
     competitor:
       'Large enterprises deeply invested in the Atlassian ecosystem needing structured documentation with compliance controls.',
   },
 },
 {
   slug: 'reattend-vs-obsidian',
   name: 'Obsidian',
   tagline: 'Reattend vs Obsidian - AI Memory vs Local-First Notes',
   description:
     'Obsidian is a local-first Markdown note-taking app with a graph view. Reattend is a cloud-native AI memory platform. Compare their approaches to knowledge management.',
   icon: 'obsidian',
   features: [
     { name: 'AI auto-capture & triage', reattend: true, competitor: false },
     { name: 'Memory graph (linked knowledge)', reattend: true, competitor: true },
     { name: 'Semantic search (AI embeddings)', reattend: true, competitor: 'Plugin only' },
     { name: 'Ask AI over your knowledge', reattend: true, competitor: 'Plugin only' },
     { name: 'Auto entity extraction', reattend: true, competitor: false },
     { name: 'Whiteboard / canvas', reattend: true, competitor: true },
     { name: 'Local-first / offline', reattend: false, competitor: true },
     { name: 'Markdown files (portable)', reattend: false, competitor: true },
     { name: 'Plugin ecosystem', reattend: false, competitor: true },
     { name: 'Gmail / Slack integrations', reattend: true, competitor: false },
     { name: 'Team workspaces', reattend: true, competitor: 'Paid add-on' },
     { name: 'Free plan', reattend: true, competitor: true },
   ],
   reattendWins: [
     'AI captures and organizes knowledge from your tools - no manual note-taking required',
     'Built-in semantic search and Ask AI - no plugin hunting or configuration',
     'Team collaboration out of the box with shared knowledge graphs',
     'Integrates with Gmail, Slack, and other work tools natively',
   ],
   competitorWins: [
     'Complete data ownership with local Markdown files',
     'Massive plugin ecosystem for any workflow',
     'Works offline without internet',
     'One-time payment for Sync - no recurring subscription',
   ],
   bestFor: {
     reattend:
       'Teams and professionals who want AI to capture knowledge from their workflow automatically. People who value automatic organization over manual note-taking.',
     competitor:
       'Individual power users who want full data ownership, offline access, and deep customization through plugins.',
   },
 },
 {
   slug: 'reattend-vs-roam-research',
   name: 'Roam Research',
   tagline: 'Reattend vs Roam Research - AI Memory vs Networked Thought',
   description:
     'Roam Research pioneered bidirectional linking for networked thought. Reattend takes it further with AI that builds the network for you. Compare the two approaches.',
   icon: 'roam',
   features: [
     { name: 'AI auto-capture & triage', reattend: true, competitor: false },
     { name: 'Memory graph (linked knowledge)', reattend: true, competitor: true },
     { name: 'Semantic search (AI embeddings)', reattend: true, competitor: false },
     { name: 'Ask AI over your knowledge', reattend: true, competitor: false },
     { name: 'Auto entity extraction', reattend: true, competitor: false },
     { name: 'Bidirectional linking', reattend: 'Automatic', competitor: 'Manual' },
     { name: 'Block references', reattend: false, competitor: true },
     { name: 'Daily notes', reattend: false, competitor: true },
     { name: 'Whiteboard / canvas', reattend: true, competitor: false },
     { name: 'Gmail / Slack integrations', reattend: true, competitor: false },
     { name: 'Team workspaces', reattend: true, competitor: true },
     { name: 'Free plan', reattend: true, competitor: false },
   ],
   reattendWins: [
     'AI creates the knowledge graph automatically - no manual linking needed',
     'Captures context from email, Slack, and meetings without copy-pasting',
     'Semantic search finds connections you didn\'t explicitly link',
     'Free plan available vs Roam\'s $15/month minimum',
   ],
   competitorWins: [
     'Block-level references and transclusions for granular linking',
     'Daily notes workflow for journaling and daily capture',
     'Mature outliner with deep keyboard shortcut support',
     'Established community and knowledge base',
   ],
   bestFor: {
     reattend:
       'Professionals who want the power of networked thought without the overhead of manual linking. Teams that need shared context from work tools.',
     competitor:
       'Individual researchers and writers who enjoy the outliner workflow and want granular block-level linking.',
   },
 },
 {
   slug: 'reattend-vs-mem',
   name: 'Mem',
   tagline: 'Reattend vs Mem - Full AI Memory Platform vs AI Notes',
   description:
     'Mem is an AI-powered note-taking app. Reattend is a complete AI memory platform with graphs, boards, and team collaboration. See the difference.',
   icon: 'mem',
   features: [
     { name: 'AI auto-capture & triage', reattend: true, competitor: 'Partial' },
     { name: 'Memory graph (linked knowledge)', reattend: true, competitor: false },
     { name: 'Semantic search (AI embeddings)', reattend: true, competitor: true },
     { name: 'Ask AI over your knowledge', reattend: true, competitor: true },
     { name: 'Auto entity extraction', reattend: true, competitor: false },
     { name: 'Whiteboard / canvas', reattend: true, competitor: false },
     { name: 'Visual graph explorer', reattend: true, competitor: false },
     { name: 'Auto-organization (tags, types)', reattend: true, competitor: true },
     { name: 'Gmail / Slack integrations', reattend: true, competitor: true },
     { name: 'Team workspaces', reattend: true, competitor: false },
     { name: 'Project groupings', reattend: true, competitor: 'Collections' },
     { name: 'Free plan', reattend: true, competitor: true },
   ],
   reattendWins: [
     'Full memory graph visualizes how your knowledge connects - Mem has no graph view',
     'Whiteboard/canvas for spatial organization of memories',
     'Team workspaces with shared knowledge graphs',
     'Structured memory types (Decision, Meeting, Idea, etc.) beyond just notes',
   ],
   competitorWins: [
     'Faster note-taking for quick capture',
     'Simpler, more minimal interface',
     'More established AI note product',
     'Mobile app available',
   ],
   bestFor: {
     reattend:
       'Teams and individuals who want a complete memory system - not just notes, but a graph of connected decisions, meetings, ideas, and context.',
     competitor:
       'Individual users who want a simple, fast AI note-taking app without the need for graphs or team features.',
   },
 },
 {
   slug: 'reattend-vs-slite',
   name: 'Slite',
   tagline: 'Reattend vs Slite - AI Memory vs Team Knowledge Base',
   description:
     'Slite is a team knowledge base with AI-powered search. Reattend is an AI memory platform that captures, enriches, and connects knowledge automatically. Compare them.',
   icon: 'slite',
   features: [
     { name: 'AI auto-capture & triage', reattend: true, competitor: false },
     { name: 'Memory graph (linked knowledge)', reattend: true, competitor: false },
     { name: 'Semantic search (AI embeddings)', reattend: true, competitor: true },
     { name: 'Ask AI over your knowledge', reattend: true, competitor: true },
     { name: 'Auto entity extraction', reattend: true, competitor: false },
     { name: 'Whiteboard / canvas', reattend: true, competitor: false },
     { name: 'Document editor', reattend: false, competitor: true },
     { name: 'Channels / collections', reattend: 'Projects', competitor: true },
     { name: 'Gmail / Slack integrations', reattend: true, competitor: true },
     { name: 'Team workspaces', reattend: true, competitor: true },
     { name: 'Verification workflow', reattend: false, competitor: true },
     { name: 'Free plan', reattend: true, competitor: true },
   ],
   reattendWins: [
     'AI captures knowledge from your workflow - Slite requires manual document creation',
     'Memory graph connects ideas across projects automatically',
     'Structured memory types enrich content beyond plain documents',
     'Whiteboard for spatial organization alongside the knowledge graph',
   ],
   competitorWins: [
     'Full document editor for long-form content',
     'Document verification to keep content up-to-date',
     'More established team knowledge base product',
     'Better for traditional documentation workflows',
   ],
   bestFor: {
     reattend:
       'Teams that want knowledge captured automatically from their workflow - not another wiki that goes stale. Teams that value connections between knowledge.',
     competitor:
       'Teams that need a traditional knowledge base with a rich document editor and content verification workflows.',
   },
 },
 {
   slug: 'reattend-vs-microsoft-loop',
   name: 'Microsoft Loop',
   tagline: 'Reattend vs Microsoft Loop - AI Memory vs Collaborative Workspace',
   description:
     'Microsoft Loop is a collaborative workspace in the Microsoft 365 ecosystem. Reattend is an AI memory platform that works across all your tools. See the differences.',
   icon: 'loop',
   features: [
     { name: 'AI auto-capture & triage', reattend: true, competitor: false },
     { name: 'Memory graph (linked knowledge)', reattend: true, competitor: false },
     { name: 'Semantic search (AI embeddings)', reattend: true, competitor: false },
     { name: 'Ask AI over your knowledge', reattend: true, competitor: 'Copilot (paid)' },
     { name: 'Auto entity extraction', reattend: true, competitor: false },
     { name: 'Whiteboard / canvas', reattend: true, competitor: false },
     { name: 'Loop components (portable blocks)', reattend: false, competitor: true },
     { name: 'Microsoft 365 integration', reattend: false, competitor: true },
     { name: 'Real-time co-editing', reattend: false, competitor: true },
     { name: 'Gmail / Slack integrations', reattend: true, competitor: false },
     { name: 'Team workspaces', reattend: true, competitor: true },
     { name: 'Free plan', reattend: true, competitor: 'With M365' },
   ],
   reattendWins: [
     'Works across all your tools - not locked into Microsoft ecosystem',
     'AI automatically captures and connects knowledge from any source',
     'Memory graph visualizes hidden connections in your team\'s knowledge',
     'Purpose-built for knowledge retention vs general collaboration',
   ],
   competitorWins: [
     'Deep Microsoft 365 integration (Teams, Outlook, Word)',
     'Portable Loop components that embed anywhere in M365',
     'Real-time collaborative editing',
     'Included with existing Microsoft 365 subscriptions',
   ],
   bestFor: {
     reattend:
       'Teams using a mix of tools (Gmail, Slack, etc.) who want AI-powered knowledge capture that isn\'t locked to one ecosystem.',
     competitor:
       'Teams fully committed to Microsoft 365 who want a collaborative workspace that integrates natively with their existing stack.',
   },
 },
 {
   slug: 'reattend-vs-coda',
   name: 'Coda',
   tagline: 'Reattend vs Coda - AI Memory vs All-in-One Doc',
   description:
     'Coda combines docs, spreadsheets, and apps in one surface. Reattend is an AI memory platform focused on capturing and connecting knowledge. Compare their strengths.',
   icon: 'coda',
   features: [
     { name: 'AI auto-capture & triage', reattend: true, competitor: false },
     { name: 'Memory graph (linked knowledge)', reattend: true, competitor: false },
     { name: 'Semantic search (AI embeddings)', reattend: true, competitor: false },
     { name: 'Ask AI over your knowledge', reattend: true, competitor: 'Coda AI (paid)' },
     { name: 'Auto entity extraction', reattend: true, competitor: false },
     { name: 'Whiteboard / canvas', reattend: true, competitor: false },
     { name: 'Docs with tables & formulas', reattend: false, competitor: true },
     { name: 'Automations & packs', reattend: false, competitor: true },
     { name: 'Custom apps / views', reattend: false, competitor: true },
     { name: 'Gmail / Slack integrations', reattend: true, competitor: true },
     { name: 'Team workspaces', reattend: true, competitor: true },
     { name: 'Free plan', reattend: true, competitor: true },
   ],
   reattendWins: [
     'AI captures knowledge automatically - Coda requires manual document building',
     'Memory graph connects knowledge across all your projects effortlessly',
     'Focused on "remembering" - not trying to replace spreadsheets and databases',
     'Simpler learning curve for knowledge management use cases',
   ],
   competitorWins: [
     'Powerful tables, formulas, and database-like functionality',
     'Custom automations and integration packs',
     'Build custom views and mini-apps within docs',
     'More flexible for structured workflows and processes',
   ],
   bestFor: {
     reattend:
       'Teams that want to capture and connect knowledge automatically, without building complex docs and databases. Knowledge-heavy teams with context scattered across tools.',
     competitor:
       'Teams that need an all-in-one doc platform with tables, formulas, automations, and custom views for structured workflows.',
   },
 },
]




export function getCompetitorBySlug(slug: string): Competitor | undefined {
 return COMPETITORS.find(c => c.slug === slug)
}



