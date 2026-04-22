'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home,
  Sparkles,
  Brain,
  Gavel,
  Network,
  Bot,
  FileText,
  Settings,
  Plus,
  LogOut,
  User,
  UserPlus,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  Building2,
  Activity,
  Check,
  Search,
  Users,
  Plug,
  BookOpen,
  Zap,
  Crown,
  BrainCircuit,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/stores/app-store'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'

// Reattend Enterprise primary nav.
// Chat + Capture are primary buttons (above the nav). Search is in the topbar.
// Nav (trimmed for Enterprise): Home · Tasks · Memory · Wiki · Agents · Policies.
// Decisions + Graph are now filter-chip views inside Memory, not top-level links.
// My team, Projects, and legacy Personal nav have been removed.
const navItems = [
  { href: '/app', icon: Home, label: 'Home', exact: true },
  { href: '/app/oracle', icon: Crown, label: 'Oracle' },
  { href: '/app/brain-dump', icon: BrainCircuit, label: 'Brain dump' },
  { href: '/app/timeline', icon: History, label: 'Time Machine' },
  { href: '/app/tasks', icon: Zap, label: 'Tasks' },
  { href: '/app/memories', icon: Brain, label: 'Memory' },
  { href: '/app/wiki', icon: BookOpen, label: 'Wiki' },
  { href: '/app/agents', icon: Bot, label: 'Agents' },
  { href: '/app/policies', icon: FileText, label: 'Policies' },
]

interface UserInfo {
  email: string
  name: string | null
  avatarUrl: string | null
}

interface WorkspaceInfo {
  id: string
  name: string
  type: string
  role: string
  createdAt: string
}


export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    subscription,
    setSubscription,
    setWorkspaceInfo,
    setAllWorkspaces: setStoreWorkspaces,
    setCurrentWorkspaceId,
    inviteOpen,
    setInviteOpen,
    recentChats,
    setRecentChats,
    inboxUnread,
    setInboxUnread,
    setOnboardingCompleted,
    enterpriseOrgs,
    setEnterpriseOrgs,
    activeEnterpriseOrgId,
    setActiveEnterpriseOrgId,
  } = useAppStore()

  const [user, setUser] = useState<UserInfo | null>(null)
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceInfo | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetchUser()
    fetchChats()
    fetchInboxUnread()
    fetchEnterpriseOrgs()
    const interval = setInterval(fetchInboxUnread, 60_000)
    return () => clearInterval(interval)
  }, [])

  const fetchEnterpriseOrgs = async () => {
    try {
      const res = await fetch('/api/enterprise/organizations')
      if (!res.ok) return
      const data = await res.json()
      const orgs = (data.organizations ?? []).map((o: { orgId: string; orgName: string; orgSlug: string; orgPlan: string; orgDeployment: string; role: string }) => ({
        orgId: o.orgId,
        orgName: o.orgName,
        orgSlug: o.orgSlug,
        orgPlan: o.orgPlan,
        orgDeployment: o.orgDeployment,
        role: o.role,
      }))
      setEnterpriseOrgs(orgs)
      // Initialize active org if not set and user has exactly one
      if (orgs.length > 0 && !activeEnterpriseOrgId) {
        setActiveEnterpriseOrgId(orgs[0].orgId)
      }
    } catch { /* silent */ }
  }

  const fetchInboxUnread = async () => {
    try {
      const res = await fetch('/api/notifications/count')
      const data = await res.json()
      if (typeof data.count === 'number') setInboxUnread(data.count)
    } catch { /* silent */ }
  }

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/chats')
      const data = await res.json()
      if (data.chats) setRecentChats(data.chats)
    } catch { /* silent */ }
  }

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user')
      const data = await res.json()
      if (data.user) setUser(data.user)
      if (data.workspace) {
        setCurrentWorkspace({
          id: data.workspace.id,
          name: data.workspace.name,
          type: data.workspace.type,
          role: data.role || 'member',
          createdAt: data.workspace.createdAt,
        })
        setWorkspaceInfo(data.workspace.name, data.workspace.type === 'team' ? 'team' : 'personal')
      }
      if (data.workspaces) {
        setStoreWorkspaces(data.workspaces.map((ws: WorkspaceInfo) => ({ id: ws.id, name: ws.name, type: ws.type, role: ws.role || 'member' })))
      }
      if (data.workspace) setCurrentWorkspaceId(data.workspace.id)
      if (data.subscription) setSubscription(data.subscription)
      if (data.user) setOnboardingCompleted(data.user.onboardingCompleted ?? false)
    } catch {
      // silent
    }
  }

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    setInviting(true)
    try {
      const res = await fetch('/api/workspaces/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: 'member' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send invite')
        return
      }
      toast.success(`Invite sent to ${email}`)
      setInviteEmail('')
      setInviteOpen(false)
    } catch {
      toast.error('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || ''
  const initials = displayName.slice(0, 2).toUpperCase()
  const workspaceName = currentWorkspace?.name || 'Personal'

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const handleNewChat = () => {
    router.push('/app')
  }

  if (sidebarCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <MobileOverlay mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} pathname={pathname} router={router} />
        <motion.aside
          initial={false}
          animate={{ width: 64 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="hidden sm:flex fixed left-0 top-0 z-40 h-screen flex-col border-r bg-sidebar text-sidebar-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-center p-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>

          <Separator className="bg-sidebar-border" />

          <div className="px-2 pt-2 flex flex-col gap-1.5 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => useAppStore.getState().setCaptureOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Capture memory</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/app/chat"
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded transition-colors',
                    pathname.startsWith('/app/chat')
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-primary/40 text-primary bg-primary/10 hover:bg-primary/15',
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Chat with memory</TooltipContent>
            </Tooltip>
          </div>

          <ScrollArea className="flex-1 px-2 py-2">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = item.exact ? pathname === item.href : isActive(item.href)
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                        )}
                      >
                        <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                )
              })}
            </nav>
          </ScrollArea>

          <div className="px-2 pb-2 flex flex-col gap-1">
            {/* Enterprise cockpit shortcut in collapsed mode */}
            {enterpriseOrgs.length > 0 && (() => {
              const active = enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId) ?? enterpriseOrgs[0]
              const isAdminRole = active.role === 'super_admin' || active.role === 'admin'
              if (!isAdminRole) return null
              const inAdminRoute = pathname.startsWith('/app/admin')
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/app/admin/${active.orgId}`}
                      className={cn(
                        'flex items-center justify-center rounded-md px-2 py-2 transition-colors',
                        inAdminRoute
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary/10 text-primary hover:bg-primary/20',
                      )}
                    >
                      <Activity className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {active.orgName} · Memory cockpit
                  </TooltipContent>
                </Tooltip>
              )
            })()}

            {enterpriseOrgs.length === 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/app/admin/onboarding"
                    className="flex items-center justify-center rounded-md px-2 py-2 text-primary hover:bg-primary/10"
                  >
                    <Building2 className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Set up organization</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/app/settings"
                  className={cn(
                    'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive('/app/settings')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>

            <Separator className="my-1 bg-sidebar-border" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-center px-0 h-9">
                  <Avatar className="h-7 w-7">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="top">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/settings"><User className="mr-2 h-4 w-4" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.aside>

        {/* Invite Dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-500" />
                Invite to {workspaceName}
              </DialogTitle>
              <DialogDescription>
                Invite a team member by email. They&apos;ll receive a link to join this workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                {inviting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Sending...</> : <><UserPlus className="h-4 w-4 mr-1" />Send Invite</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <MobileOverlay mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} pathname={pathname} router={router} />
      <motion.aside
        initial={false}
        animate={{ width: 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden sm:flex fixed left-0 top-0 z-40 h-screen flex-col border-r bg-sidebar text-sidebar-foreground"
      >
        {/* Header: Logo + Collapse */}
        <div className="flex items-center gap-2 p-3">
          <Link href="/app" className="flex items-center gap-2 flex-1 min-w-0 px-1">
            <Image src="/black_logo.svg" alt="Reattend" width={28} height={28} className="h-7 w-7 shrink-0 dark:hidden" />
            <Image src="/white_logo.svg" alt="Reattend" width={28} height={28} className="h-7 w-7 shrink-0 hidden dark:block" />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-[15px] font-bold text-sidebar-foreground tracking-tight">Reattend</span>
              <span className="text-[9px] uppercase tracking-wider text-primary font-semibold">Enterprise</span>
            </div>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors shrink-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Collapse</TooltipContent>
          </Tooltip>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Enterprise identity — primary, above nav. The ONLY identity in
            Reattend Enterprise. No personal/team workspace concepts here. */}
        <div className="px-2 pt-2">
          <EnterpriseSidebarSection
            orgs={enterpriseOrgs}
            activeOrgId={activeEnterpriseOrgId}
            setActiveOrgId={setActiveEnterpriseOrgId}
            currentPathname={pathname}
            variant="primary"
          />
        </div>

        <Separator className="mt-2 bg-sidebar-border" />

        {/* Quick Actions — Capture (primary) + Chat (secondary). Both sit
            above the nav because they're the two most-used daily actions.
            Search lives in the topbar. */}
        <div className="px-2 pt-2 flex flex-col gap-1.5">
          <Button
            size="sm"
            className="w-full h-8 text-[13px] font-medium"
            onClick={() => useAppStore.getState().setCaptureOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Capture memory
          </Button>
          <Link
            href="/app/chat"
            className={cn(
              'w-full h-8 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 rounded transition-colors',
              pathname.startsWith('/app/chat')
                ? 'bg-primary text-primary-foreground'
                : 'border border-primary/40 text-primary bg-primary/10 hover:bg-primary/15',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Chat
          </Link>
        </div>

        {/* Main scrollable area */}
        <ScrollArea className="flex-1 px-2 py-2 min-h-0">
          <nav className="flex flex-col gap-0.5 mb-2">
            {navItems.map((item) => {
              const active = item.exact ? pathname === item.href : isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded px-3 py-1.5 text-[13px] transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )}
                >
                  <item.icon className={cn('h-3.5 w-3.5 shrink-0', active && 'text-primary')} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Recent Ask threads — only visible if the user has some */}
          {recentChats.length > 0 && (
            <div className="mt-3">
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Recent questions</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {recentChats.slice(0, 6).map((chat) => {
                  const chatUrl = `/app?chat=${chat.id}`
                  const isActiveChatUrl = typeof window !== 'undefined'
                    ? window.location.pathname === '/app' && new URLSearchParams(window.location.search).get('chat') === chat.id
                    : false
                  return (
                    <button
                      key={chat.id}
                      onClick={() => router.push(chatUrl)}
                      className={cn(
                        'flex items-center gap-2 rounded px-3 py-1 text-[12px] text-left w-full transition-colors',
                        isActiveChatUrl
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                      )}
                    >
                      <span className="truncate flex-1">{chat.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Bottom section — settings + profile. Integrations + desktop install
            are now behind Admin → Integrations (org-level config). */}
        <div className="px-2 pb-2 flex flex-col gap-0.5">
          <Separator className="mb-2 bg-sidebar-border" />

          {/* Integrations — quick access to Connect / Disconnect / Sync */}
          <Link
            href="/app/integrations"
            className={cn(
              'flex items-center gap-3 rounded px-3 py-1.5 text-[13px] transition-colors',
              isActive('/app/integrations')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <Plug className={cn('h-3.5 w-3.5 shrink-0', isActive('/app/integrations') && 'text-primary')} />
            <span>Integrations</span>
          </Link>

          {/* Settings */}
          <Link
            href="/app/settings"
            className={cn(
              'flex items-center gap-3 rounded px-3 py-1.5 text-[13px] transition-colors',
              isActive('/app/settings')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <Settings className={cn('h-3.5 w-3.5 shrink-0', isActive('/app/settings') && 'text-primary')} />
            <span>Settings</span>
          </Link>

          <Separator className="my-1.5 bg-sidebar-border" />

          {/* Personal usage quota removed — enterprise billing is org-level,
              not per-user. See Admin → Settings → Plan. */}

          {/* User profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-2 h-10"
              >
                <Avatar className="h-7 w-7">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground truncate w-full">{displayEmail}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start" side="top">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/settings"><User className="mr-2 h-4 w-4" /> Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      {/* Invite People Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-500" />
              Invite to {workspaceName}
            </DialogTitle>
            <DialogDescription>
              Invite a team member by email. They&apos;ll receive a link to join this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email Address</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
              {inviting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Sending...</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-1" />Send Invite</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

// Mobile slide-over sidebar overlay
function MobileOverlay({
  mobileSidebarOpen,
  setMobileSidebarOpen,
  pathname,
  router,
}: {
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  pathname: string
  router: any
}) {
  const { inboxUnread } = useAppStore()

  if (!mobileSidebarOpen) return null

  const close = () => setMobileSidebarOpen(false)

  const navLink = (href: string, icon: React.ElementType, label: string, badge?: number) => {
    const Icon = icon
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        key={href}
        href={href}
        onClick={close}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
        {label}
        {badge != null && badge > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 sm:hidden" onClick={close} />
      {/* Drawer */}
      <div className="fixed left-0 top-0 z-50 h-screen w-[260px] flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border sm:hidden">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-sidebar-border shrink-0">
          <Link href="/app" className="flex items-center gap-2 flex-1 min-w-0 px-1" onClick={close}>
            <Image src="/black_logo.svg" alt="Reattend" width={28} height={28} className="h-7 w-7 shrink-0 dark:hidden" />
            <Image src="/white_logo.svg" alt="Reattend" width={28} height={28} className="h-7 w-7 shrink-0 hidden dark:block" />
            <span className="text-[15px] font-bold tracking-tight">Reattend</span>
          </Link>
          <button
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors shrink-0"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="px-2 pt-2 pb-1 flex flex-col gap-1.5 shrink-0">
          <Button
            size="sm"
            className="w-full h-8 text-[13px] font-medium"
            onClick={() => { useAppStore.getState().setCaptureOpen(true); close() }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Capture memory
          </Button>
          <Link
            href="/app/chat"
            onClick={close}
            className="w-full h-8 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 rounded border border-primary/40 text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Chat
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {navLink('/app', Home, 'Home')}
          {navLink('/app/oracle', Crown, 'Oracle')}
          {navLink('/app/brain-dump', BrainCircuit, 'Brain dump')}
          {navLink('/app/timeline', History, 'Time Machine')}
          {navLink('/app/tasks', Zap, 'Tasks')}
          {navLink('/app/memories', Brain, 'Memory')}
          {navLink('/app/wiki', BookOpen, 'Wiki')}
          {navLink('/app/agents', Bot, 'Agents')}
          {navLink('/app/policies', FileText, 'Policies')}
          <div className="my-2 h-px bg-sidebar-border" />
          {navLink('/app/settings', Settings, 'Settings')}
        </div>
      </div>
    </>
  )
}

// ─── Enterprise section in sidebar ──────────────────────────────────────────
// Shown to every authenticated user:
//   - If they belong to zero orgs: a single "Set up organization" CTA
//   - If they belong to 1+ orgs: the active org card with a Cockpit link
//     (for admins/super_admins) and a switcher if they belong to more than one
function EnterpriseSidebarSection({
  orgs,
  activeOrgId,
  setActiveOrgId,
  currentPathname,
}: {
  orgs: import('@/stores/app-store').EnterpriseOrgMembership[]
  activeOrgId: string | null
  setActiveOrgId: (id: string | null) => void
  currentPathname: string
  variant?: 'primary' | 'secondary'
}) {
  const active = orgs.find((o) => o.orgId === activeOrgId) ?? orgs[0]
  const isAdmin = active && (active.role === 'super_admin' || active.role === 'admin')
  const inAdminRoute = currentPathname.startsWith('/app/admin')

  if (orgs.length === 0) {
    return (
      <Link
        href="/app/admin/onboarding"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[13px] font-medium text-primary">Set up organization</span>
          <span className="text-[10px] text-muted-foreground">Nothing happens until you do</span>
        </div>
      </Link>
    )
  }

  return (
    <>
      {active && (
        <div className="rounded border border-border bg-sidebar-accent/40 p-2.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
              {active.orgName[0]?.toUpperCase() ?? 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate">{active.orgName}</div>
              <div className="text-[10px] text-muted-foreground capitalize">
                {active.role.replace('_', ' ')} · {active.orgPlan}
              </div>
            </div>
            {orgs.length >= 2 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-sidebar-accent/60 text-muted-foreground">
                    <ChevronsUpDownLocal />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {orgs.map((o) => (
                    <DropdownMenuItem
                      key={o.orgId}
                      className="cursor-pointer"
                      onClick={() => setActiveOrgId(o.orgId)}
                    >
                      <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{o.orgName}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{o.role.replace('_', ' ')}</div>
                      </div>
                      {o.orgId === activeOrgId && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isAdmin && (
            <Link
              href={`/app/admin/${active.orgId}`}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                inAdminRoute
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/90 text-white hover:bg-primary',
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Memory cockpit</span>
            </Link>
          )}

          {isAdmin && (
            <div className="grid grid-cols-2 gap-1 mt-1">
              <Link
                href={`/app/admin/${active.orgId}/members`}
                className="text-[11px] text-center px-1.5 py-1 rounded hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
              >
                Members
              </Link>
              <Link
                href={`/app/admin/${active.orgId}/health`}
                className="text-[11px] text-center px-1.5 py-1 rounded hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
              >
                Self-healing
              </Link>
            </div>
          )}

          {!isAdmin && (
            <div className="text-[11px] text-muted-foreground px-1 py-0.5">
              You are a {active.role.replace('_', ' ')} in this organization.
            </div>
          )}
        </div>
      )}
    </>
  )
}

function ChevronsUpDownLocal() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  )
}
