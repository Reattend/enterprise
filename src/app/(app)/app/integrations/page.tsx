'use client'

// Integrations — live connector cockpit with the same wiring the
// NangoConnectPanel had (status / session / finalize / backfill /
// disconnect / sync / scope), restyled into a dense 3-column grid
// with real brand logos. Connect flow:
//   1. POST /api/integrations/nango/session → session_token
//   2. Open the Nango Connect popup with that token
//   3. POST /api/integrations/nango/finalize to register the connection
//   4. POST /api/integrations/nango/backfill so the first batch ingests
//
// Roadmap providers ship as flat cards with a "On roadmap" pill — no
// connect button.

import { useCallback, useEffect, useState } from 'react'
import {
  Loader2, RefreshCw, Plug, CheckCircle2, AlertCircle, Brain, Filter,
  ShieldCheck,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'
import { ProviderLogo } from '@/components/enterprise/provider-logo'
import { TriageReviewSheet } from '@/components/enterprise/triage-review-sheet'

type Provider = {
  key: string
  providerConfigKey: string
  name: string
  category: string
  description: string
  iconHint: string
  setupHint: string | null
  status: 'connected' | 'disconnected' | 'error'
  lastSyncedAt: string | null
  syncError: string | null
}

type StatusResp = { configured: boolean; providers: Provider[] }

interface RoadmapItem {
  iconHint: string
  name: string
  description: string
}

const ROADMAP: RoadmapItem[] = [
  { iconHint: 'teams',      name: 'Microsoft Teams', description: 'Meetings, channels, and files from Teams.' },
  { iconHint: 'sharepoint', name: 'SharePoint',      description: 'Document libraries and lists. OCR for scanned files.' },
  { iconHint: 'sap',        name: 'SAP',             description: 'Records and approvals from your ERP.' },
  { iconHint: 'jira',       name: 'Jira',            description: 'Tickets, comments, and decisions from project tracking.' },
]

function fmtSync(iso: string | null) {
  if (!iso) return 'never synced'
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diff < 1) return 'just synced'
  if (diff < 60) return `synced ${diff} min ago`
  if (diff < 24 * 60) return `synced ${Math.floor(diff / 60)}h ago`
  return `synced ${d.toLocaleDateString()}`
}

export default function IntegrationsPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const activeOrg = useAppStore((s) => s.enterpriseOrgs).find((o) => o.orgId === activeOrgId)
  const isAdmin = activeOrg && (activeOrg.role === 'super_admin' || activeOrg.role === 'admin')

  const [data, setData] = useState<StatusResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [scopeFor, setScopeFor] = useState<Provider | null>(null)
  const [triageOpen, setTriageOpen] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/nango/status')
      if (!res.ok) { setData({ configured: false, providers: [] }); return }
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // Re-fetch when the tab regains focus — tokens may have been mutated
  // in another tab (Connect popup, OAuth redirect) and we want the cards
  // to reflect that immediately without a manual refresh.
  useEffect(() => {
    const onFocus = () => fetchStatus()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
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

      const mod: any = await import('@nangohq/frontend')
      const Nango = mod.default ?? mod.Nango ?? mod
      const client = new Nango({
        host: session.host,
        connectSessionToken: session.sessionToken,
      })

      try {
        await client.auth(session.providerConfigKey)
      } catch (authErr: any) {
        if (authErr?.type === 'authorization_cancelled' || authErr?.message?.includes('cancel')) return
        throw authErr
      }

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
          const bd = await backfillRes.json()
          toast.success(`Backfill done · ${bd.added} new, ${bd.skipped} already-seen, ${bd.filtered} filtered`)
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
      const sd = await res.json()
      toast.success(`Sync done: ${sd.added} new, ${sd.skipped} already-seen`)
      fetchStatus()
    } finally {
      setSyncing(null)
    }
  }

  const providers = data?.providers ?? []
  const connectedCount = providers.filter((p) => p.status === 'connected').length

  return (
    <div className="int-page-wrap">
      <div className="int-page">
        <div className="int-head">
          <div>
            <span className="int-crumb">
              <Plug size={9} strokeWidth={2} /> Integrations
            </span>
            <h1>Pull memory in automatically</h1>
            <p className="sub">
              Reattend auto-captures from the tools your org lives in. OAuth once per user; the AI triages every record before it becomes memory; department RBAC always respected.
            </p>
          </div>
          {isAdmin && activeOrgId && (
            <button
              type="button"
              onClick={() => setTriageOpen(true)}
              className="int-triage-btn"
            >
              <Brain size={13} strokeWidth={1.8} />
              Triage queue
            </button>
          )}
        </div>

        {/* Active providers */}
        <div className="int-sec-head">
          {data?.configured ? 'Enterprise integrations' : 'Connectors'}
          <span className="meta">
            {data?.configured && connectedCount > 0
              ? `${connectedCount} connected · ${providers.length} available`
              : data?.configured
                ? `${providers.length} available`
                : 'awaiting tenant provisioning'}
          </span>
        </div>

        {loading ? (
          <div className="int-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="int-card" style={{ minHeight: 132 }}>
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--ink-3)' }} />
              </div>
            ))}
          </div>
        ) : !data?.configured ? (
          <div className="int-empty-card">
            <span className="glyph"><Plug size={18} /></span>
            <h3>Connectors are being enabled for your tenant</h3>
            <p>
              Gmail, Drive, Slack, Notion, and Confluence connectors will appear here as soon as your tenant is provisioned. No action required from your team. Need this turned on now? Email <a href="mailto:support@reattend.com" style={{ color: 'var(--brand-ink)' }}>support@reattend.com</a>.
            </p>
          </div>
        ) : (
          <div className="int-grid">
            {providers.map((p) => {
              const isConn = p.status === 'connected'
              const isErr = p.status === 'error'
              const isConnecting = connecting === p.key
              const isSyncing = syncing === p.key
              return (
                <div key={p.key} className={`int-card ${isConn ? 'connected' : ''} ${isErr ? 'error' : ''}`}>
                  <div className="int-card-head">
                    <div className="int-logo">
                      <ProviderLogo hint={p.iconHint} className="h-5 w-5" />
                    </div>
                    <div className="int-card-body">
                      <div className="int-card-name">
                        {p.name}
                        {isConn && (
                          <span className="int-status-pill connected">
                            <CheckCircle2 size={9} /> Live
                          </span>
                        )}
                        {isErr && (
                          <span className="int-status-pill error">
                            <AlertCircle size={9} /> Error
                          </span>
                        )}
                      </div>
                      <div className="int-card-desc">{p.description}</div>
                      {isConn && (
                        <div className="int-meta-line">{fmtSync(p.lastSyncedAt)}</div>
                      )}
                      {p.syncError && (
                        <div className="int-error-line">{p.syncError}</div>
                      )}
                    </div>
                  </div>

                  {isConn && p.setupHint && (
                    <div className="int-setup-hint">
                      <b>Setup: </b>{p.setupHint}
                    </div>
                  )}

                  <div className="int-actions">
                    {isConn ? (
                      <>
                        <button
                          type="button"
                          className="int-btn"
                          onClick={() => handleSync(p)}
                          disabled={isSyncing}
                        >
                          {isSyncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                          Sync now
                        </button>
                        <button
                          type="button"
                          className="int-btn"
                          onClick={() => setScopeFor(p)}
                        >
                          <Filter size={11} /> Scope
                        </button>
                        <button
                          type="button"
                          className="int-btn danger"
                          onClick={() => handleDisconnect(p)}
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="int-btn primary"
                        onClick={() => handleConnect(p)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? <Loader2 size={11} className="animate-spin" /> : <Plug size={11} />}
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Roadmap */}
        <div className="int-sec-head">
          On the roadmap
          <span className="meta">{ROADMAP.length} planned</span>
        </div>
        <div className="int-grid">
          {ROADMAP.map((r) => (
            <div key={r.iconHint} className="int-card">
              <div className="int-card-head">
                <div className="int-logo">
                  <ProviderLogo hint={r.iconHint} className="h-5 w-5" />
                </div>
                <div className="int-card-body">
                  <div className="int-card-name">
                    {r.name}
                    <span className="int-status-pill roadmap">On roadmap</span>
                  </div>
                  <div className="int-card-desc">{r.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Security */}
        <div className="int-security">
          <ShieldCheck size={14} strokeWidth={1.8} />
          <div style={{ flex: 1 }}>
            <h3>Security model</h3>
            <ul>
              <li>OAuth tokens scoped to the minimum needed — read-only, optionally per-label / per-channel.</li>
              <li>Every sync event is logged to the audit trail with actor + timestamp.</li>
              <li>Record visibility respects department RBAC — a Gmail thread from finance only shows to the finance dept.</li>
              <li>On-premise deployment available on the Enterprise plan — the entire ingestion pipeline runs inside your network; no data leaves your tenant.</li>
            </ul>
          </div>
        </div>
      </div>

      {isAdmin && activeOrgId && (
        <TriageReviewSheet orgId={activeOrgId} open={triageOpen} onOpenChange={setTriageOpen} />
      )}

      <ScopeDialog
        provider={scopeFor}
        onOpenChange={(v) => !v && setScopeFor(null)}
      />
    </div>
  )
}

// ─── Scope editor dialog ─── (preserved verbatim from nango-connect-panel)
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

  const hints = ({
    'gmail-nango': { includeHint: 'decision, approved, q4', excludeHint: 'marketing, newsletter', domainLabel: 'Only keep emails touching these domains' },
    'google-drive-nango': { includeHint: 'roadmap, spec', excludeHint: 'archive, obsolete', domainLabel: 'Filenames or titles must contain' },
    'google-calendar-nango': { includeHint: 'review, planning, decision', excludeHint: 'lunch, 1:1', domainLabel: 'Only meetings with attendees from' },
    'slack-nango': { includeHint: 'decision, ship', excludeHint: 'lunch, fun', domainLabel: 'Only keep messages mentioning' },
    'notion-nango': { includeHint: 'spec, decision', excludeHint: 'draft, scratch', domainLabel: 'Page title must contain' },
    'github-nango': { includeHint: 'design, RFC, breaking', excludeHint: 'WIP, dependabot, typo', domainLabel: 'Only repos containing' },
    'linear-nango': { includeHint: 'spec, decision, RFC', excludeHint: 'duplicate, wontfix', domainLabel: 'Only teams containing' },
    'confluence-nango': { includeHint: 'policy, runbook', excludeHint: 'sandbox', domainLabel: 'Space key must contain' },
    'jira-nango': { includeHint: 'spec, decision, RFC, blocker', excludeHint: 'duplicate, wontfix, dupe', domainLabel: 'Only projects containing' },
  } as Record<string, { includeHint: string; excludeHint: string; domainLabel: string }>)[provider.key] || { includeHint: 'keyword1, keyword2', excludeHint: '', domainLabel: 'Must contain' }

  return (
    <Dialog open={!!provider} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Scope for {provider.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Only records matching these filters will be stored. Applied at ingest — rejected records never hit your workspace.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
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
