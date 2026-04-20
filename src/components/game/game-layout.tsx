'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

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
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />

      {/* Background gradient blobs */}
      {bgBlobs}

      {/* Room info bar */}
      {roomBar}

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-12 px-5 text-center">
        {heroContent}
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

      <Footer />
    </div>
  )
}
