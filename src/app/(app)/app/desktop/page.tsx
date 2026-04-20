'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Monitor,
  Apple,
  Download,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Shield,
  Zap,
  Brain,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ApiToken {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

export default function DesktopAppPage() {
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([])
  const [generatingToken, setGeneratingToken] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [tokenName, setTokenName] = useState('Desktop App')
  const [loading, setLoading] = useState(true)
  const [extensionDocsOpen, setExtensionDocsOpen] = useState(false)

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    try {
      const res = await fetch('/api/tray/tokens')
      const data = await res.json()
      if (data.tokens) setApiTokens(data.tokens)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateToken = async () => {
    setGeneratingToken(true)
    try {
      const res = await fetch('/api/tray/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tokenName || 'Desktop App' }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        setNewToken(data.token)
        setShowToken(true)
        setApiTokens(prev => [{ id: data.id, name: tokenName || 'Desktop App', prefix: data.prefix, lastUsedAt: null, createdAt: new Date().toISOString() }, ...prev])
        setTokenName('Desktop App')
        toast.success('Token generated — copy it now, it won\'t be shown again')
      } else {
        toast.error(data.error || 'Failed to generate token')
      }
    } catch {
      toast.error('Failed to generate token')
    } finally {
      setGeneratingToken(false)
    }
  }

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Revoke this token? Any device using it will lose access.')) return
    try {
      const res = await fetch('/api/tray/tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tokenId }),
      })
      if (res.ok) {
        setApiTokens(prev => prev.filter(t => t.id !== tokenId))
        toast.success('Token revoked')
      }
    } catch {
      toast.error('Failed to revoke token')
    }
  }

  const handleCopyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    }
  }

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-4xl"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <Monitor className="h-6 w-6 text-[#4F46E5]" />
          Install Reattend
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Install the Chrome extension to passively capture memories and get ambient recall while you work.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
          <div className="h-9 w-9 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
            <Brain className="h-4.5 w-4.5 text-[#4F46E5]" />
          </div>
          <div>
            <p className="text-sm font-semibold">Passive Capture</p>
            <p className="text-xs text-muted-foreground mt-0.5">Silently captures what you read and write. No manual work needed.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
          <div className="h-9 w-9 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
            <Zap className="h-4.5 w-4.5 text-[#4F46E5]" />
          </div>
          <div>
            <p className="text-sm font-semibold">Ambient Recall</p>
            <p className="text-xs text-muted-foreground mt-0.5">Surfaces relevant memories as you work, like Grammarly for your brain.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
          <div className="h-9 w-9 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
            <Shield className="h-4.5 w-4.5 text-[#4F46E5]" />
          </div>
          <div>
            <p className="text-sm font-semibold">Private & Smart</p>
            <p className="text-xs text-muted-foreground mt-0.5">Skips sensitive apps. AI filters noise so only meaningful content is saved.</p>
          </div>
        </div>
      </div>

      {/* Download Section */}
      <div className="grid grid-cols-3 gap-4">
        {/* Chrome Extension — primary */}
        <Card className="relative overflow-hidden ring-2 ring-emerald-500/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                <circle cx="12" cy="12" r="4" fill="white"/>
                <path d="M12 2a10 10 0 0 1 8.66 5H12V2z" fill="#EA4335"/>
                <path d="M20.66 7A10 10 0 0 1 12 22V12h8.66z" fill="#34A853" opacity="0.9"/>
                <path d="M12 22A10 10 0 0 1 3.34 7H12v15z" fill="#FBBC05" opacity="0.9"/>
              </svg>
              Chrome Extension
            </CardTitle>
            <CardDescription>
              Lightweight browser extension. No install needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="https://chromewebstore.google.com/detail/laadgmehnfecpdpooegebadmbhdbbjfh" target="_blank" rel="noopener">
              <Button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.25)]">
                <ExternalLink className="h-4 w-4 mr-2" />
                Add to Chrome
              </Button>
            </a>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setExtensionDocsOpen(true)}>
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Documentation
            </Button>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>v0.1.0</span>
              <Badge variant="secondary" className="text-[10px]">Chrome</Badge>
            </div>
          </CardContent>
        </Card>

        {/* macOS — coming soon */}
        <Card className="relative overflow-hidden opacity-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Apple className="h-5 w-5" />
              macOS
              <Badge variant="secondary" className="text-[10px] ml-auto">Coming Soon</Badge>
            </CardTitle>
            <CardDescription>
              Apple Silicon (M1/M2/M3/M4). Requires macOS 13+.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button disabled className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download for Mac
            </Button>
          </CardContent>
        </Card>

        {/* Windows — coming soon */}
        <Card className="relative overflow-hidden opacity-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
              </svg>
              Windows
              <Badge variant="secondary" className="text-[10px] ml-auto">Coming Soon</Badge>
            </CardTitle>
            <CardDescription>
              Windows 10/11 (64-bit).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button disabled className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download for Windows
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Chrome Extension Installation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="#4285F4"/>
              <circle cx="12" cy="12" r="4" fill="white"/>
              <path d="M12 2a10 10 0 0 1 8.66 5H12V2z" fill="#EA4335"/>
              <path d="M20.66 7A10 10 0 0 1 12 22V12h8.66z" fill="#34A853" opacity="0.9"/>
              <path d="M12 22A10 10 0 0 1 3.34 7H12v15z" fill="#FBBC05" opacity="0.9"/>
            </svg>
            Chrome Extension Installation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
                <div className="w-px flex-1 bg-border mt-1" />
              </div>
              <div className="pb-4">
                <p className="text-sm font-semibold">Download and unzip</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the download button above. Unzip the file to a folder on your computer.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
                <div className="w-px flex-1 bg-border mt-1" />
              </div>
              <div className="pb-4">
                <p className="text-sm font-semibold">Load in Chrome</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Open <code className="bg-background px-1.5 py-0.5 rounded text-[11px]">chrome://extensions</code>, enable &quot;Developer mode&quot; (top-right toggle), click &quot;Load unpacked&quot;, and select the unzipped folder.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</div>
              </div>
              <div>
                <p className="text-sm font-semibold">Connect your account</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the Reattend extension icon, then open Settings. Generate an API token below, paste it in the extension settings, and click Save.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> API Tokens
          </CardTitle>
          <CardDescription>
            Generate tokens to connect apps and extensions to your account. Each device should have its own token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generate token */}
          <div className="flex gap-2">
            <Input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Token name (e.g. MacBook Pro)"
              className="flex-1"
            />
            <Button onClick={handleGenerateToken} disabled={generatingToken} size="sm">
              {generatingToken ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Key className="h-3.5 w-3.5 mr-1.5" />}
              Generate Token
            </Button>
          </div>

          {/* Show new token */}
          {newToken && (
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-primary">Your new API token</p>
              <p className="text-xs text-muted-foreground">Copy this token now. It will not be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background border rounded-md px-3 py-2 text-xs font-mono break-all">
                  {showToken ? newToken : newToken.slice(0, 12) + '\u2022'.repeat(40)}
                </code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyToken}>
                  {tokenCopied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {tokenCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="text-xs mt-1" onClick={() => setNewToken(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {/* Active tokens list */}
          {apiTokens.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
              <Key className="h-5 w-5 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No API tokens yet. Generate one to connect the desktop app.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiTokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between py-2.5 px-3 rounded-md border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{token.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <code className="font-mono">{token.prefix}...</code>
                        {' · '}
                        {token.lastUsedAt ? `Last used ${formatTime(token.lastUsedAt)}` : 'Never used'}
                        {' · Created '}
                        {formatTime(token.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRevokeToken(token.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Chrome Extension Docs Dialog */}
      <Dialog open={extensionDocsOpen} onOpenChange={setExtensionDocsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2.5">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                <circle cx="12" cy="12" r="4" fill="white"/>
                <path d="M12 2a10 10 0 0 1 8.66 5H12V2z" fill="#EA4335"/>
                <path d="M20.66 7A10 10 0 0 1 12 22V12h8.66z" fill="#34A853" opacity="0.9"/>
                <path d="M12 22A10 10 0 0 1 3.34 7H12v15z" fill="#FBBC05" opacity="0.9"/>
              </svg>
              Chrome Extension — Full Guide
            </DialogTitle>
            <DialogDescription>
              Everything you need to install, connect, and use the Reattend browser extension.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="py-5 space-y-7 text-sm">

              {/* What it does */}
              <section>
                <h3 className="font-bold text-base mb-2">What the Extension Does</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Reattend Chrome extension is a lightweight background app that connects your browsing activity to your memory. It works in two directions: it passively captures important content as you browse, and it surfaces relevant memories when you&apos;re on a page related to something you&apos;ve already saved. Think of it as a second brain that runs in the background and keeps itself updated automatically.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Brain, color: 'text-[#4F46E5] bg-[#4F46E5]/10', title: 'Passive Capture', desc: 'Saves meaningful content as you browse without any manual action from you.' },
                    { icon: Zap, color: 'text-amber-600 bg-amber-500/10', title: 'Ambient Recall', desc: 'Shows a subtle overlay when the current page relates to saved memories.' },
                    { icon: BookOpen, color: 'text-sky-600 bg-sky-500/10', title: 'Ask Sidebar', desc: 'Ask questions about your memories without leaving your current tab.' },
                    { icon: Mic, color: 'text-pink-600 bg-pink-500/10', title: 'Meeting Recorder', desc: 'Record any browser-based meeting and get an AI transcript as a memory.' },
                  ].map(({ icon: Icon, color, title, desc }) => (
                    <div key={title} className="flex gap-3 p-3 rounded-lg border bg-card">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Installation */}
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Installation</h3>
                <div className="space-y-4">
                  {[
                    {
                      step: 'Add from Chrome Web Store',
                      desc: 'Click the "Add to Chrome" button above. You\'ll be taken to the Chrome Web Store listing. Click "Add to Chrome", then confirm the popup. The extension installs in seconds — no download or unzip needed.',
                    },
                    {
                      step: 'Pin the extension',
                      desc: 'After installation, click the puzzle icon (🧩) in Chrome\'s top-right corner. Find "Reattend" in the list and click the pin icon to keep it visible in your toolbar. This gives you one-click access to capture and the Ask sidebar.',
                    },
                    {
                      step: 'Generate an API token',
                      desc: 'Scroll down on this page to the API Tokens section. Name your token (e.g. "Chrome Extension") and click Generate Token. Copy the token immediately — it won\'t be shown again.',
                    },
                    {
                      step: 'Connect your account',
                      desc: 'Click the Reattend icon in your Chrome toolbar to open the extension. Go to Settings (gear icon) and paste your API token. Click Save. The extension will show your name and workspace when connected successfully.',
                    },
                    {
                      step: 'You\'re ready',
                      desc: 'The extension is now connected. Browsing normally will start building your memory. No further setup required.',
                    },
                  ].map(({ step, desc }, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                      <div>
                        <p className="text-xs font-semibold">{step}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Passive Capture */}
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Passive Capture — How It Works</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Passive capture runs silently as you browse. The extension reads the visible text on each page you visit and decides — using local AI — whether it&apos;s worth saving. It does not capture everything: it filters noise like navigation menus, ads, login pages, and social feeds.
                </p>
                <div className="space-y-2 mb-3">
                  <p className="text-xs font-semibold text-foreground">What gets captured:</p>
                  {[
                    'Articles and long-form content you spend time reading',
                    'Documentation pages (GitHub, Notion, Confluence, internal wikis)',
                    'Google Docs and Notion pages you have open',
                    'Email threads you read in Gmail web',
                    'Pages you manually clip using the extension toolbar',
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">What gets skipped automatically:</p>
                  {[
                    'Banking, finance, and payment sites',
                    'Password managers and authentication pages',
                    'Social media feeds (Twitter, Instagram, TikTok)',
                    'Pages you visit for less than 10 seconds',
                    'Any site you manually exclude in extension settings',
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/40 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Ambient Recall */}
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Ambient Recall</h3>
                <p className="text-muted-foreground leading-relaxed">
                  When you open a webpage that&apos;s semantically related to something you&apos;ve previously saved in Reattend, a small overlay appears in the bottom-right corner of the page. It shows the related memory title and a one-line summary. Clicking it opens the full memory in a sidebar without navigating away from the page. This is designed to be unobtrusive — it never blocks content and disappears if you ignore it.
                </p>
                <div className="rounded-lg bg-muted/50 p-3 mt-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Example</p>
                  <p>You saved a memory about your company&apos;s API rate limiting decision three weeks ago. Today you open the Stripe API docs. Ambient Recall shows: &quot;You have a memory about API rate limiting — Decision, 3 weeks ago.&quot;</p>
                </div>
              </section>

              {/* Ask Sidebar */}
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Ask Sidebar</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Click the Reattend icon in your toolbar to open the Ask sidebar. You can type any question and Reattend will search your memories to answer it — without opening a new tab. The sidebar stays open as you browse, so you can reference your memory while reading a page, taking notes, or in a meeting.
                </p>
                <div className="space-y-2">
                  {[
                    { q: '"What did we decide about the new pricing?"', note: 'Works from any tab, any context.' },
                    { q: '"Who owns the infrastructure work?"', note: 'Searches across all your memories.' },
                    { q: '"Summarise our Q1 goals."', note: 'Multi-memory synthesis.' },
                  ].map(({ q, note }, i) => (
                    <div key={i} className="pl-3 border-l-2 border-primary/20">
                      <p className="text-xs italic text-muted-foreground">{q}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{note}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Usage counts toward your monthly question limit (10/month free, unlimited on Pro).
                </p>
              </section>

              {/* Meeting Recorder */}
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Meeting Recorder</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  The extension can record audio from any browser-based meeting — Google Meet, Zoom web, Microsoft Teams web, or any other call that runs in Chrome. The recording is sent to Reattend&apos;s transcription service, processed with Whisper AI, and saved as a Transcript-type memory with full text and extracted action items.
                </p>
                <div className="space-y-3">
                  {[
                    { step: 'Join a meeting in Chrome', desc: 'Open Google Meet, Zoom web, or any browser-based video call.' },
                    { step: 'Click the Reattend icon → Record Meeting', desc: 'A recording indicator appears. All participants are being recorded — inform them per your local regulations.' },
                    { step: 'Stop recording when done', desc: 'Click Stop. The audio is uploaded to Reattend\'s servers for transcription. This takes 1–3 minutes depending on meeting length.' },
                    { step: 'Memory saved automatically', desc: 'The transcript appears in Memories as a Transcript-type record with the full text, a summary, and extracted action items. No Inbox review needed.' },
                  ].map(({ step, desc }, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-5 w-5 rounded-full bg-pink-500/10 text-pink-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                      <div>
                        <p className="text-xs font-semibold">{step}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 mt-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Recording consent notice</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    In many jurisdictions (including most US states and EU countries), all-party consent is required to record a conversation. Always inform meeting participants before starting a recording. Reattend is not responsible for compliance with local recording laws.
                  </p>
                </div>
              </section>

              {/* Privacy */}
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Privacy & Data</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'What is sent to Reattend servers', desc: 'The text content of pages you visit (after local filtering), meeting audio for transcription, and Ask queries.' },
                    { label: 'What stays local', desc: 'Raw page HTML, images, videos, form data, passwords, and anything on the skip list never leaves your browser.' },
                    { label: 'API token security', desc: 'Your API token is stored in Chrome\'s encrypted local storage. It\'s never exposed to any webpage you visit.' },
                    { label: 'Revoking access', desc: 'Go to Install → API Tokens and revoke your extension token. The extension will immediately stop syncing.' },
                    { label: 'Incognito mode', desc: 'The extension does not run in Incognito windows unless you explicitly enable it in Chrome\'s extension settings.' },
                  ].map(({ label, desc }) => (
                    <div key={label}>
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Troubleshooting */}
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Troubleshooting</h3>
                <div className="space-y-3">
                  {[
                    { q: 'Nothing is being captured', desc: 'Check that the extension is connected — open it and look for your name. If it shows "Not connected", your API token may have expired. Generate a new one and re-paste it in extension settings.' },
                    { q: 'The Ask sidebar shows no results', desc: 'Make sure you have memories saved first. If you\'re new, create a few manually and then try asking again.' },
                    { q: 'Recording button is greyed out', desc: 'The extension needs microphone permission. Click the extension icon → Settings → grant microphone access. Also make sure Chrome has microphone permission for the meeting site.' },
                    { q: 'Ambient recall is too noisy', desc: 'You can reduce sensitivity or disable it entirely from extension Settings → Ambient Recall → Off.' },
                  ].map(({ q, desc }) => (
                    <div key={q}>
                      <p className="text-xs font-semibold">{q}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="pb-4 pt-2 border-t text-center">
                <p className="text-xs text-muted-foreground">
                  Still stuck? Use the feedback button in the top bar to reach us directly.
                </p>
              </div>

            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
