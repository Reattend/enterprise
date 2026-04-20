export interface HelpArticle {
 slug: string
 title: string
 description: string
 category: string
}


export interface HelpCategory {
 slug: string
 title: string
 description: string
 icon: string
 articles: HelpArticle[]
}


export const HELP_CATEGORIES: HelpCategory[] = [
 {
   slug: 'getting-started',
   title: 'Getting Started',
   description: 'Learn the basics of Reattend and set up your workspace.',
   icon: 'Rocket',
   articles: [
     { slug: 'what-is-reattend', title: 'What is Reattend?', description: 'An overview of Reattend - the AI-powered shared memory for teams and individuals.', category: 'getting-started' },
     { slug: 'creating-your-account', title: 'Creating your account', description: 'Sign up, verify your email, and set up your profile.', category: 'getting-started' },
     { slug: 'navigating-the-dashboard', title: 'Navigating the dashboard', description: 'Understand the layout - sidebar, topbar, stats, and quick actions.', category: 'getting-started' },
     { slug: 'quick-start-guide', title: 'Quick start guide', description: 'Create your first project, capture a memory, and explore the board in five minutes.', category: 'getting-started' },
   ],
 },
 {
   slug: 'inbox',
   title: 'Inbox & Capture',
   description: 'Capture raw thoughts and let AI organize them into memories.',
   icon: 'Inbox',
   articles: [
     { slug: 'capturing-raw-items', title: 'Capturing raw items', description: 'How the inbox works - drop in anything and let AI handle the rest.', category: 'inbox' },
     { slug: 'manual-capture', title: 'Manual capture with metadata', description: 'Add items manually with source, date, and project context.', category: 'inbox' },
     { slug: 'ai-triage', title: 'How AI triage works', description: 'How the AI agent classifies, enriches, and stores your raw items.', category: 'inbox' },
     { slug: 'source-filtering', title: 'Filtering by source', description: 'Filter inbox items by Gmail, Slack, Teams, or other sources.', category: 'inbox' },
   ],
 },
 {
   slug: 'memories',
   title: 'Memories',
   description: 'Everything about memories - your structured, AI-enriched knowledge units.',
   icon: 'Brain',
   articles: [
     { slug: 'understanding-memories', title: 'Understanding memories', description: 'What memories are and how they differ from raw inbox items.', category: 'memories' },
     { slug: 'memory-types', title: 'Memory types', description: 'The seven types - Decision, Meeting, Idea, Insight, Context, Task, and Note.', category: 'memories' },
     { slug: 'creating-memories', title: 'Creating memories manually', description: 'Create memories directly without going through the inbox.', category: 'memories' },
     { slug: 'editing-and-managing', title: 'Editing, locking, and deleting', description: 'Edit titles, summaries, tags, lock important memories, or remove them.', category: 'memories' },
     { slug: 'entities-and-tags', title: 'Entities and tags', description: 'How AI extracts people, organizations, and topics from your memories.', category: 'memories' },
     { slug: 'file-attachments', title: 'File attachments', description: 'Attach files to memories for richer context.', category: 'memories' },
   ],
 },
 {
   slug: 'projects',
   title: 'Projects',
   description: 'Organize memories into meaningful groups with projects.',
   icon: 'FolderKanban',
   articles: [
     { slug: 'creating-projects', title: 'Creating and managing projects', description: 'Create projects with names, descriptions, and colors.', category: 'projects' },
     { slug: 'organizing-memories', title: 'Organizing memories into projects', description: 'Assign memories to projects and move them between groups.', category: 'projects' },
     { slug: 'ai-project-suggestions', title: 'AI-suggested project groupings', description: 'Let AI suggest how to organize your memories into projects.', category: 'projects' },
   ],
 },
 {
   slug: 'board',
   title: 'Board & Whiteboard',
   description: 'Spatially organize memories on an interactive canvas.',
   icon: 'LayoutDashboard',
   articles: [
     { slug: 'board-overview', title: 'Board overview', description: 'What the board is and how to use it as a visual workspace.', category: 'board' },
     { slug: 'node-types', title: 'Node types', description: 'Memory nodes, sticky notes, shapes, text, and embed nodes.', category: 'board' },
     { slug: 'drawing-connections', title: 'Drawing connections and edge types', description: 'Connect nodes with typed edges - related, depends on, leads to, and more.', category: 'board' },
     { slug: 'canvas-tools', title: 'Canvas tools', description: 'Select, pan, draw, comment - all the tools at your disposal.', category: 'board' },
   ],
 },
 {
   slug: 'search',
   title: 'Search',
   description: 'Find any memory instantly with hybrid text and semantic search.',
   icon: 'Search',
   articles: [
     { slug: 'search-overview', title: 'How search works', description: 'An overview of Reattend\'s hybrid search combining text and AI embeddings.', category: 'search' },
     { slug: 'search-modes', title: 'Search modes', description: 'Hybrid, text-only, and semantic-only search modes explained.', category: 'search' },
     { slug: 'search-tips', title: 'Search tips and best practices', description: 'Get better results with specific queries, filters, and search strategies.', category: 'search' },
   ],
 },
 {
   slug: 'ask-ai',
   title: 'Ask AI',
   description: 'Have conversations with your memory graph using AI.',
   icon: 'Sparkles',
   articles: [
     { slug: 'asking-questions', title: 'Asking questions about your memories', description: 'How to use Ask AI to query your entire knowledge base conversationally.', category: 'ask-ai' },
     { slug: 'conversation-tips', title: 'Tips for better AI answers', description: 'Frame questions effectively to get the most useful responses.', category: 'ask-ai' },
   ],
 },
 {
   slug: 'teams',
   title: 'Teams & Collaboration',
   description: 'Work together with shared workspaces, roles, and permissions.',
   icon: 'Users',
   articles: [
     { slug: 'creating-a-team', title: 'Creating a team workspace', description: 'Set up a team workspace for collaborative memory-building.', category: 'teams' },
     { slug: 'inviting-members', title: 'Inviting team members', description: 'Send invite links and manage pending invitations.', category: 'teams' },
     { slug: 'roles-and-permissions', title: 'Roles and permissions', description: 'Owner, Admin, and Member roles - what each can do.', category: 'teams' },
     { slug: 'switching-workspaces', title: 'Switching between workspaces', description: 'Toggle between personal and team workspaces from the topbar.', category: 'teams' },
     { slug: 'shared-knowledge-graph', title: 'Shared knowledge graph', description: 'How team memories connect into a shared graph.', category: 'teams' },
   ],
 },
 {
   slug: 'integrations',
   title: 'Integrations',
   description: 'Connect external tools to automatically capture context.',
   icon: 'Plug',
   articles: [
     { slug: 'available-integrations', title: 'Available integrations', description: 'Browse all integrations - connected and coming soon.', category: 'integrations' },
     { slug: 'connecting-gmail', title: 'Connecting Gmail', description: 'Set up Gmail integration to capture emails as inbox items.', category: 'integrations' },
     { slug: 'connecting-slack', title: 'Connecting Slack', description: 'Set up Slack integration to capture messages and threads.', category: 'integrations' },
     { slug: 'webhooks', title: 'Using webhooks', description: 'Send data to Reattend from any tool using webhooks.', category: 'integrations' },
   ],
 },
 {
   slug: 'account',
   title: 'Account & Billing',
   description: 'Manage your profile, workspace settings, and subscription.',
   icon: 'Settings',
   articles: [
     { slug: 'profile-settings', title: 'Profile settings', description: 'Update your name, avatar, and account details.', category: 'account' },
     { slug: 'workspace-settings', title: 'Workspace settings', description: 'Rename, configure, or delete a workspace.', category: 'account' },
     { slug: 'billing-and-plans', title: 'Billing and plans', description: 'Understand free vs paid plans, upgrade, and manage billing.', category: 'account' },
     { slug: 'data-and-security', title: 'Data and security', description: 'How Reattend protects your data - encryption, isolation, and compliance.', category: 'account' },
   ],
 },
]


export function getCategoryBySlug(slug: string): HelpCategory | undefined {
 return HELP_CATEGORIES.find(c => c.slug === slug)
}


export function getArticleBySlug(categorySlug: string, articleSlug: string): HelpArticle | undefined {
 const cat = getCategoryBySlug(categorySlug)
 return cat?.articles.find(a => a.slug === articleSlug)
}


export function getAllArticles(): (HelpArticle & { categoryTitle: string })[] {
 return HELP_CATEGORIES.flatMap(c =>
   c.articles.map(a => ({ ...a, categoryTitle: c.title }))
 )
}


export function searchArticles(query: string): (HelpArticle & { categoryTitle: string })[] {
 const q = query.toLowerCase().trim()
 if (!q) return []
 return getAllArticles().filter(
   a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
 )
}



