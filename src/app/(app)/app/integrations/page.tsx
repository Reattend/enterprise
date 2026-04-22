'use client'

// Integrations — placeholder page.
//
// Real OAuth / sync pipelines land when Nango self-host is deployed on the
// droplet. Until then, this page lists the connectors on the roadmap so
// the OAuth callback URLs have somewhere sensible to return to and the
// admin surface isn't a dead link.

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Plug, Mail, MessageSquare, Calendar, FileText, Slack, Video,
  ShieldCheck, Clock, ArrowRight, Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/stores/app-store'

interface Connector {
  key: string
  name: string
  description: string
  icon: typeof Mail
  status: 'roadmap' | 'coming-soon' | 'beta'
}

const CONNECTORS: Connector[] = [
  { key: 'gmail',    name: 'Gmail',            description: 'Sync labeled threads and domain-whitelisted emails.',         icon: Mail,          status: 'coming-soon' },
  { key: 'slack',    name: 'Slack',            description: 'Capture decisions, announcements, and pinned threads.',        icon: Slack,         status: 'coming-soon' },
  { key: 'calendar', name: 'Google Calendar',  description: 'Meetings with descriptions + attendees become memories.',     icon: Calendar,      status: 'coming-soon' },
  { key: 'teams',    name: 'Microsoft Teams',  description: 'Meetings, channels, and files from Teams.',                    icon: Video,         status: 'roadmap' },
  { key: 'notion',   name: 'Notion',           description: 'Whole workspace or selected databases.',                       icon: FileText,      status: 'roadmap' },
  { key: 'sharepoint', name: 'SharePoint',     description: 'Document libraries + lists. OCR for scanned files.',           icon: FileText,      status: 'roadmap' },
  { key: 'confluence', name: 'Confluence',     description: 'Spaces + pages with version history.',                         icon: FileText,      status: 'roadmap' },
  { key: 'sap',      name: 'SAP',              description: 'Records + approvals from ERP.',                                icon: FileText,      status: 'roadmap' },
]

const STATUS_META: Record<Connector['status'], { label: string; tone: string }> = {
  beta:           { label: 'Beta',         tone: 'bg-violet-500/10 text-violet-600 border-violet-500/30' },
  'coming-soon':  { label: 'Coming soon',  tone: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/30' },
  roadmap:        { label: 'On roadmap',   tone: 'bg-muted text-muted-foreground border-border' },
}

export default function IntegrationsPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const activeOrg = useAppStore((s) => s.enterpriseOrgs).find((o) => o.orgId === activeOrgId)
  const isAdmin = activeOrg && (activeOrg.role === 'super_admin' || activeOrg.role === 'admin')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <Plug className="h-3.5 w-3.5" /> Integrations
        </div>
        <h1 className="font-display text-3xl tracking-tight mb-1">Pull memory in automatically</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Reattend will auto-capture from the tools your org lives in. Emails, meeting notes,
          Slack decisions, Confluence pages — all flow into the Inbox for review, then become
          memory your whole org can search. Configure once per org; per-user scopes respected.
        </p>
      </div>

      <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-4 flex gap-3">
        <Clock className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-yellow-900 dark:text-yellow-400">Ingestion pipeline is being built.</p>
          <p className="text-yellow-800/80 dark:text-yellow-500/80 mt-0.5">
            We run Nango on your infra (or ours) to handle OAuth + incremental sync. It&apos;s the single
            biggest capability gap right now — we&apos;ll flip the first three connectors (Gmail / Slack /
            Calendar) when the self-hosted Nango lands. Until then, use Capture, Brain Dump, or the
            voice recorder for manual intake.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CONNECTORS.map((c) => {
          const Icon = c.icon
          const meta = STATUS_META[c.status]
          return (
            <div key={c.key} className="rounded-xl border bg-card p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded bg-muted/70 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                  <Badge variant="outline" className={`text-[10px] ${meta.tone}`}>{meta.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-1">Security model</h3>
          <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
            <li>• OAuth tokens scoped to the minimum needed — read-only, optionally per-label / per-channel.</li>
            <li>• Every sync event is logged to the audit trail with actor + timestamp.</li>
            <li>• Record visibility respects department RBAC — a Gmail thread from finance only shows to the finance dept.</li>
            <li>• On-premise deployment available on the Enterprise plan — no data leaves your network.</li>
          </ul>
        </div>
      </div>

      {isAdmin && activeOrgId && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex items-center gap-3">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium">You&apos;re an admin — connector settings will live in the cockpit.</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When Nango lands, admin-level integration config shows up at
              {' '}
              <code className="text-[11px] bg-background px-1 py-0.5 rounded">/app/admin/{activeOrg?.orgId}/integrations</code>.
            </p>
          </div>
          <Link href={`/app/admin/${activeOrgId}`} className="text-xs text-primary hover:underline whitespace-nowrap">
            Cockpit <ArrowRight className="h-3 w-3 inline" />
          </Link>
        </div>
      )}
    </motion.div>
  )
}
