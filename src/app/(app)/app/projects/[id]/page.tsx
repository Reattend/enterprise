'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Brain,
  Trash2,
  Plus,
  Network,
  Loader2,
  Sparkles,
  Upload,
  FileText,
  Paperclip,
  X,
  Gavel,
  Lightbulb,
  MessageSquare,
  Zap,
  Target,
  StickyNote,
  ChevronRight,
  Calendar,
  Grid3X3,
  GanttChart,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const typeConfig: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  decision: { icon: Gavel, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-200 dark:border-violet-500/20' },
  meeting: { icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
  idea: { icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
  insight: { icon: Lightbulb, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
  context: { icon: FileText, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20' },
  tasklike: { icon: Target, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' },
  note: { icon: StickyNote, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-200 dark:border-gray-500/20' },
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Add memory dialog
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMode, setCreateMode] = useState<'text' | 'file'>('text')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      const [projRes, recRes] = await Promise.all([
        fetch('/api/projects'),
        fetch(`/api/records?project_id=${projectId}`),
      ])
      const projData = await projRes.json()
      const recData = await recRes.json()

      if (projData.projects) {
        const p = projData.projects.find((p: any) => p.id === projectId)
        setProject(p)
      }
      if (recData.records) setRecords(recData.records)
    } catch {
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMemory = async () => {
    if (createMode === 'file') {
      if (!selectedFile) return
      setCreating(true)
      try {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('project_id', projectId)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Failed to upload'); return }
        if (data.record) setRecords(prev => [data.record, ...prev])
        toast.success('File uploaded and enriched!')
        setShowAddMemory(false)
        setNewContent('')
        setSelectedFile(null)
        setCreateMode('text')
      } catch {
        toast.error('Failed to upload file')
      } finally {
        setCreating(false)
      }
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
          project_id: projectId,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to create')
        return
      }

      if (data.record) setRecords(prev => [data.record, ...prev])
      toast.success('Memory created and enriched!')
      setShowAddMemory(false)
      setNewContent('')
    } catch {
      toast.error('Failed to create memory')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return
    try {
      const res = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId }),
      })
      if (res.ok) {
        toast.success('Project deleted')
        router.push('/app/projects')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete')
      }
    } catch {
      toast.error('Failed to delete project')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found</p>
        <Button className="mt-4" asChild>
          <Link href="/app/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  // Group records by type
  const typeCounts: Record<string, number> = {}
  for (const r of records) {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1
  }

  const filtered = typeFilter === 'all' ? records : records.filter(r => r.type === typeFilter)

  const groupByDate = (recs: any[]) => {
    const map = new Map<string, any[]>()
    for (const r of recs) {
      const key = new Date(r.createdAt).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    const now = new Date()
    const today = new Date(now.toDateString())
    return Array.from(map.entries()).map(([key, items]) => {
      const d = new Date(key)
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
      let label: string
      if (diff === 0) label = 'Today'
      else if (diff === 1) label = 'Yesterday'
      else if (diff < 7) label = d.toLocaleDateString('en-US', { weekday: 'long' })
      else label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', ...(diff > 365 ? { year: 'numeric' } : {}) })
      return { label, key, items }
    })
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5 max-w-5xl"
    >
      {/* Top bar */}
      <motion.div variants={item} className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {!project.isDefault && (
          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={handleDeleteProject}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </motion.div>

      {/* Header card */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl border bg-card">
        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: project.color || '#6366f1' }} />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="h-14 w-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md"
              style={{ background: `linear-gradient(135deg, ${project.color || '#6366f1'}, ${project.color || '#6366f1'}dd)` }}
            >
              {project.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{project.description || 'No description'}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Brain className="h-3.5 w-3.5" /> {records.length} memories
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link href="/app/board">
                  <Network className="h-3.5 w-3.5 mr-1.5" /> Board
                </Link>
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAddMemory(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Memory
              </Button>
            </div>
          </div>

          {/* Type breakdown strip — clickable filters */}
          {Object.keys(typeCounts).length > 0 && (
            <div className="flex items-center gap-2 mt-5 pt-4 border-t flex-wrap">
              <button
                onClick={() => setTypeFilter('all')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                  typeFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'
                )}
              >
                All ({records.length})
              </button>
              {Object.entries(typeCounts).map(([type, count]) => {
                const tc = typeConfig[type]
                if (!tc) return null
                const Icon = tc.icon
                const active = typeFilter === type
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(active ? 'all' : type)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                      active
                        ? `${tc.bg} ${tc.color} border-current ring-1 ring-current/30`
                        : `${tc.bg} ${tc.color} border-transparent opacity-70 hover:opacity-100`
                    )}
                  >
                    <Icon className="h-3 w-3" /> {count} {type}{count !== 1 ? 's' : ''}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Memories section */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Memories ({filtered.length}{typeFilter !== 'all' ? ` of ${records.length}` : ''})
          </h2>
          {records.length > 0 && (
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setViewMode('timeline')}
                title="Timeline view"
              >
                <GanttChart className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-muted/20 text-center py-16">
            <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground font-medium">No memories in this project yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first memory to get started</p>
            <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAddMemory(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add First Memory
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-muted/20 text-center py-10">
            <p className="text-sm text-muted-foreground">No {typeFilter} memories in this project.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((record) => {
              const tc = typeConfig[record.type]
              const Icon = tc?.icon || FileText
              return (
                <Link key={record.id} href={`/app/memories/${record.id}`}>
                  <div className={`group rounded-xl border bg-card p-4 hover:shadow-md transition-all cursor-pointer ${tc?.border || 'border-border'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${tc?.bg || 'bg-muted'} ${tc?.color || ''}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${tc?.bg || ''} ${tc?.color || ''}`}>
                            {record.type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(record.createdAt)}</span>
                          {record.locked && <Lock className="h-3 w-3 text-muted-foreground ml-auto" />}
                        </div>
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {record.title}
                        </p>
                        {record.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{record.summary}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
                    </div>
                    {record.confidence != null && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <span className="text-[10px] text-muted-foreground">Confidence</span>
                        <Progress value={record.confidence * 100} className="flex-1 h-1" />
                        <span className="text-[10px] font-medium tabular-nums">{Math.round(record.confidence * 100)}%</span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div>
            {groupByDate(filtered).map((group) => (
              <div key={group.key} className="mb-7">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="relative pl-7">
                  <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border/70" />
                  <div className="space-y-2.5">
                    {group.items.map((record: any, i: number) => {
                      const tc = typeConfig[record.type]
                      const Icon = tc?.icon || FileText
                      return (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="relative"
                        >
                          <div className="absolute -left-[18px] top-4 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                          <Link href={`/app/memories/${record.id}`}>
                            <div className={`group rounded-xl border bg-card p-3.5 hover:shadow-md transition-all cursor-pointer ${tc?.border || 'border-border'}`}>
                              <div className="flex items-start gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${tc?.bg || 'bg-muted'} ${tc?.color || ''}`}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                      {record.title}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                                      {new Date(record.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {record.summary && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{record.summary}</p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${tc?.bg || ''} ${tc?.color || ''}`}>
                                      {record.type}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Memory Dialog */}
      <Dialog open={showAddMemory} onOpenChange={(open) => {
        setShowAddMemory(open)
        if (!open) { setCreateMode('text'); setSelectedFile(null); setNewContent('') }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Add Memory to {project.name}
            </DialogTitle>
            <DialogDescription>
              Add text or upload a document. AI will enrich it automatically.
            </DialogDescription>
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

            {createMode === 'text' ? (
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What do you want to remember?"
                rows={5}
                autoFocus
              />
            ) : (
              <div>
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
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(0)} KB
                      </p>
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
            <Button variant="ghost" onClick={() => setShowAddMemory(false)}>Cancel</Button>
            <Button
              onClick={handleAddMemory}
              disabled={(createMode === 'text' ? !newContent.trim() : !selectedFile) || creating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  {createMode === 'file' ? 'Uploading...' : 'Enriching...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  {createMode === 'file' ? 'Upload & Enrich' : 'Create & Enrich'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
