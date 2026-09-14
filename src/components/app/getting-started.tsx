'use client'

// "Get Reattend working" - the first-week checklist on both home pages.
//
// Every tick comes from real activity (GET /api/me/getting-started), so it
// fills itself in as people use the product - install the extension and the
// item ticks the next time the page gets focus. The next undone item is
// highlighted with its action; the rest are one-line links. Hidden once
// everything is done, or when the person dismisses it (per browser).

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Check, ChevronRight, Loader2, Sparkles, X } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import './getting-started.css'

type Items = {
  ai: boolean
  memory: boolean
  extension: boolean
  integration: boolean
  asked: boolean
  invited: boolean | null
}
type State = { context: 'personal' | 'org'; orgId: string | null; isOrgAdmin: boolean; trialUsed: boolean; items: Items }

type Row = {
  key: keyof Items
  title: string
  body: string
  cta?: { label: string; href?: string; onClick?: () => void }
  alt?: { label: string; href: string }
}

const DISMISS_KEY = (ctx: string) => `reattend:getting-started:dismissed:${ctx}`

export function GettingStarted() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const hydrated = useAppStore((s) => s.hasHydratedStore)
  const [state, setState] = useState<State | null>(null)
  const [dismissed, setDismissed] = useState(true)
  const [startingTrial, setStartingTrial] = useState(false)
  const ctxKey = activeOrgId ? `org:${activeOrgId}` : 'personal'

  const load = useCallback(async () => {
    try {
      const q = activeOrgId ? `?orgId=${encodeURIComponent(activeOrgId)}` : ''
      const res = await fetch(`/api/me/getting-started${q}`)
      if (res.ok) setState(await res.json())
    } catch { /* the checklist is optional - stay hidden */ }
  }, [activeOrgId])

  useEffect(() => {
    if (!hydrated) return
    try { setDismissed(window.localStorage.getItem(DISMISS_KEY(ctxKey)) === '1') } catch { setDismissed(false) }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [hydrated, ctxKey, load])

  async function startTrial() {
    if (startingTrial) return
    setStartingTrial(true)
    try {
      const res = await fetch('/api/billing/start-trial', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.message(data.message || 'The free trial has already been used on this account.'); return }
      toast.success(data.trialDays ? `Free trial started: ${data.trialDays} days, no card.` : 'Free trial started. No card needed.')
      window.dispatchEvent(new Event('reattend:billing-changed'))
      load()
    } catch {
      toast.error('Network error - try again')
    } finally {
      setStartingTrial(false)
    }
  }

  if (!state || dismissed) return null
  const { items, context, isOrgAdmin, orgId, trialUsed } = state
  const inOrg = context === 'org'

  const rows: Row[] = [
    {
      key: 'ai',
      title: 'Turn on the AI',
      body: inOrg
        ? (isOrgAdmin
          ? 'Start the Managed trial so everyone can ask right away, or connect one AI key for the whole organization.'
          : 'An admin of your organization needs to switch the AI on. Until then, questions are paused.')
        : 'Reattend needs an AI to answer and to file what you save. Try ours free, or connect your own key.',
      cta: inOrg && !isOrgAdmin
        ? undefined
        : trialUsed
          ? { label: 'Choose a plan', href: '/app/settings/billing' }
          : { label: startingTrial ? 'Starting…' : 'Start free trial', onClick: startTrial },
      alt: inOrg
        ? (isOrgAdmin && orgId ? { label: 'Connect a key', href: `/app/admin/${orgId}/settings#ai-provider` } : undefined)
        : { label: 'Use my own key', href: '/app/settings?tab=ai-provider' },
    },
    {
      key: 'memory',
      title: 'Save your first memory',
      body: 'Paste a meeting note, a decision or a few scattered thoughts. Reattend splits them up and files them.',
      cta: { label: 'Brain-dump', href: '/app/brain-dump' },
    },
    ...(inOrg && isOrgAdmin ? [{
      key: 'invited' as const,
      title: 'Invite your team',
      body: 'Shared memory works when everyone adds to it. Invite the people you work with most.',
      cta: { label: 'Invite people', href: `/app/admin/${orgId}/members` },
    }] : []),
    {
      key: 'extension',
      title: 'Add the browser extension',
      body: 'It saves what matters from the pages and email you read, and answers in a side panel while you work.',
      cta: { label: 'Get the extension', href: '/app/extension' },
    },
    {
      key: 'integration',
      title: 'Connect a tool you use',
      body: 'Notion, Linear and more, so memories arrive on their own instead of being typed in.',
      cta: { label: 'See integrations', href: '/app/integrations' },
    },
    {
      key: 'asked',
      title: 'Ask your first question',
      body: 'Try "What did I decide about…?" The answer shows which memories it came from.',
      cta: { label: 'Ask', href: '/app/ask' },
    },
  ]

  const done = rows.filter((r) => items[r.key] === true).length
  if (done === rows.length) return null
  const next = rows.find((r) => items[r.key] !== true)

  const dismiss = () => {
    setDismissed(true)
    try { window.localStorage.setItem(DISMISS_KEY(ctxKey), '1') } catch { /* ignore */ }
  }

  return (
    <section className="gs-card" aria-label="Getting started">
      <div className="gs-head">
        <div>
          <div className="gs-eyebrow"><Sparkles size={12} /> Getting started</div>
          <h2>Get Reattend working for you</h2>
        </div>
        <div className="gs-progress" aria-label={`${done} of ${rows.length} done`}>
          <span className="gs-count">{done} of {rows.length}</span>
          <span className="gs-bar"><span style={{ width: `${(done / rows.length) * 100}%` }} /></span>
        </div>
        <button type="button" className="gs-x" onClick={dismiss} title="Hide this" aria-label="Hide getting started">
          <X size={14} />
        </button>
      </div>

      <ol className="gs-list">
        {rows.map((r) => {
          const isDone = items[r.key] === true
          const isNext = r === next
          return (
            <li key={r.key} className={isDone ? 'is-done' : isNext ? 'is-next' : ''}>
              <span className="gs-tick">{isDone ? <Check size={12} strokeWidth={3} /> : null}</span>
              <div className="gs-text">
                <div className="gs-title">{r.title}</div>
                {isNext && <div className="gs-body">{r.body}</div>}
              </div>
              {!isDone && r.cta && (
                <div className="gs-actions">
                  {isNext && r.alt && <Link href={r.alt.href} className="gs-alt">{r.alt.label}</Link>}
                  {r.cta.href ? (
                    <Link href={r.cta.href} className={isNext ? 'gs-btn' : 'gs-link'}>
                      {r.cta.label} {!isNext && <ChevronRight size={13} />}
                    </Link>
                  ) : (
                    <button type="button" onClick={r.cta.onClick} className={isNext ? 'gs-btn' : 'gs-link'} disabled={startingTrial}>
                      {startingTrial && r.key === 'ai' ? <Loader2 size={13} className="animate-spin" /> : null}
                      {r.cta.label}
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {!inOrg && (
        <p className="gs-foot">
          Using Reattend with a team? <Link href="/app/admin/onboarding">Create an organization</Link>: 15 days free, no card.
        </p>
      )}
    </section>
  )
}
