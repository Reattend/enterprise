'use client'

import { useAppStore } from '@/stores/app-store'

// Tasks gallery - every card is a memory-grounded workflow. The point of
// this page over plain Claude: each draft is conditioned on the org's
// actual memory (decisions, meetings, threads, briefs), with citations
// back to source records. No hallucinated facts.
//
// Cards are pulled from src/lib/ai/task-modes.ts. Click → /app/tasks/<id>
// renders the compose panel (TaskModePanel).

import Link from 'next/link'
import {
  Sparkles, Mail, Calendar, FileText, LayoutDashboard,
  ChevronRight, ShieldCheck, ArrowRight, Database, Quote, WandSparkles,
} from 'lucide-react'
import { TASK_MODES } from '@/lib/ai/task-modes'
import { cn } from '@/lib/utils'

const ICONS: Record<string, any> = { Mail, Calendar, FileText, LayoutDashboard }

const CATEGORY_ORDER: Array<'write' | 'prep' | 'plan'> = ['write', 'prep', 'plan']

const CATEGORY_LABEL: Record<string, string> = {
  write: 'Write',
  prep: 'Prepare',
  plan: 'Plan',
}

export default function TasksPage() {
  const activeOrgId = useAppStore((st) => st.activeEnterpriseOrgId)
  const totalFields = TASK_MODES.reduce((sum, mode) => sum + mode.fields.length, 0)
  const byCategory = TASK_MODES.reduce((acc, m) => {
    ;(acc[m.category] = acc[m.category] || []).push(m)
    return acc
  }, {} as Record<string, typeof TASK_MODES>)

  return (
    <div className="tsk-page-wrap">
      <div className="tsk-page">
        <span className="tsk-crumb">
          <Sparkles size={9} strokeWidth={2} /> Tasks
        </span>
        <div className="tsk-head">
          <h1>Write from <span className="accent">memory</span>, not a blank page.</h1>
          <p className="sub">
            {activeOrgId
              ? <>Pick a workflow. Fill in a couple of fields. The AI drafts it from your org&apos;s actual decisions, meetings, and threads - citing each fact inline. Stays inside your tenant.</>
              : <>Pick a workflow. Fill in a couple of fields. The AI drafts it from your own memory - citing each fact inline.</>}
          </p>
        </div>

        {/* Compact process strip - the old block panel spent a third of the
            viewport restating four words. */}
        <div className="tsk-flow" aria-label="Retrieve, compose, verify, cite">
          <span className="tsk-flow-kicker"><WandSparkles size={12} /> How it works</span>
          <div className="tsk-flow-steps">
            <span><Database size={13} /> Retrieve</span>
            <i />
            <span><Sparkles size={13} /> Compose</span>
            <i />
            <span><ShieldCheck size={13} /> Verify</span>
            <i />
            <span><Quote size={13} /> Cite</span>
          </div>
          <span className="tsk-flow-count">{TASK_MODES.length} workflows · {totalFields} guided inputs</span>
        </div>

        {/* One dense grid, not one sparse grid per family. The family is a
            tag on the card, so a family of one no longer leaves a hole. */}
        <div className="tsk-grid">
          {CATEGORY_ORDER.flatMap((cat) => byCategory[cat] || []).map((m) => {
            const Icon = ICONS[m.iconName] || Sparkles
            return (
              <Link key={m.id} href={`/app/tasks/${m.id}`} className="tsk-card">
                <div className="tsk-card-top">
                  <div className={cn('tsk-card-ico', m.category)}>
                    <Icon size={17} strokeWidth={1.9} />
                  </div>
                  <span className={cn('tsk-card-cat', m.category)}>{CATEGORY_LABEL[m.category]}</span>
                  <ChevronRight size={16} strokeWidth={2} className="tsk-card-arrow" />
                </div>
                <span className="tsk-card-title">{m.label}</span>
                <span className="tsk-card-tagline">{m.tagline}</span>
                <div className="tsk-card-meta">
                  <span className="pill">{m.fields.length} fields</span>
                  {m.retrievalHint?.types && (
                    <span className="pill">{m.retrievalHint.types.slice(0, 3).join(' · ')}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        <div className="tsk-rs-strip">
          <ShieldCheck size={16} strokeWidth={1.8} />
          <div style={{ flex: 1 }}>
            <b>Why use this over plain Claude?</b> Every draft is grounded in your memory and cites the source record. No invented numbers, no made-up commitments. Tokens stay on your tenant.
          </div>
          <Link href="/app/integrations" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            color: 'var(--brand-ink)', fontWeight: 600, fontSize: 12, textDecoration: 'none',
          }}>
            Add more sources <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}
