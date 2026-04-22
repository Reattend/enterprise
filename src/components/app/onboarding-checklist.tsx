'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import Link from 'next/link'

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/reattend/khhdeanlmhkbomhknmnahelbienahpgh'
const LS_EXT = 'reattend_onb_ext'
const LS_ASK = 'reattend_onb_ask'

interface ServerSteps {
  hasIntegration: boolean
  hasMemory: boolean
}

export function OnboardingChecklist() {
  const { onboardingCompleted, setOnboardingCompleted, setAskOpen } = useAppStore()
  const [serverSteps, setServerSteps] = useState<ServerSteps | null>(null)
  const [extDone, setExtDone] = useState(false)
  const [askDone, setAskDone] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    if (onboardingCompleted !== false) return
    setExtDone(!!localStorage.getItem(LS_EXT))
    setAskDone(!!localStorage.getItem(LS_ASK))
    fetch('/api/user/onboarding')
      .then(r => r.json())
      .then(d => setServerSteps({
        hasIntegration: d.steps?.hasIntegration ?? false,
        hasMemory: d.steps?.hasMemory ?? false,
      }))
      .catch(() => setServerSteps({ hasIntegration: false, hasMemory: false }))
  }, [onboardingCompleted])

  if (onboardingCompleted !== false || !serverSteps) return null

  const steps = [
    {
      key: 'account',
      label: 'Create your account',
      sublabel: 'You\'re in.',
      done: true,
      onClick: null as (() => void) | null,
      href: null as string | null,
    },
    {
      key: 'extension',
      label: 'Add Chrome extension',
      sublabel: 'Capture from Gmail, Slack & more.',
      done: extDone,
      href: null,
      onClick: () => {
        window.open(CHROME_STORE_URL, '_blank')
        localStorage.setItem(LS_EXT, '1')
        setExtDone(true)
      },
    },
    {
      key: 'integration',
      label: 'See the connector roadmap',
      sublabel: 'Gmail, Slack, Calendar — coming via Nango.',
      done: serverSteps.hasIntegration,
      href: '/app/integrations',
      onClick: null,
    },
    {
      key: 'memory',
      label: 'Save your first memory',
      sublabel: 'Capture a thought or note.',
      done: serverSteps.hasMemory,
      href: '/app/memories',
      onClick: null,
    },
    {
      key: 'ask',
      label: 'Ask your first question',
      sublabel: 'Try the AI side panel.',
      done: askDone,
      href: null,
      onClick: () => {
        localStorage.setItem(LS_ASK, '1')
        setAskDone(true)
        setAskOpen(true)
      },
    },
  ]

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length
  const progress = (doneCount / steps.length) * 100

  const dismiss = async () => {
    setDismissing(true)
    try { await fetch('/api/user/onboarding', { method: 'POST' }) } catch { /* silent */ }
    setOnboardingCompleted(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="mx-4 sm:mx-6 mt-4 rounded-xl border bg-card overflow-hidden shadow-sm"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold whitespace-nowrap">Getting started</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden hidden sm:block">
                <motion.div
                  className="h-full rounded-full bg-indigo-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{doneCount}/{steps.length}</span>
            </div>
          </div>
          <button
            onClick={dismiss}
            disabled={dismissing}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
            aria-label="Dismiss checklist"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Steps — horizontal on desktop, vertical on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {steps.map((step) => {
            const cardContent = (
              <div className={cn(
                'flex sm:flex-col items-start gap-3 sm:gap-2 px-4 py-3 sm:p-4 h-full transition-colors',
                !step.done && (step.href || step.onClick) && 'hover:bg-muted/40 cursor-pointer group',
              )}>
                {/* Check circle */}
                <div className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all mt-0.5 sm:mt-0',
                  step.done
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-border/60 bg-background group-hover:border-indigo-400'
                )}>
                  {step.done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-[13px] font-medium leading-tight',
                    step.done ? 'text-muted-foreground line-through' : 'text-foreground'
                  )}>
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed hidden sm:block">
                      {step.sublabel}
                    </p>
                  )}
                </div>

                {/* Arrow (mobile only, undone) */}
                {!step.done && (step.href || step.onClick) && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-indigo-500 transition-colors shrink-0 sm:hidden" />
                )}
              </div>
            )

            if (step.done || (!step.href && !step.onClick)) {
              return <div key={step.key}>{cardContent}</div>
            }
            if (step.href) {
              return <Link key={step.key} href={step.href} className="block h-full">{cardContent}</Link>
            }
            return (
              <button key={step.key} onClick={step.onClick!} className="block w-full text-left h-full">
                {cardContent}
              </button>
            )
          })}
        </div>

        {/* All done banner */}
        {allDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between px-4 py-3 border-t bg-indigo-500/5"
          >
            <p className="text-sm font-medium text-indigo-600">You're all set. Reattend is ready to go.</p>
            <button
              onClick={dismiss}
              disabled={dismissing}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Dismiss →
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
