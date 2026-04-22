'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, FileText, Link as LinkIcon, Upload, Check, Loader2, Sparkles,
  ChevronDown, Target, Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'
import { VoiceRecorder } from './voice-recorder'

type Tab = 'text' | 'file' | 'url' | 'voice'

interface Team {
  teamId: string
  teamName: string
  departmentPath: string
  workspaceId: string
  projects: Array<{ id: string; name: string; isDefault: boolean }>
}

export function CaptureDrawer() {
  const open = useAppStore((s) => s.captureOpen)
  const setOpen = useAppStore((s) => s.setCaptureOpen)
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)

  const [tab, setTab] = useState<Tab>('text')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ recordId: string; title: string } | null>(null)

  // Scope: team + project. Loaded lazily.
  const [teams, setTeams] = useState<Team[]>([])
  const [showScope, setShowScope] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !activeOrgId) return
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
      } catch { /* silent */ }
    })()
  }, [open, activeOrgId])

  const activeTeam = useMemo(() => teams.find((t) => t.teamId === selectedTeam), [teams, selectedTeam])

  function reset() {
    setText('')
    setUrl('')
    setFiles([])
    setErr(null)
    setSuccess(null)
    setTab('text')
    setShowScope(false)
  }

  function close() {
    if (busy) return
    setOpen(false)
    setTimeout(reset, 200)
  }

  async function submit() {
    setBusy(true)
    setErr(null)
    setSuccess(null)
    try {
      if (tab === 'text' && text.trim()) {
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: text.trim(),
            project_id: selectedProject || undefined,
            // workspace scoping happens server-side via auth / project
          }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        const body = await res.json()
        setSuccess({ recordId: body.record?.id, title: body.record?.title || 'Captured' })
      } else if (tab === 'url' && url.trim()) {
        // Quick-and-dirty: save the URL as a memory; ingestion jobs can
        // enrich it later by fetching the page content.
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `[Link] ${url.trim()}`,
            project_id: selectedProject || undefined,
          }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        const body = await res.json()
        setSuccess({ recordId: body.record?.id, title: body.record?.title || 'Captured' })
      } else if (tab === 'file' && files.length > 0) {
        // Use existing /api/upload — it handles PDF/DOC/audio/video/image.
        for (const file of files) {
          const fd = new FormData()
          fd.append('file', file)
          if (selectedProject) fd.append('projectId', selectedProject)
          const res = await fetch('/api/upload', { method: 'POST', body: fd })
          if (!res.ok) throw new Error((await res.json().catch(() => ({ error: 'failed' }))).error || 'upload failed')
        }
        setSuccess({ recordId: '', title: `${files.length} file${files.length === 1 ? '' : 's'} uploaded` })
      } else {
        setErr('Nothing to capture — add text, a URL, or a file.')
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // ESC to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !busy) close()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && open) submit()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, busy, tab, text, url, files]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={close}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[520px] z-50 bg-background border-l border-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-display text-xl">Capture to memory</h2>
              </div>
              <button
                onClick={close}
                className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Success state */}
            {success ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl mb-1">Captured</h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  &ldquo;{success.title}&rdquo;<br />
                  Triaging now — it&apos;ll appear in Memory shortly.
                </p>
                <div className="flex gap-2 mt-5">
                  <Button variant="outline" onClick={() => { reset() }}>
                    Capture another
                  </Button>
                  <Button onClick={close}>Done</Button>
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex border-b border-border px-4">
                  <TabBtn active={tab === 'text'} onClick={() => setTab('text')} icon={FileText} label="Text" />
                  <TabBtn active={tab === 'voice'} onClick={() => setTab('voice')} icon={Mic} label="Voice" />
                  <TabBtn active={tab === 'file'} onClick={() => setTab('file')} icon={Upload} label="Upload" />
                  <TabBtn active={tab === 'url'} onClick={() => setTab('url')} icon={LinkIcon} label="Link" />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {tab === 'text' && (
                    <>
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste an email, meeting notes, a Slack thread, a decision rationale — anything. The AI triage agent will turn it into a structured record."
                        rows={12}
                        className="font-sans text-[13px] resize-none"
                        autoFocus
                      />
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        AI extracts entities, summary, and links to related memories automatically.
                      </div>
                    </>
                  )}

                  {tab === 'voice' && (
                    <VoiceRecorder
                      selectedProject={selectedProject}
                      onSuccess={(r) => setSuccess({ recordId: r.recordId ?? '', title: r.title })}
                      onError={(msg) => setErr(msg)}
                    />
                  )}

                  {tab === 'file' && (
                    <>
                      <label
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                          'border-border hover:border-primary/50 hover:bg-primary/5',
                        )}
                      >
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => setFiles(Array.from(e.target.files || []))}
                        />
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div className="text-sm font-medium">
                          {files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'Drop files or click to browse'}
                        </div>
                        <div className="text-xs text-muted-foreground text-center max-w-xs">
                          PDF · DOCX · XLSX · audio · video · images. All extracted, transcribed, and added to the memory graph.
                        </div>
                      </label>
                      {files.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {files.map((f, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              <span className="truncate flex-1">{f.name}</span>
                              <span className="text-[10px]">{Math.round(f.size / 1024)} KB</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}

                  {tab === 'url' && (
                    <>
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        type="url"
                        autoFocus
                      />
                      <div className="text-xs text-muted-foreground">
                        The page will be fetched, its content extracted, and added as a memory. Good for docs, articles, specs.
                      </div>
                    </>
                  )}

                  {/* Scope picker — optional, collapsed by default */}
                  <div className="pt-3 mt-3 border-t border-border">
                    {showScope ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">Destination</span>
                          <button
                            onClick={() => setShowScope(false)}
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Use default
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
                            value={selectedTeam ?? ''}
                            onChange={(e) => {
                              setSelectedTeam(e.target.value)
                              const t = teams.find((tt) => tt.teamId === e.target.value)
                              const def = t?.projects.find((p) => p.isDefault) || t?.projects[0]
                              setSelectedProject(def?.id ?? null)
                            }}
                          >
                            {teams.map((t) => (
                              <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                            ))}
                          </select>
                          <select
                            className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
                            value={selectedProject ?? ''}
                            onChange={(e) => setSelectedProject(e.target.value)}
                          >
                            {activeTeam?.projects.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (default)' : ''}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowScope(true)}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                      >
                        <Target className="h-3 w-3" />
                        {activeTeam
                          ? <>Going to <span className="font-medium text-foreground">{activeTeam.teamName}</span> · <span className="text-muted-foreground">{activeTeam.projects.find((p) => p.id === selectedProject)?.name}</span></>
                          : 'Choose destination'}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {err && (
                    <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2 mt-3">
                      {err}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    <kbd className="font-mono bg-muted px-1 py-0.5 rounded">⌘↵</kbd> to capture · <kbd className="font-mono bg-muted px-1 py-0.5 rounded">Esc</kbd> to close
                  </span>
                  <Button onClick={submit} disabled={busy}>
                    {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Capturing…</> : 'Capture'}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof FileText; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] border-b-2 -mb-px transition-colors',
        active ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
