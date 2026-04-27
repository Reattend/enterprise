'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home,
  Sparkles,
  Bot,
  Settings,
  LogOut,
  User,
  UserPlus,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  Building2,
  Check,
  BookOpen,
  // Sprint O sidebar refresh
  ListFilterPlus,    // Capture
  Database,          // Memories
  Proportions,       // Landscape
  Columns4,          // Policies
  BookmarkCheck,     // Tasks
  HatGlasses,        // Agents (just-above-Settings, distinct)
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

// Reattend Enterprise primary nav (Sprint O sidebar refresh).
// Chat is a gradient button above the nav (replaces the older "Ask" label).
// Control Room is a separate gradient button on top of the sidebar.
// Search is in the topbar; Legend + Integrations have moved out of the
// sidebar into the topbar; Agents is a distinct button just above Settings.
const navItems = [
  { href: '/app', icon: Home, label: 'Home', exact: true },
  { href: '/app/brain-dump', icon: ListFilterPlus, label: 'Capture' },
  { href: '/app/memories', icon: Database, label: 'Memories' },
  { href: '/app/landscape', icon: Proportions, label: 'Landscape' },
  { href: '/app/wiki', icon: BookOpen, label: 'Wiki' },
  { href: '/app/policies', icon: Columns4, label: 'Policies' },
  { href: '/app/tasks', icon: BookmarkCheck, label: 'Tasks' },
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

  if (sidebarCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <MobileOverlay mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} pathname={pathname} router={router} />
        <motion.aside
          initial={false}
          animate={{ width: 64 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="hidden md:flex fixed left-0 top-0 z-40 h-screen flex-col border-r bg-sidebar text-sidebar-foreground"
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
            {(() => {
              const active = enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId) ?? enterpriseOrgs[0]
              const href = active && (active.role === 'super_admin' || active.role === 'admin')
                ? `/app/admin/${active.orgId}`
                : '/app'
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white hover:opacity-90 transition-opacity"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Control Room</TooltipContent>
                </Tooltip>
              )
            })()}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/app/ask"
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded transition-colors',
                    'bg-[#1a1a2e] text-white hover:bg-[#2d2b55]',
                    pathname.startsWith('/app/ask') && 'ring-2 ring-primary/30',
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Chat</TooltipContent>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/app/agents"
                  className={cn(
                    'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive('/app/agents')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <HatGlasses className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Agents</TooltipContent>
            </Tooltip>

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
            <Image src="/icon-128.png" alt="Reattend" width={28} height={28} className="h-7 w-7 shrink-0 rounded-md" unoptimized />
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

        {/* Sprint O sidebar refresh — two stacked gradient buttons:
            Control Room (admin pivot) + Chat (renamed from Ask).
            Org switching + identity moved into the topbar. */}
        <div className="px-2 pt-3 flex flex-col gap-2">
          <ControlRoomButton
            orgs={enterpriseOrgs}
            activeOrgId={activeEnterpriseOrgId}
            currentPathname={pathname}
          />
          <Link
            href="/app/ask"
            className={cn(
              'w-full h-9 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 rounded-md transition-all',
              'bg-[#1a1a2e] text-white shadow-sm hover:bg-[#2d2b55]',
              pathname.startsWith('/app/ask') && 'ring-2 ring-primary/30',
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
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
                  // Chat threads live at /app/ask (chat-view), not /app
                  // (home dashboard). Pointing at /app would dump the user
                  // onto the home page with no thread visible.
                  const chatUrl = `/app/ask?chat=${chat.id}`
                  const isActiveChatUrl = typeof window !== 'undefined'
                    ? window.location.pathname === '/app/ask' && new URLSearchParams(window.location.search).get('chat') === chat.id
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

        {/* Bottom section — Agents, Settings, profile. Legend + Integrations
            moved to the topbar in Sprint O. */}
        <div className="px-2 pb-2 flex flex-col gap-0.5">
          <Separator className="mb-2 bg-sidebar-border" />

          {/* Agents — distinct, just above Settings. Org admins manage and
              run agents from here; members can run dept-scoped ones. */}
          <Link
            href="/app/agents"
            className={cn(
              'flex items-center gap-3 rounded px-3 py-1.5 text-[13px] transition-colors',
              isActive('/app/agents')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <HatGlasses className={cn('h-3.5 w-3.5 shrink-0', isActive('/app/agents') && 'text-primary')} />
            <span>Agents</span>
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

          {/* User profile + role pill (active org's role) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-2 h-12"
              >
                <Avatar className="h-7 w-7">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left flex-1 min-w-0 gap-0.5">
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="text-sm font-medium truncate flex-1 min-w-0">{displayName}</span>
                    <UserRolePill role={enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId)?.role} />
                  </div>
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
      <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={close} />
      {/* Drawer */}
      <div className="fixed left-0 top-0 z-50 h-screen w-[260px] flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border md:hidden">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-sidebar-border shrink-0">
          <Link href="/app" className="flex items-center gap-2 flex-1 min-w-0 px-1" onClick={close}>
            <Image src="/icon-128.png" alt="Reattend" width={28} height={28} className="h-7 w-7 shrink-0 rounded-md" unoptimized />
            <span className="text-[15px] font-bold tracking-tight">Reattend</span>
          </Link>
          <button
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors shrink-0"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Quick action — Chat (renamed from Ask in Sprint O). */}
        <div className="px-2 pt-2 pb-1 flex flex-col gap-1.5 shrink-0">
          <Link
            href="/app/ask"
            onClick={close}
            className="w-full h-9 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1a1a2e] text-white hover:bg-[#2d2b55] transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </Link>
        </div>

        {/* Nav — matches the desktop sidebar order + icons */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {navLink('/app', Home, 'Home')}
          {navLink('/app/brain-dump', ListFilterPlus, 'Capture')}
          {navLink('/app/memories', Database, 'Memories')}
          {navLink('/app/landscape', Proportions, 'Landscape')}
          {navLink('/app/wiki', BookOpen, 'Wiki')}
          {navLink('/app/policies', Columns4, 'Policies')}
          {navLink('/app/tasks', BookmarkCheck, 'Tasks')}
          <div className="my-2 h-px bg-sidebar-border" />
          {navLink('/app/agents', HatGlasses, 'Agents')}
          {navLink('/app/settings', Settings, 'Settings')}
        </div>
      </div>
    </>
  )
}

// ─── Control Room button (Sprint O sidebar refresh) ────────────────────────
// Single gradient button that pivots the user into the org admin surface.
// For non-admin members it routes to their org Home (org-scoped admin
// surfaces are gated server-side anyway, so this is just the friendly
// landing). Org switching has moved to the topbar.
function ControlRoomButton({
  orgs,
  activeOrgId,
  currentPathname,
}: {
  orgs: import('@/stores/app-store').EnterpriseOrgMembership[]
  activeOrgId: string | null
  currentPathname: string
}) {
  const active = orgs.find((o) => o.orgId === activeOrgId) ?? orgs[0]
  const inAdminRoute = currentPathname.startsWith('/app/admin')

  if (orgs.length === 0) {
    return (
      <Link
        href="/app/admin/onboarding"
        className={cn(
          'w-full h-10 inline-flex items-center justify-center gap-2 rounded-md text-[13px] font-semibold transition-all',
          'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-sm hover:opacity-90',
        )}
      >
        <Building2 className="h-3.5 w-3.5" />
        Set up organization
      </Link>
    )
  }

  if (!active) return null

  const href = (active.role === 'super_admin' || active.role === 'admin')
    ? `/app/admin/${active.orgId}`
    : '/app'

  return (
    <Link
      href={href}
      className={cn(
        'w-full h-10 inline-flex items-center justify-center gap-2 rounded-md text-[13px] font-semibold transition-all',
        'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-sm hover:opacity-90',
        inAdminRoute && 'ring-2 ring-fuchsia-300/50',
      )}
    >
      <Building2 className="h-3.5 w-3.5" />
      Control Room
    </Link>
  )
}

// ─── Role pill ──────────────────────────────────────────────────────────────
// Shown next to the user's name in the sidebar profile button. Color-codes
// the active org's role so the user can tell at a glance whether they are
// looking at the product through admin lenses or guest lenses.
function UserRolePill({ role }: { role?: string }) {
  if (!role) return null
  const cfg = roleStyle(role)
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0 h-4 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 border',
        cfg.bg, cfg.text, cfg.border,
      )}
      title={`Role: ${role.replace('_', ' ')}`}
    >
      {cfg.label}
    </span>
  )
}

function roleStyle(role: string): { label: string; bg: string; text: string; border: string } {
  switch (role) {
    case 'super_admin':
      return { label: 'Super', bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' }
    case 'admin':
      return { label: 'Admin', bg: 'bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30' }
    case 'guest':
      return { label: 'Guest', bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' }
    case 'member':
    default:
      return { label: 'Member', bg: 'bg-slate-500/15', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-500/30' }
  }
}
