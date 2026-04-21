'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Command,
  Moon,
  Sun,
  X,
  Menu,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  Loader2,
  MessageCircle,
  RotateCcw,
  Bot,
  User,
  Check,
  ChevronsUpDown,
  Plus,
  Users,
  UserPlus,
  FolderKanban,
  Brain,
  Glasses,
  ArrowRight,
  BookOpen,
  Building2,
  Search,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/stores/app-store'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  objectType: string | null
  objectId: string | null
  status: 'unread' | 'read' | 'done'
  createdAt: string
  workspaceName?: string
}

export function AppTopbar() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { inboxPanelOpen, setInboxPanelOpen, subscription, workspaceName, workspaceType, allWorkspaces, currentWorkspaceId, createTeamOpen, setCreateTeamOpen, setInviteOpen, mobileSidebarOpen, setMobileSidebarOpen, enterpriseOrgs, activeEnterpriseOrgId } = useAppStore()
  const activeEnterpriseOrg = enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId) ?? enterpriseOrgs[0]
  const hasEnterprise = enterpriseOrgs.length > 0

  // Create team
  const [newTeamName, setNewTeamName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [teamCreated, setTeamCreated] = useState(false)

  // Docs
  const [docsOpen, setDocsOpen] = useState(false)

  // Feedback
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'feature_request' | 'bug_report'>('feedback')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

  // Real notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0)

  const handleSwitchWorkspace = async (wsId: string) => {
    try {
      const res = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId }),
      })
      if (res.ok) {
        window.location.href = '/app'
      } else {
        toast.error('Failed to switch workspace')
      }
    } catch {
      toast.error('Failed to switch workspace')
    }
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return
    setCreatingTeam(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Team "${newTeamName.trim()}" created!`)
        setNewTeamName('')
        setTeamCreated(true)
      } else {
        toast.error(data.message || data.error || 'Failed to create team')
      }
    } catch {
      toast.error('Failed to create team')
    } finally {
      setCreatingTeam(false)
    }
  }

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await fetch('/api/notifications?status=unread&limit=20&global=true')
      const data = await res.json()
      if (data.notifications) setNotifications(data.notifications)
    } catch {
      // silent
    } finally {
      setNotifLoading(false)
    }
  }, [])

  const fetchGlobalCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count')
      const data = await res.json()
      if (typeof data.count === 'number') setGlobalUnreadCount(data.count)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    fetchGlobalCount()
  }, [fetchNotifications, fetchGlobalCount])

  // Poll global count every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchGlobalCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchGlobalCount])

  const handleMarkDone = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'done' }),
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
      setGlobalUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }

  const handleSnooze = async (id: string) => {
    try {
      const snoozedUntil = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'unread', snoozedUntil }),
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
      setGlobalUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }

    const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) return
    setFeedbackSending(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: feedbackType, message: feedbackMessage }),
      })
      if (res.ok) {
        setFeedbackSent(true)
        setFeedbackMessage('')
        setTimeout(() => {
          setFeedbackSent(false)
          setFeedbackOpen(false)
        }, 2000)
      }
    } catch {
      // silent
    } finally {
      setFeedbackSending(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="sm:hidden flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Left: org identity pill — compact. */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {hasEnterprise && activeEnterpriseOrg && (
            <Link
              href={`/app/admin/${activeEnterpriseOrg.orgId}`}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/60 transition-colors text-[12px]"
              title="Open Memory Cockpit"
            >
              <div className="h-4 w-4 rounded bg-primary text-primary-foreground text-[9px] font-semibold flex items-center justify-center">
                {(activeEnterpriseOrg.orgName || 'O')[0]?.toUpperCase()}
              </div>
              <span className="font-medium text-foreground truncate max-w-[140px]">{activeEnterpriseOrg.orgName}</span>
            </Link>
          )}
        </div>

        {/* Center: Global search — Glean-style. */}
        <div className="flex-1 flex justify-center min-w-0 px-4">
          <button
            onClick={() => router.push('/app/search')}
            className="w-full max-w-xl inline-flex items-center gap-2.5 h-9 px-3 rounded-md border border-border bg-background/60 hover:bg-background hover:border-border/80 transition-colors text-[13px] text-muted-foreground"
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1 text-left">Search memories, decisions, policies, people…</span>
            <kbd className="text-[10px] font-mono text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
        </div>

        {/* Org switcher (only for multi-org users) */}
        {hasEnterprise && enterpriseOrgs.length >= 2 && activeEnterpriseOrg && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground" title="Switch organization">
                <ChevronsUpDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Switch organization
              </div>
              {enterpriseOrgs.map((o) => (
                <DropdownMenuItem
                  key={o.orgId}
                  onClick={() => {
                    useAppStore.getState().setActiveEnterpriseOrgId(o.orgId)
                    if ((o.role === 'super_admin' || o.role === 'admin')) {
                      router.push(`/app/admin/${o.orgId}`)
                    }
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold mr-2 shrink-0 bg-primary text-primary-foreground">
                    {o.orgName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">{o.orgName}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {o.role.replace('_', ' ')} · {o.orgPlan}
                    </span>
                  </div>
                  {o.orgId === activeEnterpriseOrgId && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Right: Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Plan badge */}
          {subscription && (
            subscription.isSmartActive ? (
              <Link href="/app/billing" className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 text-[11px] font-semibold border border-violet-500/20 hover:bg-violet-500/20 transition-colors mr-1">
                Pro
              </Link>
            ) : (
              <Link href="/app/billing" className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium hover:bg-muted/80 transition-colors mr-1 border border-border">
                Free · Upgrade
              </Link>
            )
          )}

          {/* Quick Capture */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => useAppStore.getState().setCommandOpen(true)}
            title="Quick capture"
          >
            <Command className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Notifications */}
          <Button
            variant={inboxPanelOpen ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="relative"
            onClick={() => {
              setInboxPanelOpen(!inboxPanelOpen)
              setFeedbackOpen(false)
              if (!inboxPanelOpen) fetchNotifications()
            }}
          >
            <Bell className="h-4 w-4 text-amber-500" />
            {globalUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                {globalUnreadCount > 9 ? '9+' : globalUnreadCount}
              </span>
            )}
          </Button>

          {/* Feedback */}
          <Button
            variant={feedbackOpen ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={() => {
              setFeedbackOpen(!feedbackOpen)
              setInboxPanelOpen(false)
              setDocsOpen(false)
            }}
          >
            <MessageCircle className="h-4 w-4 text-pink-500" />
          </Button>

          {/* Guide / Docs */}
          <Button
            variant={docsOpen ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={() => {
              setDocsOpen(!docsOpen)
              setFeedbackOpen(false)
              setInboxPanelOpen(false)
            }}
            title="Reattend Guide"
          >
            <BookOpen className="h-4 w-4 text-sky-500" />
          </Button>

          {/* DeepThink */}
          <button
            onClick={() => window.location.href = '/app/deepthink'}
            title="DeepThink"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-600/20 to-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 hover:from-amber-600/30 hover:to-amber-500/20 transition-all text-amber-400/90 hover:text-amber-300"
          >
            <Glasses className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold tracking-tight hidden sm:inline">DeepThink</span>
          </button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 text-amber-500 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 text-indigo-400 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </header>


      {/* Notification Panel */}
      <AnimatePresence>
        {inboxPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-80 border-l bg-background shadow-xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <Button variant="ghost" size="icon-sm" onClick={() => setInboxPanelOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {notifLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bell className="h-6 w-6 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="flex gap-3 rounded-md p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (notif.objectType === 'record' && notif.objectId) {
                            setInboxPanelOpen(false)
                            router.push(`/app/memories/${notif.objectId}`)
                          }
                        }}
                      >
                        <div className="mt-0.5">
                          {notif.type === 'todo' && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                          {notif.type === 'suggestion' && <Sparkles className="h-4 w-4 text-primary" />}
                          {notif.type === 'decision_pending' && <Clock className="h-4 w-4 text-amber-500" />}
                          {!['todo', 'suggestion', 'decision_pending'].includes(notif.type) && (
                            <Bell className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {notif.workspaceName && (
                            <p className="text-[10px] text-muted-foreground/70 mb-0.5">{notif.workspaceName}</p>
                          )}
                          <p className="text-sm font-medium">{notif.title}</p>
                          {notif.body && (
                            <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                          )}
                          {notif.objectType === 'record' && notif.objectId && (
                            <p className="text-[11px] text-primary mt-1">View memory →</p>
                          )}
                          <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleMarkDone(notif.id)}
                            >
                              Done
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleSnooze(notif.id)}
                            >
                              Later
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Panel */}
      <AnimatePresence>
        {feedbackOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-80 border-l bg-background shadow-xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-pink-500" />
                  <h3 className="font-semibold text-sm">Send Feedback</h3>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setFeedbackOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 p-4 space-y-4">
                {feedbackSent ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
                    <p className="text-sm font-medium">Thanks for your feedback!</p>
                    <p className="text-xs text-muted-foreground mt-1">We&apos;ll review it shortly.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Type</label>
                      <div className="flex gap-1.5">
                        {([
                          { value: 'feedback' as const, label: 'Feedback' },
                          { value: 'feature_request' as const, label: 'Feature' },
                          { value: 'bug_report' as const, label: 'Bug' },
                        ]).map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setFeedbackType(opt.value)}
                            className={cn(
                              'text-xs px-3 py-1.5 rounded-full border transition-colors',
                              feedbackType === opt.value
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted/50 hover:bg-muted border-transparent'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Message</label>
                      <textarea
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder={
                          feedbackType === 'feature_request'
                            ? 'Describe the feature you\'d like...'
                            : feedbackType === 'bug_report'
                            ? 'What went wrong? Steps to reproduce...'
                            : 'Tell us what you think...'
                        }
                        className="w-full min-h-[120px] rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                        disabled={feedbackSending}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleFeedbackSubmit}
                      disabled={!feedbackMessage.trim() || feedbackSending}
                    >
                      {feedbackSending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {feedbackSending ? 'Sending...' : 'Send'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Docs Panel */}
      <AnimatePresence>
        {docsOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-[420px] border-l bg-background shadow-xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sky-500" />
                <h3 className="font-semibold text-sm">Reattend Guide</h3>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setDocsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-5 py-4 space-y-7 text-sm">

                {/* Overview */}
                <section>
                  <h2 className="font-bold text-base mb-1">What is Reattend?</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Reattend is your AI memory layer — a single place where everything you read, write, decide, and discuss gets captured, organised, and made instantly searchable. Instead of hunting through Slack, email, and docs, you ask Reattend and get an answer with a source.
                  </p>
                </section>

                {/* Memories */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Memories</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Memories are the core unit in Reattend. Every meeting note, decision, idea, or captured insight is stored as a memory. The AI automatically classifies, summarises, and extracts entities so you never have to tag things manually.
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: 'Meeting', color: 'bg-blue-500/10 text-blue-600', desc: 'Summaries from calls and syncs — participants, decisions, follow-ups.' },
                      { label: 'Decision', color: 'bg-violet-500/10 text-violet-600', desc: 'Choices made. Good for architecture, product, or business decisions.' },
                      { label: 'Idea', color: 'bg-amber-500/10 text-amber-600', desc: 'Raw concepts and hypotheses before they become decisions.' },
                      { label: 'Insight', color: 'bg-emerald-500/10 text-emerald-600', desc: 'Key learnings from data, research, or experience.' },
                      { label: 'Note', color: 'bg-gray-500/10 text-gray-600', desc: 'General freeform text — catch-all for anything that doesn\'t fit above.' },
                      { label: 'Transcript', color: 'bg-pink-500/10 text-pink-600', desc: 'Audio recordings with AI transcription from the Chrome extension.' },
                      { label: 'Context', color: 'bg-slate-500/10 text-slate-600', desc: 'Background information — team bios, onboarding notes, product context.' },
                    ].map(({ label, color, desc }) => (
                      <div key={label} className="flex gap-2.5 items-start">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${color}`}>{label}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    When you save a memory, the AI runs in the background: it assigns a type, writes a summary, extracts people and companies (entities), scores confidence, and links the memory to related ones.
                  </p>
                </section>

                {/* Creating Memories */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">How to Create Memories</h2>
                  <div className="space-y-3">
                    {[
                      { step: '⌘ Quick Capture', desc: 'Hit the command icon in the top bar (or use the keyboard shortcut). Type anything — a thought, a decision, a URL, a meeting summary. Fastest path to saving something.' },
                      { step: 'New Memory button', desc: 'Go to Memories → click "+ New Memory". Write text or upload a file (PDF, Word, image, CSV). AI enriches it in the background.' },
                      { step: 'Integrations', desc: 'Connect Gmail, Google Calendar, or Slack. Emails, calendar events, and Slack messages are automatically pulled into your Inbox for review.' },
                      { step: 'Chrome Extension', desc: 'The browser extension passively captures important content as you browse. It also lets you manually clip any page or selection.' },
                      { step: 'Webhook / API', desc: 'POST JSON to your workspace webhook endpoint. Useful for automating from Zapier, Make, or your own code.' },
                    ].map(({ step, desc }, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                        <div>
                          <p className="text-xs font-semibold">{step}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Quick Capture */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Quick Capture ⌘</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The command icon (⌘) in the top bar opens the Quick Capture panel from anywhere in the app. You can type a memory, search your existing memories, or navigate to any page — all from the keyboard. It&apos;s designed to get information in within seconds, before the thought is gone.
                  </p>
                </section>

                {/* Ask / AI Chat */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Ask — AI Chat</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Ask is your memory-aware AI assistant. It searches across all your saved memories to answer questions — not the web, not a generic model, just your data. Answers include source citations so you can trace every statement back to the original memory.
                  </p>
                  <div className="space-y-1.5">
                    {[
                      '"What did we decide about the pricing model?"',
                      '"Who was in the onboarding meeting last Tuesday?"',
                      '"What are all the action items from this week?"',
                      '"Summarise everything we know about Competitor X."',
                    ].map((q, i) => (
                      <p key={i} className="text-xs text-muted-foreground italic pl-3 border-l-2 border-primary/20">{q}</p>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    After each answer, Reattend suggests 3 follow-up questions to help you explore deeper. Free accounts get 10 questions per month. Pro is unlimited.
                  </p>
                </section>

                {/* Inbox */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Inbox</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The Inbox is where raw items land before they become memories. When Reattend pulls in an email, calendar event, or Slack message, it goes to Inbox first so you can review and approve. Items you don&apos;t want can be rejected. Approved items get AI-enriched and move to Memories. You can also snooze items to review later.
                  </p>
                </section>

                {/* Projects */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Projects</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Projects let you organise memories by theme — a product launch, a client, a quarter, a topic. Every workspace has an &quot;Unassigned&quot; default project. When creating or editing a memory, assign it to any project. You can filter Memories view by project and ask questions scoped to a specific project.
                  </p>
                </section>

                {/* Board */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Board — Visual Graph</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The Board shows your memories as an interactive graph. Nodes are memories, edges are connections the AI found between them. You can zoom, pan, click a node to read the memory, and see clusters of related content. Useful for spotting patterns you wouldn&apos;t notice in a list view.
                  </p>
                </section>

                {/* Integrations */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Integrations</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Connect your existing tools so memories flow in automatically. Go to Integrations in the sidebar to connect.
                  </p>
                  <div className="space-y-2">
                    {[
                      { name: 'Gmail', desc: 'Syncs important emails from domains you whitelist. Threads are summarised and go to Inbox for review.' },
                      { name: 'Google Calendar', desc: 'Pulls in upcoming and past events. Meeting titles, descriptions, attendees, and times become searchable memories.' },
                      { name: 'Slack', desc: 'Captures messages from channels you select. Decisions, links, and announcements are automatically extracted.' },
                      { name: 'Webhook / API', desc: 'Any system can POST JSON to your workspace endpoint. The payload becomes a memory. Full control over what gets saved.' },
                    ].map(({ name, desc }) => (
                      <div key={name}>
                        <p className="text-xs font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Sharing */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Sharing a Memory</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Any memory can be shared via a public link. Open a memory → click the share icon. The recipient sees a preview of the memory including summary, action items, and key points. They can save it directly to their own Reattend account with one click. Share links expire after 30 days.
                  </p>
                </section>

                {/* Chrome Extension */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Chrome Extension</h2>
                  <p className="text-muted-foreground leading-relaxed mb-2">
                    The extension runs silently in your browser. It has two main modes:
                  </p>
                  <div className="space-y-2">
                    {[
                      { name: 'Passive Capture', desc: 'As you browse — reading articles, Notion pages, Google Docs, emails — the extension extracts meaningful content and saves it as a memory. It skips sensitive apps, banking, and passwords automatically.' },
                      { name: 'Ambient Recall', desc: 'If you open a page related to something you\'ve saved, the extension shows a subtle suggestion in the corner. Like Grammarly for your memory.' },
                      { name: 'Ask Sidebar', desc: 'Open the sidebar in Chrome and ask questions about your memories without leaving the current tab.' },
                      { name: 'Meeting Recorder', desc: 'Record audio from any browser-based meeting (Google Meet, Zoom web, Teams web). The recording is transcribed and saved as a Transcript memory.' },
                    ].map(({ name, desc }) => (
                      <div key={name}>
                        <p className="text-xs font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Go to Install → Chrome Extension to download and connect the extension to your account using an API token.
                  </p>
                </section>

                {/* Teams */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Team Workspaces</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Create a team workspace to share memories with colleagues. Every member can add memories, ask questions, and see shared integrations. Workspace owners can invite members and manage integrations. Switch between Personal and Team workspaces using the pills in the top bar. Ask questions in Team workspace to query only team memories — or switch to Personal to query your own.
                  </p>
                </section>

                {/* Settings */}
                <section>
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Settings</h2>
                  <div className="space-y-2">
                    {[
                      { name: 'Profile', desc: 'Update your name and email. Your avatar is pulled from Google if you signed in with Google.' },
                      { name: 'Notifications', desc: 'Control which types of alerts appear in your Inbox — suggestions, to-dos, decision reminders.' },
                      { name: 'Billing', desc: 'View your current plan, upgrade to Pro, or manage your Paddle subscription. Pro gives unlimited AI questions and higher sync limits.' },
                      { name: 'Delete Account', desc: 'Permanently deletes all your memories, workspaces, tokens, and personal data. Required by GDPR. This action cannot be undone.' },
                    ].map(({ name, desc }) => (
                      <div key={name}>
                        <p className="text-xs font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="pb-6 text-center">
                  <p className="text-xs text-muted-foreground">Questions? Use the feedback button to reach us directly.</p>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Team Dialog */}
      <AnimatePresence>
        {createTeamOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => { setCreateTeamOpen(false); setTeamCreated(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background rounded-2xl border shadow-2xl w-full max-w-md mx-4 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {teamCreated ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    <h3 className="font-semibold text-base">Team created!</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Here&apos;s what to do next:</p>
                  <div className="space-y-2">
                    {[
                      { num: 1, text: 'Invite your team members', Icon: UserPlus },
                      { num: 2, text: 'Create your first team project', Icon: FolderKanban },
                      { num: 3, text: 'Start adding shared memories', Icon: Brain },
                    ].map((step) => (
                      <div key={step.num} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-500">
                          {step.num}
                        </div>
                        <step.Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{step.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                    onClick={() => { setCreateTeamOpen(false); setTeamCreated(false); window.location.href = '/app' }}
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                      <Users className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">Create Team Workspace</h3>
                      <p className="text-xs text-muted-foreground">Collaborate with your team on shared memories.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Team Name</label>
                      <Input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Acme Corp, Product Team"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTeam() }}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => { setCreateTeamOpen(false); setNewTeamName('') }}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-indigo-500 hover:bg-indigo-600 text-white"
                        disabled={!newTeamName.trim() || creatingTeam}
                        onClick={handleCreateTeam}
                      >
                        {creatingTeam ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                        {creatingTeam ? 'Creating...' : 'Create Team'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}