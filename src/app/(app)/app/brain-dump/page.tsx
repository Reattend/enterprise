'use client'

// Brain Dump — give us the firehose, we'll split it into structured parts.
//
// Flow:
//   1. User types or speaks a stream-of-consciousness dump.
//   2. Preview: Claude parses into decisions / questions / actions / facts.
//   3. User deselects anything they don't want + edits titles inline.
//   4. Commit: each selected item becomes its own record, ingest job runs.

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Brain, Sparkles, Loader2, Check, X, Gavel, HelpCircle, CheckSquare,
  Info, ArrowRight, Mic, Square, BrainCircuit, FileUp, LinkIcon, Upload,
  Target, ChevronDown,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'

type ItemKind = 'decision' | 'question' | 'action' | 'fact'
interface DumpItem {
  kind: ItemKind
  title: string
  detail?: string | null
  sourceSpan?: string | null
}

const KIND_META: Record<ItemKind, { label: string; icon: any; color: string }> = {
  decision: { label: 'Decision', icon: Gavel, color: 'text-violet-500 bg-violet-500/10' },
  question: { label: 'Open question', icon: HelpCircle, color: 'text-blue-500 bg-blue-500/10' },
  action: { label: 'Action', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-500/10' },
  fact: { label: 'Fact', icon: Info, color: 'text-slate-500 bg-slate-500/10' },
}

type Mode = 'firehose' | 'file' | 'link'

interface Team {
  teamId: string
  teamName: string
  departmentPath: string
  workspaceId: string
  projects: Array<{ id: string; name: string; isDefault: boolean }>
}

export default function BrainDumpPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const [mode, setMode] = useState<Mode>('firehose')
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [items, setItems] = useState<DumpItem[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [rejectedReason, setRejectedReason] = useState<string | null>(null)
  const [committing, setCommitting] = useState(false)
  const [result, setResult] = useState<{ created: Array<{ id: string; title: string; kind: ItemKind }>; skippedDupes: string[] } | null>(null)

  // Scope picker — same behavior the old CaptureDrawer had. Loaded once per
  // org. Defaults to the first team + default project so most people can
  // skip it entirely.
  const [teams, setTeams] = useState<Team[]>([])
  const [showScope, setShowScope] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  useEffect(() => {
    if (!activeOrgId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/organizations/${activeOrgId}/teams`)
        if (!res.ok) return
        const data = await res.json()
        setTeams(data.teams || [])
        if (data.teams?.[0]) {
          setSelectedTeam(data.teams[0].teamId)
          const def = data.teams[0].projects.find((p: { isDefault: boolean }) => p.isDefault) || data.teams[0].projects[0]
          setSelectedProject(def?.id ?? null)
        }
      } catch { /* non-fatal */ }
    })()
  }, [activeOrgId])

  const activeTeam = teams.find((t) => t.teamId === selectedTeam)

  // File upload state — Brain Dump's File tab. PDFs / DOCX / images go through
  // /api/upload which extracts text and creates a record.
  const [fileUploading, setFileUploading] = useState(false)
  const [fileDragOver, setFileDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Link tab — paste a URL, create a `[Link]` record that the ingest job
  // enriches by fetching page content.
  const [linkUrl, setLinkUrl] = useState('')
  const [linkNote, setLinkNote] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)

  // Voice capture — tap mic to speak, same pipeline as capture drawer, but
  // the transcript goes into the textarea instead of creating a memory.
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  async function toggleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const mr = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: mime })
        const fd = new FormData()
        fd.append('audio', blob, 'brain-dump.webm')
        toast.loading('Transcribing…', { id: 'brain-transcribe' })
        // Reuse the voice endpoint but we only want the transcript — the
        // endpoint also creates a record. For brain dump we'd rather just
        // capture the transcript. Call a dedicated transcribe path.
        const res = await fetch('/api/records/voice?transcriptOnly=1', { method: 'POST', body: fd })
        toast.dismiss('brain-transcribe')
        if (!res.ok) {
          toast.error('Transcription failed')
          return
        }
        const data = await res.json()
        const transcript = data.transcript || ''
        setRawText((prev) => prev ? prev + '\n\n' + transcript : transcript)
        toast.success('Transcript added')
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
    } catch (err) {
      toast.error('Mic access denied')
    }
  }

  async function parse() {
    if (rawText.trim().length < 50) {
      toast.error('Dump a bit more — at least 50 characters so there is something to structure.')
      return
    }
    setParsing(true)
    setItems(null)
    setSelected(new Set())
    setRejectedReason(null)
    try {
      const res = await fetch('/api/enterprise/brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Parse failed')
        return
      }
      const data = await res.json()
      setItems(data.items || [])
      setRejectedReason(data.rejectedReason || null)
      // Pre-select all items by default — user can deselect.
      setSelected(new Set(Array.from({ length: (data.items || []).length }, (_, i) => i)))
    } finally {
      setParsing(false)
    }
  }

  async function commit() {
    if (!items) return
    const toCommit = items.filter((_, i) => selected.has(i))
    if (toCommit.length === 0) {
      toast.error('Nothing selected')
      return
    }
    setCommitting(true)
    try {
      const res = await fetch('/api/enterprise/brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commit: true,
          items: toCommit,
          workspaceId: activeTeam?.workspaceId,
          projectId: selectedProject || undefined,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Commit failed')
        return
      }
      const data = await res.json()
      setResult(data)
      toast.success(`Created ${data.created.length} memor${data.created.length === 1 ? 'y' : 'ies'}`)
    } finally {
      setCommitting(false)
    }
  }

  function reset() {
    setRawText('')
    setItems(null)
    setSelected(new Set())
    setResult(null)
    setRejectedReason(null)
    setLinkUrl('')
    setLinkNote('')
  }

  async function uploadFile(file: File) {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too big — 20MB max')
      return
    }
    setFileUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Upload failed')
        return
      }
      const data = await res.json()
      const newRecord = data.record || data
      const id = newRecord?.id
      if (id) {
        setResult({
          created: [{ id, title: newRecord.title || file.name, kind: 'fact' }],
          skippedDupes: [],
        })
        toast.success(`Added ${file.name}`)
      } else {
        toast.success('Uploaded — processing in the background')
      }
    } finally {
      setFileUploading(false)
    }
  }

  async function saveLink() {
    const url = linkUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      toast.error('Paste a full URL starting with http(s)://')
      return
    }
    setLinkSaving(true)
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Link] ${url}`,
          content: linkNote ? `${url}\n\n${linkNote}` : url,
          type: 'context',
          source: 'url',
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Link save failed')
        return
      }
      const data = await res.json()
      const r = data.record || data
      if (r?.id) {
        setResult({
          created: [{ id: r.id, title: r.title || `[Link] ${url}`, kind: 'fact' }],
          skippedDupes: [],
        })
        toast.success('Link captured — page content will be enriched in background')
      }
    } finally {
      setLinkSaving(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setFileDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) uploadFile(f)
  }

  function toggleSelected(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function editItem(i: number, patch: Partial<DumpItem>) {
    setItems((prev) => prev ? prev.map((it, idx) => idx === i ? { ...it, ...patch } : it) : prev)
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-5"
    >
      <div className="text-center space-y-2 py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 text-fuchsia-600 text-[11px] font-medium uppercase tracking-wider">
          <BrainCircuit className="h-3 w-3" /> Capture
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === 'firehose' && 'Give me the firehose'}
          {mode === 'file' && 'Drop a file'}
          {mode === 'link' && 'Paste a link'}
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          {mode === 'firehose' && 'Talk or type everything in your head. Reattend splits it into decisions, open questions, actions, and facts — you review and commit in one click.'}
          {mode === 'file' && 'PDF, Word, image, or audio. Claude extracts the text, creates a memory, and links it to what you already know.'}
          {mode === 'link' && 'Save any URL as a memory. The ingest job fetches the page title, extracts key content, and enriches it in the background.'}
        </p>
      </div>

      {/* Tab bar — three capture modes. "Firehose" is the hero; File + Link
          are first-class alternatives so this page is the single New Memory
          surface for the whole app. */}
      {!result && !items && (
        <div className="flex items-center justify-center gap-1 border-b">
          <TabButton active={mode === 'firehose'} onClick={() => setMode('firehose')} icon={BrainCircuit} label="Firehose" />
          <TabButton active={mode === 'file'} onClick={() => setMode('file')} icon={FileUp} label="File" />
          <TabButton active={mode === 'link'} onClick={() => setMode('link')} icon={LinkIcon} label="Link" />
        </div>
      )}

      {!result && mode === 'firehose' && (
        <div className="rounded-2xl border-2 border-fuchsia-500/20 bg-card p-4 shadow-lg">
          {/* Scope picker — which team + project this dump lands in. Hidden
              behind a chevron so the 95% case (default team / default project)
              doesn't see any extra UI. Moved here from the old CaptureDrawer. */}
          {teams.length > 0 && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowScope(!showScope)}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Target className="h-3 w-3" />
                <span>
                  Scope: <strong className="text-foreground">{activeTeam?.teamName || 'default'}</strong>
                  {selectedProject && activeTeam?.projects.find((p) => p.id === selectedProject) && (
                    <> · {activeTeam.projects.find((p) => p.id === selectedProject)!.name}</>
                  )}
                </span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', showScope && 'rotate-180')} />
              </button>
              {showScope && (
                <div className="mt-2 rounded-md border bg-muted/30 p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Team</label>
                    <select
                      value={selectedTeam ?? ''}
                      onChange={(e) => {
                        const newTeam = e.target.value
                        setSelectedTeam(newTeam)
                        const t = teams.find((tt) => tt.teamId === newTeam)
                        const def = t?.projects.find((p) => p.isDefault) || t?.projects[0]
                        setSelectedProject(def?.id ?? null)
                      }}
                      className="w-full h-7 text-xs rounded border border-input bg-background px-2"
                    >
                      {teams.map((t) => (
                        <option key={t.teamId} value={t.teamId}>{t.departmentPath} · {t.teamName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Project</label>
                    <select
                      value={selectedProject ?? ''}
                      onChange={(e) => setSelectedProject(e.target.value || null)}
                      className="w-full h-7 text-xs rounded border border-input bg-background px-2"
                      disabled={!activeTeam || activeTeam.projects.length === 0}
                    >
                      {activeTeam?.projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (default)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={'"We had a 30-min meeting with the CFO. He wants to freeze hiring in Q4 but we pushed back on frontline. Action for me: draft the exemption memo by Friday. Partha flagged the AWS bill being up 34% — need to dig in. Open question: do we still sponsor the BANGALORE.JS conf this year? Marketing says yes, finance says no. We agreed I\'d decide by next Mon."'}
            rows={10}
            className="border-0 shadow-none focus-visible:ring-0 text-sm resize-none font-sans"
            disabled={parsing || committing}
          />
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleRecord}
                disabled={parsing || committing}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                  recording ? 'bg-red-500 border-red-500 text-white' : 'hover:bg-muted',
                )}
              >
                {recording ? <Square className="h-3 w-3 fill-white" /> : <Mic className="h-3 w-3" />}
                {recording ? 'Stop' : 'Talk'}
              </button>
              <span className="text-[11px] text-muted-foreground">
                {rawText.length} chars · Claude parses into structured items
              </span>
            </div>
            <Button
              onClick={parse}
              disabled={parsing || committing || rawText.trim().length < 50}
              className="bg-gradient-to-br from-fuchsia-500 to-pink-600 hover:opacity-95"
            >
              {parsing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Structure this
            </Button>
          </div>
        </div>
      )}

      {!result && mode === 'file' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setFileDragOver(true) }}
          onDragLeave={() => setFileDragOver(false)}
          onDrop={onDrop}
          className={cn(
            'rounded-2xl border-2 border-dashed p-10 text-center transition-colors',
            fileDragOver ? 'border-fuchsia-500 bg-fuchsia-500/5' : 'border-fuchsia-500/30 bg-card',
          )}
        >
          <div className="mx-auto h-12 w-12 rounded-full bg-fuchsia-500/10 text-fuchsia-500 flex items-center justify-center mb-3">
            <Upload className="h-5 w-5" />
          </div>
          <p className="font-semibold mb-1">Drop a file here, or click to pick one</p>
          <p className="text-xs text-muted-foreground mb-4">
            PDF · Word · image · audio · video — up to 20MB. Text is extracted and indexed.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.webm,.mp4"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadFile(f)
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={fileUploading}
            className="bg-gradient-to-br from-fuchsia-500 to-pink-600 hover:opacity-95"
          >
            {fileUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileUp className="h-4 w-4 mr-1" />}
            {fileUploading ? 'Uploading…' : 'Choose file'}
          </Button>
        </div>
      )}

      {!result && mode === 'link' && (
        <div className="rounded-2xl border-2 border-fuchsia-500/20 bg-card p-4 shadow-lg space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">URL</label>
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              onKeyDown={(e) => { if (e.key === 'Enter') saveLink() }}
              disabled={linkSaving}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Note (optional)</label>
            <Textarea
              value={linkNote}
              onChange={(e) => setLinkNote(e.target.value)}
              rows={3}
              placeholder="Why this matters, what you want to remember…"
              disabled={linkSaving}
            />
          </div>
          <div className="flex items-center justify-end pt-2 border-t">
            <Button
              onClick={saveLink}
              disabled={linkSaving || !linkUrl.trim()}
              className="bg-gradient-to-br from-fuchsia-500 to-pink-600 hover:opacity-95"
            >
              {linkSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-1" />}
              Save link
            </Button>
          </div>
        </div>
      )}

      {rejectedReason && !items?.length && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-800 dark:text-yellow-300">
          {rejectedReason}
        </div>
      )}

      {items && items.length > 0 && !result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              Found <strong>{items.length}</strong> items · {selected.size} selected
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set(items.map((_, i) => i)))}>
                Select all
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((it, i) => {
              const meta = KIND_META[it.kind]
              const Icon = meta.icon
              const chosen = selected.has(i)
              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border bg-card p-3 transition-colors',
                    chosen ? 'border-primary/40' : 'border-border opacity-60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleSelected(i)}
                      className={cn(
                        'mt-1 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                        chosen ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:bg-muted',
                      )}
                    >
                      {chosen && <Check className="h-3 w-3" />}
                    </button>
                    <div className={cn('h-6 w-6 rounded flex items-center justify-center shrink-0', meta.color)}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-wide">{meta.label}</Badge>
                      </div>
                      <Input
                        value={it.title}
                        onChange={(e) => editItem(i, { title: e.target.value })}
                        className="text-sm font-medium h-7 border-0 shadow-none focus-visible:ring-0 px-0"
                      />
                      {it.detail && (
                        <p className="text-xs text-muted-foreground">{it.detail}</p>
                      )}
                      {it.sourceSpan && (
                        <p className="text-[10px] text-muted-foreground/80 italic border-l-2 border-border pl-2">
                          "{it.sourceSpan}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={reset} disabled={committing}>Start over</Button>
            <Button
              onClick={commit}
              disabled={committing || selected.size === 0}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:opacity-95"
            >
              {committing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
              Create {selected.size} memor{selected.size === 1 ? 'y' : 'ies'}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border bg-gradient-to-br from-emerald-500/5 to-transparent p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">Created {result.created.length} memor{result.created.length === 1 ? 'y' : 'ies'}</div>
              <div className="text-xs text-muted-foreground">
                Triage is running in the background — Claude will re-title and link them to related memories in ~30s.
              </div>
            </div>
          </div>
          {result.skippedDupes.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Skipped {result.skippedDupes.length} duplicate{result.skippedDupes.length === 1 ? '' : 's'} — already in your memory.
            </div>
          )}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {result.created.map((r) => (
              <Link key={r.id} href={`/app/memories/${r.id}`} className="flex items-center gap-2 text-xs hover:text-primary transition-colors">
                <Badge variant="outline" className="text-[9px] h-4 px-1">{KIND_META[r.kind].label}</Badge>
                <span className="truncate">{r.title}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={reset} className="bg-gradient-to-br from-fuchsia-500 to-pink-600 hover:opacity-95">
              <BrainCircuit className="h-4 w-4 mr-1" /> Dump again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/app/memories">See all memories</Link>
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function TabButton({
  active, onClick, icon: Icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: any
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
        active ? 'border-fuchsia-500 text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
