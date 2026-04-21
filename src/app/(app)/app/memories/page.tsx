'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Brain, Search, Plus, Lock, Grid3X3, List, GanttChart, Network,
  Loader2, Paperclip, Upload, FileText, X, Scale, Users, Flame,
  Lightbulb, CircleCheckBig, PenLine, Mic, Share2, Copy, Check,
  Mail, SlidersHorizontal, Calendar, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { TourTooltip } from '@/components/app/tour-tooltip'
import { useRouter } from 'next/navigation'

type MemoryRecord = {
  id: string
  title: string
  type: string
  summary: string | null
  content: string | null
  confidence: number | null
  tags: string | null
  locked: boolean | null
  createdAt: string
  source?: string | null
}

type Project = {
  id: string
  name: string
  color: string | null
  isDefault: boolean | null
}

const typeColors: Record<string, string> = {
  decision: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  meeting: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  idea: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  insight: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  context: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  tasklike: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  note: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  transcript: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
}

const typeIcons: Record<string, any> = {
  decision: Scale, meeting: Users, idea: Flame, insight: Lightbulb,
  context: FileText, tasklike: CircleCheckBig, note: PenLine, transcript: Mic,
}

const sourceLabels: Record<string, string> = {
  gmail: 'Gmail',
  'google-calendar': 'Calendar',
  slack: 'Slack',
  manual: 'Manual',
}

const DATE_RANGES = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'decision', label: 'Decisions' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'idea', label: 'Ideas' },
  { value: 'insight', label: 'Insights' },
  { value: 'context', label: 'Context' },
  { value: 'tasklike', label: 'Tasks' },
  { value: 'note', label: 'Notes' },
  { value: 'transcript', label: 'Transcripts' },
]

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All sources' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'gmail', label: 'Gmail' },
  { value: 'google-calendar', label: 'Calendar' },
  { value: 'slack', label: 'Slack' },
]

function parseTags(tags: string | null): string[] {
  if (!tags) return []
  try { return JSON.parse(tags) } catch { return [] }
}

function formatRelativeDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.floor((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', ...(diff > 365 ? { year: 'numeric' } : {}) })
}

function groupByDate(recs: MemoryRecord[]) {
  const map = new Map<string, MemoryRecord[]>()
  for (const r of recs) {
    const key = new Date(r.createdAt).toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: formatRelativeDate(items[0].createdAt),
    key,
    items,
  }))
}

function MemoryTypeIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) {
  const Icon = typeIcons[type] || PenLine
  const bg = typeColors[type]?.split(' ').find(c => c.startsWith('bg-')) || 'bg-muted'
  const text = typeColors[type]?.split(' ').find(c => c.startsWith('text-')) || 'text-muted-foreground'
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <div className={cn('flex items-center justify-center rounded-lg shrink-0', dim, bg)}>
      <Icon className={cn(icon, text)} />
    </div>
  )
}

function SourceBadge({ source }: { source?: string | null }) {
  if (!source || source === 'manual') return null
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
      {sourceLabels[source] || source}
    </span>
  )
}

export default function MemoriesPage() {
  const router = useRouter()
  const [records, setRecords] = useState<MemoryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'timeline'>('timeline')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Share state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sharingRecord, setSharingRecord] = useState<MemoryRecord | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Create memory state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMode, setCreateMode] = useState<'text' | 'file'>('text')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Bulk import state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importFiles, setImportFiles] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ saved: number; total: number } | null>(null)
  const bulkInputRef = React.useRef<HTMLInputElement>(null)

  const handleBulkImport = async () => {
    if (importFiles.length === 0) return
    setImporting(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      importFiles.forEach(f => formData.append('files', f))
      const res = await fetch('/api/upload/bulk', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setImportResult({ saved: data.saved, total: data.total })
        toast.success(`${data.saved} memories imported successfully.`)
        fetchRecords()
        setTimeout(() => { setShowImportDialog(false); setImportFiles([]); setImportResult(null) }, 2000)
      } else {
        toast.error(data.error || 'Import failed')
      }
    } catch { toast.error('Import failed') }
    finally { setImporting(false) }
  }

  function buildUrl(off: number) {
    const p = new URLSearchParams({ limit: '50', offset: String(off) })
    if (typeFilter !== 'all') p.set('type', typeFilter)
    if (sourceFilter !== 'all') p.set('source', sourceFilter)
    if (dateRange !== 'all') p.set('dateRange', dateRange)
    return `/api/records?${p}`
  }

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(buildUrl(0))
      const data = await res.json()
      if (data.records) setRecords(data.records)
      if (data.total !== undefined) setTotal(data.total)
      setOffset(50)
    } catch {
      toast.error('Failed to load memories')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, sourceFilter, dateRange])

  // After a new memory is created, the background AI enrichment takes
  // ~30-60s to fill in title/summary/tags/entities. Poll that specific
  // record with backoff until either it's enriched (title !== 'Untitled')
  // or we hit the max attempts. No refresh required.
  const pollUntilEnriched = useCallback(async (recordId: string) => {
    const delays = [3000, 5000, 8000, 12000, 20000, 30000]
    for (const delay of delays) {
      await new Promise(resolve => setTimeout(resolve, delay))
      try {
        const res = await fetch(`/api/records/${recordId}`)
        if (!res.ok) continue
        const data = await res.json()
        const updated = data.record
        if (!updated) continue
        // Swap the placeholder row in-place with the enriched version
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updated } : r))
        // Done once we have a real title
        if (updated.title && updated.title !== 'Untitled' && updated.title.trim().length > 0) {
          return
        }
      } catch { /* retry on next tick */ }
    }
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await fetch(buildUrl(offset))
      const data = await res.json()
      if (data.records) setRecords(prev => [...prev, ...data.records])
      setOffset(prev => prev + 50)
    } catch {
      toast.error('Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      if (data.projects) setProjects(data.projects)
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchRecords()
  }, [typeFilter, sourceFilter, dateRange])

  useEffect(() => {
    fetchProjects()
  }, [])

  // Import shared memory
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const importToken = params.get('import')
    if (!importToken) return
    window.history.replaceState({}, '', '/app/memories')
    ;(async () => {
      try {
        const res = await fetch('/api/share/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: importToken }),
        })
        if (!res.ok) { toast.error('Share link not found or expired'); return }
        const data = await res.json()
        if (data.recordId) router.push(`/app/memories/${data.recordId}`)
      } catch { toast.error('Failed to import memory') }
    })()
  }, [])

  const openShareDialog = async (e: React.MouseEvent, record: MemoryRecord) => {
    e.preventDefault(); e.stopPropagation()
    setSharingRecord(record)
    setShareUrl(''); setShareEmail(''); setEmailSent(false); setCopied(false)
    setShareDialogOpen(true); setShareLoading(true)
    try {
      const res = await fetch('/api/records/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id }),
      })
      const data = await res.json()
      if (data.shareUrl) setShareUrl(data.shareUrl)
      else toast.error('Failed to create share link')
    } catch { toast.error('Failed to create share link') }
    finally { setShareLoading(false) }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    if (!shareEmail || !shareUrl || !sharingRecord) return
    setSendingEmail(true)
    try {
      const res = await fetch('/api/share/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: shareEmail, title: sharingRecord.title, summary: sharingRecord.summary, shareUrl }),
      })
      if (res.ok) { setEmailSent(true); toast.success('Email sent!') }
      else toast.error('Failed to send email')
    } catch { toast.error('Failed to send email') }
    finally { setSendingEmail(false) }
  }

  const handleCreateMemory = async () => {
    if (createMode === 'file') {
      if (!selectedFile) return
      setCreating(true)
      try {
        const formData = new FormData()
        formData.append('file', selectedFile)
        if (selectedProjectId) formData.append('project_id', selectedProjectId)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Failed to upload'); return }
        if (data.record) {
          setRecords(prev => [data.record, ...prev])
          // Auto-refresh this record as AI enrichment completes in background
          pollUntilEnriched(data.record.id)
        }
        toast.success('Memory saved successfully.')
        setShowCreateDialog(false); setNewContent(''); setSelectedFile(null); setSelectedProjectId(''); setCreateMode('text')
      } catch { toast.error('Failed to upload file') }
      finally { setCreating(false) }
      return
    }

    if (!newContent.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim(), project_id: selectedProjectId || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to create memory'); return }
      if (data.record) {
        setRecords(prev => [data.record, ...prev])
        // Auto-refresh this record as AI enrichment completes in background
        pollUntilEnriched(data.record.id)
      }
      toast.success('Memory saved successfully.')
      setShowCreateDialog(false); setNewContent(''); setSelectedProjectId('')
    } catch { toast.error('Failed to create memory') }
    finally { setCreating(false) }
  }

  const filtered = records.filter(r => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const tags = parseTags(r.tags)
    return r.title.toLowerCase().includes(q) ||
      (r.summary && r.summary.toLowerCase().includes(q)) ||
      tags.some(t => t.includes(q))
  })

  const activeFilterCount = [typeFilter !== 'all', sourceFilter !== 'all', dateRange !== 'all'].filter(Boolean).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-6xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <TourTooltip
            tourKey="memories"
            title="Your Memories"
            description="All your processed memories live here. Click one to see details, edit tags, or explore connections."
          >
            <h1 className="text-2xl font-bold tracking-tight">Memories</h1>
          </TourTooltip>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Loading...' : `${total.toLocaleString()} memories`}
            {activeFilterCount > 0 && !loading && (
              <span className="ml-1 text-primary font-medium">· {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">New Memory</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Type chips — decisions, insights, meetings were their own sidebar
          entries in Personal Reattend. In Enterprise they're lenses over
          memory. Graph stays a full page because the React-Flow canvas needs
          the screen. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'decision', label: 'Decisions' },
          { key: 'insight', label: 'Insights' },
          { key: 'meeting', label: 'Meetings' },
          { key: 'idea', label: 'Ideas' },
          { key: 'note', label: 'Notes' },
        ].map((t) => {
          const active = typeFilter === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {t.label}
            </button>
          )
        })}
        <div className="mx-2 h-4 w-px bg-border" />
        <Link
          href="/app/graph"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Network className="h-3 w-3" /> Graph view
        </Link>
      </div>

      {/* Search + Filter bar */}
      <div className="space-y-2">
        {/* Row 1: Search + view toggle + filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle (mobile) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(v => !v)}
            className={cn('flex items-center gap-1.5 h-9 sm:hidden shrink-0', filtersOpen && 'border-primary text-primary')}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* View mode + filters inline on desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <DateRangePills value={dateRange} onChange={setDateRange} />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} onBoard={() => router.push('/app/board')} />
        </div>

        {/* Row 2: mobile filters (collapsible) */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden sm:hidden"
            >
              <div className="space-y-2 pt-1">
                <DateRangePills value={dateRange} onChange={setDateRange} />
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setTypeFilter('all'); setSourceFilter('all'); setDateRange('all') }}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Timeline view */}
      {!loading && viewMode === 'timeline' && (
        <div className="space-y-8">
          {groupByDate(filtered).map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {group.label}
                  </span>
                </div>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground/60 shrink-0">{group.items.length}</span>
              </div>

              <div className="relative pl-4 sm:pl-6">
                <div className="absolute left-1.5 sm:left-2.5 top-2 bottom-2 w-px bg-gradient-to-b from-border via-border to-transparent" />
                <div className="space-y-3">
                  {group.items.map((record, i) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="relative group/card"
                    >
                      <div className="absolute -left-[15px] sm:-left-[19px] top-4 h-3 w-3 rounded-full border-2 border-primary/50 bg-background group-hover/card:border-primary transition-colors" />
                      <Link href={`/app/memories/${record.id}`}>
                        <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              <MemoryTypeIcon type={record.type} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h3 className="font-medium text-sm group-hover/card:text-primary transition-colors line-clamp-2 leading-snug">
                                    {record.title}
                                  </h3>
                                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                    {record.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                    {parseTags(record.tags).includes('attachment') && <Paperclip className="h-3 w-3 text-primary/60" />}
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(record.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                                {record.summary && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                                    {record.summary}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge variant="secondary" className={cn('text-[10px] flex items-center gap-1', typeColors[record.type] || '')}>
                                    {(() => { const Icon = typeIcons[record.type] || PenLine; return <Icon className="h-2.5 w-2.5" /> })()}
                                    {record.type}
                                  </Badge>
                                  <SourceBadge source={record.source} />
                                  {parseTags(record.tags).filter(t => t !== 'attachment').slice(0, 3).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                      <button
                        onClick={(e) => openShareDialog(e, record)}
                        className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-md bg-background border border-border hover:bg-muted z-10"
                        title="Share"
                      >
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid view */}
      {!loading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((record, i) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className="relative group/card"
            >
              <Link href={`/app/memories/${record.id}`} className="block h-full">
                <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer h-full">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className={cn('text-[10px] flex items-center gap-1', typeColors[record.type] || '')}>
                        {(() => { const Icon = typeIcons[record.type] || PenLine; return <Icon className="h-3 w-3" /> })()}
                        {record.type}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <SourceBadge source={record.source} />
                        {record.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                    <h3 className="font-medium text-sm group-hover/card:text-primary transition-colors line-clamp-2 leading-snug mb-2">
                      {record.title}
                    </h3>
                    {record.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                        {record.summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1 flex-wrap min-w-0">
                        {parseTags(record.tags).filter(t => t !== 'attachment').slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <button
                onClick={(e) => openShareDialog(e, record)}
                className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-md bg-background border border-border hover:bg-muted z-10"
                title="Share"
              >
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && viewMode === 'list' && (
        <div className="space-y-2">
          {filtered.map((record, i) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="relative group/card"
            >
              <Link href={`/app/memories/${record.id}`}>
                <Card className="hover:shadow-sm hover:border-primary/20 transition-all cursor-pointer">
                  <CardContent className="p-3.5 flex gap-3">
                    <MemoryTypeIcon type={record.type} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm group-hover/card:text-primary transition-colors truncate">
                          {record.title}
                        </h3>
                        {parseTags(record.tags).includes('attachment') && <Paperclip className="h-3 w-3 text-primary/60 shrink-0" />}
                        {record.locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {record.summary || record.content || 'No summary'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className={cn('text-[10px]', typeColors[record.type] || '')}>
                          {record.type}
                        </Badge>
                        <SourceBadge source={record.source} />
                        {parseTags(record.tags).filter(t => t !== 'attachment').slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </CardContent>
                </Card>
              </Link>
              <button
                onClick={(e) => openShareDialog(e, record)}
                className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-md bg-background border border-border hover:bg-muted z-10"
                title="Share"
              >
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && records.length < total && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Load more ({total - records.length} remaining)
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {records.length === 0
              ? 'No memories yet. Create your first one!'
              : 'No memories match your filters.'}
          </p>
          {records.length === 0 ? (
            <Button className="mt-4" size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Memory
            </Button>
          ) : (
            <button
              onClick={() => { setTypeFilter('all'); setSourceFilter('all'); setDateRange('all'); setSearchQuery('') }}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={(open) => { setShareDialogOpen(open); if (!open) setEmailSent(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Memory
            </DialogTitle>
            <DialogDescription className="line-clamp-1">{sharingRecord?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Share link</label>
              {shareLoading ? (
                <div className="flex items-center gap-2 h-9">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Generating link...</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="text-xs font-mono" />
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0 gap-1.5">
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Send via email</label>
              {emailSent ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <Check className="h-4 w-4" /> Email sent!
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                    disabled={!shareUrl}
                  />
                  <Button size="sm" onClick={handleSendEmail} disabled={!shareEmail || !shareUrl || sendingEmail} className="shrink-0 gap-1.5">
                    {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Recipient can view and save this memory to their Reattend.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => { if (!open) { setImportFiles([]); setImportResult(null) }; setShowImportDialog(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Memories</DialogTitle>
            <DialogDescription>
              Upload text files, markdown notes, or meeting transcripts. Supports .txt, .md, .csv, .json files. Up to 50 files at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all"
              onClick={() => bulkInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary/60', 'bg-primary/5') }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-primary/60', 'bg-primary/5') }}
              onDrop={e => {
                e.preventDefault()
                e.currentTarget.classList.remove('border-primary/60', 'bg-primary/5')
                const files = Array.from(e.dataTransfer.files)
                setImportFiles(prev => [...prev, ...files].slice(0, 50))
              }}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Obsidian vault, Read.ai exports, Fireflies transcripts, any text files
              </p>
            </div>
            <input
              ref={bulkInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.markdown"
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || [])
                setImportFiles(prev => [...prev, ...files].slice(0, 50))
              }}
            />
            {importFiles.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground">{importFiles.length} file(s) selected</p>
                {importFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-2 py-1 bg-muted/30 rounded">
                    <span className="truncate">{f.name}</span>
                    <button onClick={() => setImportFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive ml-2">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {importResult && (
              <p className="text-sm text-green-600">{importResult.saved} of {importResult.total} files imported successfully.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={importFiles.length === 0 || importing}>
              {importing ? 'Importing...' : `Import ${importFiles.length} file(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Memory Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open)
        if (!open) { setCreateMode('text'); setSelectedFile(null); setNewContent('') }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              New Memory
            </DialogTitle>
            <DialogDescription>Add text or upload a document. AI enriches it in the background.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex border rounded-lg p-0.5 bg-muted/30">
              <button
                onClick={() => setCreateMode('text')}
                className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', createMode === 'text' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <FileText className="h-3.5 w-3.5" /> Text
              </button>
              <button
                onClick={() => setCreateMode('file')}
                className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', createMode === 'file' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Upload className="h-3.5 w-3.5" /> Upload File
              </button>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: p.color || '#6366f1' }} />
                        {p.name}{p.isDefault && ' (Default)'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {createMode === 'text' ? (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Content</label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g., Decided to use React Flow for the memory graph. It supports interactive nodes, edges, and canvas interactions..."
                  rows={5}
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Document</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,image/*"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Paperclip className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type || 'unknown'}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 p-8 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Click to upload a file</p>
                      <p className="text-xs text-muted-foreground mt-0.5">PDF, Word, text, images (max 20MB)</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateMemory}
              disabled={(createMode === 'text' ? !newContent.trim() : !selectedFile) || creating}
            >
              {creating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />{createMode === 'file' ? 'Uploading...' : 'Saving...'}</>
              ) : (
                <><Plus className="h-4 w-4 mr-1" />{createMode === 'file' ? 'Upload' : 'Submit'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function DateRangePills({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
      {DATE_RANGES.map(r => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
            value === r.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

function ViewToggle({ viewMode, setViewMode, onBoard }: { viewMode: string; setViewMode: (v: any) => void; onBoard: () => void }) {
  return (
    <div className="flex border rounded-md shrink-0">
      <Button variant={viewMode === 'timeline' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => setViewMode('timeline')} title="Timeline">
        <GanttChart className="h-4 w-4" />
      </Button>
      <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => setViewMode('grid')} title="Grid">
        <Grid3X3 className="h-4 w-4" />
      </Button>
      <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => setViewMode('list')} title="List">
        <List className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onBoard} title="Board">
        <Network className="h-4 w-4" />
      </Button>
    </div>
  )
}
