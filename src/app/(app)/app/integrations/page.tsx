'use client'

// Integrations — live connector cockpit.
//
// First-class providers (Gmail, Drive, Slack, Notion, Confluence) are wired
// through Nango: OAuth + incremental sync + scope filters. Everything else is
// listed as roadmap so prospects can see what's coming.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plug, FileText, Video, ShieldCheck, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NangoConnectPanel } from '@/components/enterprise/nango-connect-panel'
import { TriageReviewSheet } from '@/components/enterprise/triage-review-sheet'
import { useAppStore } from '@/stores/app-store'

interface Roadmap {
  key: string
  name: string
  description: string
  icon: typeof FileText
}

const ROADMAP: Roadmap[] = [
  { key: 'teams',      name: 'Microsoft Teams',  description: 'Meetings, channels, and files from Teams.',           icon: Video },
  { key: 'sharepoint', name: 'SharePoint',       description: 'Document libraries + lists. OCR for scanned files.',  icon: FileText },
  { key: 'sap',        name: 'SAP',              description: 'Records + approvals from ERP.',                       icon: FileText },
  { key: 'jira',       name: 'Jira / Linear / GitHub', description: 'Tickets, PRs, and decisions from your dev stack.', icon: FileText },
]

export default function IntegrationsPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const activeOrg = useAppStore((s) => s.enterpriseOrgs).find((o) => o.orgId === activeOrgId)
  const isAdmin = activeOrg && (activeOrg.role === 'super_admin' || activeOrg.role === 'admin')
  const [triageOpen, setTriageOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <Plug className="h-3.5 w-3.5" /> Integrations
          </div>
          <h1 className="font-display text-3xl tracking-tight mb-1">Pull memory in automatically</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Reattend auto-captures from the tools your org lives in. OAuth once per user; the AI
            triages every record before it becomes memory; department RBAC always respected.
          </p>
        </div>
        {isAdmin && activeOrgId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTriageOpen(true)}
            className="shrink-0 gap-1.5"
          >
            <Brain className="h-3.5 w-3.5 text-violet-600" />
            <span className="text-xs">Triage</span>
          </Button>
        )}
      </div>

      <NangoConnectPanel />

      {isAdmin && activeOrgId && (
        <TriageReviewSheet orgId={activeOrgId} open={triageOpen} onOpenChange={setTriageOpen} />
      )}

      <div>
        <h2 className="text-sm font-semibold mb-2">On the roadmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ROADMAP.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.key} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded bg-muted/70 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">On roadmap</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-1">Security model</h3>
          <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
            <li>• OAuth tokens scoped to the minimum needed — read-only, optionally per-label / per-channel.</li>
            <li>• Every sync event is logged to the audit trail with actor + timestamp.</li>
            <li>• Record visibility respects department RBAC — a Gmail thread from finance only shows to the finance dept.</li>
            <li>• On-premise deployment available on the Enterprise plan — the entire ingestion pipeline runs inside your network; no data leaves your tenant.</li>
          </ul>
        </div>
      </div>
    </motion.div>
  )
}
