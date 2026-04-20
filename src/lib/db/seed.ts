import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { hashSync } from 'bcryptjs'

// First run migrations
require('./migrate')

const dbPath = path.resolve(process.cwd(), 'data', 'reattend.db')
const sqlite = new Database(dbPath)
sqlite.pragma('foreign_keys = ON')

const uid = () => crypto.randomUUID()

// ─── Seed Plans ─────────────────────────────────────────
const planData = [
  {
    id: uid(), key: 'free', name: 'Free', priceMonthly: 0,
    features: JSON.stringify(['Up to 500 memories', '1 workspace', 'Basic AI triage', 'Community support'])
  },
  {
    id: uid(), key: 'pro', name: 'Pro', priceMonthly: 12,
    features: JSON.stringify(['Unlimited memories', '5 workspaces', 'Advanced AI pipeline', 'Priority support', 'Custom integrations', 'API access'])
  },
  {
    id: uid(), key: 'team', name: 'Team', priceMonthly: 29,
    features: JSON.stringify(['Everything in Pro', 'Unlimited workspaces', 'Team collaboration', 'Shared memory graphs', 'Admin controls', 'SSO (coming soon)', 'Dedicated support'])
  },
]

const insertPlan = sqlite.prepare('INSERT OR IGNORE INTO plans (id, key, name, price_monthly, features) VALUES (?, ?, ?, ?, ?)')
for (const p of planData) {
  insertPlan.run(p.id, p.key, p.name, p.priceMonthly, p.features)
}

// ─── Seed Demo User ─────────────────────────────────────
const demoUserId = uid()
const demoWorkspaceId = uid()

sqlite.prepare('INSERT OR IGNORE INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)')
  .run(demoUserId, 'demo@reattend.com', 'Demo User', hashSync('demo1234', 10))

sqlite.prepare('INSERT OR IGNORE INTO workspaces (id, name, type, created_by) VALUES (?, ?, ?, ?)')
  .run(demoWorkspaceId, 'Personal', 'personal', demoUserId)

sqlite.prepare('INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)')
  .run(uid(), demoWorkspaceId, demoUserId, 'owner')

// Create default "Unassigned" project
sqlite.prepare('INSERT OR IGNORE INTO projects (id, workspace_id, name, description, is_default) VALUES (?, ?, ?, ?, ?)')
  .run(uid(), demoWorkspaceId, 'Unassigned', 'Memories not yet assigned to a project', 1)

// Create subscription (1 month trial)
const trialEnd = new Date()
trialEnd.setDate(trialEnd.getDate() + 30)
sqlite.prepare('INSERT OR IGNORE INTO subscriptions (id, workspace_id, plan_key, status, trial_ends_at) VALUES (?, ?, ?, ?, ?)')
  .run(uid(), demoWorkspaceId, 'free', 'trialing', trialEnd.toISOString())

// ─── Seed 100 Integrations ─────────────────────────────
const integrations = [
  // Communication (15)
  { key: 'slack', name: 'Slack', category: 'Communication', description: 'Capture decisions and key messages from Slack channels and DMs.' },
  { key: 'microsoft-teams', name: 'Microsoft Teams', category: 'Communication', description: 'Ingest meeting notes, chat messages, and shared files from Teams.' },
  { key: 'discord', name: 'Discord', category: 'Communication', description: 'Monitor Discord servers for important discussions and decisions.' },
  { key: 'zoom', name: 'Zoom', category: 'Communication', description: 'Auto-capture meeting transcripts, action items, and recordings.' },
  { key: 'google-meet', name: 'Google Meet', category: 'Communication', description: 'Extract meeting summaries and action items from Google Meet calls.' },
  { key: 'whatsapp-business', name: 'WhatsApp Business', category: 'Communication', description: 'Capture important client conversations and decisions.' },
  { key: 'telegram', name: 'Telegram', category: 'Communication', description: 'Monitor Telegram channels and groups for key information.' },
  { key: 'intercom', name: 'Intercom', category: 'Communication', description: 'Capture customer conversations and support insights.' },
  { key: 'twilio', name: 'Twilio', category: 'Communication', description: 'Log SMS and voice call summaries as memories.' },
  { key: 'loom', name: 'Loom', category: 'Communication', description: 'Extract key points and transcripts from Loom videos.' },
  { key: 'webex', name: 'Webex', category: 'Communication', description: 'Capture meeting notes and action items from Webex meetings.' },
  { key: 'signal', name: 'Signal', category: 'Communication', description: 'Securely capture important Signal conversations.' },
  { key: 'crisp', name: 'Crisp', category: 'Communication', description: 'Ingest customer chat conversations and support tickets.' },
  { key: 'drift', name: 'Drift', category: 'Communication', description: 'Capture sales conversations and lead interactions.' },
  { key: 'ringcentral', name: 'RingCentral', category: 'Communication', description: 'Log call summaries and meeting notes automatically.' },
  // Email/Calendar (10)
  { key: 'gmail', name: 'Gmail', category: 'Email & Calendar', description: 'Intelligently capture important emails, commitments, and follow-ups.' },
  { key: 'outlook', name: 'Outlook', category: 'Email & Calendar', description: 'Extract key emails, calendar events, and commitments.' },
  { key: 'google-calendar', name: 'Google Calendar', category: 'Email & Calendar', description: 'Sync calendar events and meeting notes into your memory.' },
  { key: 'apple-calendar', name: 'Apple Calendar', category: 'Email & Calendar', description: 'Import iCal events and reminders as contextual memories.' },
  { key: 'calendly', name: 'Calendly', category: 'Email & Calendar', description: 'Auto-capture scheduled meetings and preparation context.' },
  { key: 'protonmail', name: 'ProtonMail', category: 'Email & Calendar', description: 'Securely capture important email conversations.' },
  { key: 'superhuman', name: 'Superhuman', category: 'Email & Calendar', description: 'Extract key emails and follow-up commitments.' },
  { key: 'cal-com', name: 'Cal.com', category: 'Email & Calendar', description: 'Sync scheduling data and meeting context.' },
  { key: 'fantastical', name: 'Fantastical', category: 'Email & Calendar', description: 'Import calendar events with rich context.' },
  { key: 'savvycal', name: 'SavvyCal', category: 'Email & Calendar', description: 'Capture scheduling context and meeting prep.' },
  // Docs/Knowledge (15)
  { key: 'notion', name: 'Notion', category: 'Docs & Knowledge', description: 'Sync pages, databases, and wikis from Notion workspaces.' },
  { key: 'confluence', name: 'Confluence', category: 'Docs & Knowledge', description: 'Capture wiki pages, decisions, and documentation updates.' },
  { key: 'google-docs', name: 'Google Docs', category: 'Docs & Knowledge', description: 'Extract key content and decisions from Google Docs.' },
  { key: 'dropbox-paper', name: 'Dropbox Paper', category: 'Docs & Knowledge', description: 'Sync documents and collaborative notes.' },
  { key: 'obsidian', name: 'Obsidian', category: 'Docs & Knowledge', description: 'Import notes and knowledge graph from Obsidian vaults.' },
  { key: 'roam-research', name: 'Roam Research', category: 'Docs & Knowledge', description: 'Sync your Roam graph and daily notes.' },
  { key: 'logseq', name: 'Logseq', category: 'Docs & Knowledge', description: 'Import journals and pages from Logseq.' },
  { key: 'coda', name: 'Coda', category: 'Docs & Knowledge', description: 'Sync docs and tables from Coda workspaces.' },
  { key: 'slite', name: 'Slite', category: 'Docs & Knowledge', description: 'Capture team knowledge and documentation.' },
  { key: 'gitbook', name: 'GitBook', category: 'Docs & Knowledge', description: 'Sync documentation and knowledge bases.' },
  { key: 'evernote', name: 'Evernote', category: 'Docs & Knowledge', description: 'Import notes and notebooks from Evernote.' },
  { key: 'onenote', name: 'OneNote', category: 'Docs & Knowledge', description: 'Sync notebooks and sections from OneNote.' },
  { key: 'bear', name: 'Bear', category: 'Docs & Knowledge', description: 'Import notes and tags from Bear.' },
  { key: 'craft', name: 'Craft', category: 'Docs & Knowledge', description: 'Sync documents and spaces from Craft.' },
  { key: 'apple-notes', name: 'Apple Notes', category: 'Docs & Knowledge', description: 'Import notes from Apple Notes.' },
  // Project/Dev (20)
  { key: 'jira', name: 'Jira', category: 'Project & Dev', description: 'Track issues, sprints, and project decisions from Jira.' },
  { key: 'linear', name: 'Linear', category: 'Project & Dev', description: 'Sync issues, projects, and roadmap updates.' },
  { key: 'github', name: 'GitHub', category: 'Project & Dev', description: 'Capture PRs, issues, commits, and code discussions.' },
  { key: 'gitlab', name: 'GitLab', category: 'Project & Dev', description: 'Track merge requests, issues, and CI/CD events.' },
  { key: 'bitbucket', name: 'Bitbucket', category: 'Project & Dev', description: 'Sync PRs, issues, and repository activity.' },
  { key: 'asana', name: 'Asana', category: 'Project & Dev', description: 'Capture tasks, projects, and team workflows.' },
  { key: 'trello', name: 'Trello', category: 'Project & Dev', description: 'Sync boards, cards, and checklists.' },
  { key: 'clickup', name: 'ClickUp', category: 'Project & Dev', description: 'Track tasks, docs, and goals from ClickUp.' },
  { key: 'monday', name: 'Monday.com', category: 'Project & Dev', description: 'Sync boards, items, and workflow updates.' },
  { key: 'basecamp', name: 'Basecamp', category: 'Project & Dev', description: 'Capture to-dos, messages, and project updates.' },
  { key: 'shortcut', name: 'Shortcut', category: 'Project & Dev', description: 'Track stories, epics, and iteration progress.' },
  { key: 'height', name: 'Height', category: 'Project & Dev', description: 'Sync tasks and project updates.' },
  { key: 'vercel', name: 'Vercel', category: 'Project & Dev', description: 'Track deployments and project activity.' },
  { key: 'netlify', name: 'Netlify', category: 'Project & Dev', description: 'Monitor deployments and build events.' },
  { key: 'sentry', name: 'Sentry', category: 'Project & Dev', description: 'Capture error reports and incident summaries.' },
  { key: 'datadog', name: 'Datadog', category: 'Project & Dev', description: 'Log monitoring alerts and incident context.' },
  { key: 'pagerduty', name: 'PagerDuty', category: 'Project & Dev', description: 'Capture incident timelines and resolution notes.' },
  { key: 'circleci', name: 'CircleCI', category: 'Project & Dev', description: 'Track CI/CD pipeline events and failures.' },
  { key: 'jenkins', name: 'Jenkins', category: 'Project & Dev', description: 'Log build events and deployment summaries.' },
  { key: 'postman', name: 'Postman', category: 'Project & Dev', description: 'Sync API documentation and test results.' },
  // CRM/Support (10)
  { key: 'hubspot', name: 'HubSpot', category: 'CRM & Support', description: 'Capture deals, contacts, and sales activity.' },
  { key: 'salesforce', name: 'Salesforce', category: 'CRM & Support', description: 'Sync opportunities, accounts, and sales insights.' },
  { key: 'zendesk', name: 'Zendesk', category: 'CRM & Support', description: 'Track support tickets and customer feedback.' },
  { key: 'freshdesk', name: 'Freshdesk', category: 'CRM & Support', description: 'Capture support conversations and resolutions.' },
  { key: 'pipedrive', name: 'Pipedrive', category: 'CRM & Support', description: 'Track deals and sales pipeline activity.' },
  { key: 'close', name: 'Close', category: 'CRM & Support', description: 'Sync leads, calls, and sales sequences.' },
  { key: 'copper', name: 'Copper', category: 'CRM & Support', description: 'Capture CRM data and relationship context.' },
  { key: 'front', name: 'Front', category: 'CRM & Support', description: 'Track shared inbox conversations and decisions.' },
  { key: 'helpscout', name: 'Help Scout', category: 'CRM & Support', description: 'Capture customer conversations and documentation.' },
  { key: 'freshsales', name: 'Freshsales', category: 'CRM & Support', description: 'Sync sales data and customer interactions.' },
  // Storage (8)
  { key: 'google-drive', name: 'Google Drive', category: 'Storage', description: 'Index and extract insights from Drive files.' },
  { key: 'dropbox', name: 'Dropbox', category: 'Storage', description: 'Monitor file changes and extract document content.' },
  { key: 'onedrive', name: 'OneDrive', category: 'Storage', description: 'Sync files and extract key document insights.' },
  { key: 'box', name: 'Box', category: 'Storage', description: 'Capture document metadata and content summaries.' },
  { key: 'sharepoint', name: 'SharePoint', category: 'Storage', description: 'Sync documents and site content.' },
  { key: 'icloud', name: 'iCloud', category: 'Storage', description: 'Import files and notes from iCloud.' },
  { key: 's3', name: 'S3-Compatible', category: 'Storage', description: 'Connect any S3-compatible storage for file ingestion.' },
  { key: 'wetransfer', name: 'WeTransfer', category: 'Storage', description: 'Capture shared file transfers and context.' },
  // Design (7)
  { key: 'figma', name: 'Figma', category: 'Design', description: 'Track design decisions, comments, and file updates.' },
  { key: 'miro', name: 'Miro', category: 'Design', description: 'Capture whiteboard sessions and brainstorming outcomes.' },
  { key: 'canva', name: 'Canva', category: 'Design', description: 'Track design assets and brand decisions.' },
  { key: 'sketch', name: 'Sketch', category: 'Design', description: 'Sync design files and version history.' },
  { key: 'adobe-xd', name: 'Adobe XD', category: 'Design', description: 'Capture design iterations and feedback.' },
  { key: 'invision', name: 'InVision', category: 'Design', description: 'Track design reviews and prototype feedback.' },
  { key: 'zeplin', name: 'Zeplin', category: 'Design', description: 'Sync design specs and developer handoff notes.' },
  // Analytics & Data (8)
  { key: 'google-analytics', name: 'Google Analytics', category: 'Analytics & Data', description: 'Capture key metrics and traffic insights.' },
  { key: 'mixpanel', name: 'Mixpanel', category: 'Analytics & Data', description: 'Track product analytics and user behavior insights.' },
  { key: 'amplitude', name: 'Amplitude', category: 'Analytics & Data', description: 'Sync product analytics and experiment results.' },
  { key: 'segment', name: 'Segment', category: 'Analytics & Data', description: 'Capture customer data events and insights.' },
  { key: 'posthog', name: 'PostHog', category: 'Analytics & Data', description: 'Track product analytics and feature flags.' },
  { key: 'tableau', name: 'Tableau', category: 'Analytics & Data', description: 'Capture dashboard insights and data summaries.' },
  { key: 'looker', name: 'Looker', category: 'Analytics & Data', description: 'Sync business intelligence reports and insights.' },
  { key: 'metabase', name: 'Metabase', category: 'Analytics & Data', description: 'Capture query results and dashboard insights.' },
  // Other/Productivity (7)
  { key: 'airtable', name: 'Airtable', category: 'Productivity', description: 'Sync bases, records, and workflow updates.' },
  { key: 'zapier', name: 'Zapier', category: 'Productivity', description: 'Connect any Zapier workflow to your memory.' },
  { key: 'make', name: 'Make (Integromat)', category: 'Productivity', description: 'Automate memory ingestion from Make scenarios.' },
  { key: 'ifttt', name: 'IFTTT', category: 'Productivity', description: 'Create automated memory triggers with IFTTT.' },
  { key: 'todoist', name: 'Todoist', category: 'Productivity', description: 'Sync tasks and completed items as memories.' },
  { key: 'things', name: 'Things 3', category: 'Productivity', description: 'Import tasks and projects from Things.' },
  { key: 'raindrop', name: 'Raindrop.io', category: 'Productivity', description: 'Capture bookmarks and web clippings.' },
]

console.log(`Seeding ${integrations.length} integrations...`)

const insertIntegration = sqlite.prepare(
  'INSERT OR IGNORE INTO integrations_catalog (id, key, name, category, description, status) VALUES (?, ?, ?, ?, ?, ?)'
)

for (const i of integrations) {
  insertIntegration.run(uid(), i.key, i.name, i.category, i.description, 'coming_soon')
}

// ─── Seed some demo data ────────────────────────────────
const sourceId = uid()
sqlite.prepare('INSERT OR IGNORE INTO sources (id, workspace_id, kind, label) VALUES (?, ?, ?, ?)')
  .run(sourceId, demoWorkspaceId, 'manual', 'Quick Capture')

// Sample raw items
const sampleItems = [
  { text: 'Decided to use React Flow for the memory graph visualization. It supports both graph and whiteboard modes which is exactly what we need.', occurredAt: '2025-04-01T10:00:00Z' },
  { text: 'Meeting with Sarah about Q2 roadmap. Key outcomes: 1) Launch beta by June 2) Focus on retention metrics 3) Hire 2 more engineers', occurredAt: '2025-04-01T14:00:00Z' },
  { text: 'Interesting idea: what if memories could have "decay" scores that decrease over time unless reinforced? This would help surface truly important memories.', occurredAt: '2025-04-02T09:30:00Z' },
  { text: 'Bug fix: the embedding similarity search was returning stale results because we weren\'t invalidating the cache on record updates.', occurredAt: '2025-04-02T16:00:00Z' },
  { text: 'User feedback from beta tester: "The graph view is amazing but I wish I could filter by date range." Adding to backlog.', occurredAt: '2025-04-03T11:00:00Z' },
]

const insertRawItem = sqlite.prepare(
  'INSERT OR IGNORE INTO raw_items (id, workspace_id, source_id, text, occurred_at, status) VALUES (?, ?, ?, ?, ?, ?)'
)

for (const item of sampleItems) {
  insertRawItem.run(uid(), demoWorkspaceId, sourceId, item.text, item.occurredAt, 'new')
}

console.log('Seed complete!')
console.log(`Demo login: demo@reattend.com / demo1234`)
sqlite.close()
