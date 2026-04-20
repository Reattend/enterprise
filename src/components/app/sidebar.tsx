'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Lightbulb,
  FolderKanban,
  Settings,
  Plus,
  LogOut,
  User,
  CreditCard,
  UserPlus,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Plug,
  Monitor,
  TrendingUp,
  LayoutGrid,
  MessageSquare,
  Mic,
  MessagesSquare,
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

const navItems = [
  { href: '/app/explore', icon: TrendingUp, label: 'Explore' },
  { href: '/app/memories', icon: Lightbulb, label: 'Memories' },
  { href: '/app/transcripts', icon: Mic, label: 'Transcripts' },
  { href: '/app/board', icon: LayoutGrid, label: 'Board' },
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
  } = useAppStore()

  const [user, setUser] = useState<UserInfo | null>(null)
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceInfo | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetchUser()
    fetchChats()
    fetchInboxUnread()
    const interval = setInterval(fetchInboxUnread, 60_000)
    return () => clearInterval(interval)
  }, [])

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
                  className="h-8 w-8 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white hover:from-[#4338CA] hover:to-[#5558E6] shadow-[0_2px_8px_rgba(79,70,229,0.25)] border-0"
                  onClick={handleNewChat}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => router.push('/app/memories')}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add Memory</TooltipContent>
            </Tooltip>
          </div>

          <ScrollArea className="flex-1 px-2 py-2">
            <nav className="flex flex-col gap-1">
              {/* Explore */}
              {(() => {
                const active = isActive('/app/explore')
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/app/explore" className={cn('flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors', active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                        <TrendingUp className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Explore</TooltipContent>
                  </Tooltip>
                )
              })()}

              {/* Projects */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/app/projects"
                    className={cn(
                      'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                      isActive('/app/projects')
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <FolderKanban className={cn('h-4 w-4 shrink-0', isActive('/app/projects') && 'text-primary')} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Projects</TooltipContent>
              </Tooltip>

              {/* Memories, Transcripts, Board */}
              {navItems.filter(i => i.href !== '/app/explore').map((item) => {
                const active = isActive(item.href)
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
                  href="/app/integrations"
                  className={cn(
                    'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive('/app/integrations')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <div className="relative">
                    <Plug className="h-4 w-4" />
                    {inboxUnread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white leading-none">
                        {inboxUnread > 9 ? '9+' : inboxUnread}
                      </span>
                    )}
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                Integrations{inboxUnread > 0 ? ` (${inboxUnread} needs attention)` : ''}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/app/desktop"
                  className="flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                >
                  <Monitor className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Install App</TooltipContent>
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
                <DropdownMenuItem asChild>
                  <Link href="/app/billing"><CreditCard className="mr-2 h-4 w-4" /> Billing</Link>
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
            <span className="text-[15px] font-bold text-sidebar-foreground tracking-tight">Reattend</span>
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

        {/* Quick Actions */}
        <div className="px-2 pt-2 flex flex-col gap-1.5">
          <Button
            size="sm"
            className="w-full h-9 text-xs bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white hover:from-[#4338CA] hover:to-[#5558E6] shadow-[0_2px_8px_rgba(79,70,229,0.25)] border-0"
            onClick={handleNewChat}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Chat
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-9 text-xs bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border-[#4F46E5]/20 text-[#4F46E5] dark:text-[#818CF8] hover:from-violet-100 hover:to-indigo-100 dark:hover:from-violet-500/15 dark:hover:to-indigo-500/15"
            onClick={() => router.push('/app/memories')}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Memories
          </Button>
        </div>

        {/* Main scrollable area */}
        <ScrollArea className="flex-1 px-2 py-2 min-h-0">
          {/* Nav Items */}
          <nav className="flex flex-col gap-0.5 mb-2">
            {/* Explore */}
            {(() => {
              const active = isActive('/app/explore')
              return (
                <Link
                  href="/app/explore"
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <TrendingUp className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                  <span>Explore</span>
                </Link>
              )
            })()}

            {/* Projects */}
            <Link
              href="/app/projects"
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive('/app/projects')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <FolderKanban className={cn('h-4 w-4 shrink-0', isActive('/app/projects') && 'text-primary')} />
              <span>Projects</span>
            </Link>

            {/* Remaining nav items (Memories, Transcripts, Board) */}
            {navItems.filter(i => i.href !== '/app/explore').map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Recent Chats section */}
          <div className="mt-3">
            <div className="px-3 py-1.5">
              <span className="text-[11px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">Recent Chats</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {recentChats.length === 0 ? (
                <p className="text-[12px] text-muted-foreground/60 px-3 py-2 italic">No conversations yet</p>
              ) : (
                recentChats.slice(0, 8).map((chat) => {
                  const chatUrl = `/app?chat=${chat.id}`
                  const isActiveChatUrl = typeof window !== 'undefined'
                    ? window.location.pathname === '/app' && new URLSearchParams(window.location.search).get('chat') === chat.id
                    : false
                  return (
                    <button
                      key={chat.id}
                      onClick={() => router.push(chatUrl)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] text-left w-full transition-colors',
                        isActiveChatUrl
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )}
                    >
                      <MessagesSquare className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30" />
                      <span className="truncate flex-1">{chat.title}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Bottom section */}
        <div className="px-2 pb-2 flex flex-col gap-0.5">
          <Separator className="mb-2 bg-sidebar-border" />

          {/* Integrations */}
          <Link
            href="/app/integrations"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive('/app/integrations')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <div className="relative shrink-0">
              <Plug className={cn('h-4 w-4', isActive('/app/integrations') && 'text-primary')} />
              {inboxUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white leading-none">
                  {inboxUnread > 9 ? '9+' : inboxUnread}
                </span>
              )}
            </div>
            <span>Integrations</span>
            {inboxUnread > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {inboxUnread > 99 ? '99+' : inboxUnread}
              </span>
            )}
          </Link>

          {/* Install App */}
          <Link
            href="/app/desktop"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive('/app/desktop')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <Monitor className={cn('h-4 w-4 shrink-0', isActive('/app/desktop') && 'text-primary')} />
            <span>Install App</span>
          </Link>

          {/* Settings */}
          <Link
            href="/app/settings"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive('/app/settings')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <Settings className={cn('h-4 w-4 shrink-0', isActive('/app/settings') && 'text-primary')} />
            <span>Settings</span>
          </Link>

          <Separator className="my-1.5 bg-sidebar-border" />

          {/* AI quota — free users only */}
          {subscription && !subscription.isSmartActive && subscription.aiQueriesLimit !== null && (
            subscription.aiQueriesUsed >= subscription.aiQueriesLimit ? (
              <Link href="/app/billing" className="block mx-1 mb-1 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-[11px] font-semibold text-red-600">Daily limit reached</span>
                </div>
                <p className="text-[10px] text-red-500/60 mb-1.5">AI queries reset at midnight UTC</p>
                <span className="text-[10px] font-semibold text-indigo-600">Upgrade to Pro for unlimited →</span>
              </Link>
            ) : (
              <Link href="/app/billing" className="block mx-1 mb-1 px-3 py-2.5 rounded-lg bg-sidebar-accent/40 hover:bg-sidebar-accent/60 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-sidebar-foreground/50">Daily usage</span>
                  <span className="text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Go Pro →</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-1 rounded-full bg-sidebar-border overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500',
                        (subscription.aiQueriesUsed / subscription.aiQueriesLimit) >= 0.7 ? 'bg-amber-500' : 'bg-primary/70'
                      )}
                      style={{ width: `${Math.min(100, (subscription.aiQueriesUsed / subscription.aiQueriesLimit) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums font-medium whitespace-nowrap text-sidebar-foreground/60">
                    {subscription.aiQueriesLimit - subscription.aiQueriesUsed} left
                  </span>
                </div>
              </Link>
            )
          )}

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
                <Link href="/app/billing"><CreditCard className="mr-2 h-4 w-4" /> Billing</Link>
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
            className="w-full h-9 text-xs bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white hover:from-[#4338CA] hover:to-[#5558E6] shadow-[0_2px_8px_rgba(79,70,229,0.25)] border-0"
            onClick={() => { router.push('/app'); close() }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Chat
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-9 text-xs border-[#4F46E5]/20 text-[#4F46E5] dark:text-[#818CF8] bg-violet-50 dark:bg-violet-500/10"
            onClick={() => { router.push('/app/memories'); close() }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Memory
          </Button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {navLink('/app/explore', TrendingUp, 'Explore')}
          {navLink('/app/projects', FolderKanban, 'Projects')}
          {navLink('/app/memories', Lightbulb, 'Memories')}
          {navLink('/app/transcripts', Mic, 'Transcripts')}
          {navLink('/app/board', LayoutGrid, 'Board')}

          <div className="my-2 h-px bg-sidebar-border" />

          {navLink('/app/integrations', Plug, 'Integrations', inboxUnread)}
          {navLink('/app/desktop', Monitor, 'Install App')}
          {navLink('/app/settings', Settings, 'Settings')}
        </div>
      </div>
    </>
  )
}
