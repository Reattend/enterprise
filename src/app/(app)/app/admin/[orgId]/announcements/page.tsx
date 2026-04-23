'use client'

// Announcements — admin page.
//
// Create, edit, deactivate, or delete org-wide banner announcements. Every
// member sees the banner at the top of their app until they dismiss it.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Megaphone, Plus, Loader2, Check, X, AlertCircle, CheckCircle2, Info,
  Trash2, EyeOff, Eye,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Announcement {
  id: string
  title: string
  body: string
  tone: 'info' | 'warning' | 'success'
  active: boolean
  startsAt: string
  endsAt: string | null
  createdAt: string
}

const TONE_META: Record<Announcement['tone'], { label: string; icon: any; color: string }> = {
  info:    { label: 'Info',    icon: Info,          color: 'text-blue-500' },
  warning: { label: 'Warning', icon: AlertCircle,   color: 'text-yellow-500' },
  success: { label: 'Success', icon: CheckCircle2,  color: 'text-emerald-500' },
}

export default function AnnouncementsAdminPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [rows, setRows] = useState<Announcement[] | null>(null)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tone, setTone] = useState<Announcement['tone']>('info')
  const [creating, setCreating] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/enterprise/announcements?orgId=${orgId}&includeDismissed=1`)
      if (!res.ok) return
      const d = await res.json()
      setRows(d.announcements || [])
    } catch { /* silent */ }
  }
  useEffect(() => { load() }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/enterprise/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, title: title.trim(), body: body.trim(), tone }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Failed')
        return
      }
      toast.success('Announcement published')
      setTitle('')
      setBody('')
      setTone('info')
      setOpen(false)
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(row: Announcement) {
    try {
      await fetch(`/api/enterprise/announcements/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: row.active ? 'deactivate' : 'activate' }),
      })
      await load()
    } catch { /* silent */ }
  }

  async function remove(row: Announcement) {
    if (!confirm(`Delete "${row.title}"?`)) return
    try {
      await fetch(`/api/enterprise/announcements/${row.id}`, { method: 'DELETE' })
      await load()
      toast.success('Deleted')
    } catch { /* silent */ }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <Megaphone className="h-3.5 w-3.5" /> Announcements
        </div>
        <h1 className="font-display text-3xl tracking-tight">Pin a message across the org</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Announcements show at the top of every member&apos;s app until they dismiss it. Use for policy
          rollouts, product changes, maintenance windows — not for day-to-day comms (that&apos;s what
          team broadcasts and Slack are for).
        </p>
      </div>

      {!open ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New announcement
        </Button>
      ) : (
        <Card className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, scannable headline" disabled={creating} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Body (markdown ok)</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="What's changing, what to do, when — include a link if relevant." disabled={creating} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Tone</label>
            <div className="flex gap-1.5">
              {(Object.keys(TONE_META) as Announcement['tone'][]).map((t) => {
                const m = TONE_META[t]
                const Icon = m.icon
                return (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                      tone === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
                    )}
                  >
                    <Icon className={cn('h-3 w-3', tone === t ? '' : m.color)} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={create} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Publish
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">All announcements</h2>
        {rows === null ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading…
          </Card>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="When you have something for the whole org to see — a policy rollout, a maintenance window, a product update — publish it here."
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y">
              {rows.map((r) => {
                const m = TONE_META[r.tone] || TONE_META.info
                const Icon = m.icon
                return (
                  <li key={r.id} className="p-4 flex items-start gap-3">
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', m.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{r.title}</h3>
                        <Badge variant="outline" className="text-[9px]">{m.label}</Badge>
                        {!r.active && <Badge variant="outline" className="text-[9px] text-muted-foreground">Inactive</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.body}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Published {new Date(r.createdAt).toLocaleString()}
                        {r.endsAt && <> · ends {new Date(r.endsAt).toLocaleDateString()}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(r)} title={r.active ? 'Deactivate' : 'Activate'}>
                        {r.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r)} title="Delete" className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>
    </motion.div>
  )
}
