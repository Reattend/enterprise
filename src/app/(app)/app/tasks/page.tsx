'use client'

// Tasks index — the Copilot-style task gallery. Each card launches a
// specialized workflow that wraps /api/ask with a structured prompt + form
// input. Meant to feel like the "New from template" experience in Word/PPT
// but scoped across ALL your org memory, not just one document.

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Mail,
  Calendar,
  FileText,
  LayoutDashboard,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TASK_MODES } from '@/lib/ai/task-modes'
import { cn } from '@/lib/utils'

const ICONS: Record<string, any> = { Mail, Calendar, FileText, LayoutDashboard }

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  write: { label: 'Write', color: 'text-blue-500' },
  prep: { label: 'Prepare', color: 'text-violet-500' },
  plan: { label: 'Plan', color: 'text-amber-500' },
}

export default function TasksPage() {
  const byCategory = TASK_MODES.reduce((acc, m) => {
    ;(acc[m.category] = acc[m.category] || []).push(m)
    return acc
  }, {} as Record<string, typeof TASK_MODES>)

  const order: Array<keyof typeof byCategory> = ['write', 'prep', 'plan']

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Copilot-style workflows that pull from everything you've saved. Write an email, prep for a meeting,
          draft a brief — grounded in your actual org memory, not a blank page.
        </p>
      </div>

      {order.map((cat) => {
        const list = byCategory[cat] || []
        if (list.length === 0) return null
        const meta = CATEGORY_META[cat]
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h2 className={cn('text-sm font-semibold uppercase tracking-wider', meta.color)}>{meta.label}</h2>
              <span className="text-[10px] text-muted-foreground">{list.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {list.map((m) => {
                const Icon = ICONS[m.iconName] || Sparkles
                return (
                  <Link
                    key={m.id}
                    href={`/app/tasks/${m.id}`}
                    className="group rounded-2xl border bg-card overflow-hidden hover:shadow-sm hover:border-primary/40 transition-all"
                  >
                    <div className={cn('h-1 bg-gradient-to-r', m.color)} />
                    <div className="p-4 flex items-start gap-3">
                      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-white bg-gradient-to-br', m.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{m.label}</h3>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{m.tagline}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="rounded-2xl border-dashed border bg-card/40 p-5 text-center">
        <Badge variant="outline" className="text-[10px] mb-2">Coming soon</Badge>
        <p className="text-xs text-muted-foreground">
          Browser extension — overlay these tasks inside Word, Outlook, Teams, PowerPoint.
          Ships alongside the production OAuth callbacks.
        </p>
      </div>
    </motion.div>
  )
}
