'use client'

// Memories list — new dashboard design (Memories.html). Three views:
// timeline (default), grid, compact. All filters, share/create/import
// dialogs, and the share-import-on-mount flow are preserved verbatim.

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, Lock, Loader2, Paperclip, Upload, FileText, X,
  Scale, Users, Flame, Lightbulb, CircleCheckBig, PenLine, Mic, Share2,
  Copy, Check, Mail, Calendar, ChevronDown, Network, ChevronRight,
  ChevronLeft, LayoutList, LayoutGrid, Rows3, Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { emit, useRevalidate, SCOPES } from '@/lib/data-bus'
import { useAppStore } from '@/stores/app-store'

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

const TYPE_ICONS: Record<string, any> = {
  decision: Scale, meeting: Users, idea: Flame, insight: Lightbulb,
  context: FileText, tasklike: CircleCheckBig, note: PenLine, transcript: Mic,
}

const SOURCE_LABELS: Record<string, string> = {
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

// Category pills shown above the filter bar — quick lenses for common types.
const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'decision', label: 'Decisions' },
  { key: 'insight', label: 'Insights' },
  { key: 'meeting', label: 'Meetings' },
  { key: 'idea', label: 'Ideas' },
  { key: 'note', label: 'Notes' },
  { key: 'tasklike', label: 'Tasks' },
]

function parseTags(tags: string | null): string[] {
  if (!tags) return []
  try { return JSON.parse(tags) } catch { return [] }
}

function formatRelativeDay(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.floor((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000)
  if (diff === 0) return `Today · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  if (diff === 1) return `Yesterday · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  if (diff < 7) return `${d.toLocaleDateString('en-US', { weekday: 'long' })} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  if (diff < 30) return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = Math.floor((now - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  // For older items, show the time only when it's today, else short date.
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupByDate(recs: MemoryRecord[]) {
  const map = new Map<string, MemoryRecord[]>()
  for (const r of recs) {
    const key = new Date(r.createdAt).toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: formatRelativeDay(items[0].createdAt),
    key,
    items,
  }))
}

function MemIcon({ type, className }: { type: string; className?: string }) {
  const Icon = TYPE_ICONS[type] || PenLine
  return (
    <div className={cn('mem-ico', type, className)}>
      <Icon size={16} strokeWidth={1.8} />
    </div>
  )
}

function KindTag({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] || PenLine
  // Display label with first letter capitalized, fall back gracefully.
  const label = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Note'
  return (
    <span className={cn('mem-tag kind', type)}>
      <span className="dot" />
      {label}
    </span>
  )
}

const PAGE_SIZE = 50

export default function MemoriesPage() {
  const router = useRouter()
  // Active org from the store — passed to /api/records and /api/upload so
  // the create defaults to a team workspace instead of personal. Without
  // this the new memory only shows up under My memories, never on the
  // org wiki / landscape / cockpit.
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
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
  const [viewMode, setViewMode] = useState<'timeline' | 'grid' | 'compact'>('timeline')

  // Counts for category pills — derived from totals per type. We pull a quick
  // tally from the API so the badges feel honest without scanning all records.
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})

  // Personal-memories migration banner — shown when the user has memories in
  // their personal workspace that aren't visible to the active org. Caused by
  // the pre-fix routing bug where /api/records POST defaulted to personal.
  // The banner is the one-click escape hatch.
  const [importInfo, setImportInfo] = useState<{ count: number; targetName: string | null } | null>(null)
  const [migrating, setMigrating] = useState(false)

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bulk import state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importFiles, setImportFiles] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ saved: number; total: number } | null>(null)
  const [importDrag, setImportDrag] = useState(false)
  const bulkInputRef = useRef<HTMLInputElement>(null)

  function buildUrl(off: number) {
    const p = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) })
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
      if (data.typeCounts) setTypeCounts(data.typeCounts)
      setOffset(PAGE_SIZE)
    } catch {
      toast.error('Failed to load memories')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, sourceFilter, dateRange])

  // After a new memory is created, the background AI enrichment takes
  // ~30-60s to fill in title/summary/tags. Poll until enriched then swap.
  const pollUntilEnriched = useCallback(async (recordId: string) => {
    const delays = [3000, 5000, 8000, 12000, 20000, 30000]
    for (const delay of delays) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      try {
        const res = await fetch(`/api/records/${recordId}`)
        if (!res.ok) continue
        const data = await res.json()
        const updated = data.record
        if (!updated) continue
        setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, ...updated } : r)))
        if (updated.title && updated.title !== 'Untitled' && updated.title.trim().length > 0) return
      } catch { /* retry on next tick */ }
    }
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await fetch(buildUrl(offset))
      const data = await res.json()
      if (data.records) setRecords((prev) => [...prev, ...data.records])
      setOffset((prev) => prev + PAGE_SIZE)
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
  }, [typeFilter, sourceFilter, dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProjects()
  }, [])

  // Refetch when a memory is created elsewhere (brain-dump, share import,
  // chrome extension, etc.) or when the tab regains focus.
  useRevalidate([SCOPES.memories], fetchRecords)
  useRevalidate([SCOPES.projects], fetchProjects)

  // Fetch the personal-memory migration preview whenever the active org
  // changes. Returns 0/null when there's nothing to migrate.
  const fetchImportInfo = useCallback(async () => {
    if (!activeOrgId) { setImportInfo(null); return }
    try {
      const res = await fetch(`/api/enterprise/organizations/${activeOrgId}/import-personal`)
      if (!res.ok) { setImportInfo(null); return }
      const data = await res.json() as { eligibleCount: number; targetWorkspace: { id: string; name: string } | null }
      setImportInfo({ count: data.eligibleCount, targetName: data.targetWorkspace?.name ?? null })
    } catch { setImportInfo(null) }
  }, [activeOrgId])
  useEffect(() => { fetchImportInfo() }, [fetchImportInfo])
  useRevalidate([SCOPES.memories, SCOPES.orgs], fetchImportInfo)

  async function migratePersonal() {
    if (!activeOrgId || !importInfo || importInfo.count === 0) return
    setMigrating(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${activeOrgId}/import-personal`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Migration failed'); return }
      toast.success(`Moved ${data.moved} memor${data.moved === 1 ? 'y' : 'ies'} to ${data.targetWorkspace?.name || 'team workspace'}`)
      // Refresh everything that might show the moved records.
      emit([SCOPES.memories, SCOPES.orgs])
      fetchRecords()
      fetchImportInfo()
    } finally {
      setMigrating(false)
    }
  }

  // Import shared memory ─ when arriving from a shared-link
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        if (activeOrgId) formData.append('org_id', activeOrgId)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Failed to upload'); return }
        if (data.record) {
          setRecords((prev) => [data.record, ...prev])
          pollUntilEnriched(data.record.id)
        }
        toast.success('Memory saved successfully.')
      emit(SCOPES.memories)
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
        body: JSON.stringify({
          content: newContent.trim(),
          project_id: selectedProjectId || undefined,
          orgId: activeOrgId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to create memory'); return }
      if (data.record) {
        setRecords((prev) => [data.record, ...prev])
        pollUntilEnriched(data.record.id)
      }
      toast.success('Memory saved successfully.')
      emit(SCOPES.memories)
      setShowCreateDialog(false); setNewContent(''); setSelectedProjectId('')
    } catch { toast.error('Failed to create memory') }
    finally { setCreating(false) }
  }

  const handleBulkImport = async () => {
    if (importFiles.length === 0) return
    setImporting(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      importFiles.forEach((f) => formData.append('files', f))
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

  const filtered = records.filter((r) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const tags = parseTags(r.tags)
    return r.title.toLowerCase().includes(q) ||
      (r.summary && r.summary.toLowerCase().includes(q)) ||
      tags.some((t) => t.includes(q))
  })

  const grouped = groupByDate(filtered)

  // Header sub-line: counts per kind. If the API returned typeCounts use it,
  // otherwise derive from currently-loaded records as a best-effort.
  function countOf(type: string) {
    return typeCounts[type] ?? records.filter((r) => r.type === type).length
  }

  return (
    <div className="mem-page-wrap">
      <div className="mem-page">
        <span className="mem-crumb"><span className="dot" /> Memories</span>

        {/* Personal-memories migration banner — surfaces when the user has
            captures stuck in their personal workspace (legacy routing bug)
            and there's a team workspace they can move them to. */}
        {importInfo && importInfo.count > 0 && importInfo.targetName && (
          <div className="mem-import-banner">
            <div className="ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 9h18M9 21V9M3 21h18V3H3z" />
              </svg>
            </div>
            <div className="body">
              <b>{importInfo.count} memor{importInfo.count === 1 ? 'y is' : 'ies are'}</b> in your personal workspace and not visible to your team. Move them to <b>{importInfo.targetName}</b> so they show up on Home, Landscape, and the cockpit.
            </div>
            <button
              type="button"
              className="mem-btn primary"
              onClick={migratePersonal}
              disabled={migrating}
            >
              {migrating
                ? <Loader2 size={13} className="animate-spin" />
                : <ChevronRight size={13} />}
              {migrating ? 'Moving…' : `Move to ${importInfo.targetName}`}
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mem-head-row">
          <div className="mem-head">
            <h1>Memories</h1>
            <div className="sub">
              {loading ? 'Loading…' : (
                <>
                  <b>{total.toLocaleString()}</b> memories · <b>{countOf('decision').toLocaleString()}</b> decisions, <b>{countOf('meeting').toLocaleString()}</b> meetings, <b>{countOf('note').toLocaleString()}</b> notes
                </>
              )}
            </div>
          </div>
          <div className="mem-head-actions">
            <button className="mem-btn" onClick={() => setShowImportDialog(true)}>
              <Upload size={13} strokeWidth={1.8} />
              Import
            </button>
            <button className="mem-btn primary" onClick={() => setShowCreateDialog(true)}>
              <Plus size={13} strokeWidth={2} />
              New memory
            </button>
          </div>
        </div>

        {/* Category pills */}
        <div className="mem-cat-row">
          {CATEGORIES.map((c) => {
            const count = c.key === 'all' ? total : countOf(c.key)
            return (
              <button
                key={c.key}
                className={cn('mem-cat', typeFilter === c.key && 'active')}
                onClick={() => setTypeFilter(c.key)}
              >
                {c.label}
                <span className="n">{count.toLocaleString()}</span>
              </button>
            )
          })}
          <Link href="/app/landscape?mode=board" className="mem-cat graph">
            <Network size={12} strokeWidth={1.8} />
            Graph view
          </Link>
        </div>

        {/* Filter bar */}
        <div className="mem-filter-bar">
          <div className="mem-filter-search">
            <Search size={14} strokeWidth={1.7} style={{ color: 'var(--ink-3)' }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${total.toLocaleString() || ''} memories — try "hiring freeze", "@kang", or "#pricing"…`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="mem-date-pills">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                className={cn('mem-date-pill', dateRange === r.value && 'active')}
                onClick={() => setDateRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {/* Native selects for type / source — small footprint, accessible */}
          <select
            className="mem-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ paddingRight: 28 }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="mem-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{ paddingRight: 28 }}
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="mem-view-switch">
            <button
              className={cn('mem-view-btn', viewMode === 'timeline' && 'active')}
              onClick={() => setViewMode('timeline')}
              title="Timeline"
              aria-label="Timeline view"
            >
              <LayoutList size={14} />
            </button>
            <button
              className={cn('mem-view-btn', viewMode === 'grid' && 'active')}
              onClick={() => setViewMode('grid')}
              title="Grid"
              aria-label="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              className={cn('mem-view-btn', viewMode === 'compact' && 'active')}
              onClick={() => setViewMode('compact')}
              title="Compact"
              aria-label="Compact view"
            >
              <Rows3 size={14} />
            </button>
          </div>
        </div>

        {/* Loading / Empty */}
        {loading && (
          <div className="mem-empty">
            <Loader2 className="inline animate-spin" size={20} />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="mem-empty">
            <Brain size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>
              {records.length === 0 ? 'No memories yet. Capture your first one!' : 'No memories match your filters.'}
            </p>
            {records.length === 0 ? (
              <button className="mem-btn primary" style={{ marginTop: 16 }} onClick={() => setShowCreateDialog(true)}>
                <Plus size={13} /> New memory
              </button>
            ) : (
              <button
                onClick={() => { setTypeFilter('all'); setSourceFilter('all'); setDateRange('all'); setSearchQuery('') }}
                style={{ marginTop: 12, background: 'transparent', border: 0, color: 'var(--brand-ink)', cursor: 'pointer', textDecoration: 'underline', font: 'inherit', fontSize: 12 }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* TIMELINE */}
        {!loading && viewMode === 'timeline' && filtered.length > 0 && (
          <div>
            {grouped.map((group) => (
              <React.Fragment key={group.key}>
                <div className="mem-day-cap">
                  <Calendar className="icon" size={14} strokeWidth={1.8} />
                  <span className="label">{group.label}</span>
                  <span className="line" />
                  <span className="count">{group.items.length}</span>
                </div>
                {group.items.map((record) => (
                  <div className="mem-tl-row" key={record.id}>
                    <div className="mem-tl-rail"><span className="mem-tl-dot" /></div>
                    <Link href={`/app/memories/${record.id}`} className="mem-card">
                      <MemIcon type={record.type} />
                      <div className="mem-body">
                        <div className="mem-title">{record.title}</div>
                        {(record.summary || record.content) && (
                          <div className="mem-desc">{record.summary || record.content}</div>
                        )}
                        <div className="mem-tags">
                          <KindTag type={record.type} />
                          {record.source && record.source !== 'manual' && (
                            <span className="mem-tag">{SOURCE_LABELS[record.source] || record.source}</span>
                          )}
                          {parseTags(record.tags).filter((t) => t !== 'attachment').slice(0, 4).map((t) => (
                            <span key={t} className="mem-tag">{t}</span>
                          ))}
                          {record.locked && <span className="mem-tag" title="Locked"><Lock size={9} /> locked</span>}
                          {parseTags(record.tags).includes('attachment') && (
                            <span className="mem-tag" title="Attachment"><Paperclip size={9} /></span>
                          )}
                        </div>
                      </div>
                      <div className="mem-meta">
                        <div className="mem-time">{formatRelativeTime(record.createdAt)}</div>
                        {record.confidence != null && (
                          <div className="mem-conf">
                            <span className="bar"><i style={{ width: `${Math.round(record.confidence * 100)}%` }} /></span>
                            {Math.round(record.confidence * 100)}%
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="mem-card-share"
                        onClick={(e) => openShareDialog(e, record)}
                        title="Share"
                      >
                        <Share2 size={13} />
                      </button>
                    </Link>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* GRID */}
        {!loading && viewMode === 'grid' && filtered.length > 0 && (
          <div className="mem-grid-view">
            {filtered.map((record) => (
              <Link key={record.id} href={`/app/memories/${record.id}`} className="mem-grid-card">
                <div className="mem-grid-head">
                  <MemIcon type={record.type} />
                  <span className="mem-time">{formatRelativeTime(record.createdAt)}</span>
                </div>
                <div className="mem-title">{record.title}</div>
                {(record.summary || record.content) && (
                  <div className="mem-desc">{record.summary || record.content}</div>
                )}
                <div className="mem-tags">
                  <KindTag type={record.type} />
                  {parseTags(record.tags).filter((t) => t !== 'attachment').slice(0, 2).map((t) => (
                    <span key={t} className="mem-tag">{t}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="mem-card-share"
                  onClick={(e) => openShareDialog(e, record)}
                  title="Share"
                >
                  <Share2 size={13} />
                </button>
              </Link>
            ))}
          </div>
        )}

        {/* COMPACT */}
        {!loading && viewMode === 'compact' && filtered.length > 0 && (
          <div className="mem-compact">
            <div className="mem-cmp-head">
              <div />
              <div>Title</div>
              <div>Tags</div>
              <div>Source</div>
              <div>When</div>
              <div>Confidence</div>
            </div>
            {filtered.map((record) => {
              const Icon = TYPE_ICONS[record.type] || PenLine
              return (
                <Link key={record.id} href={`/app/memories/${record.id}`} className="mem-cmp-row">
                  <div className={cn('mem-cmp-ico mem-ico', record.type)} style={{ width: 22, height: 22 }}>
                    <Icon size={12} strokeWidth={1.8} />
                  </div>
                  <div className="mem-cmp-title">{record.title}</div>
                  <div className="mem-cmp-tags">
                    {parseTags(record.tags).filter((t) => t !== 'attachment').slice(0, 2).map((t) => (
                      <span key={t} className="mem-tag">{t}</span>
                    ))}
                  </div>
                  <div className="mem-cmp-source">{SOURCE_LABELS[record.source || ''] || record.source || '—'}</div>
                  <div className="mem-cmp-time">{formatRelativeTime(record.createdAt)}</div>
                  <div className="mem-cmp-source">{record.confidence != null ? `${Math.round(record.confidence * 100)}%` : '—'}</div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Footer / pager — `Load more` is the actual control. The numeric
            pager is decorative (single-page UI) but kept for design parity. */}
        {!loading && filtered.length > 0 && (
          <div className="mem-footer-stats">
            <span>
              Showing <b>{filtered.length.toLocaleString()}</b> of <b>{total.toLocaleString()}</b> memories
            </span>
            {records.length < total && (
              <button className="mem-btn" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                Load more ({(total - records.length).toLocaleString()} remaining)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Share dialog */}
      {shareDialogOpen && (
        <div className="mem-modal-overlay" onClick={() => setShareDialogOpen(false)}>
          <div className="mem-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share memory</h3>
            <div className="desc" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sharingRecord?.title}
            </div>
            <div className="body">
              <label>Share link</label>
              {shareLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13, height: 36 }}>
                  <Loader2 size={14} className="animate-spin" />
                  Generating link…
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={shareUrl} readOnly style={{ marginBottom: 0, fontFamily: 'var(--mono)', fontSize: 11 }} />
                  <button className="mem-btn" onClick={handleCopyLink} disabled={!shareUrl}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
              <label style={{ marginTop: 14 }}>Send via email</label>
              {emailSent ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--mem-green)', fontSize: 13 }}>
                  <Check size={14} /> Email sent!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                    disabled={!shareUrl}
                    style={{ marginBottom: 0 }}
                  />
                  <button
                    className="mem-btn primary"
                    onClick={handleSendEmail}
                    disabled={!shareEmail || !shareUrl || sendingEmail}
                  >
                    {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                    Send
                  </button>
                </div>
              )}
              <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
                Recipient can view and save this memory to their Reattend.
              </p>
            </div>
            <div className="foot">
              <button className="mem-btn" onClick={() => setShareDialogOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Create memory dialog */}
      {showCreateDialog && (
        <div className="mem-modal-overlay" onClick={() => setShowCreateDialog(false)}>
          <div className="mem-modal" onClick={(e) => e.stopPropagation()}>
            <h3>New memory</h3>
            <div className="desc">Add text or upload a document. The AI enriches it in the background.</div>
            <div className="body">
              <div className="mem-tabs" style={{ marginBottom: 12 }}>
                <button
                  className={cn('mem-tab-btn', createMode === 'text' && 'active')}
                  onClick={() => setCreateMode('text')}
                >
                  <FileText size={13} /> Text
                </button>
                <button
                  className={cn('mem-tab-btn', createMode === 'file' && 'active')}
                  onClick={() => setCreateMode('file')}
                >
                  <Upload size={13} /> Upload file
                </button>
              </div>

              {projects.length > 0 && (
                <>
                  <label>Project</label>
                  <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                    <option value="">Select a project (optional)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (default)' : ''}</option>
                    ))}
                  </select>
                </>
              )}

              {createMode === 'text' ? (
                <>
                  <label>Content</label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="e.g., Decided to use React Flow for the memory graph. It supports interactive nodes, edges, and canvas interactions…"
                    autoFocus
                  />
                </>
              ) : (
                <>
                  <label>Document</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md,.csv,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  {selectedFile ? (
                    <div className="mem-attach-card">
                      <div className="mem-attach-icon"><Paperclip size={14} /></div>
                      <div className="mem-attach-meta">
                        <div className="mem-attach-name">{selectedFile.name}</div>
                        <div className="mem-attach-size">{(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type || 'unknown'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer', padding: 4 }}
                        aria-label="Clear file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="file-zone" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={28} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--ink-3)' }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Click to upload a file</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                        PDF · Word · text · images (max 20MB)
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="foot">
              <button className="mem-btn" onClick={() => setShowCreateDialog(false)}>Cancel</button>
              <button
                className="mem-btn primary"
                onClick={handleCreateMemory}
                disabled={(createMode === 'text' ? !newContent.trim() : !selectedFile) || creating}
              >
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {creating ? (createMode === 'file' ? 'Uploading…' : 'Saving…') : (createMode === 'file' ? 'Upload' : 'Submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk import dialog */}
      {showImportDialog && (
        <div
          className="mem-modal-overlay"
          onClick={() => { setShowImportDialog(false); setImportFiles([]); setImportResult(null) }}
        >
          <div className="mem-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Import memories</h3>
            <div className="desc">
              Upload text files, markdown notes, or meeting transcripts. Supports .txt, .md, .csv, .json files. Up to 50 files at once.
            </div>
            <div className="body">
              <div
                className={cn('file-zone', importDrag && 'drag')}
                onClick={() => bulkInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setImportDrag(true) }}
                onDragLeave={() => setImportDrag(false)}
                onDrop={(e) => {
                  e.preventDefault(); setImportDrag(false)
                  const files = Array.from(e.dataTransfer.files)
                  setImportFiles((prev) => [...prev, ...files].slice(0, 50))
                }}
              >
                <Upload size={28} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--ink-3)' }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Drop files here or click to browse</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                  Obsidian vault, Read.ai exports, Fireflies transcripts, any text files
                </div>
              </div>
              <input
                ref={bulkInputRef}
                type="file"
                multiple
                accept=".txt,.md,.csv,.json,.markdown"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setImportFiles((prev) => [...prev, ...files].slice(0, 50))
                }}
              />
              {importFiles.length > 0 && (
                <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', margin: '6px 0' }}>
                    {importFiles.length} file(s) selected
                  </p>
                  {importFiles.map((f, i) => (
                    <div key={i} className="file-row">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.name}</span>
                      <button onClick={() => setImportFiles((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove file">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {importResult && (
                <p style={{ fontSize: 13, color: 'var(--mem-green)', marginTop: 10 }}>
                  {importResult.saved} of {importResult.total} files imported successfully.
                </p>
              )}
            </div>
            <div className="foot">
              <button className="mem-btn" onClick={() => setShowImportDialog(false)}>Cancel</button>
              <button
                className="mem-btn primary"
                onClick={handleBulkImport}
                disabled={importFiles.length === 0 || importing}
              >
                {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {importing ? 'Importing…' : `Import ${importFiles.length} file(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
