'use client'

// "Bring in what you already have" - connect a tool or drop in files, and
// watch the memory count climb. Used by the personal onboarding wizard so a
// new account starts full instead of empty.
//
// Connecting runs the same steps as /app/integrations (session -> provider
// OAuth -> finalize -> backfill, which pulls the recent history); keep the
// two in step if that flow changes. Notes files (.md/.txt) are split into
// separate memories by the brain-dump parser; other files go through
// /api/upload, one memory each. The counter polls
// /api/me/first-look?counts=1 (no AI calls).

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Check, Loader2, Upload, Mail, HardDrive, CalendarDays, MessageSquare, FileText, ListChecks, Plug,
} from 'lucide-react'

type Provider = {
  key: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'error'
}

const ICONS: Record<string, typeof Plug> = {
  'gmail-nango': Mail,
  'google-drive-nango': HardDrive,
  'google-calendar-nango': CalendarDays,
  'slack-nango': MessageSquare,
  'notion-nango': FileText,
  'linear-nango': ListChecks,
}
// Most useful first for one person's memory.
const ORDER = ['notion-nango', 'google-drive-nango', 'google-calendar-nango', 'linear-nango', 'gmail-nango', 'slack-nango']
const ACCEPT = '.pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp'

function isNotes(f: File): boolean {
  return /\.(md|markdown|txt)$/i.test(f.name) || f.type === 'text/plain' || f.type === 'text/markdown'
}

// Brain-dump parse + commit for a notes file. Returns false when splitting
// is not possible (no AI yet, nothing extracted), so the caller uploads it
// whole instead.
async function splitIntoMemories(f: File, orgId: string | null): Promise<boolean> {
  const rawText = (await f.text()).slice(0, 20_000)
  if (!rawText.trim()) return false
  const scope = orgId ? { orgId } : {}
  const pre = await fetch('/api/enterprise/brain-dump', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText, ...scope }),
  })
  if (!pre.ok) return false
  const pj = await pre.json().catch(() => ({}))
  const items = (pj.preview?.items ?? pj.items ?? []) as unknown[]
  if (!items.length) return false
  const commit = await fetch('/api/enterprise/brain-dump', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText, commit: true, items, ...scope }),
  })
  return commit.ok
}

export function ImportSources({ orgId = null }: { orgId?: string | null }) {
  const [providers, setProviders] = useState<Provider[] | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [added, setAdded] = useState<Record<string, number>>({})
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [uploaded, setUploaded] = useState(0)
  const [counts, setCounts] = useState<{ memories: number; filing: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/nango/status')
      const d = res.ok ? await res.json() : null
      if (!d?.configured) { setProviders([]); return }
      const list = (d.providers as Provider[]).slice().sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))
      setProviders(list)
    } catch { setProviders([]) }
  }, [])

  const loadCounts = useCallback(async () => {
    try {
      const q = orgId ? `&orgId=${encodeURIComponent(orgId)}` : ''
      const res = await fetch(`/api/me/first-look?counts=1${q}`)
      if (res.ok) setCounts(await res.json())
    } catch { /* counter is a nicety */ }
  }, [orgId])

  useEffect(() => { loadProviders(); loadCounts() }, [loadProviders, loadCounts])
  useEffect(() => {
    const t = window.setInterval(loadCounts, 4000)
    return () => window.clearInterval(t)
  }, [loadCounts])

  async function connect(p: Provider) {
    setConnecting(p.key)
    try {
      const sessionRes = await fetch('/api/integrations/nango/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerKey: p.key }),
      })
      if (!sessionRes.ok) { toast.error((await sessionRes.json().catch(() => ({}))).error || `Could not start ${p.name}`); return }
      const session = await sessionRes.json()
      const mod: any = await import('@nangohq/frontend')
      const Nango = mod.default ?? mod.Nango ?? mod
      const client = new Nango({ host: session.host, connectSessionToken: session.sessionToken })
      try {
        await client.auth(session.providerConfigKey)
      } catch (e: any) {
        if (e?.type === 'authorization_cancelled' || e?.message?.includes('cancel')) return
        throw e
      }
      const fin = await fetch('/api/integrations/nango/finalize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerKey: p.key }),
      })
      if (!fin.ok) { toast.error(`${p.name} connected, but registering it failed. Try again from Integrations.`); return }
      setProviders((prev) => prev?.map((x) => (x.key === p.key ? { ...x, status: 'connected' } : x)) ?? prev)
      toast.success(`${p.name} connected. Reading what's already there…`)
      const bf = await fetch('/api/integrations/nango/backfill', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerKey: p.key }),
      }).catch(() => null)
      if (bf?.ok) {
        const d = await bf.json().catch(() => ({}))
        setAdded((a) => ({ ...a, [p.key]: Number(d.added ?? 0) }))
      }
      loadCounts()
    } catch (e: any) {
      toast.error(e?.message || `Could not connect ${p.name}`)
    } finally {
      setConnecting(null)
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return
    const list = Array.from(files)
    setUploading({ done: 0, total: list.length })
    let ok = 0
    for (let i = 0; i < list.length; i++) {
      try {
        // Notes-like text is split into separate decisions, actions and
        // facts (the brain-dump parser) - one memory per idea is what makes
        // First look worth opening. Everything else, or if splitting is not
        // available, goes through /api/upload as one memory per file.
        if (isNotes(list[i]) && (await splitIntoMemories(list[i], orgId))) { ok++ }
        else {
          const fd = new FormData()
          fd.append('file', list[i])
          if (orgId) fd.append('org_id', orgId)
          const res = await fetch('/api/upload', { method: 'POST', body: fd })
          if (res.ok) ok++
          else toast.error(`${list[i].name}: ${(await res.json().catch(() => ({}))).error || 'could not read this file'}`)
        }
      } catch { toast.error(`${list[i].name}: upload failed`) }
      setUploading({ done: i + 1, total: list.length })
    }
    setUploading(null)
    setUploaded((u) => u + ok)
    if (ok) toast.success(`${ok} file${ok === 1 ? '' : 's'} added. Filing now.`)
    if (fileRef.current) fileRef.current.value = ''
    loadCounts()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-3 flex items-center gap-3">
        <div className="text-[26px] font-bold text-[#1a1a2e] tabular-nums leading-none">{counts ? counts.memories.toLocaleString() : '-'}</div>
        <div className="text-[12.5px] text-gray-600 leading-snug">
          memories in Reattend
          {counts && counts.filing > 0 && <span className="block text-[#2563EB] font-medium">+ {counts.filing} being filed right now</span>}
        </div>
      </div>

      {providers === null ? (
        <div className="flex items-center gap-2 text-[12.5px] text-gray-500 py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your options…</div>
      ) : providers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {providers.map((p) => {
            const Icon = ICONS[p.key] ?? Plug
            const isConn = p.status === 'connected'
            return (
              <div key={p.key} className="rounded-xl border border-white/80 bg-white/70 p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#1a1a2e]/5 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-[#1a1a2e]" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[#1a1a2e]">{p.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {isConn ? (added[p.key] !== undefined ? `Connected · ${added[p.key]} added` : 'Connected') : p.description}
                  </div>
                </div>
                {isConn ? (
                  <span className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0"><Check className="h-4 w-4" /></span>
                ) : (
                  <button
                    type="button"
                    onClick={() => connect(p)}
                    disabled={!!connecting}
                    className="h-[30px] px-3 rounded-lg bg-[#1a1a2e] hover:bg-[#2d2b55] text-white text-[12px] font-semibold disabled:opacity-50 shrink-0 flex items-center gap-1"
                  >
                    {connecting === p.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Connect
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={!!uploading}
        className="w-full rounded-xl border-2 border-dashed border-[#1a1a2e]/15 hover:border-[#2563EB]/40 bg-white/50 px-4 py-4 text-center transition-colors disabled:opacity-60"
      >
        <div className="flex items-center justify-center gap-2 text-[13px] font-semibold text-[#1a1a2e]">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? `Adding ${uploading.done} of ${uploading.total}…` : 'Or add files: notes, PDFs, docs'}
        </div>
        <div className="text-[11.5px] text-gray-500 mt-0.5">
          {uploaded > 0 ? `${uploaded} added so far. Add more any time.` : 'PDF, Word, Excel, text, Markdown or images, up to 20MB each.'}
        </div>
      </button>
      <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files)} />
    </div>
  )
}
