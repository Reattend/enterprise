'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, LogOut, User, ListFilterPlus, Database, Proportions,
  BookOpen, Columns4, BookmarkCheck, HatGlasses, MessageSquare, Building2,
  PanelLeft, Loader2, Check, Network, CreditCard,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/stores/app-store'
import { useRevalidate, SCOPES } from '@/lib/data-bus'
import { cn } from '@/lib/utils'

// New dashboard sidebar — visual structure from the claude.ai/design Chat.html
// handoff (see src/app/(app)/app/dashboard.css). All data hooks + behaviours
// preserved from the previous Sprint O sidebar:
//   - useAppStore for sidebar collapse, workspaces, recent chats, inbox count
//   - /api/user, /api/chats, /api/notifications/count, /api/enterprise/organizations
//   - workspace switcher, sign-out, mobile drawer

interface UserInfo { email: string; name: string | null; avatarUrl: string | null }

const NAV_ITEMS = [
  { href: '/app',          icon: Home,            label: 'Home', exact: true },
  { href: '/app/brain-dump', icon: ListFilterPlus, label: 'Capture' },
  { href: '/app/memories', icon: Database,        label: 'Memories' },
  { href: '/app/landscape', icon: Proportions,    label: 'Landscape' },
  { href: '/app/wiki',     icon: BookOpen,        label: 'Wiki' },
  { href: '/app/hierarchy', icon: Network,        label: 'Hierarchy' },
  { href: '/app/policies', icon: Columns4,        label: 'Policies' },
  { href: '/app/tasks',    icon: BookmarkCheck,   label: 'Tasks' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const {
    sidebarCollapsed, setSidebarCollapsed,
    mobileSidebarOpen, setMobileSidebarOpen,
    setWorkspaceInfo, setAllWorkspaces,
    setCurrentWorkspaceId,
    recentChats, setRecentChats,
    setInboxUnread,
    setOnboardingCompleted,
    enterpriseOrgs, setEnterpriseOrgs,
    activeEnterpriseOrgId, setActiveEnterpriseOrgId,
    setSubscription,
  } = useAppStore()

  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    fetchUser()
    fetchChats()
    fetchInboxUnread()
    fetchEnterpriseOrgs()
    const interval = setInterval(fetchInboxUnread, 60_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch on bus broadcasts + tab focus so a name change, new chat,
  // org rename, or notification clear shows up without a manual reload.
  useRevalidate([SCOPES.user], fetchUser)
  useRevalidate([SCOPES.chats], fetchChats)
  useRevalidate([SCOPES.inbox], fetchInboxUnread)
  useRevalidate([SCOPES.orgs], fetchEnterpriseOrgs)

  async function fetchUser() {
    try {
      const res = await fetch('/api/user')
      const data = await res.json()
      if (data.user) setUser(data.user)
      if (data.workspace) {
        setWorkspaceInfo(data.workspace.name, data.workspace.type === 'team' ? 'team' : 'personal')
        setCurrentWorkspaceId(data.workspace.id)
      }
      if (data.workspaces) {
        setAllWorkspaces(data.workspaces.map((ws: { id: string; name: string; type: string; role?: string }) =>
          ({ id: ws.id, name: ws.name, type: ws.type, role: ws.role || 'member' })))
      }
      if (data.subscription) setSubscription(data.subscription)
      if (data.user) setOnboardingCompleted(data.user.onboardingCompleted ?? false)
    } catch { /* silent */ }
  }

  async function fetchEnterpriseOrgs() {
    try {
      const res = await fetch('/api/enterprise/organizations')
      if (!res.ok) return
      const data = await res.json()
      const orgs = (data.organizations ?? []).map((o: { orgId: string; orgName: string; orgSlug: string; orgPlan: string; orgDeployment: string; role: string }) => ({
        orgId: o.orgId, orgName: o.orgName, orgSlug: o.orgSlug,
        orgPlan: o.orgPlan, orgDeployment: o.orgDeployment, role: o.role,
      }))
      setEnterpriseOrgs(orgs)
      if (orgs.length > 0 && !activeEnterpriseOrgId) {
        setActiveEnterpriseOrgId(orgs[0].orgId)
      }
    } catch { /* silent */ }
  }

  async function fetchChats() {
    try {
      const res = await fetch('/api/chats')
      const data = await res.json()
      if (data.chats) setRecentChats(data.chats)
    } catch { /* silent */ }
  }

  async function fetchInboxUnread() {
    try {
      const res = await fetch('/api/notifications/count')
      const data = await res.json()
      if (typeof data.count === 'number') setInboxUnread(data.count)
    } catch { /* silent */ }
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/login' })
    } catch {
      toast.error('Sign out failed')
    }
  }

  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase()
  const isSuper = enterpriseOrgs.some((o) => o.role === 'super_admin')

  // Mobile drawer overlay. The `rail-mobile-drawer` class on the <aside>
  // tells dashboard.css to render this rail in EXPANDED mode regardless of
  // whether the shell has `sidebar-collapsed` (the user may have toggled
  // collapse on desktop earlier — that should not carry into the mobile
  // drawer, where horizontal real estate isn't an issue).
  if (mobileSidebarOpen) {
    return (
      <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
        <div className="absolute inset-0 bg-black/40" />
        <aside
          className="rail rail-mobile-drawer absolute left-0 top-0 bottom-0 w-[280px]"
          style={{ height: '100vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderRail({ onNavigate: () => setMobileSidebarOpen(false) })}
        </aside>
      </div>
    )
  }

  return (
    <aside className="rail hidden md:flex">
      {renderRail({})}
    </aside>
  )

  // ────────────────────────────────────────────────────────────────────────
  function renderRail({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {/* Brand + collapse — uses the actual product mark from /public.
            Two SVGs swapped via [data-theme] CSS so the same markup works
            in light and dark mode. No border on the mark. */}
        <div className="brand">
          <div className="brand-mark">
            <img src="/black_logo.svg" alt="Reattend" className="brand-img light" />
            <img src="/white_logo.svg" alt="Reattend" className="brand-img dark" />
          </div>
          <div>
            <div className="brand-name">Reattend</div>
            <div className="brand-tag">Enterprise</div>
          </div>
          <button
            className="rail-collapse"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Primary CTAs */}
        {activeEnterpriseOrgId && (
          <Link href={`/app/admin/${activeEnterpriseOrgId}`} className="rail-cta" onClick={onNavigate}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
            <span>Control Room</span>
          </Link>
        )}
        <Link href="/app/ask" className="rail-cta-2" onClick={onNavigate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat</span>
        </Link>

        {/* Primary nav */}
        <nav className="rail-nav" style={{ marginTop: 14 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'active' : ''}
                onClick={onNavigate}
              >
                <Icon className="ico" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Recent chats — capped at 10, only this section scrolls within
            the rail. Takes all remaining vertical space so it adapts to the
            viewport height without ever clipping items. */}
        {recentChats && recentChats.length > 0 ? (
          <>
            <div className="rail-section" style={{ marginTop: 18, flexShrink: 0 }}>Recent questions</div>
            <nav className="rail-recent">
              {recentChats.slice(0, 10).map((chat) => (
                <Link
                  key={chat.id}
                  href={`/app/ask?chat=${chat.id}`}
                  className="recent-q"
                  title={chat.title}
                  onClick={onNavigate}
                >
                  {chat.title || 'Untitled chat'}
                </Link>
              ))}
            </nav>
          </>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Bottom: Agents only — Settings lives in the user dropdown below. */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
          <nav className="rail-nav">
            <Link href="/app/agents" className={isActive('/app/agents') ? 'active' : ''} onClick={onNavigate}>
              <HatGlasses className="ico" />
              <span>Agents</span>
            </Link>
          </nav>
        </div>

        {/* User card + dropdown */}
        <div className="rail-foot" style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 10 }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rail-user" type="button">
                <div className="rail-avatar">
                  {user?.avatarUrl ? (
                    /* Render actual photo when set; alt covers screen-readers
                       and shows initials briefly if the data URL fails. */
                    <img src={user.avatarUrl} alt={initials} />
                  ) : initials}
                </div>
                <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                  <div className="rail-user-name">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {user?.name || user?.email?.split('@')[0] || 'You'}
                    </span>
                    {isSuper && <span className="pill-super">Super</span>}
                  </div>
                  <div className="rail-user-mail">{user?.email || ' '}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <div className="text-xs">{user?.name || 'You'}</div>
                <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Org switcher */}
              {enterpriseOrgs.length > 1 && (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground py-1">
                    Workspace
                  </DropdownMenuLabel>
                  {enterpriseOrgs.map((o) => (
                    <DropdownMenuItem
                      key={o.orgId}
                      onClick={() => setActiveEnterpriseOrgId(o.orgId)}
                      className="text-[12px]"
                    >
                      <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <span className="flex-1 truncate">{o.orgName}</span>
                      {o.orgId === activeEnterpriseOrgId && <Check className="h-3 w-3" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/app/settings"><User className="h-3.5 w-3.5 mr-2" /> Account settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/app/settings/billing"><CreditCard className="h-3.5 w-3.5 mr-2" /> Billing & plan</Link>
              </DropdownMenuItem>
              {activeEnterpriseOrgId && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/app/admin/${activeEnterpriseOrgId}`}>
                    <Building2 className="h-3.5 w-3.5 mr-2" /> Memory cockpit
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </>
    )
  }
}

// Backward-compat noop export for callers that imported AppSidebar previously.
// (No callers currently re-export, but keep this here for safety.)
export default AppSidebar
