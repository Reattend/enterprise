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
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Left: org identity pill — compact. */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
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
            <span className="flex-1 text-left truncate">
              <span className="hidden md:inline">Search memories, decisions, policies, people…</span>
              <span className="md:hidden">Search…</span>
            </span>
            <kbd className="text-[10px] font-mono text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded hidden sm:inline">⌘K</kbd>
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
          {/* Plan badge — Enterprise billing lives under admin/settings (org-level),
              not a per-user subscription. Kept the pill as a quick admin jump
              when the user has an org; hidden on tablet and below. */}
          {activeEnterpriseOrg && (
            <Link
              href={`/app/admin/${activeEnterpriseOrg.orgId}/settings`}
              className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 text-[11px] font-semibold border border-violet-500/20 hover:bg-violet-500/20 transition-colors mr-1 capitalize"
            >
              {activeEnterpriseOrg.orgPlan}
            </Link>
          )}

          {/* Who Should I Ask? (⌘⇧K) — the "org knowledge router" */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => window.dispatchEvent(new CustomEvent('reattend:open-experts'))}
            title="Who should I ask? (⌘⇧K)"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
          </Button>

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

      {/* Docs Panel — Reattend Enterprise guide, scoped by role. */}
      <AnimatePresence>
        {docsOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-[460px] border-l bg-background shadow-xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sky-500" />
                <h3 className="font-semibold text-sm">
                  Reattend Enterprise · User Guide
                </h3>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setDocsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <EnterpriseDocsBody role={activeEnterpriseOrg?.role} />
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

// ─── Enterprise docs body ───────────────────────────────────────────────
// Renders the guide with "who can do what" scoped to the viewer's role.
// Source of truth for permissions is src/lib/enterprise/rbac.ts.
type RoleKey = 'super_admin' | 'admin' | 'member' | 'guest'
const ROLE_META: Record<RoleKey, { label: string; tone: string; short: string }> = {
  super_admin: { label: 'Super admin',  tone: 'bg-amber-500/15 text-amber-600 border-amber-500/30', short: 'Owner' },
  admin:       { label: 'Admin',        tone: 'bg-violet-500/15 text-violet-600 border-violet-500/30', short: 'Admin' },
  member:      { label: 'Member',       tone: 'bg-sky-500/15 text-sky-600 border-sky-500/30', short: 'Member' },
  guest:       { label: 'Guest',        tone: 'bg-slate-500/15 text-slate-600 border-slate-500/30', short: 'Guest' },
}

function RolePill({ r }: { r: RoleKey }) {
  const m = ROLE_META[r]
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${m.tone}`}>{m.short}</span>
  )
}

function Scope({ can, cannot }: { can: RoleKey[]; cannot?: RoleKey[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap text-[10px] mt-1">
      <span className="text-muted-foreground">Who:</span>
      {can.map((r) => <RolePill key={r} r={r} />)}
      {cannot && cannot.length > 0 && (
        <>
          <span className="text-muted-foreground ml-1">· hidden from:</span>
          {cannot.map((r) => (
            <span key={r} className="text-[9px] text-muted-foreground line-through">{ROLE_META[r].short}</span>
          ))}
        </>
      )}
    </div>
  )
}

function DocRow({
  title, desc, can, cannot,
}: {
  title: string
  desc: string
  can: RoleKey[]
  cannot?: RoleKey[]
}) {
  return (
    <div className="rounded-md border bg-card/50 px-3 py-2">
      <p className="text-xs font-semibold">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      <Scope can={can} cannot={cannot} />
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground mb-2 mt-1">
      {children}
    </h2>
  )
}

function EnterpriseDocsBody({ role }: { role?: string }) {
  const current: RoleKey | null = (role === 'super_admin' || role === 'admin' || role === 'member' || role === 'guest') ? role : null

  return (
    <ScrollArea className="flex-1">
      <div className="px-5 py-4 space-y-6 text-sm">

        {/* Who you are */}
        {current && (
          <div className={`rounded-xl border p-3 ${ROLE_META[current].tone}`}>
            <div className="flex items-center gap-2 mb-1">
              <User className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">You are in this org as</span>
            </div>
            <p className="text-sm font-bold">{ROLE_META[current].label}</p>
            <p className="text-[11px] mt-1 opacity-80">
              {current === 'super_admin' && 'Full access. You own the org: settings, billing, SSO, all departments, all records, audit log, self-healing, agents, policies.'}
              {current === 'admin' && 'Admin powers: manage members, departments, policies, agents, read audit. Cannot change billing or transfer ownership.'}
              {current === 'member' && 'You see records your departments allow. You can capture memories, ask questions, use agents, and acknowledge policies. Admin views are hidden.'}
              {current === 'guest' && 'Read-only on what has been explicitly shared with you. No capture, no admin, no org-wide search.'}
            </p>
          </div>
        )}

        {/* What Reattend is */}
        <section>
          <h2 className="font-bold text-base mb-1">What is Reattend Enterprise?</h2>
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Reattend Enterprise is your organisation&apos;s memory system. Every decision, context, policy,
            and meeting is captured, linked, and searchable — even after people leave. Queries are
            answered by AI with citations to the original source. Every record respects department-level
            access control.
          </p>
        </section>

        {/* Role matrix */}
        <section>
          <SectionHeader>Role matrix · who can do what</SectionHeader>
          <div className="rounded-xl border overflow-hidden text-[11px]">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-2 py-1.5 font-semibold">Action</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold">Super</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold">Admin</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold">Member</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold">Guest</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {([
                  ['Ask / search org memory (scoped)', '✓', '✓', '✓', '◐'],
                  ['Capture a memory', '✓', '✓', '✓', '—'],
                  ['See all departments&apos; data', '✓', '✓', '—', '—'],
                  ['Invite & remove members', '✓', '✓', '—', '—'],
                  ['Create / edit departments', '✓', '✓', '—', '—'],
                  ['Author / publish policies', '✓', '✓', '—', '—'],
                  ['Acknowledge policies', '✓', '✓', '✓', '—'],
                  ['Create & run agents', '✓', '✓', '◐', '—'],
                  ['Read audit log', '✓', '✓', '—', '—'],
                  ['Self-healing dashboard', '✓', '✓', '—', '—'],
                  ['Onboarding Genie', '✓', '✓', '—', '—'],
                  ['Time Machine (org-scope)', '✓', '✓', '◐', '—'],
                  ['Edit billing / plan / SSO', '✓', '—', '—', '—'],
                  ['Transfer org ownership', '✓', '—', '—', '—'],
                ] as const).map(([label, a, b, c, d]) => (
                  <tr key={label} className="bg-card">
                    <td className="px-2 py-1.5">{label}</td>
                    <td className="px-1.5 py-1.5 text-center">{a}</td>
                    <td className="px-1.5 py-1.5 text-center">{b}</td>
                    <td className="px-1.5 py-1.5 text-center">{c}</td>
                    <td className="px-1.5 py-1.5 text-center">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            <strong>✓</strong> allowed · <strong>◐</strong> scoped to their department / visibility · <strong>—</strong> hidden or denied
          </p>
        </section>

        {/* Capture */}
        <section>
          <SectionHeader>Capture — how memory gets in</SectionHeader>
          <div className="space-y-2">
            <DocRow
              title="Quick Capture (⌘)"
              desc="Top-bar command icon. Type anything — a decision, a meeting note, a lesson learned — and it becomes a memory, auto-classified and linked."
              can={['super_admin', 'admin', 'member']}
              cannot={['guest']}
            />
            <DocRow
              title="Voice capture"
              desc="Record up to 120s; Whisper transcribes, Claude enriches. Useful when typing is too slow (post-meeting debriefs)."
              can={['super_admin', 'admin', 'member']}
              cannot={['guest']}
            />
            <DocRow
              title="Brain Dump"
              desc="Paste or dictate 1,000 words of raw thinking. Claude splits it into decisions, questions, action items, and facts — each saved as a separate memory."
              can={['super_admin', 'admin', 'member']}
              cannot={['guest']}
            />
            <DocRow
              title="Integrations (Gmail, Calendar, Slack…)"
              desc="Auto-pull relevant items into the Inbox for review. Connectors are configured per-org; members see imports scoped to their departments."
              can={['super_admin', 'admin']}
            />
          </div>
        </section>

        {/* Recall */}
        <section>
          <SectionHeader>Recall — how memory comes back</SectionHeader>
          <div className="space-y-2">
            <DocRow
              title="Global search (⌘K)"
              desc="Fuzzy + semantic search across every record you have access to. Results are always RBAC-filtered — you only see what your departments allow."
              can={['super_admin', 'admin', 'member', 'guest']}
            />
            <DocRow
              title="Chat / Ask"
              desc="Conversational Q&A over your accessible memory. Every answer cites sources. Follow-up questions are suggested."
              can={['super_admin', 'admin', 'member', 'guest']}
            />
            <DocRow
              title="Oracle Mode"
              desc="Deep-research mode for high-stakes questions. Scans 150 candidates, reranks top 30 with Claude, returns a 5-section dossier (Situation / Evidence / Risks / Recommendations / Unknowns). Slower (~20-40s)."
              can={['super_admin', 'admin', 'member']}
              cannot={['guest']}
            />
            <DocRow
              title="Who should I ask? (⌘⇧K)"
              desc="Ranks the top 5 colleagues most likely to have context on a topic, based on authored records, decisions made, and entity mentions. Claude explains why each."
              can={['super_admin', 'admin', 'member']}
            />
            <DocRow
              title="Memory Resurface"
              desc="Shows what was decided or discussed on this same week 1, 2, 3, and 5 years ago. Hidden on orgs younger than a year."
              can={['super_admin', 'admin', 'member']}
            />
          </div>
        </section>

        {/* Navigation */}
        <section>
          <SectionHeader>The sidebar · navigating memory</SectionHeader>
          <div className="space-y-2">
            <DocRow
              title="Home"
              desc="Daily briefing (Start My Day card). Three sentences of Claude-synthesised focus + what changed since your last visit."
              can={['super_admin', 'admin', 'member']}
            />
            <DocRow
              title="Memory"
              desc="Every record you can see. Filter chips for decisions, graph view, by type, by person, by tag."
              can={['super_admin', 'admin', 'member', 'guest']}
            />
            <DocRow
              title="Wiki"
              desc="Auto-generated encyclopedia of your org. Topics and people pages built from memory clusters — always up to date, never stale."
              can={['super_admin', 'admin', 'member']}
            />
            <DocRow
              title="Agents"
              desc="Reusable Claude agents — ten seeded by default (onboarding, meeting synth, policy checker, etc.). Admins can create more; members can run the ones their dept has access to."
              can={['super_admin', 'admin', 'member']}
            />
            <DocRow
              title="Policies"
              desc="The org's living rulebook. Admins author + publish; members acknowledge. Pending acks surface on Home."
              can={['super_admin', 'admin', 'member']}
            />
            <DocRow
              title="Tasks"
              desc="Action items extracted from memories, meetings, and decisions. Scoped to you."
              can={['super_admin', 'admin', 'member']}
            />
            <DocRow
              title="Brain Dump"
              desc="Paste or dictate raw thinking, Claude parses it into structured memories before they're committed."
              can={['super_admin', 'admin', 'member']}
            />
            <DocRow
              title="Time Machine"
              desc="Scrub the last 24 months. See what the org 'knew' at any point — active decisions, memories that existed, what hadn't been reversed yet. Members see it scoped to their dept; admins see org-wide."
              can={['super_admin', 'admin', 'member']}
            />
            <DocRow
              title="Oracle"
              desc="Deep research page for high-stakes questions. Structured dossier with citations."
              can={['super_admin', 'admin', 'member']}
            />
          </div>
        </section>

        {/* Admin-only */}
        <section>
          <SectionHeader>Memory Cockpit · admin only</SectionHeader>
          <p className="text-[11px] text-muted-foreground mb-2">
            The org-wide control panel. Only visible to admins & super admins. Opens from the org pill in the top-left.
          </p>
          <div className="space-y-2">
            <DocRow
              title="Members"
              desc="Invite, remove, change roles, assign departments. Bulk CSV invite supported. Member directory with activity metrics."
              can={['super_admin', 'admin']}
              cannot={['member', 'guest']}
            />
            <DocRow
              title="Self-healing dashboard"
              desc="Detects stale policies, unresolved contradictions, knowledge gaps, and decisions with no documented context. Org health score + remediation checklist."
              can={['super_admin', 'admin']}
              cannot={['member', 'guest']}
            />
            <DocRow
              title="Decisions log + Blast Radius"
              desc="Every decision made, by whom, when, what it superseded. Blast Radius: 'if we reverse this, what breaks?' — citation graph with impact score."
              can={['super_admin', 'admin']}
              cannot={['member', 'guest']}
            />
            <DocRow
              title="Onboarding Genie"
              desc="Fill in a new hire's name + role + department. Claude reads org memory and writes a personalised first-week packet (decisions to know, people to meet, policies to ack, agents to try)."
              can={['super_admin', 'admin']}
              cannot={['member', 'guest']}
            />
            <DocRow
              title="Integrations"
              desc="Configure Gmail, Calendar, Slack, SharePoint, Teams, Confluence, SAP connectors. Scope which departments see which sources."
              can={['super_admin', 'admin']}
              cannot={['member', 'guest']}
            />
            <DocRow
              title="Audit log"
              desc="Every query, every access, every permission change. Searchable, exportable, retained per plan."
              can={['super_admin', 'admin']}
              cannot={['member', 'guest']}
            />
            <DocRow
              title="Departments"
              desc="Build your Org → Department → Division → Team tree. Assign members, set visibility (org-wide vs dept-scoped) for each workspace."
              can={['super_admin', 'admin']}
              cannot={['member', 'guest']}
            />
            <DocRow
              title="Plan & Billing"
              desc="Upgrade, change seat count, manage SSO/SAML, SCIM provisioning, data residency."
              can={['super_admin']}
              cannot={['admin', 'member', 'guest']}
            />
          </div>
        </section>

        {/* Security */}
        <section>
          <SectionHeader>Security & access control</SectionHeader>
          <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Two-tier RBAC.</strong> Every record has an
              organisation and a visibility (<code>org_wide</code> or <code>dept_scoped</code>). Search,
              chat, graph, and timeline all filter to records you can actually see — nothing leaks
              through a Claude answer or a rerank.
            </p>
            <p>
              <strong className="text-foreground">Admin bypass.</strong> Super admins and admins can
              read any department within their org. Members see only their departments (including
              ancestors/descendants). Guests see only what&apos;s explicitly shared.
            </p>
            <p>
              <strong className="text-foreground">Audit everything.</strong> Queries, exports, permission
              changes, logins, agent runs — all logged with IP, user agent, timestamp, and scope. Audit
              log is immutable and admin-readable.
            </p>
            <p>
              <strong className="text-foreground">Transfer protocol.</strong> When someone leaves, their
              knowledge doesn&apos;t. Role transfer moves memory ownership to the successor; originals stay
              linked for provenance. No black-box churn.
            </p>
            <p>
              <strong className="text-foreground">On-prem available.</strong> Enterprise plan supports
              on-premise Rabbit deployment. Zero data leaves your network; embeddings, LLM, and DB all
              run on your servers.
            </p>
          </div>
        </section>

        {/* Shortcuts */}
        <section>
          <SectionHeader>Keyboard shortcuts</SectionHeader>
          <div className="rounded-xl border divide-y text-[11px]">
            {[
              ['⌘K', 'Global search'],
              ['⌘⇧K', 'Who should I ask?'],
              ['⌘', 'Quick capture panel'],
              ['G then M', 'Go to Memory'],
              ['G then O', 'Go to Oracle'],
              ['G then T', 'Go to Time Machine'],
              ['?', 'Show shortcut list'],
            ].map(([k, label]) => (
              <div key={k} className="flex items-center justify-between px-3 py-1.5">
                <span className="text-muted-foreground">{label}</span>
                <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{k}</kbd>
              </div>
            ))}
          </div>
        </section>

        <div className="pb-6 text-center">
          <p className="text-[11px] text-muted-foreground">
            Something unclear or missing? Use the feedback icon (pink) to ping us directly.
          </p>
        </div>
      </div>
    </ScrollArea>
  )
}