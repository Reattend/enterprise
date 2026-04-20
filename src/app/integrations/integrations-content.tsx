'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, ArrowRight, Send, CheckCircle2, Plug, MessageSquare, Mail, FileText, Code2, Headphones, HardDrive, Palette, BarChart3, Zap } from 'lucide-react'

// ─── All 100 integrations (from seed data) ──────────────────
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
  // Email & Calendar (10)
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
  // Docs & Knowledge (15)
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
  // Project & Dev (20)
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
  // CRM & Support (10)
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
  // Productivity (7)
  { key: 'airtable', name: 'Airtable', category: 'Productivity', description: 'Sync bases, records, and workflow updates.' },
  { key: 'zapier', name: 'Zapier', category: 'Productivity', description: 'Connect any Zapier workflow to your memory.' },
  { key: 'make', name: 'Make (Integromat)', category: 'Productivity', description: 'Automate memory ingestion from Make scenarios.' },
  { key: 'ifttt', name: 'IFTTT', category: 'Productivity', description: 'Create automated memory triggers with IFTTT.' },
  { key: 'todoist', name: 'Todoist', category: 'Productivity', description: 'Sync tasks and completed items as memories.' },
  { key: 'things', name: 'Things 3', category: 'Productivity', description: 'Import tasks and projects from Things.' },
  { key: 'raindrop', name: 'Raindrop.io', category: 'Productivity', description: 'Capture bookmarks and web clippings.' },
]

const categories = [
  { label: 'All', value: 'all', icon: Plug, count: integrations.length },
  { label: 'Communication', value: 'Communication', icon: MessageSquare, count: 15 },
  { label: 'Email & Calendar', value: 'Email & Calendar', icon: Mail, count: 10 },
  { label: 'Docs & Knowledge', value: 'Docs & Knowledge', icon: FileText, count: 15 },
  { label: 'Project & Dev', value: 'Project & Dev', icon: Code2, count: 20 },
  { label: 'CRM & Support', value: 'CRM & Support', icon: Headphones, count: 10 },
  { label: 'Storage', value: 'Storage', icon: HardDrive, count: 8 },
  { label: 'Design', value: 'Design', icon: Palette, count: 7 },
  { label: 'Analytics & Data', value: 'Analytics & Data', icon: BarChart3, count: 8 },
  { label: 'Productivity', value: 'Productivity', icon: Zap, count: 7 },
]

// Generate a deterministic color from the integration key
function getColor(key: string) {
  const colors = [
    { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20' },
    { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
    { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
    { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
    { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/20' },
    { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
    { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20' },
    { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/20' },
  ]
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string) {
  return name.split(/[\s.]+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function IntegrationsContent() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [requestApp, setRequestApp] = useState('')
  const [requestEmail, setRequestEmail] = useState('')
  const [requestSubmitted, setRequestSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    let result = integrations
    if (activeCategory !== 'all') {
      result = result.filter(i => i.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      )
    }
    return result
  }, [search, activeCategory])

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestApp.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/integration-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName: requestApp.trim(), email: requestEmail.trim() || undefined }),
      })
      if (res.ok) {
        setRequestSubmitted(true)
        setRequestApp('')
        setRequestEmail('')
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative py-16 md:py-24 px-5 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-60 -right-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5]"
          >
            <Plug className="w-3.5 h-3.5" />
            100+ Integrations
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-[32px] md:text-[50px] font-bold tracking-[-0.03em] leading-[1.1] mt-5"
          >
            Connect the tools <span className="text-[#4F46E5]">you already use</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-[16px] md:text-[17px] mt-4 max-w-[600px] mx-auto leading-relaxed"
          >
            Reattend captures knowledge from every corner of your workflow. No more context lost between tools.
          </motion.p>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 max-w-[520px] mx-auto relative"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-5 py-3.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-[15px] text-[#1a1a2e] placeholder-gray-400 outline-none focus:border-[#4F46E5]/30 focus:shadow-[0_4px_24px_rgba(79,70,229,0.08)] transition-all"
            />
          </motion.div>
        </div>

        {/* Category pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {categories.map(cat => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.value
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#4F46E5] text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)]'
                    : 'bg-white/60 backdrop-blur-sm border border-white/70 text-gray-600 hover:bg-white/80 hover:border-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                <span className={`text-[11px] ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                  {cat.count}
                </span>
              </button>
            )
          })}
        </motion.div>

        {/* Integration cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item, i) => {
            const color = getColor(item.key)
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.35 }}
                className="group bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_rgba(79,70,229,0.08)] hover:border-[#4F46E5]/15 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  {/* Icon placeholder */}
                  <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-[13px] font-bold ${color.text}`}>
                      {getInitials(item.name)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-[#1a1a2e] truncate">{item.name}</h3>
                    </div>
                    <span className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                      {item.category}
                    </span>
                  </div>
                </div>
                <p className="text-[13px] text-gray-500 mt-3 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#4F46E5]/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Coming Soon
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-[15px]">No integrations found for &quot;{search}&quot;</p>
            <p className="text-gray-400 text-[13px] mt-1">Try a different search or request it below</p>
          </div>
        )}

        {/* Request an integration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 max-w-[640px] mx-auto"
        >
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] p-8 md:p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-5">
              <Send className="h-7 w-7 text-[#4F46E5]" />
            </div>
            <h2 className="text-[22px] font-bold text-[#1a1a2e] mb-2">
              Don&apos;t see your tool?
            </h2>
            <p className="text-gray-500 text-[14px] leading-relaxed mb-6 max-w-md mx-auto">
              Tell us which app you use daily and we&apos;ll prioritize it. We build integrations based on what teams actually need.
            </p>

            {requestSubmitted ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Thanks! We&apos;ll prioritize this integration.
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-3 max-w-sm mx-auto">
                <input
                  type="text"
                  placeholder="App name (e.g. Basecamp, ClickUp...)"
                  value={requestApp}
                  onChange={e => setRequestApp(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200/60 text-[14px] text-[#1a1a2e] placeholder-gray-400 outline-none focus:border-[#4F46E5]/30 transition-colors"
                />
                <input
                  type="email"
                  placeholder="Your email (optional, for updates)"
                  value={requestEmail}
                  onChange={e => setRequestEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200/60 text-[14px] text-[#1a1a2e] placeholder-gray-400 outline-none focus:border-[#4F46E5]/30 transition-colors"
                />
                <button
                  type="submit"
                  disabled={submitting || !requestApp.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98] disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Request Integration'}
                </button>
              </form>
            )}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <h2 className="text-[24px] md:text-[32px] font-bold tracking-[-0.02em]">
            Ready to unify your team&apos;s knowledge?
          </h2>
          <p className="text-gray-500 text-[15px] mt-3 max-w-md mx-auto">
            Start capturing what matters from every tool your team uses.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/40 text-[#4F46E5] font-bold text-[14px] transition-colors"
            >
              See all features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
