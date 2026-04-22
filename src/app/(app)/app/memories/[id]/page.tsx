'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Lock,
  Edit3,
  Trash2,
  Tag,
  User,
  Network,
  ChevronRight,
  Save,
  Loader2,
  Paperclip,
  Download,
  Calendar,
  Gauge,
  Gavel,
  Lightbulb,
  MessageSquare,
  Zap,
  FileText,
  Target,
  StickyNote,
  PenLine,
  Sparkles,
  Mic,
  Share2,
  Users,
  Building2,
  Globe,
  ShieldCheck,
  ScrollText,
  BookOpen,
} from 'lucide-react'
import { RecordSharePanel } from '@/components/enterprise/record-share-panel'
import { PromoteToDecisionDialog } from '@/components/enterprise/promote-to-decision-dialog'
import { useAppStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const typeConfig: Record<string, { icon: any; color: string; bg: string; gradient: string; label: string }> = {
  decision: { icon: Gavel, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', gradient: 'from-violet-500 to-purple-600', label: 'Decision' },
  meeting: { icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', gradient: 'from-blue-500 to-cyan-500', label: 'Meeting' },
  idea: { icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', gradient: 'from-amber-500 to-orange-500', label: 'Idea' },
  insight: { icon: Lightbulb, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', gradient: 'from-emerald-500 to-teal-500', label: 'Insight' },
  context: { icon: FileText, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', gradient: 'from-slate-500 to-slate-600', label: 'Context' },
  tasklike: { icon: Target, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', gradient: 'from-red-500 to-rose-600', label: 'Task' },
  note: { icon: StickyNote, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', gradient: 'from-gray-500 to-gray-600', label: 'Note' },
  transcript: { icon: Mic, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10', gradient: 'from-pink-500 to-rose-500', label: 'Transcript' },
}

export default function MemoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const recordId = params.id as string
  const { enterpriseOrgs, activeEnterpriseOrgId } = useAppStore()
  const activeOrg = enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId) ?? enterpriseOrgs[0]
  const isAdmin = activeOrg && (activeOrg.role === 'super_admin' || activeOrg.role === 'admin')

  const [record, setRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editContent, setEditContent] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [promoteOpen, setPromoteOpen] = useState(false)

  useEffect(() => {
    fetchRecord()
  }, [recordId])

  const fetchRecord = async () => {
    try {
      const res = await fetch(`/api/records/${recordId}`)
      const data = await res.json()
      if (data.record) {
        setRecord(data.record)
        setEditTitle(data.record.title)
        setEditSummary(data.record.summary || '')
        setEditContent(data.record.content || '')
      }
    } catch {
      toast.error('Failed to load memory')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const contentChanged = editContent !== (record.content || '')
    const now = new Date().toISOString()
    try {
      await fetch('/api/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recordId,
          title: editTitle,
          summary: editSummary,
          content: editContent,
        }),
      })
      setRecord((prev: any) => ({
        ...prev,
        title: editTitle,
        summary: editSummary,
        content: editContent,
        updatedAt: now,
      }))
      setIsEditing(false)
      toast.success('Memory saved')

      // Re-analyze metadata if content changed
      if (contentChanged) {
        setReanalyzing(true)
        try {
          const res = await fetch(`/api/records/${recordId}/reanalyze`, { method: 'POST' })
          if (res.ok) {
            const updated = await res.json()
            setRecord((prev: any) => ({
              ...prev,
              title: updated.title,
              summary: updated.summary,
              confidence: updated.confidence,
              updatedAt: updated.updatedAt,
            }))
            setEditTitle(updated.title)
            setEditSummary(updated.summary)
            toast.success('Metadata refreshed by AI')
          }
        } catch {
          // Reanalysis is best-effort
        } finally {
          setReanalyzing(false)
        }
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this memory?')) return
    try {
      await fetch('/api/records', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId }),
      })
      toast.success('Memory deleted')
      router.push('/app/memories')
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Memory not found</p>
        <Button className="mt-4" asChild>
          <Link href="/app/memories">Back to Memories</Link>
        </Button>
      </div>
    )
  }

  const tags = Array.isArray(record.tags) ? record.tags : []
  const entities = record.entities || []
  const links = record.links || []
  const tc = typeConfig[record.type]
  const TypeIcon = tc?.icon || FileText

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-5xl"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPromoteOpen(true)} className="gap-1.5">
            <Gavel className="h-4 w-4" /> Promote to decision
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)} className="gap-1.5">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          {/* Jump to Wiki — opens Topics filtered to the first tag, else
              Hierarchy filtered to the record's workspace. Gives context for
              this record: who else touched it, adjacent knowledge. */}
          {(() => {
            if (!record) return null
            const tags: string[] = Array.isArray(record.tags)
              ? record.tags
              : (typeof record.tags === 'string' && record.tags.startsWith('[')
                ? (() => { try { return JSON.parse(record.tags) } catch { return [] } })()
                : [])
            const firstTag = tags.find((t: string) => t && !/^(brain-dump|decision|open-question|action-item|observation)$/i.test(t))
            const wikiHref = firstTag
              ? `/app/wiki?tab=topics&topic=${encodeURIComponent(String(firstTag).toLowerCase().replace(/\s+/g, '-'))}`
              : `/app/wiki?tab=hierarchy`
            return (
              <Button asChild variant="ghost" size="sm" className="gap-1.5" title="See this in the Wiki roll-up">
                <Link href={wikiHref}>
                  <BookOpen className="h-4 w-4" /> On Wiki
                </Link>
              </Button>
            )
          })()}
          {isAdmin && activeOrg && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1.5"
              title="View audit history for this memory"
            >
              <Link href={`/app/admin/${activeOrg.orgId}/audit?resourceId=${recordId}`}>
                <ScrollText className="h-4 w-4" /> History
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => setIsEditing(!isEditing)}>
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Header with type gradient bar */}
      <div className="relative overflow-hidden rounded-2xl border bg-card">
        <div className={`h-1.5 bg-gradient-to-r ${tc?.gradient || 'from-gray-400 to-gray-500'}`} />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 bg-gradient-to-br ${tc?.gradient || 'from-gray-400 to-gray-500'} text-white`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="secondary" className={`text-[10px] ${tc?.bg || ''} ${tc?.color || ''}`}>
                  {tc?.label || record.type}
                </Badge>
                {record.locked && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Lock className="h-2.5 w-2.5" /> Locked
                  </Badge>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold"
                    placeholder="Title"
                  />
                  <Textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    className="text-sm"
                    rows={3}
                    placeholder="Summary"
                  />
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="text-sm font-mono"
                    rows={8}
                    placeholder="Full content…"
                  />
                  <div className="flex gap-2 items-center">
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold tracking-tight leading-snug line-clamp-2 break-words">{record.title}</h1>
                  {record.summary && (
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{record.summary}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column - Content + Links */}
        <div className="lg:col-span-2 space-y-4">
          {/* Content */}
          {record.content && !isEditing && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Content</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {(record.content || '').split('\n').map((line: string, i: number) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">{line || <br />}</p>
                ))}
              </div>
            </div>
          )}

          {/* Linked Memories */}
          {links.length > 0 && (
            <div className="rounded-2xl border bg-card">
              <div className="px-5 pt-4 pb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  Linked Memories ({links.length})
                </h3>
              </div>
              <div className="px-2 pb-2">
                {links.map((link: any) => {
                  const linkTc = typeConfig[link.targetType]
                  const LinkIcon = linkTc?.icon || FileText
                  return (
                    <Link
                      key={link.id}
                      href={`/app/memories/${link.targetId}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${linkTc?.bg || 'bg-muted'} ${linkTc?.color || ''}`}>
                        <LinkIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{link.targetTitle}</p>
                        {link.explanation && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{link.explanation}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{link.kind.replace(/_/g, ' ')}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Details + Tags + Entities + Attachment */}
        <div className="space-y-4">
          {/* Details card with colored background */}
          <div className={`rounded-2xl overflow-hidden bg-gradient-to-br ${tc?.gradient || 'from-gray-400 to-gray-500'} p-[1px]`}>
            <div className="rounded-[15px] bg-card">
              <div className={`px-5 pt-4 pb-3 bg-gradient-to-br ${tc?.gradient || 'from-gray-400 to-gray-500'}`}>
                <h3 className="text-sm font-semibold text-white">Details</h3>
              </div>
              <div className="p-5 space-y-4">
                {record.confidence != null && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Gauge className="h-3 w-3" /> Confidence
                      </span>
                      {reanalyzing ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 animate-pulse text-primary" /> Re-analyzing…
                        </span>
                      ) : (
                        <span className="text-xs font-bold">{Math.round(record.confidence * 100)}%</span>
                      )}
                    </div>
                    <Progress value={record.confidence * 100} className="h-2" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Created
                  </span>
                  <span className="text-xs font-medium">{new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {record.updatedAt && record.updatedAt !== record.createdAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <PenLine className="h-3 w-3" /> Edited
                    </span>
                    <span className="text-xs font-medium">
                      {new Date(record.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Created by
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {record.createdBy === 'agent' ? 'AI Agent' : 'You'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3" /> Visibility
                  </span>
                  <button
                    onClick={() => setShareOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    {record.visibility === 'private' && <><Lock className="h-3 w-3" /> Private</>}
                    {record.visibility === 'team' && <><Users className="h-3 w-3" /> Team</>}
                    {record.visibility === 'department' && <><Building2 className="h-3 w-3" /> Department</>}
                    {record.visibility === 'org' && <><Globe className="h-3 w-3" /> Organization</>}
                    {!record.visibility && <><Users className="h-3 w-3" /> Team</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Attachment */}
          {record.attachment && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Paperclip className="h-4 w-4 text-muted-foreground" /> Attachment
              </h3>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50">
                <Paperclip className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{record.attachment.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">{(record.attachment.fileSize / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2.5 text-xs" asChild>
                <a href={`/api/files/${record.attachment.id}`} download>
                  <Download className="h-3 w-3 mr-1.5" /> Download File
                </a>
              </Button>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-muted-foreground" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag: string) => (
                  <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          {entities.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" /> Entities
              </h3>
              <div className="space-y-2">
                {entities.map((entity: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30">
                    <Badge variant="secondary" className="text-[10px] shrink-0">{entity.kind}</Badge>
                    <span className="text-sm truncate">{entity.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <RecordSharePanel
        recordId={recordId}
        open={shareOpen}
        onOpenChange={setShareOpen}
        onVisibilityChange={(v) => setRecord((prev: any) => ({ ...prev, visibility: v }))}
      />

      <PromoteToDecisionDialog
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        record={record}
      />
    </motion.div>
  )
}
