'use client'

// /app/extension - Chrome extension install + API key management.
//
// Moved out of Settings' "API keys" tab into its own nav item 2026-09-01 -
// the extension is a primary capture surface for this product, not a
// buried settings tab. Replaces the old /app/downloads link (which 404'd -
// no page ever existed for that route, just the API behind it).

import { useEffect, useState } from 'react'
import {
  Key, Copy, Check, Eye, EyeOff, Chrome, Shield, Loader2, Trash2, Download, Puzzle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ApiToken {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

function formatLogTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function ExtensionPage() {
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([])
  const [tokenName, setTokenName] = useState('Chrome Extension')
  const [generatingToken, setGeneratingToken] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [loadingTokens, setLoadingTokens] = useState(true)

  useEffect(() => { fetchApiTokens() }, [])

  const fetchApiTokens = async () => {
    setLoadingTokens(true)
    try {
      const res = await fetch('/api/tray/tokens')
      const data = await res.json()
      if (data.tokens) setApiTokens(data.tokens)
    } catch {
      // silent
    } finally {
      setLoadingTokens(false)
    }
  }

  const handleGenerateToken = async () => {
    setGeneratingToken(true)
    try {
      const res = await fetch('/api/tray/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tokenName || 'Chrome Extension' }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        setNewToken(data.token)
        setShowToken(true)
        setApiTokens(prev => [{ id: data.id, name: tokenName || 'Chrome Extension', prefix: data.prefix, lastUsedAt: null, createdAt: new Date().toISOString() }, ...prev])
        setTokenName('Chrome Extension')
        toast.success('API key generated - copy it now, it won\'t be shown again')
      } else {
        toast.error(data.error || 'Failed to generate key')
      }
    } catch {
      toast.error('Failed to generate key')
    } finally {
      setGeneratingToken(false)
    }
  }

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Revoke this key? The extension using it will lose access immediately.')) return
    try {
      const res = await fetch('/api/tray/tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tokenId }),
      })
      if (res.ok) {
        setApiTokens(prev => prev.filter(t => t.id !== tokenId))
        toast.success('API key revoked')
      }
    } catch {
      toast.error('Failed to revoke key')
    }
  }

  const handleCopyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-[#4F46E5]" /> Extension
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Capture from anywhere in your browser - select text, right-click a page, or drop the pin. Free on every plan.
        </p>
      </div>

      {/* Install */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Chrome className="h-4 w-4 text-[#4F46E5]" /> Reattend for Chrome
          </CardTitle>
          <CardDescription>Not on the Chrome Web Store yet - install unpacked, takes about a minute.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button asChild>
              <a href="/api/download/reattend-extension.zip">
                <Download className="h-4 w-4 mr-1.5" /> Download extension
              </a>
            </Button>
          </div>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Unzip the download.</li>
            <li>Open <code className="bg-muted px-1 py-0.5 rounded text-[10px]">chrome://extensions</code>, turn on <strong>Developer mode</strong> (top right).</li>
            <li><strong>Load unpacked</strong> and select the unzipped folder.</li>
            <li>Generate a key below, open the extension&apos;s options page, and paste it in.</li>
          </ol>
        </CardContent>
      </Card>

      {/* Generate key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-[#4F46E5]" /> API key
          </CardTitle>
          <CardDescription>Authenticates the extension against your account. Revoke any time to cut access immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={tokenName}
                onChange={e => setTokenName(e.target.value)}
                placeholder="Key name (e.g. Chrome Extension)"
                className="flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleGenerateToken() }}
              />
              <Button onClick={handleGenerateToken} disabled={generatingToken}>
                {generatingToken ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Key className="h-4 w-4 mr-1.5" />}
                Generate
              </Button>
            </div>

            {newToken && (
              <div className="rounded-xl border border-[#4F46E5]/30 bg-[#4F46E5]/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#4F46E5]">Your new API key</p>
                  <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-500 bg-amber-500/5">
                    Copy now - shown once
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs bg-background border border-border rounded-lg px-3 py-2 truncate select-all">
                    {showToken ? newToken : '•'.repeat(40)}
                  </code>
                  <Button variant="ghost" size="icon" onClick={() => setShowToken(v => !v)}>
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" onClick={handleCopyToken} className="shrink-0">
                    {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste this into the extension&apos;s options page (base URL is already correct by default).
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Active keys
            {apiTokens.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{apiTokens.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Revoke a key to immediately block access from that client.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTokens ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : apiTokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-7 w-7 mx-auto mb-2 opacity-25" />
              <p className="text-sm">No API keys yet. Generate one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiTokens.map(token => (
                <div key={token.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
                      <Key className="h-3.5 w-3.5 text-[#4F46E5]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{token.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {token.prefix}••••••••
                        {token.lastUsedAt
                          ? <span className="font-sans ml-2 not-italic">· Last used {formatLogTime(token.lastUsedAt)}</span>
                          : <span className="font-sans ml-2 not-italic">· Never used</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[11px] text-muted-foreground/60">{formatLogTime(token.createdAt)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRevokeToken(token.id)}
                      title="Revoke key"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
