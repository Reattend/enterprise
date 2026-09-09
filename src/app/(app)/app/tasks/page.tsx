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

        <section className="inner-overview task-overview" aria-label="How memory-grounded tasks work">
          <div className="inner-overview-copy">
            <span className="inner-kicker"><WandSparkles size={12} /> Memory workflow engine</span>
            <h2>Your context moves with the work.</h2>
            <p>Each workflow retrieves the most relevant memories, drafts against them, and keeps every claim traceable.</p>
            <div className="inner-metrics">
              <span><b>{TASK_MODES.length}</b><small>ready workflows</small></span>
              <span><b>{CATEGORY_ORDER.length}</b><small>workflow families</small></span>
              <span><b>{totalFields}</b><small>guided inputs</small></span>
            </div>
          </div>
          <div className="workflow-map" aria-label="Retrieve, compose, verify, cite">
            <div className="workflow-node"><Database size={15} /><span>Retrieve<small>your memory</small></span></div>
            <i />
            <div className="workflow-node"><Sparkles size={15} /><span>Compose<small>with context</small></span></div>
            <i />
            <div className="workflow-node"><ShieldCheck size={15} /><span>Verify<small>each claim</small></span></div>
            <i />
            <div className="workflow-node"><Quote size={15} /><span>Cite<small>the source</small></span></div>
          </div>
        </section>

        {CATEGORY_ORDER.map((cat) => {
          const list = byCategory[cat] || []
          if (list.length === 0) return null
          return (
            <section key={cat}>
              <div className="tsk-sec-head">
                {CATEGORY_LABEL[cat]}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>
                  {list.length} workflow{list.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="tsk-grid">
                {list.map((m) => {
                  const Icon = ICONS[m.iconName] || Sparkles
                  return (
                    <Link key={m.id} href={`/app/tasks/${m.id}`} className="tsk-card">
                      <div className={cn('tsk-card-ico', m.category)}>
                        <Icon size={22} strokeWidth={1.8} />
                      </div>
                      <div className="tsk-card-body">
                        <div className="tsk-card-title-row">
                          <span className="tsk-card-title">{m.label}</span>
                        </div>
                        <div className="tsk-card-tagline">{m.tagline}</div>
                        <div className="tsk-card-meta">
                          <span className="pill">{m.fields.length} fields</span>
                          {m.retrievalHint?.types && (
                            <span className="pill">→ {m.retrievalHint.types.slice(0, 3).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={20} strokeWidth={1.8} className="tsk-card-arrow" />
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}

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
