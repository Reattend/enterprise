'use client'

import React, { type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { ResourceExtras } from '@/components/marketing/marketing-shell'
import { resourceMetaFor } from '@/components/marketing/resource-meta'
import '@/components/marketing/resource-shell.css'

interface GameLayoutProps {
  children: React.ReactNode
  results?: React.ReactNode
  showResults: boolean
  heroContent: React.ReactNode
  howToPlay?: React.ReactNode
  ctaSection?: React.ReactNode
  roomBar?: React.ReactNode
  bgBlobs?: React.ReactNode
}

export function GameLayout({
  children,
  results,
  showResults,
  heroContent,
  howToPlay,
  ctaSection,
  roomBar,
  bgBlobs,
}: GameLayoutProps) {
  // Same chrome as MarketingShell (marketing design's detail page): tint,
  // topbar, back link, trailing sections, footer. The game body, results
  // pane, room bar and blobs are untouched.
  const pathname = usePathname()
  const meta = resourceMetaFor(pathname)
  return (
    <div className="rshell detail-page min-h-screen overflow-x-hidden" style={{ ['--detail-tint' as string]: meta?.tint ?? '#ffe4ee' } as CSSProperties}>
      <MarketingNavbar />

      {/* Background gradient blobs */}
      {bgBlobs}

      {/* Room info bar */}
      {roomBar}

      {/* Hero - the design's tinted detail-hero, single centred column */}
      <section className="detail-hero relative z-10">
        <div className="detail-hero-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)', justifyItems: 'center' }}>
          <div className="detail-copy is-visible text-center" data-reveal style={{ maxWidth: 820 }}>
            <Link className="detail-back" href="/game">← Back to free games</Link>
            {heroContent}
          </div>
        </div>
      </section>

      {/* Game + Results area */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Desktop: side-by-side when results showing */}
          <div className="hidden md:block">
            <div className="flex gap-6 justify-center">
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={showResults ? 'w-[55%]' : 'w-full max-w-3xl'}
              >
                {children}
              </motion.div>

              <AnimatePresence>
                {showResults && results && (
                  <motion.div
                    initial={{ opacity: 0, x: 80, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: '45%' }}
                    exit={{ opacity: 0, x: 80, width: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden"
                  >
                    {results}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile: stacked */}
          <div className="md:hidden">
            <div className="max-w-lg mx-auto">
              {children}
            </div>

            <AnimatePresence>
              {showResults && results && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="mt-6 max-w-lg mx-auto"
                >
                  {results}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* How to Play */}
      {howToPlay && (
        <section className="relative z-10 px-5 pb-16">
          {howToPlay}
        </section>
      )}

      {/* CTA */}
      {ctaSection}

      {meta && <ResourceExtras meta={meta} />}

      <MarketingFooter />
    </div>
  )
}
