'use client'

// Integrations page — Nango-powered only. The legacy 100-card grid from
// Personal Reattend is retired; Sprint 10.5 self-hosts Nango so every OAuth
// callback is *.reattend.com and there's no reason to keep the "Coming Soon"
// static cards around.

import { motion } from 'framer-motion'
import Link from 'next/link'
import { BookOpen, Inbox, Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NangoConnectPanel } from '@/components/enterprise/nango-connect-panel'

export default function IntegrationsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" /> Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Connect Gmail, Drive, Slack, Notion, and Confluence. Records land
            in your org memory, get triaged by Claude, and become searchable.
            OAuth callbacks route through <code className="text-[11px] px-1 py-0.5 bg-muted rounded">nango.reattend.com</code> — fully self-hosted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/app/inbox"><Inbox className="h-4 w-4 mr-1" /> Inbox</Link>
          </Button>
        </div>
      </div>

      <NangoConnectPanel />

      <div className="rounded-2xl border bg-muted/20 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">How scope + backfill work</p>
            <ul className="list-disc list-inside space-y-1">
              <li>On first connect we backfill up to 300 records per model so data is there immediately — no waiting for cron.</li>
              <li>Scheduled syncs run via Nango webhooks delivered to <code>/api/nango/webhook</code>.</li>
              <li>Click <strong>Scope</strong> on any connected provider to filter what gets ingested — include/exclude keywords, domain whitelist. Filters apply at ingest, so rejected records never enter your workspace.</li>
              <li>Every sync is audit-logged. Every record is RBAC-filtered on read.</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
