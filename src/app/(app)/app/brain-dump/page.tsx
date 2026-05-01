'use client'

// Capture — give us the firehose, we'll split it into structured parts.
// New design pulled from claude.ai/design Capture.html: two-column layout
// with composer (left) and "What Lattice sees" preview (right). All existing
// wiring (parse, commit, uploadFile, saveLink, toggleRecord, scope picker)
// is preserved verbatim — only the surrounding chrome changed.

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles, Loader2, Check, Mic, Square, FileUp, Link as LinkIcon,
  Upload, Target, ChevronDown, MessageSquare, Globe,
} from 'lucide-react'
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

type Mode = 'firehose' | 'file' | 'link'

interface Team {
  teamId: string
  teamName: string
  departmentPath: string
  workspaceId: string
  projects: Array<{ id: string; name: string; isDefault: boolean }>
}

const KIND_LABEL: Record<ItemKind, string> = {
  decision: 'Decision',
  question: 'Open question',
  action: 'Action',
  fact: 'Fact',
}

const PIP_CLASS: Record<ItemKind, string> = {
  decision: 'pip dec',
  question: 'pip que',
  action: 'pip act',
  fact: 'pip fct',
}

const COUNT_CLASS: Record<ItemKind, string> = {
  decision: 'count accent',
  question: 'count amber',
  action: 'count green',
  fact: 'count ink',
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

  const [fileUploading, setFileUploading] = useState(false)
  const [fileDragOver, setFileDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [linkUrl, setLinkUrl] = useState('')
  const [linkNote, setLinkNote] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)

  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  // ⌘1/⌘2/⌘3 mode shortcuts (matches design's keyboard hint).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (result || items) return // don't switch mode mid-review
      if (e.key === '1') { e.preventDefault(); setMode('firehose') }
      else if (e.key === '2') { e.preventDefault(); setMode('file') }
      else if (e.key === '3') { e.preventDefault(); setMode('link') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result, items])

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
    } catch {
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

  // Group items by kind for the preview panel.
  const grouped: Record<ItemKind, Array<{ idx: number; item: DumpItem }>> = {
    decision: [], action: [], question: [], fact: [],
  }
  ;(items || []).forEach((it, idx) => grouped[it.kind].push({ idx, item: it }))
  const counts = {
    decision: grouped.decision.length,
    action: grouped.action.length,
    question: grouped.question.length,
    fact: grouped.fact.length,
  }

  const charCount = rawText.length
  const detectedItems = items?.length ?? Math.max(0, Math.round(charCount / 64))
  const meterText = items
    ? `${charCount.toLocaleString()} chars · ${items.length} items detected`
    : `${charCount.toLocaleString()} chars · ~ ${detectedItems} items detected`

  return (
    <div className="cap-page">
      <span className="cap-crumb">
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
        Capture
      </span>

      <div className="cap-head">
        <h1>Drop, dictate, or <em>drag in</em> anything.</h1>
        <p>
          One inbox for every kind of input. The AI pulls out the decisions, actions, open questions and facts — you review and commit in one click. Press <span className="kbd">⌘1</span> <span className="kbd">⌘2</span> <span className="kbd">⌘3</span> to switch modes.
        </p>
      </div>

      {!result && !items && (
        <div className="cap-modes" role="tablist">
          <button
            type="button"
            className={cn('cap-mode-btn', mode === 'firehose' && 'active')}
            onClick={() => setMode('firehose')}
          >
            <MessageSquare className="ico" />
            Firehose
            <span className="cap-mode-kbd">⌘1</span>
          </button>
          <button
            type="button"
            className={cn('cap-mode-btn', mode === 'file' && 'active')}
            onClick={() => setMode('file')}
          >
            <FileUp className="ico" />
            File
            <span className="cap-mode-kbd">⌘2</span>
          </button>
          <button
            type="button"
            className={cn('cap-mode-btn', mode === 'link' && 'active')}
            onClick={() => setMode('link')}
          >
            <Globe className="ico" />
            Link
            <span className="cap-mode-kbd">⌘3</span>
          </button>
        </div>
      )}

      {rejectedReason && !items?.length && (
        <div className="cap-rejected">{rejectedReason}</div>
      )}

      {result ? (
        <div className="cap-result">
          <div className="cap-result-head">
            <div className="cap-result-icon">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <div className="cap-result-title">
                Created {result.created.length} memor{result.created.length === 1 ? 'y' : 'ies'}
              </div>
              <div className="cap-result-sub">
                Triage is running in the background — the AI will re-title and link them to related memories in ~30s.
              </div>
            </div>
          </div>
          {result.skippedDupes.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Skipped {result.skippedDupes.length} duplicate{result.skippedDupes.length === 1 ? '' : 's'} — already in your memory.
            </div>
          )}
          <div className="cap-result-list">
            {result.created.map((r) => (
              <Link key={r.id} href={`/app/memories/${r.id}`} className="cap-result-row">
                <span className="badge">{KIND_LABEL[r.kind]}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
            <button onClick={reset} className="cap-commit">
              <Sparkles className="h-4 w-4" /> Capture again
            </button>
            <Link href="/app/memories" className="cap-ftool" style={{ textDecoration: 'none' }}>
              See all memories
            </Link>
          </div>
        </div>
      ) : (
        <div className="cap-grid">
          {/* LEFT — composer */}
          <div className="cap-composer">
            {/* Scope picker — same behavior the old version had. Default-on
                hidden behind a chevron so the 95% case sees no extra UI. */}
            {teams.length > 0 && mode === 'firehose' && (
              <div className="cap-scope-bar">
                <button
                  type="button"
                  onClick={() => setShowScope(!showScope)}
                  className="cap-scope-toggle"
                >
                  <Target className="h-3 w-3" />
                  <span>
                    Scope: <b>{activeTeam?.teamName || 'default'}</b>
                    {selectedProject && activeTeam?.projects.find((p) => p.id === selectedProject) && (
                      <> · {activeTeam.projects.find((p) => p.id === selectedProject)!.name}</>
                    )}
                  </span>
                  <ChevronDown className={cn('h-3 w-3 transition-transform', showScope && 'rotate-180')} />
                </button>
                {showScope && (
                  <div className="cap-scope-fields">
                    <div>
                      <label className="cap-scope-label">Team</label>
                      <select
                        value={selectedTeam ?? ''}
                        onChange={(e) => {
                          const newTeam = e.target.value
                          setSelectedTeam(newTeam)
                          const t = teams.find((tt) => tt.teamId === newTeam)
                          const def = t?.projects.find((p) => p.isDefault) || t?.projects[0]
                          setSelectedProject(def?.id ?? null)
                        }}
                      >
                        {teams.map((t) => (
                          <option key={t.teamId} value={t.teamId}>{t.departmentPath} · {t.teamName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="cap-scope-label">Project</label>
                      <select
                        value={selectedProject ?? ''}
                        onChange={(e) => setSelectedProject(e.target.value || null)}
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

            {mode === 'firehose' && (
              <>
                <div className="cap-firehose-body">
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder='Talk or type everything in your head. Reattend splits it into decisions, open questions, actions, and facts — you review and commit in one click.'
                    disabled={parsing || committing}
                  />
                </div>
                <div className="cap-comp-foot">
                  <button
                    type="button"
                    onClick={toggleRecord}
                    disabled={parsing || committing}
                    className={cn('cap-ftool rec', recording && 'live')}
                  >
                    {recording ? (
                      <>
                        <Square className="h-3 w-3 fill-current" />
                        Stop
                      </>
                    ) : (
                      <>
                        <span className="pulse" />
                        Talk
                      </>
                    )}
                  </button>
                  <span className="cap-meter">{meterText}</span>
                  <button
                    type="button"
                    className="cap-commit"
                    onClick={items ? commit : parse}
                    disabled={parsing || committing || (!items && rawText.trim().length < 50) || (items != null && selected.size === 0)}
                  >
                    {(parsing || committing) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {items
                      ? `Commit ${selected.size} memor${selected.size === 1 ? 'y' : 'ies'}`
                      : 'Structure & commit'}
                  </button>
                </div>
              </>
            )}

            {mode === 'file' && (
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); setFileDragOver(true) }}
                  onDragLeave={() => setFileDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn('cap-dropzone', fileDragOver && 'drag')}
                >
                  <div className="cap-dz-icon">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="cap-dz-title">Drop a file here, or click to pick one</p>
                  <p className="cap-dz-sub">PDF · Word · image · audio · video — up to 20 MB. Text is extracted, transcribed, and indexed.</p>
                  <div className="cap-dz-types">
                    <span className="cap-type-chip">PDF</span>
                    <span className="cap-type-chip">DOCX</span>
                    <span className="cap-type-chip">MD</span>
                    <span className="cap-type-chip">PNG / JPG</span>
                    <span className="cap-type-chip">MP3 / WAV</span>
                    <span className="cap-type-chip">MP4 / MOV</span>
                  </div>
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
                </div>
                <div className="cap-comp-foot">
                  <span className="cap-meter">
                    {fileUploading ? 'Uploading…' : 'Up to 20 MB · text + audio + video supported'}
                  </span>
                  <button
                    type="button"
                    className="cap-commit"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={fileUploading}
                  >
                    {fileUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                    Choose file
                  </button>
                </div>
              </>
            )}

            {mode === 'link' && (
              <>
                <div className="cap-link-body">
                  <div className="cap-link-input">
                    <LinkIcon className="cap-link-fav h-4 w-4" />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveLink() }}
                      placeholder="Paste a URL — Notion page, Slack thread, Google Doc, GitHub issue, YouTube…"
                      disabled={linkSaving}
                    />
                  </div>
                  <textarea
                    value={linkNote}
                    onChange={(e) => setLinkNote(e.target.value)}
                    placeholder="Note (optional) — why this matters, what you want to remember…"
                    disabled={linkSaving}
                    className="cap-link-note"
                  />
                </div>
                <div className="cap-comp-foot">
                  <span className="cap-meter">Page content + comments are fetched in the background.</span>
                  <button
                    type="button"
                    className="cap-commit"
                    onClick={saveLink}
                    disabled={linkSaving || !linkUrl.trim()}
                  >
                    {linkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5" />}
                    Fetch & commit
                  </button>
                </div>
              </>
            )}
          </div>

          {/* RIGHT — preview panel */}
          <aside className="cap-preview">
            <div className="cap-pv-head">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              <span className="title">What the AI sees</span>
              <span className="live"><span className="dot" /> Live</span>
            </div>

            {!items && !parsing && (
              <div className="cap-empty">
                <span className="glyph">~</span>
                {mode === 'firehose' && 'Start typing on the left. We\'ll surface decisions, actions and questions as you go.'}
                {mode === 'file' && 'Drop a file to extract structured items — decisions, action items, key facts.'}
                {mode === 'link' && 'Paste a URL to capture and enrich a page in your memory.'}
              </div>
            )}

            {parsing && (
              <div className="cap-empty">
                <Loader2 className="inline h-4 w-4 animate-spin" style={{ marginRight: 8 }} />
                Structuring your dump…
              </div>
            )}

            {items && items.length > 0 && (
              <>
                {(['decision', 'action', 'question', 'fact'] as ItemKind[]).map((kind) => {
                  if (counts[kind] === 0) return null
                  return (
                    <div key={kind} className="cap-pv-section">
                      <div className="cap-pv-cap">
                        {kind === 'decision' && 'Decisions'}
                        {kind === 'action' && 'Actions'}
                        {kind === 'question' && 'Open questions'}
                        {kind === 'fact' && 'Facts'}
                        <span className={COUNT_CLASS[kind]}>{counts[kind]}</span>
                      </div>
                      {grouped[kind].map(({ idx, item }) => (
                        <div
                          key={idx}
                          className={cn('cap-pv-item', !selected.has(idx) && 'unselected')}
                        >
                          <span className={PIP_CLASS[kind]} />
                          <div className="body">
                            <input
                              value={item.title}
                              onChange={(e) => editItem(idx, { title: e.target.value })}
                            />
                            {item.detail && <div className="detail">{item.detail}</div>}
                            {item.sourceSpan && (
                              <div className="tags">
                                <span className="t" title={item.sourceSpan}>source</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="x"
                            onClick={() => toggleSelected(idx)}
                            title={selected.has(idx) ? 'Remove from commit' : 'Add back to commit'}
                          >
                            {selected.has(idx) ? '×' : '+'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}
                <div className="cap-pv-foot">
                  <span className="meta">
                    <b>{items.length}</b> items · <b>{selected.size}</b> selected
                    {activeTeam && <> · routed to <b>{activeTeam.teamName}</b></>}
                  </span>
                  <button
                    type="button"
                    className="right"
                    onClick={() => setShowScope(true)}
                  >
                    Edit routing →
                  </button>
                </div>
              </>
            )}

            {items && items.length === 0 && !parsing && (
              <div className="cap-empty">
                <span className="glyph">∅</span>
                Nothing structured found in that dump.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
