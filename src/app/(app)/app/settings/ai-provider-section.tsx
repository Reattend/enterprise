'use client'

// BYOK section on /app/settings - legacy-Personal-only as of 2026-08-25.
//
// Org accounts manage their AI key exclusively in the Control Room
// (/app/admin/[orgId]/settings, admin-only) - regular members never see
// any API-key UI at all, by explicit product decision ("employees need
// not see the API part"). This component only renders for the handful of
// pre-2026-08-25 accounts with no org at all; new signups always get an
// org, so they can never reach this. The parent Settings page hides the
// "AI Provider" tab entirely when the user has an active org - see
// page.tsx's activeEnterpriseOrgId check before rendering this.

import { useEffect, useState } from 'react'
import { Bot, Loader2, KeyRound, Trash2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type ProviderName = 'anthropic' | 'openai' | 'gemini'

const PROVIDER_LABELS: Record<ProviderName, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'OpenAI',
  gemini: 'Gemini (Google)',
}

interface KeyStatus {
  provider: ProviderName
  keyLast4: string
  status: 'unverified' | 'valid' | 'invalid'
  updatedAt: string
}

export function AiProviderSection() {
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState<KeyStatus | null>(null)
  const [provider, setProvider] = useState<ProviderName>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => { refresh() }, [])

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/me/ai-provider-key')
      if (!res.ok) return
      const data = await res.json() as { key: KeyStatus | null }
      setCurrent(data.key)
      if (data.key) setProvider(data.key.provider)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!apiKey.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/me/ai-provider-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || data.error || 'Could not verify that key')
        return
      }
      toast.success(`${PROVIDER_LABELS[provider]} key connected`)
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
      const res = await fetch('/api/me/ai-provider-key', { method: 'DELETE' })
      if (!res.ok) { toast.error('Could not remove key'); return }
      toast.success('Key removed')
      setCurrent(null)
      setApiKey('')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-[#4F46E5]" /> AI Provider
        </CardTitle>
        <CardDescription>
          Connect a key to use Ask, Capture, and every AI feature - free forever, the AI never
          touches our servers' budget, only yours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
          </div>
        ) : current ? (
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
              <Button variant="ghost" size="icon" onClick={handleRemove} disabled={removing} className="h-7 w-7">
                {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            </div>
          </div>
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
      </CardContent>
    </Card>
  )
}
