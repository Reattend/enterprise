'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'

interface TourTooltipProps {
  tourKey: string
  title: string
  description: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  icon?: React.ReactNode
}

export function TourTooltip({ tourKey, title, description, children, side = 'bottom', icon }: TourTooltipProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(`tour_${tourKey}`)
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [tourKey])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(`tour_${tourKey}`, '1')
    // Also mark visited for onboarding checklist integration
    if (tourKey === 'graph') localStorage.setItem('visited_graph', '1')
    if (tourKey === 'board') localStorage.setItem('visited_board', '1')
    if (tourKey === 'ask') localStorage.setItem('visited_ask', '1')
  }

  const positionClasses = {
    bottom: 'top-full mt-2 left-0',
    top: 'bottom-full mb-2 left-0',
    right: 'left-full ml-2 top-0',
    left: 'right-full mr-2 top-0',
  }

  return (
    <div className="relative inline-block">
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: side === 'top' ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'top' ? 8 : -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 w-[280px] rounded-xl bg-white dark:bg-zinc-900 border border-border/60 shadow-[0_8px_32px_rgba(79,70,229,0.12)] p-4 ${positionClasses[side]}`}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F46E5]/10 shrink-0 mt-0.5">
                {icon || <Sparkles className="h-3.5 w-3.5 text-[#4F46E5]" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
              <button
                onClick={dismiss}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={dismiss}
              className="mt-3 w-full text-xs font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors text-center py-1.5 rounded-lg hover:bg-[#4F46E5]/5"
            >
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
