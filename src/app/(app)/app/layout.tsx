'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/app/sidebar'
import { AppTopbar } from '@/components/app/topbar'
import { QuickCapture } from '@/components/app/quick-capture'
import { InboxBanner } from '@/components/app/inbox-banner'
import { OnboardingChecklist } from '@/components/app/onboarding-checklist'
import { CaptureDrawer } from '@/components/enterprise/capture-drawer'
import { PolicyPendingBanner } from '@/components/enterprise/policy-pending-banner'
import { AnnouncementBanner } from '@/components/enterprise/announcement-banner'
import { SandboxBanner } from '@/components/enterprise/sandbox-banner'
import { StoreHydrator } from '@/components/app/store-hydrator'
import { KeyboardShortcuts } from '@/components/app/keyboard-shortcuts'
import { AskExpertsDialog } from '@/components/enterprise/ask-experts-dialog'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

const FULL_BLEED_PATHS = ['/app', '/app/landscape']

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

  // The sidebar fetches `enterpriseOrgs` on mount. We give it one tick before
  // deciding to redirect, so we don't bounce users who are still loading.
  useEffect(() => {
    const t = setTimeout(() => setOrgsLoaded(true), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!orgsLoaded) return
    if (enterpriseOrgs.length > 0) return
    const onAllowedRoute = NO_ORG_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (onAllowedRoute) return
    router.replace('/app/admin/onboarding')
  }, [orgsLoaded, enterpriseOrgs.length, pathname, router])

  return (
    <div className="min-h-screen bg-background enterprise-shell">
      <StoreHydrator />
      <KeyboardShortcuts />
      <AskExpertsDialog open={askExpertsOpen} onOpenChange={setAskExpertsOpen} />
      <AppSidebar />
      <QuickCapture />
      <CaptureDrawer />
      <motion.main
        initial={false}
        animate={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 64 : 240) }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col min-h-screen overflow-x-hidden"
      >
        <AppTopbar />
        <SandboxBanner />
        <InboxBanner />
        <AnnouncementBanner orgId={activeEnterpriseOrgId} />
        <PolicyPendingBanner />
        <OnboardingChecklist />
        <div className={cn(
          'flex-1 overflow-hidden flex flex-col',
          !isFullBleed && 'p-4 sm:p-6 overflow-y-auto'
        )}>
          {children}
        </div>
      </motion.main>
    </div>
  )
}
