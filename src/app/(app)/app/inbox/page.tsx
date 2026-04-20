'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
  RotateCcw,
  Brain,
  AlertCircle,
  Calendar,
  Mail,
  MessageSquare,
  FileText,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { TourTooltip } from '@/components/app/tour-tooltip'

interface Notification {
  id: string
  type: 'todo' | 'decision_pending' | 'suggestion' | 'mention' | 'system' | 'reminder' | 'needs_review' | 'rejected'
  title: string
  body: string | null
  objectType: string | null
  objectId: string | null
  status: 'unread' | 'read' | 'done'
  createdAt: string
  workspaceName?: string
}

const typeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  needs_review: { label: 'Needs Review', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: AlertCircle },
  todo: { label: 'Task', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: CheckCircle2 },
  decision_pending: { label: 'Decision', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', icon: Brain },
  rejected: { label: 'Rejected', color: 'bg-slate-500/10 text-slate-500 dark:text-slate-400', icon: XCircle },
  system: { label: 'Info', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', icon: FileText },
  suggestion: { label: 'Suggestion', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: Brain },
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <InboxContent />
    </Suspense>
  )
}

function InboxContent() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'rejected' ? 'rejected' : 'inbox'

  const [inboxItems, setInboxItems] = useState<Notification[]>([])
  const [rejectedItems, setRejectedItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<Set<string>>(new Set())

  const fetchInbox = useCallback(async () => {
    try {
      const [inboxRes, rejectedRes] = await Promise.all([
        fetch('/api/notifications?tab=inbox&global=true&limit=100'),
        fetch('/api/notifications?tab=rejected&global=true&limit=100'),
      ])
      const [inboxData, rejectedData] = await Promise.all([inboxRes.json(), rejectedRes.json()])
      if (inboxData.notifications) setInboxItems(inboxData.notifications)
      if (rejectedData.notifications) setRejectedItems(rejectedData.notifications)
    } catch {
      toast.error('Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInbox() }, [fetchInbox])

  const handleAccept = async (notif: Notification) => {
    setActing(prev => new Set(prev).add(notif.id))
    try {
      // Promote the record from needs_review → auto_accepted (makes it visible in memories)
      if (notif.objectType === 'record' && notif.objectId) {
        await fetch(`/api/records/${notif.objectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triageStatus: 'auto_accepted' }),
        })
      }
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id, status: 'done' }),
      })
      setInboxItems(prev => prev.filter(n => n.id !== notif.id))
      toast.success('Accepted — saved to memories')
    } catch {
      toast.error('Failed')
    } finally {
      setActing(prev => { const s = new Set(prev); s.delete(notif.id); return s })
    }
  }

  const handleReject = async (notif: Notification) => {
    setActing(prev => new Set(prev).add(notif.id))
    try {
      // Delete the record and mark notification done
      if (notif.objectType === 'record' && notif.objectId) {
        await fetch(`/api/records/${notif.objectId}`, { method: 'DELETE' })
      }
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id, status: 'done' }),
      })
      setInboxItems(prev => prev.filter(n => n.id !== notif.id))
      toast('Rejected and removed')
    } catch {
      toast.error('Failed')
    } finally {
      setActing(prev => { const s = new Set(prev); s.delete(notif.id); return s })
    }
  }

  const handleRescue = async (notif: Notification) => {
    setActing(prev => new Set(prev).add(notif.id))
    try {
      // Re-queue the raw item for triage with force_store
      if (notif.objectType === 'raw_item' && notif.objectId) {
        await fetch('/api/raw-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notif.objectId, status: 'new' }),
        })
      }
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id, status: 'done' }),
      })
      setRejectedItems(prev => prev.filter(n => n.id !== notif.id))
      toast.success('Restored — will be re-processed')
    } catch {
      toast.error('Failed to rescue')
    } finally {
      setActing(prev => { const s = new Set(prev); s.delete(notif.id); return s })
    }
  }

  const handleDismissRejected = async (notifId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notifId, status: 'done' }),
      })
      setRejectedItems(prev => prev.filter(n => n.id !== notifId))
    } catch {
      toast.error('Failed')
    }
  }

  const activeInbox = inboxItems.filter(n => n.status !== 'done')
  const activeRejected = rejectedItems.filter(n => n.status !== 'done')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl"
    >
      <div>
        <TourTooltip
          tourKey="inbox"
          title="Your Inbox"
          description="Items that need your attention. Everything else is automatically saved to memories."
        >
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        </TourTooltip>
        <p className="text-sm text-muted-foreground mt-1">
          High-confidence captures go straight to memories. Only items needing your input land here.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1.5">
            Needs Attention
            {activeInbox.length > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 leading-none">
                {activeInbox.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5">
            Rejected by AI
            {activeRejected.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-500/20 text-slate-600 dark:text-slate-400 text-[10px] font-medium px-1.5 py-0.5 leading-none">
                {activeRejected.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4 space-y-2">
          <AnimatePresence>
            {activeInbox.map(notif => (
              <InboxItem
                key={notif.id}
                notif={notif}
                isActing={acting.has(notif.id)}
                onAccept={() => handleAccept(notif)}
                onReject={() => handleReject(notif)}
              />
            ))}
          </AnimatePresence>
          {activeInbox.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">All clear</p>
              <p className="text-xs mt-1">New captures from integrations are being processed automatically.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            AI determined these weren't worth storing. Rescue any that shouldn't have been dropped.
          </p>
          <AnimatePresence>
            {activeRejected.map(notif => (
              <RejectedItem
                key={notif.id}
                notif={notif}
                isActing={acting.has(notif.id)}
                onRescue={() => handleRescue(notif)}
                onDismiss={() => handleDismissRejected(notif.id)}
              />
            ))}
          </AnimatePresence>
          {activeRejected.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No rejected items.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

function sourceIcon(workspaceName?: string, title?: string) {
  const t = title?.toLowerCase() || ''
  const w = workspaceName?.toLowerCase() || ''
  if (t.includes('meeting') || t.includes('calendar')) return Calendar
  if (t.includes('email') || t.includes('gmail') || w.includes('mail')) return Mail
  if (t.includes('slack') || t.includes('teams') || t.includes('chat')) return MessageSquare
  return FileText
}

function InboxItem({
  notif,
  isActing,
  onAccept,
  onReject,
}: {
  notif: Notification
  isActing: boolean
  onAccept: () => void
  onReject: () => void
}) {
  const cfg = typeConfig[notif.type] || typeConfig.system
  const Icon = cfg.icon
  const SourceIcon = sourceIcon(notif.workspaceName, notif.title)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group flex gap-3 rounded-lg border p-4 transition-all hover:shadow-sm bg-card"
    >
      <div className="mt-0.5 shrink-0">
        {isActing ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <SourceIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className="text-sm font-medium leading-snug flex-1">{notif.title}</p>
          {notif.objectType === 'record' && notif.objectId && (
            <Link
              href={`/app/memories/${notif.objectId}`}
              className="shrink-0 text-[10px] text-primary hover:underline flex items-center gap-0.5 mt-0.5"
            >
              View <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        {notif.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className={cn('text-[10px]', cfg.color)}>
            <Icon className="h-3 w-3 mr-1" />
            {cfg.label}
          </Badge>
          {notif.workspaceName && (
            <span className="text-[10px] text-muted-foreground">{notif.workspaceName}</span>
          )}
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-1.5 shrink-0 pt-0.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={onAccept}
          disabled={isActing}
        >
          <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-destructive hover:text-destructive"
          onClick={onReject}
          disabled={isActing}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Reject
        </Button>
      </div>
    </motion.div>
  )
}

function RejectedItem({
  notif,
  isActing,
  onRescue,
  onDismiss,
}: {
  notif: Notification
  isActing: boolean
  onRescue: () => void
  onDismiss: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group flex gap-3 rounded-lg border border-dashed p-4 opacity-70 hover:opacity-100 transition-all bg-card"
    >
      <div className="mt-0.5 shrink-0">
        <XCircle className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{notif.title}</p>
        {notif.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 italic">"{notif.body}"</p>
        )}
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-1.5">
          <Clock className="h-2.5 w-2.5" />
          {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="flex items-start gap-1.5 shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={onRescue}
          disabled={isActing}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Rescue
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={onDismiss}
          disabled={isActing}
        >
          Clear
        </Button>
      </div>
    </motion.div>
  )
}
