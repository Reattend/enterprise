'use client'

// Control Room · AI Provider - the only place an org's BYOK key lives.
// Admin-only end to end (page-level PermissionGate + org.manage on every
// route). Regular members never see any of this - no read-only view, no
// status, nothing. That's an explicit product decision ("employees need
// not see the API part"), not an oversight - see today.md 2026-08-25.

import { useEffect, useState } from 'react'
import { Loader2, KeyRound, Trash2, ShieldCheck, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type ProviderName = 'anthropic' | 'openai' | 'gemini'

const PROVIDER_LABELS: Record<ProviderName, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'OpenAI',
  gemini: 'Gemini (Google)',
}

interface OrgKeyDetail {
  provider: ProviderName
  keyLast4: string
  status: 'unverified' | 'valid' | 'invalid'
  updatedAt: string
  rateLimitPerMonth: number | null
  queriesThisMonth: number
  queriesResetAt: string | null
}

export function AiProviderAdminSection({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState<OrgKeyDetail | null>(null)
  const [provider, setProvider] = useState<ProviderName>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const [rateLimitInput, setRateLimitInput] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)

  const url = `/api/enterprise/organizations/${orgId}/ai-provider-key`

  useEffect(() => { refresh() }, [orgId])

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json() as { key: OrgKeyDetail | null }
      setCurrent(data.key)
      if (data.key) {
        setProvider(data.key.provider)
        setRateLimitInput(data.key.rateLimitPerMonth ? String(data.key.rateLimitPerMonth) : '')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!apiKey.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || data.error || 'Could not verify that key')
        return
      }
      toast.success(`${PROVIDER_LABELS[provider]} key connected - every member now uses this automatically`)
      setApiKey('')
      setCurrent(data.key)
    } catch {
      toast.error('Network error - try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (removing) return
    setRemoving(true)
    try {
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) { toast.error('Could not remove key'); return }
      toast.success('Key removed - members will see "connect an AI key" until a new one is set')
      setCurrent(null)
      setApiKey('')
      setRateLimitInput('')
    } finally {
      setRemoving(false)
    }
  }

  async function handleSaveLimit() {
    if (savingLimit) return
    setSavingLimit(true)
    try {
      const n = rateLimitInput.trim() ? parseInt(rateLimitInput, 10) : null
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rateLimitPerMonth: n }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || data.error || 'Could not update the limit')
        return
      }
      toast.success(n ? `Capped at ${n} queries/month` : 'Limit removed - unlimited')
      setCurrent(data.key)
    } catch {
      toast.error('Network error - try again')
    } finally {
      setSavingLimit(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {current ? (
        <>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{PROVIDER_LABELS[current.provider]}</p>
                <p className="text-xs text-muted-foreground font-mono">•••• {current.keyLast4}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={current.status === 'valid' ? 'text-emerald-600 border-emerald-400/40 bg-emerald-500/5 text-[10px]' : 'text-amber-600 border-amber-400/40 bg-amber-500/5 text-[10px]'}>
                {current.status === 'valid' ? 'Connected' : current.status}
              </Badge>
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={handleRemove} disabled={removing} className="h-7 w-7">
                  {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
              <Gauge className="h-3.5 w-3.5" /> Monthly rate limit
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Caps total org-wide queries against this key - protects your own {PROVIDER_LABELS[current.provider]} bill, not ours. Blank = unlimited.
              {current.queriesResetAt && ` Used ${current.queriesThisMonth}${current.rateLimitPerMonth ? ` / ${current.rateLimitPerMonth}` : ''} this month.`}
            </p>
            <div className="flex gap-2 max-w-xs">
              <Input
                type="number"
                min={1}
                value={rateLimitInput}
                onChange={e => setRateLimitInput(e.target.value)}
                placeholder="Unlimited"
                disabled={!canEdit}
              />
              {canEdit && (
                <Button variant="outline" onClick={handleSaveLimit} disabled={savingLimit}>
                  {savingLimit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </>
      ) : !canEdit ? (
        <p className="text-sm text-muted-foreground italic">No AI provider connected yet.</p>
      ) : (
        <div className="flex gap-2">
          <Select value={provider} onValueChange={v => setProvider(v as ProviderName)}>
            <SelectTrigger className="w-[170px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROVIDER_LABELS) as ProviderName[]).map(p => (
                <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Paste your API key"
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          />
          <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <KeyRound className="h-4 w-4 mr-1.5" />}
            Connect
          </Button>
        </div>
      )}
    </div>
  )
}
