'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/app/sidebar'
import { AppTopbar } from '@/components/app/topbar'
import './dashboard.css'
import { QuickCapture } from '@/components/app/quick-capture'
import { InboxBanner } from '@/components/app/inbox-banner'
import { CaptureDrawer } from '@/components/enterprise/capture-drawer'
import { PolicyPendingBanner } from '@/components/enterprise/policy-pending-banner'
import { AnnouncementBanner } from '@/components/enterprise/announcement-banner'
import { SandboxBanner } from '@/components/enterprise/sandbox-banner'
import { StoreHydrator } from '@/components/app/store-hydrator'
import { KeyboardShortcuts } from '@/components/app/keyboard-shortcuts'
import { AskExpertsDialog } from '@/components/enterprise/ask-experts-dialog'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

// Routes that get a full-bleed canvas (no padding) so the page can manage
// its own height end-to-end. /app/ask needs this because its chatbox is
// pinned to the bottom and the standard p-4 sm:p-6 + overflow-y-auto
// wrapper would let the input drift mid-page.
const FULL_BLEED_PATHS: string[] = ['/app/ask', '/app/brain-dump']

// Routes a user with zero orgs is allowed to stay on. Everything else redirects
// to onboarding. Reattend Enterprise is org-only — no personal workspace home.
const NO_ORG_ALLOWED_PREFIXES = ['/app/admin/onboarding', '/app/settings']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, enterpriseOrgs, activeEnterpriseOrgId } = useAppStore()
  const pathname = usePathname()
  const router = useRouter()
  const isFullBleed = FULL_BLEED_PATHS.includes(pathname)
  const [isMobile, setIsMobile] = useState(false)
  const [orgsLoaded, setOrgsLoaded] = useState(false)
  const [askExpertsOpen, setAskExpertsOpen] = useState(false)

  // Global shortcut: ⌘⇧K (or Ctrl+Shift+K) opens Ask Experts.
  // Separate from ⌘K (search). Also listens for a 'reattend:open-experts'
  // custom event so the topbar button can trigger without prop drilling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAskExpertsOpen(true)
      }
    }
    const onCustom = () => setAskExpertsOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('reattend:open-experts', onCustom as EventListener)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('reattend:open-experts', onCustom as EventListener)
    }
  }, [])

  useEffect(() => {
    // Treat anything below md (768px) as mobile so iPad portrait and small
    // laptops get the full-width drawer instead of a squeezed 240px sidebar.
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // The sidebar fetches `enterpriseOrgs` on mount and the result lands in
  // the zustand store. The previous version of this layout relied on a
  // 400ms `setTimeout` to wait for that, which raced on slow networks: if
  // the timeout fired before the fetch returned, `enterpriseOrgs.length`
  // was still 0 → layout redirected to /app/admin/onboarding → the
  // onboarding page saw the populated store a moment later and bounced
  // back to /app/admin/<orgId>. Net effect: refreshing any page from any
  // route landed the user on the cockpit instead of where they were.
  //
  // Replaced with our own fetch, gated by a real loaded flag. Only after
  // the response resolves do we consider running the redirect.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/enterprise/organizations')
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          const memberships = (data.organizations ?? []) as Array<{
            orgId: string; orgName: string; orgSlug: string; orgPlan: string; orgDeployment: string; role: 'super_admin' | 'admin' | 'member' | 'guest'
          }>
          // Mirror sidebar's hydration so all consumers share the same source.
          useAppStore.getState().setEnterpriseOrgs(memberships)
          if (memberships.length > 0 && !useAppStore.getState().activeEnterpriseOrgId) {
            useAppStore.getState().setActiveEnterpriseOrgId(memberships[0].orgId)
          }
        }
      } finally {
        if (!cancelled) setOrgsLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!orgsLoaded) return
    if (enterpriseOrgs.length > 0) return
    const onAllowedRoute = NO_ORG_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (onAllowedRoute) return
    router.replace('/app/admin/onboarding')
  }, [orgsLoaded, enterpriseOrgs.length, pathname, router])

  return (
    // h-screen (not min-h-screen) — locks the shell to exactly the viewport
    // so children with flex-1 inherit a definite height. Pages that need to
    // scroll past viewport do so via the inner content wrapper's
    // overflow-y-auto (set when not full-bleed). Pages that pin a footer
    // surface (e.g. the Ask chatbox) rely on this lock to keep `shrink-0`
    // children glued to the bottom of the visible area.
    <div className={cn('enterprise-shell h-screen overflow-hidden', sidebarCollapsed && 'sidebar-collapsed')}>
      <StoreHydrator />
      <KeyboardShortcuts />
      <AskExpertsDialog open={askExpertsOpen} onOpenChange={setAskExpertsOpen} />
      <QuickCapture />
      <CaptureDrawer />
      <div className="app-grid">
        <AppSidebar />
        <main className="flex flex-col min-h-0 overflow-hidden">
          <AppTopbar />
          <SandboxBanner />
          <InboxBanner />
          <AnnouncementBanner orgId={activeEnterpriseOrgId} />
          <PolicyPendingBanner />
          <div className={cn(
            'flex-1 overflow-hidden flex flex-col',
            !isFullBleed && 'p-4 sm:p-6 overflow-y-auto'
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
