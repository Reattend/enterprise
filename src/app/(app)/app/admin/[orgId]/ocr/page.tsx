'use client'

// OCR — batch upload, job queue, quality dashboard.
//
// The gov-track hero page. Admin drops a folder of scanned documents;
// each file becomes an ocr_jobs row; the worker OCRs, redacts PII,
// creates a memory record. Dashboard shows confidence + flagged rate so
// the trainer can re-scan low-quality pages.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FileScan, Upload, Loader2, CheckCircle2, AlertTriangle, AlertCircle,
  Clock, FileText, Eye, Shield, RefreshCw, Languages,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Stats {
  windowDays: number
  total: number
  byStatus: Record<string, number>
  avgConfidence: number | null
  totalRedactions: number
  totalPages: number
  totalTextLength: number
  flagRate: number
}

interface Job {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  language: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review'
  pageCount: number | null
  avgConfidence: number | null
  redactionCount: number | null
  resultRecordId: string | null
  errorMessage: string | null
  batchId: string | null
  createdAt: string
  completedAt: string | null
}

const STATUS_META: Record<Job['status'], { label: string; icon: any; cls: string }> = {
  pending:      { label: 'Pending',     icon: Clock,        cls: 'bg-muted text-muted-foreground' },
  processing:   { label: 'Processing',  icon: Loader2,      cls: 'bg-blue-500/10 text-blue-600 animate-pulse' },
  completed:    { label: 'Completed',   icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  failed:       { label: 'Failed',      icon: AlertCircle,  cls: 'bg-red-500/10 text-red-600 border-red-500/30' },
  needs_review: { label: 'Needs review',icon: AlertTriangle,cls: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/30' },
}

const LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'spa', label: 'Spanish' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'por', label: 'Portuguese' },
  { code: 'ita', label: 'Italian' },
]

export default function OCRPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [stats, setStats] = useState<Stats | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [uploading, setUploading] = useState(false)
  const [language, setLanguage] = useState('eng')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      const [sRes, jRes] = await Promise.all([
        fetch(`/api/enterprise/ocr/stats?orgId=${orgId}&days=30`),
        fetch(`/api/enterprise/ocr/jobs?orgId=${orgId}&limit=100`),
      ])
      if (sRes.ok) setStats(await sRes.json())
      if (jRes.ok) setJobs((await jRes.json()).jobs || [])
    } catch { /* silent */ }
  }

  useEffect(() => {
    load()
    // Poll every 4s while any job is pending/processing
    const t = setInterval(() => {
      if (jobs.some((j) => j.status === 'pending' || j.status === 'processing')) load()
    }, 4000)
    return () => clearInterval(t)
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(files: FileList | File[]) {
    const fileArr = Array.from(files)
    if (fileArr.length === 0) return
    if (fileArr.length > 20) {
      toast.error('Max 20 files per batch')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('orgId', orgId)
      fd.append('language', language)
      for (const f of fileArr) fd.append('files', f)

      const res = await fetch('/api/enterprise/ocr/batch', { method: 'POST', body: fd })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Upload failed')
        return
      }
      const data = await res.json()
      toast.success(`Queued ${data.queued} document${data.queued === 1 ? '' : 's'}${data.skipped?.length ? ` (${data.skipped.length} skipped)` : ''}`)
      await load()
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) upload(e.dataTransfer.files)
  }

  const activeCount = (stats?.byStatus.pending ?? 0) + (stats?.byStatus.processing ?? 0)
  const completedCount = stats?.byStatus.completed ?? 0
  const reviewCount = stats?.byStatus.needs_review ?? 0
  const failedCount = stats?.byStatus.failed ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <FileScan className="h-3.5 w-3.5" /> OCR pipeline
        </div>
        <h1 className="font-display text-3xl tracking-tight">Paper to searchable memory</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Upload scanned documents. We extract the text, redact PII (SSN, phone, email,
          credit card, account numbers, DOB, addresses), flag low-confidence pages for
          human review, and file everything into org memory with a 30-day retention default.
        </p>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Stat icon={FileText} label="Docs (30d)" value={stats.total} />
          <Stat icon={Clock} label="In flight" value={activeCount} tone={activeCount > 0 ? 'active' : undefined} />
          <Stat icon={CheckCircle2} label="Completed" value={completedCount} tone="ok" />
          <Stat icon={AlertTriangle} label="Need review" value={reviewCount} tone={reviewCount > 0 ? 'warning' : undefined} />
          <Stat icon={AlertCircle} label="Failed" value={failedCount} tone={failedCount > 0 ? 'danger' : undefined} />
          <Stat icon={Shield} label="Redactions" value={stats.totalRedactions} sub="PII masked" />
          <Stat
            icon={FileScan}
            label="Avg confidence"
            value={stats.avgConfidence != null ? `${Math.round(stats.avgConfidence * 100)}%` : '—'}
            sub={`flag rate ${Math.round(stats.flagRate * 100)}%`}
            tone={stats.avgConfidence != null && stats.avgConfidence > 0.85 ? 'ok' : stats.avgConfidence != null && stats.avgConfidence < 0.6 ? 'warning' : undefined}
          />
        </div>
      )}

      {/* Upload zone */}
      <Card
        className={cn(
          'p-6 border-2 border-dashed transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Drop scanned documents here</h2>
            <p className="text-xs text-muted-foreground mt-1">
              PNG / JPG / TIFF / WEBP / PDF. Up to 20 files per batch, 25MB each. Text-layer PDFs
              go through pdf-parse (fast). Scanned images go through Tesseract (slower — ~5s/page).
              <br />
              <span className="text-[11px] opacity-80">v1 limitation: scanned PDFs without a text layer must be re-uploaded as per-page images. Multi-page rasterization is on the post-launch roadmap.</span>
            </p>
            <div className="flex items-center gap-2 mt-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/tiff,image/webp,image/bmp,application/pdf,text/plain"
                hidden
                onChange={(e) => { if (e.target.files) upload(e.target.files) }}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                {uploading ? 'Uploading…' : 'Choose files'}
              </Button>
              <div className="inline-flex items-center gap-1 border rounded-md px-2 h-9 text-xs">
                <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  className="bg-transparent outline-none text-sm"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={uploading}
                >
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <Button variant="ghost" size="sm" onClick={load}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Jobs list */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Recent jobs ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <FileScan className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No OCR jobs yet. Drop a document above to begin.
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y">
              {jobs.map((j) => {
                const meta = STATUS_META[j.status]
                const Icon = meta.icon
                return (
                  <li key={j.id} className="p-3 flex items-center gap-3">
                    <Icon className={cn('h-4 w-4 shrink-0', j.status === 'processing' && 'animate-spin')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate max-w-[50%]">{j.fileName}</span>
                        <Badge variant="outline" className={`text-[9px] ${meta.cls}`}>{meta.label}</Badge>
                        {j.avgConfidence != null && (
                          <span className="text-[10px] text-muted-foreground">
                            {Math.round(j.avgConfidence * 100)}% conf
                          </span>
                        )}
                        {(j.redactionCount ?? 0) > 0 && (
                          <Badge variant="outline" className="text-[9px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            <Shield className="h-2.5 w-2.5" /> {j.redactionCount} redacted
                          </Badge>
                        )}
                        {j.language !== 'eng' && (
                          <Badge variant="outline" className="text-[9px] uppercase">{j.language}</Badge>
                        )}
                      </div>
                      {j.errorMessage && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{j.errorMessage}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {(j.fileSize / 1024).toFixed(0)} KB ·
                        {' '}{new Date(j.createdAt).toLocaleString()}
                        {j.completedAt && <> · took {Math.round((new Date(j.completedAt).getTime() - new Date(j.createdAt).getTime()) / 1000)}s</>}
                      </div>
                    </div>
                    {j.resultRecordId && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/app/memories/${j.resultRecordId}`}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Open
                        </Link>
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>
    </motion.div>
  )
}

function Stat({
  icon: Icon, label, value, sub, tone,
}: {
  icon: any
  label: string
  value: number | string
  sub?: string
  tone?: 'ok' | 'warning' | 'danger' | 'active'
}) {
  return (
    <Card className={cn(
      'p-3',
      tone === 'warning' && 'border-yellow-500/30 bg-yellow-500/5',
      tone === 'danger' && 'border-red-500/30 bg-red-500/5',
      tone === 'ok' && 'border-emerald-500/30 bg-emerald-500/5',
      tone === 'active' && 'border-blue-500/30 bg-blue-500/5',
    )}>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </Card>
  )
}
