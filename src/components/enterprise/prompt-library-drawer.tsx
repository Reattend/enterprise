'use client'

// Prompt Library — org-wide shared prompts.
//
// Opens as a slide-out drawer from any Ask page. Members browse, search,
// click to run. A "save this prompt" affordance lets anyone contribute.
// Usage count bubbles the most-loved prompts to the top.

import { useEffect, useState } from 'react'
import {
  X, BookMarked, Plus, Loader2, Copy, Check, Trash2, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Prompt {
  id: string
  title: string
  body: string
  tags: string[]
  usageCount: number
  createdByUserId: string
  createdAt: string
}

export function PromptLibraryDrawer({
  open, onOpenChange, orgId, onUse,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  orgId: string | null
  onUse: (body: string) => void
}) {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function load() {
    if (!orgId) return
    try {
      const res = await fetch(`/api/enterprise/prompts?orgId=${orgId}`)
      if (!res.ok) return
      const d = await res.json()
      setPrompts(d.prompts || [])
    } catch { /* silent */ }
  }

  useEffect(() => { if (open) load() }, [open, orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function savePrompt() {
    if (!orgId) return
    if (!title.trim() || !body.trim()) {
      toast.error('Title + body required')
      return
    }
    setSaving(true)
    try {
      const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await fetch('/api/enterprise/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, title: title.trim(), body: body.trim(), tags }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Save failed')
        return
      }
      toast.success('Prompt saved')
      setTitle(''); setBody(''); setTagsStr(''); setAddOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this prompt?')) return
    try {
      await fetch(`/api/enterprise/prompts/${id}`, { method: 'DELETE' })
      await load()
      toast.success('Deleted')
    } catch { /* silent */ }
  }

  async function use(p: Prompt) {
    onUse(p.body)
    // Bump usage count
    try {
      await fetch(`/api/enterprise/prompts/${p.id}`, { method: 'POST' })
    } catch { /* silent */ }
    onOpenChange(false)
  }

  function copyBody(p: Prompt) {
    navigator.clipboard.writeText(p.body)
    setCopiedId(p.id)
    setTimeout(() => setCopiedId(null), 1200)
  }

  const filtered = (prompts || []).filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return p.title.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  })

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={() => onOpenChange(false)} />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] z-50 bg-background border-l flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Prompt library</h2>
            {prompts && <span className="text-[11px] text-muted-foreground">({prompts.length})</span>}
          </div>
          <button onClick={() => onOpenChange(false)} className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {addOpen ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What this prompt does" disabled={saving} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Prompt body</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="The full prompt. Use placeholders like [customer name] if relevant." disabled={saving} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Tags (comma-separated)</label>
              <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="onboarding, renewal, pricing" disabled={saving} />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={savePrompt} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute top-2.5 left-2.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search prompts…"
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Button size="sm" className="w-full" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add prompt
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {prompts === null ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {prompts.length === 0 ? (
                    <>
                      <BookMarked className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No prompts yet</p>
                      <p className="text-xs mt-1 max-w-xs mx-auto">Shared prompts your team can reuse — "Draft a renewal email," "Summarize a customer's history." Save your first one.</p>
                    </>
                  ) : 'No matches'}
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((p) => (
                    <li key={p.id} className="p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">{p.title}</div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {p.tags.map((t) => (
                              <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                            ))}
                            {p.usageCount > 0 && (
                              <span className="text-[10px] text-muted-foreground">Used {p.usageCount} time{p.usageCount === 1 ? '' : 's'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{p.body}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" onClick={() => use(p)}>Use in Ask</Button>
                        <Button size="sm" variant="ghost" onClick={() => copyBody(p)}>
                          {copiedId === p.id ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                          Copy
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="text-destructive ml-auto">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
