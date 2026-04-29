'use client'

// The Enterprise Integrations panel. Powered by Nango.
//
// Shows five first-class providers (Gmail, Drive, Slack, Notion, Confluence),
// each with a Connect / Disconnect button. Connect flow:
//   1. POST /api/integrations/nango/session → returns a one-time session_token
//   2. Open the Nango Connect UI via @nangohq/frontend with that token
//   3. On success, kick /api/integrations/nango/sync so the first batch of
//      records ingests immediately instead of waiting for Nango's cron.

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Loader2,
  RefreshCw,
  Plug,
  CheckCircle2,
  AlertCircle,
  Zap,
  Filter,
} from 'lucide-react'

type Provider = {
  key: string
  providerConfigKey: string
  name: string
  category: string
  description: string
  iconHint: string
  status: 'connected' | 'disconnected' | 'error'
  lastSyncedAt: string | null
  syncError: string | null
}

type StatusResp = {
  configured: boolean
  providers: Provider[]
}

// Minimal inline icon set — keeps us from hauling in a separate icon package.
function ProviderIcon({ hint, className = 'h-6 w-6' }: { hint: string; className?: string }) {
  if (hint === 'gmail') return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22 6L12 13L2 6V4l10 7L22 4v2z" fill="#EA4335" />
      <path d="M2 6v12a2 2 0 002 2h2V8.5L12 13l6-4.5V20h2a2 2 0 002-2V6l-2-2-8 6-8-6-2 2z" fill="#EA4335" />
      <path d="M2 6l10 7V20H4a2 2 0 01-2-2V6z" fill="#FBBC05" />
      <path d="M22 6l-10 7V20h8a2 2 0 002-2V6z" fill="#34A853" />
    </svg>
  )
  if (hint === 'drive') return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M7.71 3.52L1.15 15l3.07 5.48L10.77 9 7.71 3.52z" fill="#0066DA" />
      <path d="M12 9l-6.55 11.48h13.1L25.1 9H12z" fill="#EA4335" transform="translate(-1.1 0)" />
      <path d="M22.85 15L16.29 3.52H8.72L15.28 15h7.57z" fill="#00AC47" />
    </svg>
  )
  if (hint === 'slack') return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" fill="#E01E5A" />
      <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" fill="#36C5F0" />
      <path d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312z" fill="#2EB67D" />
      <path d="M15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" fill="#ECB22E" />
    </svg>
  )
  if (hint === 'notion') return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.46 2.35c-.42-.326-.98-.7-2.055-.607L3.01 2.96c-.467.047-.56.28-.374.466l1.823 1.782zm.793 3.358v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.047.934-.56.934-1.167V6.634c0-.607-.233-.933-.747-.887l-15.177.887c-.56.047-.747.327-.747.932zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.934-.234-1.495-.933l-4.577-7.186v6.953l1.449.327s0 .84-1.168.84l-3.222.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.747-1.073l3.456-.234 4.764 7.28V9.388l-1.215-.14c-.093-.514.28-.887.747-.933l3.268-.187z" />
    </svg>
  )
  if (hint === 'confluence') return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M2 17.5c-.6-.9.3-2.1 1.3-2.7 4.1-2.6 8.7-2.4 12.9.1 1.1.7 2 1.7 1.4 2.8-.4.8-1.3 1-2.1.5-3.3-1.9-6.9-2.1-10.3-.3-.9.5-2.1.5-2.8 0-.2-.1-.3-.3-.4-.4z" fill="#0052CC" />
      <path d="M22 6.5c.6.9-.3 2.1-1.3 2.7-4.1 2.6-8.7 2.4-12.9-.1-1.1-.7-2-1.7-1.4-2.8.4-.8 1.3-1 2.1-.5 3.3 1.9 6.9 2.1 10.3.3.9-.5 2.1-.5 2.8 0 .2.1.3.3.4.4z" fill="#2684FF" />
    </svg>
  )
  if (hint === 'calendar') return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" fill="#FFFFFF" stroke="#4285F4" strokeWidth="1.5" />
      <rect x="3" y="5" width="18" height="4" rx="2" fill="#4285F4" />
      <line x1="8" y1="3" x2="8" y2="7" stroke="#1A73E8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="3" x2="16" y2="7" stroke="#1A73E8" strokeWidth="1.5" strokeLinecap="round" />
      <text x="12" y="18" textAnchor="middle" fontSize="9" fontWeight="600" fill="#4285F4">31</text>
    </svg>
  )
  return <Plug className={className} />
}

export function NangoConnectPanel() {
  const [data, setData] = useState<StatusResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [scopeForProvider, setScopeForProvider] = useState<Provider | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/nango/status')
      if (!res.ok) {
        setData({ configured: false, providers: [] })
        return
      }
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleConnect = async (provider: Provider) => {
    setConnecting(provider.key)
    try {
      const sessionRes = await fetch('/api/integrations/nango/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerKey: provider.key }),
      })
      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({}))
        toast.error(err.error || 'Failed to create Nango session')
        return
      }
      const session = await sessionRes.json()

      // Dynamic import keeps the Nango frontend bundle out of pages that
      // don't need it. We use the classic auth() popup flow rather than
      // openConnectUI() — the latter loads its iframe from connect.nango.dev
      // by default, which doesn't know about our self-hosted instance.
      // auth() goes straight to <our nango>/oauth/connect/<provider>, opens
      // the provider's own consent screen in a popup, and resolves on success.
      const mod: any = await import('@nangohq/frontend')
      const Nango = mod.default ?? mod.Nango ?? mod
      const client = new Nango({
        host: session.host,
        connectSessionToken: session.sessionToken,
      })

      try {
        // Don't pass a connection_id — when using session tokens, Nango
        // generates its own. We recover it via /finalize below.
        await client.auth(session.providerConfigKey)
      } catch (authErr: any) {
        // User closed popup or denied consent — non-fatal, just stop.
        if (authErr?.type === 'authorization_cancelled' || authErr?.message?.includes('cancel')) {
          return
        }
        throw authErr
      }

      // Finalize: ask Nango for the auto-generated connection_id and persist
      // an integrations_connections row with status='connected'. We don't
      // wait for the auth webhook because it can race with the backfill below.
      const finalizeRes = await fetch('/api/integrations/nango/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerKey: provider.key }),
      })
      if (!finalizeRes.ok) {
        const err = await finalizeRes.json().catch(() => ({}))
        toast.error(err.error || 'Connected to provider but failed to register the connection — try Sync now from the panel.')
        fetchStatus()
        return
      }

      toast.success(`${provider.name} connected — running backfill…`)
      try {
        const backfillRes = await fetch('/api/integrations/nango/backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerKey: provider.key }),
        })
        if (backfillRes.ok) {
          const data = await backfillRes.json()
          toast.success(`Backfill done · ${data.added} new, ${data.skipped} already-seen, ${data.filtered} filtered`)
        } else {
          const err = await backfillRes.json().catch(() => ({}))
          toast.error(err.error || 'Backfill failed — check the Inbox or click Sync now to retry.')
        }
      } catch { /* non-fatal */ }
      fetchStatus()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to open OAuth flow')
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (provider: Provider) => {
    if (!confirm(`Disconnect ${provider.name}? New messages will stop syncing. Existing memories are preserved.`)) return
    try {
      const res = await fetch('/api/integrations/nango/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerKey: provider.key }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to disconnect')
        return
      }
      toast.success(`${provider.name} disconnected`)
      fetchStatus()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to disconnect')
    }
  }

  const handleSync = async (provider: Provider) => {
    setSyncing(provider.key)
    try {
      const res = await fetch('/api/integrations/nango/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerKey: provider.key }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Sync failed')
        return
      }
      const data = await res.json()
      toast.success(`Sync done: ${data.added} new, ${data.skipped} already-seen`)
      fetchStatus()
    } finally {
      setSyncing(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading integrations…
        </div>
      </div>
    )
  }

  // Connectors not yet provisioned — show a friendly "coming online" card
  // instead of a panel full of disabled buttons. The customer's admin can't
  // self-serve this; provisioning happens on our infra (one-time, by us).
  if (!data?.configured) {
    return (
      <div className="rounded-2xl border bg-card p-6 mb-6 text-center">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-base font-semibold tracking-tight mb-1">Connectors are being enabled for your tenant</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Gmail, Drive, Slack, Notion, and Confluence connectors will appear here as soon as your
          tenant is provisioned. No action required from your team.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-3">
          Need this turned on now? Email <a href="mailto:support@reattend.com" className="underline">support@reattend.com</a>.
        </p>
      </div>
    )
  }

  const anyConnected = data?.providers.some((p) => p.status === 'connected')

  return (
    <div className="rounded-2xl border bg-card mb-6 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Enterprise Integrations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              One-click OAuth + auto-sync into your org memory. Tokens stay on your tenant.
            </p>
          </div>
        </div>
        {anyConnected && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {data?.providers.filter((p) => p.status === 'connected').length} connected
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
        {data?.providers.map((p, i) => {
          const isConnected = p.status === 'connected'
          const isConnecting = connecting === p.key
          const isSyncing = syncing === p.key
          const rowBorder = i >= 2 ? 'md:border-t' : ''
          return (
            <div key={p.key} className={`p-4 ${rowBorder}`}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <ProviderIcon hint={p.iconHint} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{p.name}</h3>
                    {isConnected && (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Connected
                      </Badge>
                    )}
                    {p.status === 'error' && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertCircle className="h-2.5 w-2.5" /> Error
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                  {p.lastSyncedAt && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Last sync {new Date(p.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                  {p.syncError && (
                    <p className="text-[10px] text-red-500 mt-1 line-clamp-2">{p.syncError}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {isConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(p)}
                      disabled={isSyncing}
                      className="text-xs h-7"
                    >
                      {isSyncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Sync now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScopeForProvider(p)}
                      className="text-xs h-7"
                    >
                      <Filter className="h-3 w-3 mr-1" /> Scope
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(p)}
                      className="text-xs h-7 text-muted-foreground hover:text-destructive"
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(p)}
                    disabled={!data?.configured || isConnecting}
                    className="text-xs h-7"
                  >
                    {isConnecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plug className="h-3 w-3 mr-1" />}
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ScopeDialog
        provider={scopeForProvider}
        onOpenChange={(v) => !v && setScopeForProvider(null)}
      />
    </div>
  )
}

// ─── Scope editor dialog ───────────────────────────────────
// User-configurable per-connection filters. Values are applied at INGEST
// time (src/lib/integrations/nango/ingest.ts → passesScope) so rejected
// records never enter the workspace. Very useful for Gmail where the user
// wants "only threads from @acme.com" or Slack "only #eng channels".

function ScopeDialog({
  provider, onOpenChange,
}: {
  provider: Provider | null
  onOpenChange: (v: boolean) => void
}) {
  const [include, setInclude] = useState('')
  const [exclude, setExclude] = useState('')
  const [domains, setDomains] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!provider) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/integrations/nango/scope?providerKey=${provider.key}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const s = data.scope || {}
        setInclude((s.includeTerms || []).join(', '))
        setExclude((s.excludeTerms || []).join(', '))
        setDomains((s.domainWhitelist || []).join(', '))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [provider])

  if (!provider) return null

  const parse = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/integrations/nango/scope', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerKey: provider.key,
          scope: {
            includeTerms: parse(include),
            excludeTerms: parse(exclude),
            domainWhitelist: parse(domains),
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Save failed')
        return
      }
      toast.success('Scope saved — applies to next sync')
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  // Provider-tuned helper copy
  const hints = {
    'gmail-nango': { includeHint: 'decision, approved, q4', excludeHint: 'marketing, newsletter', domainLabel: 'Only keep emails touching these domains' },
    'google-drive-nango': { includeHint: 'roadmap, spec', excludeHint: 'archive, obsolete', domainLabel: 'Filenames or titles must contain' },
    'google-calendar-nango': { includeHint: 'review, planning, decision', excludeHint: 'lunch, 1:1', domainLabel: 'Only meetings with attendees from' },
    'slack-nango': { includeHint: 'decision, ship', excludeHint: 'lunch, fun', domainLabel: 'Only keep messages mentioning' },
    'notion-nango': { includeHint: 'spec, decision', excludeHint: 'draft, scratch', domainLabel: 'Page title must contain' },
    'confluence-nango': { includeHint: 'policy, runbook', excludeHint: 'sandbox', domainLabel: 'Space key must contain' },
  }[provider.key] || { includeHint: 'keyword1, keyword2', excludeHint: '', domainLabel: 'Must contain' }

  return (
    <Dialog open={!!provider} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Scope for {provider.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Only records matching these filters will be stored. Applied at ingest —
            rejected records never hit your workspace.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Include terms (comma-separated)</Label>
              <Input value={include} onChange={(e) => setInclude(e.target.value)} placeholder={hints.includeHint} className="h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Keep only records whose text contains any of these. Blank = everything.</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Exclude terms (comma-separated)</Label>
              <Input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder={hints.excludeHint} className="h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Drop records touching any of these. Applied before dedup.</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{hints.domainLabel}</Label>
              <Input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="acme.com, partner.io" className="h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Case-insensitive substring match. Blank = no domain restriction.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            Save scope
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
