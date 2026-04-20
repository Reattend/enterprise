'use client'

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Search,
  Plug,
  Code,
  X,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22 6L12 13L2 6V4l10 7L22 4v2z" fill="#EA4335"/>
      <path d="M2 6v12a2 2 0 002 2h2V8.5L12 13l6-4.5V20h2a2 2 0 002-2V6l-2-2-8 6-8-6-2 2z" fill="#EA4335"/>
      <path d="M2 6l10 7V20H4a2 2 0 01-2-2V6z" fill="#FBBC05"/>
      <path d="M22 6l-10 7V20h8a2 2 0 002-2V6z" fill="#34A853"/>
      <path d="M22 4v2L12 13 2 6V4a2 2 0 012-2h16a2 2 0 012 2z" fill="#C5221F"/>
      <path d="M2 4a2 2 0 012-2h3l7 5.5L21 2h-1L12 8.5 4 2H4a2 2 0 00-2 2z" fill="#EA4335"/>
    </svg>
  )
}

function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="#4285F4" strokeWidth="1.5"/>
      <rect x="3" y="3" width="18" height="6" rx="2" fill="#4285F4"/>
      <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#4285F4">31</text>
      <rect x="7" y="1" width="2" height="3" rx="0.5" fill="#1A73E8"/>
      <rect x="15" y="1" width="2" height="3" rx="0.5" fill="#1A73E8"/>
    </svg>
  )
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" fill="#E01E5A"/>
      <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" fill="#36C5F0"/>
      <path d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312z" fill="#2EB67D"/>
      <path d="M15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" fill="#ECB22E"/>
    </svg>
  )
}

function NotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.46 2.35c-.42-.326-.98-.7-2.055-.607L3.01 2.96c-.467.047-.56.28-.374.466l1.823 1.782zm.793 3.358v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.047.934-.56.934-1.167V6.634c0-.607-.233-.933-.747-.887l-15.177.887c-.56.047-.747.327-.747.932zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.934-.234-1.495-.933l-4.577-7.186v6.953l1.449.327s0 .84-1.168.84l-3.222.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.747-1.073l3.456-.234 4.764 7.28V9.388l-1.215-.14c-.093-.514.28-.887.747-.933l3.268-.187z"/>
    </svg>
  )
}

function IntegrationImg({ src, className }: { src: string; className?: string }) {
  return <img src={src} alt="" className={cn(className, 'object-contain')} />
}
function ObsidianIcon({ className }: { className?: string }) { return <IntegrationImg src="/integrations/obsidian.svg" className={className} /> }
function ReadAiIcon({ className }: { className?: string }) { return <IntegrationImg src="/integrations/read.svg" className={className} /> }
function FirefliesIcon({ className }: { className?: string }) { return <IntegrationImg src="/integrations/fireflies.svg" className={className} /> }
function OtterIcon({ className }: { className?: string }) { return <IntegrationImg src="/integrations/Otter.svg" className={className} /> }
function GranolaIcon({ className }: { className?: string }) { return <IntegrationImg src="/integrations/granola.svg" className={className} /> }
function SupernormalIcon({ className }: { className?: string }) { return <IntegrationImg src="/integrations/superhuman.svg" className={className} /> }

function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M20.625 6.5h-5.25a.375.375 0 00-.375.375v7.25a2.375 2.375 0 01-2.375 2.375H9v1.125A2.375 2.375 0 0011.375 20h5.949l2.865 1.91a.5.5 0 00.786-.41V20h.025A2.375 2.375 0 0023 17.625v-8.75A2.375 2.375 0 0020.625 6.5z" fill="#5059C9"/>
      <circle cx="19.5" cy="4" r="2.5" fill="#5059C9"/>
      <path d="M15 5H5.375A2.375 2.375 0 003 7.375v8.25A2.375 2.375 0 005.375 18h5.949l3.865 2.573a.5.5 0 00.786-.41V18h.025A2.375 2.375 0 0018 15.625V7.375A2.375 2.375 0 0015.625 5H15z" fill="#7B83EB"/>
      <circle cx="10" cy="2.5" r="2.5" fill="#7B83EB"/>
    </svg>
  )
}

const integrationIcons: Record<string, React.FC<{ className?: string }>> = {
  gmail: GmailIcon,
  'google-calendar': GoogleCalendarIcon,
  slack: SlackIcon,
  'microsoft-teams': TeamsIcon,
  notion: NotionIcon,
  obsidian: ObsidianIcon,
  'read-ai': ReadAiIcon,
  fireflies: FirefliesIcon,
  otter: OtterIcon,
  granola: GranolaIcon,
  supernormal: SupernormalIcon,
}

const featuredKeys = ['notion', 'obsidian', 'read-ai', 'fireflies', 'otter', 'granola', 'supernormal']

const categories = [
  'All',
  'Communication',
  'Email & Calendar',
  'Docs & Knowledge',
  'Project & Dev',
  'CRM & Support',
  'Storage',
  'Design',
  'Analytics & Data',
  'Productivity',
]

const integrations = [
  // Communication
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
  // Email & Calendar
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
  // Docs & Knowledge
  { key: 'notion', name: 'Notion', category: 'Docs & Knowledge', description: 'Sync pages, databases, and wikis from Notion workspaces.' },
  { key: 'confluence', name: 'Confluence', category: 'Docs & Knowledge', description: 'Capture wiki pages, decisions, and documentation updates.' },
  { key: 'google-docs', name: 'Google Docs', category: 'Docs & Knowledge', description: 'Extract key content and decisions from Google Docs.' },
  { key: 'dropbox-paper', name: 'Dropbox Paper', category: 'Docs & Knowledge', description: 'Sync documents and collaborative notes.' },
  { key: 'obsidian', name: 'Obsidian', category: 'Docs & Knowledge', description: 'Import your vault — export as markdown, drag into Reattend Import.' },
  { key: 'read-ai', name: 'Read.ai', category: 'Communication', description: 'Paste or import meeting transcripts and summaries from Read.ai.' },
  { key: 'fireflies', name: 'Fireflies.ai', category: 'Communication', description: 'Import meeting transcripts and action items from Fireflies.' },
  { key: 'otter', name: 'Otter.ai', category: 'Communication', description: 'Import meeting transcripts and notes from Otter.' },
  { key: 'granola', name: 'Granola', category: 'Communication', description: 'Import enhanced meeting notes from Granola.' },
  { key: 'supernormal', name: 'Supernormal', category: 'Communication', description: 'Import meeting summaries and follow-ups from Supernormal.' },
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
  // Project & Dev
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
  // CRM & Support
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
  // Storage
  { key: 'google-drive', name: 'Google Drive', category: 'Storage', description: 'Index and extract insights from Drive files.' },
  { key: 'dropbox', name: 'Dropbox', category: 'Storage', description: 'Monitor file changes and extract document content.' },
  { key: 'onedrive', name: 'OneDrive', category: 'Storage', description: 'Sync files and extract key document insights.' },
  { key: 'box', name: 'Box', category: 'Storage', description: 'Capture document metadata and content summaries.' },
  { key: 'sharepoint', name: 'SharePoint', category: 'Storage', description: 'Sync documents and site content.' },
  { key: 'icloud', name: 'iCloud', category: 'Storage', description: 'Import files and notes from iCloud.' },
  { key: 's3', name: 'S3-Compatible', category: 'Storage', description: 'Connect any S3-compatible storage for file ingestion.' },
  { key: 'wetransfer', name: 'WeTransfer', category: 'Storage', description: 'Capture shared file transfers and context.' },
  // Design
  { key: 'figma', name: 'Figma', category: 'Design', description: 'Track design decisions, comments, and file updates.' },
  { key: 'miro', name: 'Miro', category: 'Design', description: 'Capture whiteboard sessions and brainstorming outcomes.' },
  { key: 'canva', name: 'Canva', category: 'Design', description: 'Track design assets and brand decisions.' },
  { key: 'sketch', name: 'Sketch', category: 'Design', description: 'Sync design files and version history.' },
  { key: 'adobe-xd', name: 'Adobe XD', category: 'Design', description: 'Capture design iterations and feedback.' },
  { key: 'invision', name: 'InVision', category: 'Design', description: 'Track design reviews and prototype feedback.' },
  { key: 'zeplin', name: 'Zeplin', category: 'Design', description: 'Sync design specs and developer handoff notes.' },
  // Analytics & Data
  { key: 'google-analytics', name: 'Google Analytics', category: 'Analytics & Data', description: 'Capture key metrics and traffic insights.' },
  { key: 'mixpanel', name: 'Mixpanel', category: 'Analytics & Data', description: 'Track product analytics and user behavior insights.' },
  { key: 'amplitude', name: 'Amplitude', category: 'Analytics & Data', description: 'Sync product analytics and experiment results.' },
  { key: 'segment', name: 'Segment', category: 'Analytics & Data', description: 'Capture customer data events and insights.' },
  { key: 'posthog', name: 'PostHog', category: 'Analytics & Data', description: 'Track product analytics and feature flags.' },
  { key: 'tableau', name: 'Tableau', category: 'Analytics & Data', description: 'Capture dashboard insights and data summaries.' },
  { key: 'looker', name: 'Looker', category: 'Analytics & Data', description: 'Sync business intelligence reports and insights.' },
  { key: 'metabase', name: 'Metabase', category: 'Analytics & Data', description: 'Capture query results and dashboard insights.' },
  // Productivity
  { key: 'airtable', name: 'Airtable', category: 'Productivity', description: 'Sync bases, records, and workflow updates.' },
  { key: 'zapier', name: 'Zapier', category: 'Productivity', description: 'Connect any Zapier workflow to your memory.' },
  { key: 'make', name: 'Make (Integromat)', category: 'Productivity', description: 'Automate memory ingestion from Make scenarios.' },
  { key: 'ifttt', name: 'IFTTT', category: 'Productivity', description: 'Create automated memory triggers with IFTTT.' },
  { key: 'todoist', name: 'Todoist', category: 'Productivity', description: 'Sync tasks and completed items as memories.' },
  { key: 'things', name: 'Things 3', category: 'Productivity', description: 'Import tasks and projects from Things.' },
  { key: 'raindrop', name: 'Raindrop.io', category: 'Productivity', description: 'Capture bookmarks and web clippings.' },
]

const sampleWebhookPayload = `{
  "text": "Decided to migrate from PostgreSQL to SQLite for simpler hosting.",
  "source": "api",
  "workspace_id": "your-workspace-id",
  "occurred_at": "2025-04-01T10:00:00Z",
  "author": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "metadata": {
    "channel": "#engineering",
    "importance": "high"
  }
}`

// Active integrations that have real connect flows
const activeIntegrationKeys = new Set(['notion'])
// These work via file import (no OAuth needed) — shown as "Import Ready"
const importReadyKeys = new Set(['obsidian', 'read-ai', 'fireflies', 'otter', 'granola', 'supernormal'])

interface GmailState {
  connected: boolean
  status?: string
  lastSyncedAt?: string | null
  syncError?: string | null
  connectedEmail?: string | null
  settings: {
    domainWhitelist: string[]
    syncEnabled: boolean
  }
}

interface TeamsState {
  connected: boolean
  status?: string
  lastSyncedAt?: string | null
  syncError?: string | null
  settings: {
    syncEnabled: boolean
  }
}

interface SlackState {
  connected: boolean
  status?: string
  lastSyncedAt?: string | null
  syncError?: string | null
  settings: {
    channels: string[]
    syncEnabled: boolean
    teamName?: string
  }
}

interface CalendarState {
  connected: boolean
  status?: string
  lastSyncedAt?: string | null
  syncError?: string | null
  connectedEmail?: string | null
  settings: {
    syncEnabled: boolean
    syncDays: number
    selectedCalendars: string[]
  }
  calendars: Array<{ id: string; summary: string; primary?: boolean }>
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
      <IntegrationsContent />
    </Suspense>
  )
}

function IntegrationsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedIntegration, setSelectedIntegration] = useState<typeof integrations[0] | null>(null)
  const [showWebhookTest, setShowWebhookTest] = useState(false)
  const [showIntegrationDocs, setShowIntegrationDocs] = useState(false)
  const [integrationDocsTab, setIntegrationDocsTab] = useState<'gmail' | 'calendar' | 'slack'>('gmail')
  const [webhookPayload, setWebhookPayload] = useState(sampleWebhookPayload)

  // Gmail state
  const [gmail, setGmail] = useState<GmailState>({ connected: false, settings: { domainWhitelist: [], syncEnabled: true } })
  const [gmailLoading, setGmailLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // Teams state
  const [teams, setTeams] = useState<TeamsState>({ connected: false, settings: { syncEnabled: true } })
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [teamsSyncing, setTeamsSyncing] = useState(false)
  const [teamsDisconnecting, setTeamsDisconnecting] = useState(false)

  // Slack state
  const [slack, setSlack] = useState<SlackState>({ connected: false, settings: { channels: [], syncEnabled: true } })
  const [slackLoading, setSlackLoading] = useState(true)
  const [slackSyncing, setSlackSyncing] = useState(false)
  const [slackDisconnecting, setSlackDisconnecting] = useState(false)
  const [slackChannels, setSlackChannels] = useState<Array<{ id: string; name: string; numMembers: number }>>([])
  const [slackChannelsLoading, setSlackChannelsLoading] = useState(false)
  const [slackSelectedChannels, setSlackSelectedChannels] = useState<string[]>([])
  const [slackSavingChannels, setSlackSavingChannels] = useState(false)

  // Calendar state
  const [calendar, setCalendar] = useState<CalendarState>({ connected: false, settings: { syncEnabled: true, syncDays: 30, selectedCalendars: [] }, calendars: [] })
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [calendarSyncing, setCalendarSyncing] = useState(false)
  const [calendarDisconnecting, setCalendarDisconnecting] = useState(false)

  // Notion state
  const [notionConnected, setNotionConnected] = useState(false)
  const [notionSyncing, setNotionSyncing] = useState(false)

  // Fetch Gmail status
  const fetchGmailStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/gmail')
      if (res.ok) {
        const data = await res.json()
        setGmail({
          connected: data.connected,
          status: data.status,
          lastSyncedAt: data.lastSyncedAt,
          syncError: data.syncError,
          connectedEmail: data.connectedEmail || null,
          settings: data.settings || { domainWhitelist: [], syncEnabled: true },
        })
      }
    } catch {
      // silently fail
    } finally {
      setGmailLoading(false)
    }
  }, [])

  // Fetch Teams status
  const fetchTeamsStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/teams')
      if (res.ok) {
        const data = await res.json()
        setTeams({
          connected: data.connected,
          status: data.status,
          lastSyncedAt: data.lastSyncedAt,
          syncError: data.syncError,
          settings: data.settings || { syncEnabled: true },
        })
      }
    } catch {
      // silently fail
    } finally {
      setTeamsLoading(false)
    }
  }, [])

  // Fetch Slack status
  const fetchSlackStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/slack')
      if (res.ok) {
        const data = await res.json()
        setSlack({
          connected: data.connected,
          status: data.status,
          lastSyncedAt: data.lastSyncedAt,
          syncError: data.syncError,
          settings: data.settings || { channels: [], syncEnabled: true },
        })
        if (data.connected) {
          setSlackSelectedChannels(data.settings?.channels || [])
        }
      }
    } catch {
      // silently fail
    } finally {
      setSlackLoading(false)
    }
  }, [])

  const fetchSlackChannels = useCallback(async () => {
    setSlackChannelsLoading(true)
    try {
      const res = await fetch('/api/integrations/slack/channels')
      if (res.ok) {
        const data = await res.json()
        setSlackChannels(data.channels || [])
      }
    } catch {
      // silently fail
    } finally {
      setSlackChannelsLoading(false)
    }
  }, [])

  const handleSaveSlackChannels = async () => {
    setSlackSavingChannels(true)
    try {
      const res = await fetch('/api/integrations/slack', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: slackSelectedChannels }),
      })
      if (res.ok) {
        setSlack(prev => ({ ...prev, settings: { ...prev.settings, channels: slackSelectedChannels } }))
        toast.success('Channel settings saved.')
      } else {
        toast.error('Failed to save channel settings.')
      }
    } catch {
      toast.error('Failed to save channel settings.')
    } finally {
      setSlackSavingChannels(false)
    }
  }

  // Fetch Calendar status
  const fetchCalendarStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/calendar')
      if (res.ok) {
        const data = await res.json()
        setCalendar({
          connected: data.connected,
          status: data.status,
          lastSyncedAt: data.lastSyncedAt,
          syncError: data.syncError,
          connectedEmail: data.connectedEmail || null,
          settings: data.settings || { syncEnabled: true, syncDays: 30, selectedCalendars: [] },
          calendars: data.calendars || [],
        })
      }
    } catch {
      // silently fail
    } finally {
      setCalendarLoading(false)
    }
  }, [])

  const fetchNotionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/notion')
      if (res.ok) {
        const data = await res.json()
        setNotionConnected(data.connected)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchGmailStatus()
    fetchTeamsStatus()
    fetchSlackStatus()
    fetchCalendarStatus()
    fetchNotionStatus()
  }, [fetchGmailStatus, fetchTeamsStatus, fetchSlackStatus, fetchCalendarStatus, fetchNotionStatus])

  // Handle OAuth callback query params
  useEffect(() => {
    const gmailParam = searchParams.get('gmail')
    const gmailError = searchParams.get('gmail_error')
    const teamsParam = searchParams.get('teams')
    const teamsError = searchParams.get('teams_error')
    const slackParam = searchParams.get('slack')
    const slackError = searchParams.get('slack_error')

    const calendarParam = searchParams.get('calendar')
    const calendarError = searchParams.get('calendar_error')

    if (calendarParam === 'connected') {
      toast.success('Google Calendar connected successfully!')
      fetchCalendarStatus()
      const calendarIntegration = integrations.find(i => i.key === 'google-calendar')
      if (calendarIntegration) setSelectedIntegration(calendarIntegration)
      router.replace('/app/integrations')
    } else if (calendarError) {
      const messages: Record<string, string> = {
        denied: 'Google Calendar access was denied.',
        missing_params: 'Missing parameters from Google.',
        invalid_state: 'Invalid OAuth state.',
        token_exchange: 'Failed to exchange token with Google.',
      }
      toast.error(messages[calendarError] || 'Google Calendar connection failed.')
      router.replace('/app/integrations')
    } else if (gmailParam === 'connected') {
      toast.success('Gmail connected successfully!')
      fetchGmailStatus()
      const gmailIntegration = integrations.find(i => i.key === 'gmail')
      if (gmailIntegration) setSelectedIntegration(gmailIntegration)
      router.replace('/app/integrations')
    } else if (gmailError) {
      const messages: Record<string, string> = {
        denied: 'Gmail access was denied.',
        missing_params: 'Missing parameters from Google.',
        invalid_state: 'Invalid OAuth state.',
        token_exchange: 'Failed to exchange token with Google.',
      }
      toast.error(messages[gmailError] || 'Gmail connection failed.')
      router.replace('/app/integrations')
    } else if (teamsParam === 'connected') {
      toast.success('Microsoft Teams connected successfully!')
      fetchTeamsStatus()
      const teamsIntegration = integrations.find(i => i.key === 'microsoft-teams')
      if (teamsIntegration) setSelectedIntegration(teamsIntegration)
      router.replace('/app/integrations')
    } else if (teamsError) {
      const messages: Record<string, string> = {
        denied: 'Teams access was denied.',
        missing_params: 'Missing parameters from Microsoft.',
        invalid_state: 'Invalid OAuth state.',
        token_exchange: 'Failed to exchange token with Microsoft.',
      }
      toast.error(messages[teamsError] || 'Teams connection failed.')
      router.replace('/app/integrations')
    } else if (slackParam === 'connected') {
      toast.success('Slack connected successfully!')
      fetchSlackStatus()
      fetchSlackChannels()
      const slackIntegration = integrations.find(i => i.key === 'slack')
      if (slackIntegration) setSelectedIntegration(slackIntegration)
      router.replace('/app/integrations')
    } else if (slackError) {
      const messages: Record<string, string> = {
        denied: 'Slack access was denied.',
        missing_params: 'Missing parameters from Slack.',
        invalid_state: 'Invalid OAuth state.',
        token_exchange: 'Failed to exchange token with Slack.',
      }
      toast.error(messages[slackError] || 'Slack connection failed.')
      router.replace('/app/integrations')
    }
  }, [searchParams, router, fetchGmailStatus, fetchTeamsStatus, fetchSlackStatus, fetchCalendarStatus])

  const filtered = useMemo(() => {
    return integrations.filter(i => {
      if (activeCategory !== 'All' && i.category !== activeCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
      }
      return true
    })
  }, [searchQuery, activeCategory])

  const handleTestWebhook = () => {
    try {
      JSON.parse(webhookPayload)
      toast.success('Webhook test sent! Check your inbox.')
    } catch {
      toast.error('Invalid JSON payload')
    }
  }

  // Calendar actions
  const handleConnectCalendar = () => {
    window.location.href = '/api/integrations/calendar/connect'
  }

  const handleDisconnectCalendar = async () => {
    setCalendarDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/calendar', { method: 'DELETE' })
      if (res.ok) {
        setCalendar({ connected: false, settings: { syncEnabled: true, syncDays: 30, selectedCalendars: [] }, calendars: [] })
        toast.success('Google Calendar disconnected.')
        setSelectedIntegration(null)
      } else {
        toast.error('Failed to disconnect Google Calendar.')
      }
    } catch {
      toast.error('Failed to disconnect Google Calendar.')
    } finally {
      setCalendarDisconnecting(false)
    }
  }

  const handleSyncCalendar = async () => {
    setCalendarSyncing(true)
    try {
      const res = await fetch('/api/integrations/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.synced > 0) {
          toast.success(data.message, {
            action: { label: 'View Memories', onClick: () => router.push('/app/memories') },
          })
        } else {
          toast.info(data.message || 'No new events found.')
        }
        fetchCalendarStatus()
      } else {
        toast.error(data.error || 'Sync failed.')
      }
    } catch {
      toast.error('Sync failed.')
    } finally {
      setCalendarSyncing(false)
    }
  }

  const handleToggleCalendar = async (calendarId: string) => {
    const current = calendar.settings.selectedCalendars
    const updated = current.includes(calendarId)
      ? current.filter(id => id !== calendarId)
      : [...current, calendarId]
    try {
      const res = await fetch('/api/integrations/calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedCalendars: updated }),
      })
      if (res.ok) {
        setCalendar(prev => ({ ...prev, settings: { ...prev.settings, selectedCalendars: updated } }))
      }
    } catch {}
  }

  // Gmail actions
  const handleConnectGmail = () => {
    window.location.href = '/api/integrations/gmail/connect'
  }

  const handleDisconnectGmail = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/gmail', { method: 'DELETE' })
      if (res.ok) {
        setGmail({ connected: false, settings: { domainWhitelist: [], syncEnabled: true } })
        toast.success('Gmail disconnected.')
        setSelectedIntegration(null)
      } else {
        toast.error('Failed to disconnect Gmail.')
      }
    } catch {
      toast.error('Failed to disconnect Gmail.')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleAddDomain = async () => {
    const domain = newDomain.trim().toLowerCase().replace(/^@/, '')
    if (!domain || !domain.includes('.')) {
      toast.error('Enter a valid domain (e.g. company.com)')
      return
    }
    if (gmail.settings.domainWhitelist.includes(domain)) {
      toast.error('Domain already added.')
      return
    }

    const updated = [...gmail.settings.domainWhitelist, domain]
    setSavingSettings(true)
    try {
      const res = await fetch('/api/integrations/gmail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainWhitelist: updated }),
      })
      if (res.ok) {
        setGmail(prev => ({ ...prev, settings: { ...prev.settings, domainWhitelist: updated } }))
        setNewDomain('')
        toast.success(`Added ${domain}`)
      }
    } catch {
      toast.error('Failed to save.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleRemoveDomain = async (domain: string) => {
    const updated = gmail.settings.domainWhitelist.filter(d => d !== domain)
    setSavingSettings(true)
    try {
      const res = await fetch('/api/integrations/gmail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainWhitelist: updated }),
      })
      if (res.ok) {
        setGmail(prev => ({ ...prev, settings: { ...prev.settings, domainWhitelist: updated } }))
        toast.success(`Removed ${domain}`)
      }
    } catch {
      toast.error('Failed to save.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSyncGmail = async () => {
    if (gmail.settings.domainWhitelist.length === 0) {
      toast.error('Add at least one domain before syncing.')
      return
    }
    setSyncing(true)
    try {
      const res = await fetch('/api/integrations/gmail/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.synced > 0) {
          toast.success(`Synced ${data.synced} email${data.synced > 1 ? 's' : ''} to your inbox!`, {
            action: {
              label: 'View in Inbox',
              onClick: () => router.push('/app/inbox?source=gmail'),
            },
          })
        } else {
          toast.info(data.message || 'No new emails found.')
        }
        fetchGmailStatus()
      } else {
        toast.error(data.error || 'Sync failed.')
      }
    } catch {
      toast.error('Sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  // Teams actions
  const handleConnectTeams = () => {
    window.location.href = '/api/integrations/teams/connect'
  }

  const handleDisconnectTeams = async () => {
    setTeamsDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/teams', { method: 'DELETE' })
      if (res.ok) {
        setTeams({ connected: false, settings: { syncEnabled: true } })
        toast.success('Teams disconnected.')
        setSelectedIntegration(null)
      } else {
        toast.error('Failed to disconnect Teams.')
      }
    } catch {
      toast.error('Failed to disconnect Teams.')
    } finally {
      setTeamsDisconnecting(false)
    }
  }

  const handleSyncTeams = async () => {
    setTeamsSyncing(true)
    try {
      const res = await fetch('/api/integrations/teams/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.synced > 0) {
          toast.success(`Synced ${data.synced} message${data.synced > 1 ? 's' : ''} to your inbox!`, {
            action: {
              label: 'View in Inbox',
              onClick: () => router.push('/app/inbox?source=teams'),
            },
          })
        } else {
          toast.info('No new messages found.')
        }
        fetchTeamsStatus()
      } else {
        toast.error(data.error || 'Sync failed.')
      }
    } catch {
      toast.error('Sync failed.')
    } finally {
      setTeamsSyncing(false)
    }
  }

  // Slack actions
  const handleConnectSlack = () => {
    window.location.href = '/api/integrations/slack/connect'
  }

  const handleDisconnectSlack = async () => {
    setSlackDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/slack', { method: 'DELETE' })
      if (res.ok) {
        setSlack({ connected: false, settings: { channels: [], syncEnabled: true } })
        toast.success('Slack disconnected.')
        setSelectedIntegration(null)
      } else {
        toast.error('Failed to disconnect Slack.')
      }
    } catch {
      toast.error('Failed to disconnect Slack.')
    } finally {
      setSlackDisconnecting(false)
    }
  }

  const handleSyncSlack = async () => {
    setSlackSyncing(true)
    try {
      const res = await fetch('/api/integrations/slack/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.synced > 0) {
          toast.success(`Synced ${data.synced} message${data.synced > 1 ? 's' : ''} to your inbox!`, {
            action: {
              label: 'View in Inbox',
              onClick: () => router.push('/app/inbox?source=slack'),
            },
          })
        } else {
          toast.info('No new messages found.')
        }
        fetchSlackStatus()
      } else {
        toast.error(data.error || 'Sync failed.')
      }
    } catch {
      toast.error('Sync failed.')
    } finally {
      setSlackSyncing(false)
    }
  }

  const isGmailSelected = selectedIntegration?.key === 'gmail'
  const isTeamsSelected = selectedIntegration?.key === 'microsoft-teams'
  const isSlackSelected = selectedIntegration?.key === 'slack'
  const isCalendarSelected = selectedIntegration?.key === 'google-calendar'
  const isNotionSelected = selectedIntegration?.key === 'notion'

  const renderFeaturedCard = (key: string) => {
    const integration = integrations.find(i => i.key === key)!
    const IconComponent = integrationIcons[key]
    const isConnected = (key === 'gmail' && gmail.connected) || (key === 'microsoft-teams' && teams.connected) || (key === 'slack' && slack.connected) || (key === 'google-calendar' && calendar.connected) || (key === 'notion' && notionConnected)
    const isActive = activeIntegrationKeys.has(key)

    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card
          className={cn(
            'hover:shadow-md transition-all cursor-pointer group h-full',
            isConnected
              ? 'border-green-500/30 bg-green-500/[0.03] hover:border-green-500/50'
              : 'border-primary/10 bg-primary/[0.02] hover:border-primary/30'
          )}
          onClick={() => setSelectedIntegration(integration)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-white dark:bg-muted flex items-center justify-center shadow-sm border">
                {IconComponent ? <IconComponent className="h-6 w-6" /> : <span className="text-lg font-bold text-muted-foreground">{integration.name[0]}</span>}
              </div>
              {isConnected ? (
                <Badge className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">Connected</Badge>
              ) : isActive ? (
                <Badge className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20">Available</Badge>
              ) : importReadyKeys.has(key) ? (
                <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">Import Ready</Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px]">Coming Soon</Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{integration.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{integration.description}</p>
            <div className="flex items-center justify-between mt-3">
              <Badge variant="outline" className="text-[9px]">{integration.category}</Badge>
              {isConnected ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {integrations.length} integrations to feed your memory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowIntegrationDocs(true)}>
            <BookOpen className="h-4 w-4 mr-1" />
            Docs
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowWebhookTest(true)}>
            <Code className="h-4 w-4 mr-1" />
            Test Webhook
          </Button>
          <Link href="/app/inbox">
            <Button size="sm" className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
              <Inbox className="h-4 w-4 mr-1" />
              Inbox
            </Button>
          </Link>
        </div>
      </div>

      {/* Search + Categories */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="pl-9"
          />
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-transparent'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Featured Integrations */}
      {activeCategory === 'All' && !searchQuery && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Popular</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {featuredKeys.map(renderFeaturedCard)}
          </div>
        </div>
      )}

      {/* All Integrations Grid */}
      {(activeCategory !== 'All' || searchQuery) && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Integrations</h2>}
      {activeCategory === 'All' && !searchQuery && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-4">All Integrations</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((integration, i) => {
          const IconComponent = integrationIcons[integration.key]
          const isConnectedCard = (integration.key === 'gmail' && gmail.connected) || (integration.key === 'microsoft-teams' && teams.connected) || (integration.key === 'slack' && slack.connected) || (integration.key === 'google-calendar' && calendar.connected)
          const isActive = activeIntegrationKeys.has(integration.key)
          return (
            <motion.div
              key={integration.key}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
            >
              <Card
                className={cn(
                  'hover:shadow-md transition-all cursor-pointer group h-full',
                  isConnectedCard
                    ? 'border-green-500/20 hover:border-green-500/40'
                    : 'hover:border-primary/20'
                )}
                onClick={() => setSelectedIntegration(integration)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      {IconComponent ? <IconComponent className="h-5 w-5" /> : <span className="text-lg font-bold text-muted-foreground">{integration.name[0]}</span>}
                    </div>
                    {isConnectedCard ? (
                      <Badge className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">Connected</Badge>
                    ) : isActive ? (
                      <Badge className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20">Available</Badge>
                    ) : importReadyKeys.has(integration.key) ? (
                      <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">Import Ready</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px]">Coming Soon</Badge>
                    )}
                  </div>
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors">{integration.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{integration.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className="text-[9px]">{integration.category}</Badge>
                    {isConnectedCard ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Switch disabled className="scale-75 opacity-50" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Plug className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No integrations found.</p>
        </div>
      )}

      {/* Integration SDK Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4" />
            Integration SDK
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            All integrations send normalized events to the ingest API. Use the contract below to build custom integrations.
          </p>
          <div className="rounded-lg bg-muted p-4 font-mono text-xs overflow-x-auto">
            <pre>{`POST /api/ingest
Content-Type: application/json

{
  "text": "string (required) - The raw content to ingest",
  "source": "string - Source identifier (manual, api, etc.)",
  "workspace_id": "string (required) - Target workspace",
  "occurred_at": "ISO 8601 datetime",
  "author": {
    "name": "string",
    "email": "string"
  },
  "metadata": {
    // Any additional key-value pairs
  }
}`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Gmail Integration Modal */}
      <Dialog open={isGmailSelected} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white dark:bg-muted flex items-center justify-center shadow-sm border">
                <GmailIcon className="h-6 w-6" />
              </div>
              Gmail
              {gmail.connected && (
                <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Connected</Badge>
              )}
              {gmail.connected && gmail.connectedEmail && (
                <Badge variant="outline" className="text-[10px] font-normal">{gmail.connectedEmail}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Automatically ingest important emails from whitelisted domains into your memory.
            </DialogDescription>
          </DialogHeader>

          {gmailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !gmail.connected ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">How it works</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex gap-2"><span className="text-primary font-medium">1.</span> Connect your Gmail account</li>
                  <li className="flex gap-2"><span className="text-primary font-medium">2.</span> Add domains you want to capture emails from</li>
                  <li className="flex gap-2"><span className="text-primary font-medium">3.</span> Sync to import matching emails as memories</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  We only read emails from your whitelisted domains. We never send emails on your behalf.
                </p>
              </div>
              <Button onClick={handleConnectGmail} className="w-full">
                <GmailIcon className="h-4 w-4 mr-2" />
                Connect Gmail
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Domain Whitelist */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Domain Whitelist</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only emails from these domains will be ingested as memories.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="company.com"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                    disabled={savingSettings}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddDomain}
                    disabled={savingSettings || !newDomain.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {gmail.settings.domainWhitelist.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {gmail.settings.domainWhitelist.map((domain) => (
                      <Badge
                        key={domain}
                        variant="secondary"
                        className="text-xs py-1 px-2.5 gap-1.5"
                      >
                        @{domain}
                        <button
                          onClick={() => handleRemoveDomain(domain)}
                          className="hover:text-destructive transition-colors"
                          disabled={savingSettings}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No domains added yet. Add at least one domain to start syncing.
                  </p>
                )}
              </div>

              {/* Sync Status */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Sync</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncGmail}
                    disabled={syncing || gmail.settings.domainWhitelist.length === 0}
                  >
                    {syncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
                {gmail.lastSyncedAt && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(gmail.lastSyncedAt).toLocaleString()}
                    </p>
                    <Link href="/app/inbox?source=gmail" className="text-xs text-primary hover:underline">
                      View in Inbox
                    </Link>
                  </div>
                )}
                {gmail.syncError && (
                  <div className="flex items-start gap-1.5 text-xs text-orange-600">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {gmail.syncError}
                  </div>
                )}
              </div>

              {/* Disconnect */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDisconnectGmail}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Disconnect Gmail
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Teams Integration Modal */}
      <Dialog open={isTeamsSelected} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white dark:bg-muted flex items-center justify-center shadow-sm border">
                <TeamsIcon className="h-6 w-6" />
              </div>
              Microsoft Teams
              {teams.connected && (
                <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Connected</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Sync chat messages from Microsoft Teams into your memory inbox.
            </DialogDescription>
          </DialogHeader>

          {teamsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !teams.connected ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">How it works</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex gap-2"><span className="text-primary font-medium">1.</span> Connect your Microsoft account</li>
                  <li className="flex gap-2"><span className="text-primary font-medium">2.</span> Sync to pull recent chat messages</li>
                  <li className="flex gap-2"><span className="text-primary font-medium">3.</span> Review and triage messages in your Inbox</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  We read your chats in read-only mode. We never send messages on your behalf.
                </p>
              </div>
              <Button onClick={handleConnectTeams} className="w-full">
                <TeamsIcon className="h-4 w-4 mr-2" />
                Connect Microsoft Teams
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Sync Status */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Sync</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncTeams}
                    disabled={teamsSyncing}
                  >
                    {teamsSyncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {teamsSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pulls recent messages from your Teams chats.
                </p>
                {teams.lastSyncedAt && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(teams.lastSyncedAt).toLocaleString()}
                    </p>
                    <Link href="/app/inbox?source=teams" className="text-xs text-primary hover:underline">
                      View in Inbox
                    </Link>
                  </div>
                )}
                {teams.syncError && (
                  <div className="flex items-start gap-1.5 text-xs text-orange-600">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {teams.syncError}
                  </div>
                )}
              </div>

              {/* Disconnect */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDisconnectTeams}
                  disabled={teamsDisconnecting}
                >
                  {teamsDisconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Disconnect Teams
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Slack Integration Modal */}
      <Dialog open={isSlackSelected} onOpenChange={(open) => { if (!open) setSelectedIntegration(null); else if (slack.connected) fetchSlackChannels() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white dark:bg-muted flex items-center justify-center shadow-sm border">
                <SlackIcon className="h-6 w-6" />
              </div>
              Slack
              {slack.connected && (
                <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Connected</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Capture important messages from Slack channels into your memory inbox.
            </DialogDescription>
          </DialogHeader>

          {slackLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !slack.connected ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">How it works</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex gap-2"><span className="text-primary font-medium">1.</span> Connect your Slack workspace</li>
                  <li className="flex gap-2"><span className="text-primary font-medium">2.</span> Pick channels — messages sync into your memory inbox every 30 min</li>
                  <li className="flex gap-2"><span className="text-primary font-medium">3.</span> Use <code className="text-[11px] font-mono bg-background border rounded px-1">/reattend save</code> to save notes directly from Slack</li>
                  <li className="flex gap-2"><span className="text-primary font-medium">4.</span> Right-click any message → <strong>Save to Reattend</strong> to save it instantly</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Read-only access to channels you&apos;re a member of. We never post without your action.
                </p>
              </div>
              <Button onClick={handleConnectSlack} className="w-full">
                <SlackIcon className="h-4 w-4 mr-2" />
                Connect Slack
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Workspace info */}
              {slack.settings.teamName && (
                <div className="text-xs text-muted-foreground">
                  Connected to <span className="font-medium text-foreground">{slack.settings.teamName}</span>
                </div>
              )}

              {/* Channel picker */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Channels to sync</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {slackSelectedChannels.length === 0
                        ? 'All channels you are a member of'
                        : `${slackSelectedChannels.length} channel${slackSelectedChannels.length !== 1 ? 's' : ''} selected`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 px-2"
                    onClick={fetchSlackChannels}
                    disabled={slackChannelsLoading}
                  >
                    {slackChannelsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh'}
                  </Button>
                </div>

                {slackChannelsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : slackChannels.length > 0 ? (
                  <>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {slackChannels.map(ch => (
                        <label key={ch.id} className="flex items-center gap-2.5 py-1 px-1.5 rounded hover:bg-muted/50 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-primary"
                            checked={slackSelectedChannels.includes(ch.id)}
                            onChange={e => {
                              setSlackSelectedChannels(prev =>
                                e.target.checked ? [...prev, ch.id] : prev.filter(id => id !== ch.id)
                              )
                            }}
                          />
                          <span className="text-xs text-foreground">#{ch.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{ch.numMembers} members</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t">
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setSlackSelectedChannels(
                          slackSelectedChannels.length === slackChannels.length ? [] : slackChannels.map(c => c.id)
                        )}
                      >
                        {slackSelectedChannels.length === slackChannels.length ? 'Deselect all' : 'Select all'}
                      </button>
                      <Button size="sm" className="h-7 text-xs" onClick={handleSaveSlackChannels} disabled={slackSavingChannels}>
                        {slackSavingChannels ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No channels found. Make sure you are a member of at least one public channel.
                  </p>
                )}
              </div>

              {/* Sync Status */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Sync</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncSlack}
                    disabled={slackSyncing}
                  >
                    {slackSyncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {slackSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Syncs automatically every 30 minutes. Messages appear in your Inbox.
                </p>
                {slack.lastSyncedAt && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(slack.lastSyncedAt).toLocaleString()}
                    </p>
                    <Link href="/app/inbox?source=slack" className="text-xs text-primary hover:underline">
                      View in Inbox
                    </Link>
                  </div>
                )}
                {slack.syncError && (
                  <div className="flex items-start gap-1.5 text-xs text-orange-600">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {slack.syncError}
                  </div>
                )}
              </div>

              {/* Slash commands + shortcut docs */}
              <div className="rounded-lg border p-3 space-y-2.5 bg-muted/30">
                <p className="text-xs font-semibold text-foreground">Slack Commands</p>
                <div className="space-y-2">
                  {[
                    { cmd: '/reattend save [note]', desc: 'Save any text to your Reattend memory from Slack' },
                    { cmd: '/reattend search [query]', desc: 'Search your Reattend memories without leaving Slack' },
                    { cmd: 'Message shortcut', desc: 'Right-click any message → More actions → Save to Reattend' },
                  ].map(item => (
                    <div key={item.cmd} className="flex flex-col gap-0.5">
                      <code className="text-[11px] font-mono bg-background border rounded px-1.5 py-0.5 w-fit">{item.cmd}</code>
                      <p className="text-[11px] text-muted-foreground pl-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground pt-1 border-t">
                  Commands require the Reattend Slack app to be installed in your workspace.
                </p>
              </div>

              {/* Disconnect */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDisconnectSlack}
                  disabled={slackDisconnecting}
                >
                  {slackDisconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Disconnect Slack
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Google Calendar Integration Modal */}
      <Dialog open={isCalendarSelected} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white dark:bg-muted flex items-center justify-center shadow-sm border">
                <GoogleCalendarIcon className="h-6 w-6" />
              </div>
              Google Calendar
              {calendar.connected && (
                <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Connected</Badge>
              )}
              {calendar.connected && calendar.connectedEmail && (
                <Badge variant="outline" className="text-[10px] font-normal">{calendar.connectedEmail}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Automatically capture meetings and events as memories with attendees, dates, and context.
            </DialogDescription>
          </DialogHeader>

          {calendarLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !calendar.connected ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">How it works</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex gap-2"><span className="text-primary font-medium">1.</span> Connect your Google account</li>
                  <li className="flex gap-2"><span className="text-primary font-medium">2.</span> Choose which calendars to sync</li>
                  <li className="flex gap-2"><span className="text-primary font-medium">3.</span> Events are auto-triaged into memories</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Read-only access. We never create or modify events.
                </p>
              </div>
              <Button onClick={handleConnectCalendar} className="w-full">
                <GoogleCalendarIcon className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Calendar selection */}
              {calendar.calendars.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Calendars to sync</p>
                  <p className="text-xs text-muted-foreground">Leave all unchecked to sync your primary calendar only.</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {calendar.calendars.map(cal => {
                      const selected = calendar.settings.selectedCalendars.includes(cal.id)
                      return (
                        <button
                          key={cal.id}
                          onClick={() => handleToggleCalendar(cal.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-primary border-primary' : 'border-border'}`}>
                            {selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm truncate">{cal.summary}</span>
                          {cal.primary && <Badge variant="outline" className="text-[9px] ml-auto shrink-0">Primary</Badge>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Sync */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Sync</p>
                  <Button size="sm" variant="outline" onClick={handleSyncCalendar} disabled={calendarSyncing}>
                    {calendarSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                    {calendarSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fetches events from the last {calendar.settings.syncDays} days. Future runs fetch only new events.
                </p>
                {calendar.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(calendar.lastSyncedAt).toLocaleString()}
                  </p>
                )}
                {calendar.syncError && (
                  <div className="flex items-start gap-1.5 text-xs text-orange-600">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {calendar.syncError}
                  </div>
                )}
              </div>

              {/* Disconnect */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDisconnectCalendar}
                  disabled={calendarDisconnecting}
                >
                  {calendarDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                  Disconnect Google Calendar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notion Integration Modal */}
      <Dialog open={isNotionSelected} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white dark:bg-muted flex items-center justify-center shadow-sm border">
                <NotionIcon className="h-6 w-6" />
              </div>
              Notion
            </DialogTitle>
            <DialogDescription>Sync pages, databases, and wikis from your Notion workspace into Reattend.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {notionConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Connected
                </div>
                <p className="text-sm text-muted-foreground">Your Notion pages are being synced automatically every hour. New and updated pages will appear as memories.</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={notionSyncing}
                  onClick={async () => {
                    setNotionSyncing(true)
                    try {
                      await fetch('/api/integrations/notion/sync', { method: 'POST' })
                      await fetchNotionStatus()
                    } catch {} finally { setNotionSyncing(false) }
                  }}
                >
                  {notionSyncing ? 'Syncing...' : 'Sync now'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Connect your Notion workspace to import pages as memories. You&apos;ll choose which pages to share during the Notion authorization flow.</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- Syncs page titles and content automatically</li>
                  <li>- Re-syncs when pages are edited</li>
                  <li>- AI extracts entities, decisions, and action items</li>
                  <li>- Auto-sync every 60 minutes</li>
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIntegration(null)}>Close</Button>
            {notionConnected ? (
              <Button variant="destructive" size="sm" onClick={async () => {
                await fetch('/api/integrations/notion', { method: 'DELETE' })
                setNotionConnected(false)
                setSelectedIntegration(null)
              }}>Disconnect</Button>
            ) : (
              <Button onClick={() => { window.location.href = '/api/integrations/notion/connect' }}>Connect Notion</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generic Integration Detail Modal (non-Gmail, non-Teams, non-Slack, non-Calendar, non-Notion) */}
      <Dialog open={!!selectedIntegration && !isGmailSelected && !isTeamsSelected && !isSlackSelected && !isCalendarSelected && !isNotionSelected} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                {selectedIntegration && integrationIcons[selectedIntegration.key]
                  ? React.createElement(integrationIcons[selectedIntegration.key], { className: 'h-6 w-6' })
                  : <span className="text-lg font-bold">{selectedIntegration?.name[0]}</span>}
              </div>
              {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>{selectedIntegration?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedIntegration && importReadyKeys.has(selectedIntegration.key) ? (
              <div>
                <Badge className="text-xs mb-2 bg-amber-500/10 text-amber-600 border-amber-500/20">Import Ready</Badge>
                <p className="text-sm text-muted-foreground">
                  Import your {selectedIntegration.name} data into Reattend:
                </p>
                <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                  <li>Export your notes/transcripts from {selectedIntegration.name} as text or markdown files</li>
                  <li>Go to Memories → click Import</li>
                  <li>Drag and drop your files (up to 50 at once)</li>
                  <li>AI automatically extracts entities, decisions, and key information</li>
                </ol>
              </div>
            ) : (
              <div>
                <Badge variant="secondary" className="text-xs mb-2">Coming Soon</Badge>
                <p className="text-sm text-muted-foreground">
                  This integration is currently in development. When available, it will:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>- Automatically ingest relevant data into your memory</li>
                  <li>- Extract entities, decisions, and key information</li>
                  <li>- Link with existing memories in your graph</li>
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIntegration(null)}>Close</Button>
            {selectedIntegration && importReadyKeys.has(selectedIntegration.key) ? (
              <Button onClick={() => { setSelectedIntegration(null); window.location.href = '/app/memories' }}>Go to Import</Button>
            ) : (
              <Button disabled>Connect (Coming Soon)</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integration Docs Modal */}
      <Dialog open={showIntegrationDocs} onOpenChange={setShowIntegrationDocs}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-sky-500" />
              Integration Documentation
            </DialogTitle>
            <DialogDescription>
              How to connect your tools and what to expect after integration.
            </DialogDescription>
          </DialogHeader>

          {/* Tab bar */}
          <div className="flex gap-1 border-b shrink-0 pb-0">
            {([
              { key: 'gmail' as const, label: 'Gmail', icon: GmailIcon },
              { key: 'calendar' as const, label: 'Google Calendar', icon: GoogleCalendarIcon },
              { key: 'slack' as const, label: 'Slack', icon: SlackIcon },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setIntegrationDocsTab(key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  integrationDocsTab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="py-5 space-y-6 text-sm">

              {/* ───────── GMAIL ───────── */}
              {integrationDocsTab === 'gmail' && (<>
                <section>
                  <h3 className="font-bold text-base mb-1">Gmail Integration</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Reattend connects to Gmail via read-only OAuth. It scans emails from domains you specify and imports important threads as memories — automatically summarised, tagged, and linked to related content. We never read emails from domains you haven&apos;t whitelisted, and we never send email on your behalf.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-3">How to Connect</h4>
                  <div className="space-y-3">
                    {[
                      { step: 'Click Gmail on this page', desc: 'From the integrations grid, click the Gmail card to open the connection panel.' },
                      { step: 'Sign in with Google', desc: 'You\'ll be redirected to Google\'s OAuth consent screen. Grant read-only Gmail access. Reattend only requests the minimum scopes needed.' },
                      { step: 'Add domain whitelist', desc: 'After connecting, add the email domains you want to capture — e.g. your company domain (acme.com), client domains, or key contacts. Only emails from these domains will be imported.' },
                      { step: 'Run first sync', desc: 'Click "Sync Now" to pull in the last 30 days of matching emails. Subsequent syncs happen automatically every 30 minutes.' },
                      { step: 'Review in Inbox', desc: 'Imported emails land in your Inbox first. Review, approve, or reject each item. Approved emails become memories.' },
                    ].map(({ step, desc }, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-5 w-5 rounded-full bg-red-500/10 text-red-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                        <div>
                          <p className="text-xs font-semibold">{step}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-3">What Gets Captured</h4>
                  <div className="space-y-2">
                    {[
                      { item: 'Email threads', desc: 'Full thread is summarised. Subject, participants, date, and key content are extracted.' },
                      { item: 'Commitments & follow-ups', desc: 'AI detects phrases like "I\'ll send it by Friday" or "Let\'s schedule a call" and flags them as action items.' },
                      { item: 'Decisions', desc: 'Sentences expressing agreement or resolution are tagged as Decision-type memories.' },
                      { item: 'Attachments (coming soon)', desc: 'PDF and document attachments will be OCR\'d and added as context to the email memory.' },
                    ].map(({ item, desc }) => (
                      <div key={item} className="flex gap-2 items-start">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-medium">{item}</span>
                          <span className="text-xs text-muted-foreground"> — {desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">What to Expect</h4>
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
                    <p>After your first sync, matching emails from the last 30 days appear in your Inbox. If your domain whitelist is broad (e.g. gmail.com), you may get many items — tighten to specific company domains for best results.</p>
                    <p>Syncs run every 30 minutes automatically. New emails matching your whitelist will appear within the hour.</p>
                    <p>The Gmail integration stores an encrypted refresh token in your account. You can disconnect at any time from the Gmail card — this deletes the token and stops all future syncs.</p>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">Privacy</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Reattend requests read-only access (<code className="bg-muted px-1 rounded">gmail.readonly</code> scope). We never store raw email bodies permanently — only the AI-generated summary and extracted entities. Your Google OAuth token is encrypted at rest. You can revoke access at any time from your Google Account security settings or from the Integrations page.
                  </p>
                </section>
              </>)}

              {/* ───────── GOOGLE CALENDAR ───────── */}
              {integrationDocsTab === 'calendar' && (<>
                <section>
                  <h3 className="font-bold text-base mb-1">Google Calendar Integration</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Reattend pulls your calendar events into your memory — making every meeting searchable, summarised, and linkable to decisions and notes from the same timeframe. Connect once and your calendar syncs automatically. Read-only access only.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-3">How to Connect</h4>
                  <div className="space-y-3">
                    {[
                      { step: 'Click Google Calendar on this page', desc: 'From the integrations grid, click the Google Calendar card.' },
                      { step: 'Sign in with Google', desc: 'You\'ll see Google\'s OAuth consent screen. Grant read-only Calendar access. Only calendar data is requested — no other Google services.' },
                      { step: 'Select calendars to sync', desc: 'After connecting, you\'ll see all calendars on your account. Toggle which ones to include. Your primary calendar is selected by default.' },
                      { step: 'Run first sync', desc: 'Click "Sync Now" to pull in the last 30 days of events. Events become memories automatically — no Inbox review needed for calendar events.' },
                      { step: 'Automatic sync', desc: 'Reattend syncs your calendar every hour. New meetings appear as memories within 60 minutes of being created in Google Calendar.' },
                    ].map(({ step, desc }, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                        <div>
                          <p className="text-xs font-semibold">{step}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-3">What Gets Captured</h4>
                  <div className="space-y-2">
                    {[
                      { item: 'Event title & description', desc: 'The meeting title and any notes in the event description are saved verbatim.' },
                      { item: 'Attendees', desc: 'All invited participants (name and email) are extracted as entities and linked to the memory.' },
                      { item: 'Date, time & duration', desc: 'Exact start time and duration are recorded so you can search "what did I have on Tuesday afternoon".' },
                      { item: 'Recurring events', desc: 'Each occurrence of a recurring event creates its own memory, so you can track what changed week to week.' },
                      { item: 'Video call links', desc: 'Google Meet links are stored as part of the memory metadata.' },
                    ].map(({ item, desc }) => (
                      <div key={item} className="flex gap-2 items-start">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-medium">{item}</span>
                          <span className="text-xs text-muted-foreground"> — {desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">What to Expect</h4>
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
                    <p>Calendar events become memories directly — they don&apos;t require Inbox approval. After your first sync, you&apos;ll see up to 30 days of past events in Memories, tagged as type &quot;Meeting&quot;.</p>
                    <p>You can ask Reattend things like &quot;What meetings did I have with Sarah this month?&quot; or &quot;What was the agenda for the design review?&quot; — as long as the event had a description.</p>
                    <p>Cancelled events are not imported. Declined events are also skipped by default.</p>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">Privacy</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Reattend uses the <code className="bg-muted px-1 rounded">calendar.readonly</code> OAuth scope — strictly read-only. We never create, edit, or delete calendar events. Your token is encrypted at rest and can be revoked from the Integrations page at any time.
                  </p>
                </section>
              </>)}

              {/* ───────── SLACK ───────── */}
              {integrationDocsTab === 'slack' && (<>
                <section>
                  <h3 className="font-bold text-base mb-1">Slack Integration</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Reattend adds a bot to your Slack workspace. You choose which channels to monitor. Messages containing decisions, links, action items, or announcements are captured and sent to your Inbox. You also get slash commands to manually save any message or search your memory from inside Slack.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-3">How to Connect</h4>
                  <div className="space-y-3">
                    {[
                      { step: 'Click Slack on this page', desc: 'From the integrations grid, click the Slack card to start the OAuth flow.' },
                      { step: 'Authorise the Reattend Slack app', desc: 'You\'ll be taken to Slack\'s OAuth page. You need to be a Slack workspace admin (or have the "Manage apps" permission) to install the app. Click Allow.' },
                      { step: 'Select channels to monitor', desc: 'Back in Reattend, you\'ll see all public channels in your workspace. Select the ones you want Reattend to listen to. Only messages in selected channels will be captured — DMs are never read.' },
                      { step: 'Save your channel selection', desc: 'Click Save. Reattend will start monitoring those channels and sync recent messages immediately.' },
                      { step: 'Review in Inbox', desc: 'Captured Slack messages land in your Inbox. Approve the ones worth keeping as memories.' },
                    ].map(({ step, desc }, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-5 w-5 rounded-full bg-[#E01E5A]/10 text-[#E01E5A] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                        <div>
                          <p className="text-xs font-semibold">{step}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-3">What Gets Captured</h4>
                  <div className="space-y-2">
                    {[
                      { item: 'Decisions & announcements', desc: 'Messages with phrases like "we decided", "going with", "shipping" or "approved" are flagged as Decision-type memories.' },
                      { item: 'Shared links', desc: 'URLs posted in monitored channels are captured with context — what the link is and who shared it.' },
                      { item: 'Action items', desc: 'Messages containing task assignments ("@alice can you", "please review") are extracted as action items.' },
                      { item: 'Thread context', desc: 'When a reply thread has high engagement, the whole thread is summarised together rather than individually.' },
                      { item: 'Channel context', desc: 'The channel name and author are stored with every memory so you always know where it came from.' },
                    ].map(({ item, desc }) => (
                      <div key={item} className="flex gap-2 items-start">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-medium">{item}</span>
                          <span className="text-xs text-muted-foreground"> — {desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-3">Slash Commands</h4>
                  <div className="space-y-2.5">
                    {[
                      { cmd: '/reattend save [text]', desc: 'Save any text as a memory directly from Slack. Great for quick captures mid-conversation.' },
                      { cmd: '/reattend search [query]', desc: 'Search your Reattend memory from inside Slack. Results appear as an ephemeral message only visible to you.' },
                      { cmd: 'Message shortcut → Save to Reattend', desc: 'Right-click any message in Slack → More message actions → Save to Reattend. Saves that specific message as a memory.' },
                    ].map(({ cmd, desc }) => (
                      <div key={cmd}>
                        <code className="text-[11px] bg-muted px-2 py-0.5 rounded border font-mono">{cmd}</code>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">What to Expect</h4>
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
                    <p>After installing, Reattend syncs the last 7 days of messages from your selected channels. Busy channels with many messages will surface only the most significant ones — routine chatter is filtered out by AI.</p>
                    <p>Ongoing sync runs every 30 minutes. High-volume channels are fine — the AI is selective about what it saves.</p>
                    <p>Only public channels can be monitored. Private channels and direct messages are never accessible to Reattend.</p>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">Privacy</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The Reattend Slack app only reads messages from channels you explicitly select. It has no access to DMs, private channels, or any workspace it hasn&apos;t been invited to. You can disconnect Slack at any time from this page — this immediately removes the app from your Slack workspace and stops all syncing.
                  </p>
                </section>
              </>)}

            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Webhook Test Modal */}
      <Dialog open={showWebhookTest} onOpenChange={setShowWebhookTest}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Test Webhook</DialogTitle>
            <DialogDescription>
              Paste a JSON payload to test the ingest API endpoint.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={webhookPayload}
            onChange={(e) => setWebhookPayload(e.target.value)}
            className="font-mono text-xs min-h-[200px]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowWebhookTest(false)}>Cancel</Button>
            <Button onClick={handleTestWebhook}>Send Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
