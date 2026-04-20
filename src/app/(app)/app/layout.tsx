'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/app/sidebar'
import { AppTopbar } from '@/components/app/topbar'
import { QuickCapture } from '@/components/app/quick-capture'
import { InboxBanner } from '@/components/app/inbox-banner'
import { OnboardingChecklist } from '@/components/app/onboarding-checklist'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

const FULL_BLEED_PATHS = ['/app', '/app/board']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, workspaceType } = useAppStore()
  const pathname = usePathname()
  const isFullBleed = FULL_BLEED_PATHS.includes(pathname)
  const isTeam = workspaceType === 'team'
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div className={cn("min-h-screen bg-background", isTeam && "team-theme")}>
      <AppSidebar />
      <QuickCapture />
      <motion.main
        initial={false}
        animate={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 64 : 240) }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col min-h-screen overflow-x-hidden"
      >
        <AppTopbar />
        <InboxBanner />
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
