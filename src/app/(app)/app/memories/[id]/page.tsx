'use client'

// Memory detail — new dashboard design (Memory.html). Hero with gradient strip
// + serif title, two-column body (content + extracted notes on left, Details
// gradient panel + Tags / Entities / Linked / Activity on right). All actions
// (promote, share, on-wiki, history, edit, delete) and verification controls
// preserved verbatim.

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Lock, Edit3, Trash2, Tag as TagIcon, User, Network, ChevronRight,
  Save, Loader2, Paperclip, Download, Calendar, Gauge, Gavel, Lightbulb,
  MessageSquare, Zap, FileText, Target, StickyNote, PenLine, Sparkles, Mic,
  Share2, Users, Building2, Globe, ShieldCheck, ScrollText, BookOpen, Clock,
  X, Check,
} from 'lucide-react'
import { RecordSharePanel } from '@/components/enterprise/record-share-panel'
import { PromoteToDecisionDialog } from '@/components/enterprise/promote-to-decision-dialog'
import { TrustBadge, computeTrustState } from '@/components/enterprise/trust-badge'
import { useAppStore } from '@/stores/app-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TYPE_META: Record<string, { icon: any; label: string }> = {
  decision: { icon: Gavel, label: 'Decision' },
  meeting: { icon: MessageSquare, label: 'Meeting' },
  idea: { icon: Zap, label: 'Idea' },
  insight: { icon: Lightbulb, label: 'Insight' },
  context: { icon: FileText, label: 'Context' },
  tasklike: { icon: Target, label: 'Task' },
  note: { icon: StickyNote, label: 'Note' },
  transcript: { icon: Mic, label: 'Transcript' },
}

function entityKindClass(kind: string): string {
  const k = (kind || '').toLowerCase()
  if (k === 'org' || k === 'organization') return 'org'
  if (k === 'topic' || k === 'concept') return 'topic'
  return ''
}

function avatarInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
  const [verifyOpen, setVerifyOpen] = useState(false)

  useEffect(() => {
    fetchRecord()
    // Fire-and-forget view ping — feeds trending + admin analytics.
    fetch(`/api/enterprise/records/${recordId}/view`, { method: 'POST' }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId])

  async function verifyNow() {
    try {
      const res = await fetch(`/api/enterprise/records/${recordId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Verify failed')
        return
      }
      const data = await res.json()
      setRecord(data.record)
      toast.success('Marked as verified')
    } catch { toast.error('Verify failed') }
  }

  async function setCadence(days: number | null) {
    try {
      const res = await fetch(`/api/enterprise/records/${recordId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setCadence', cadenceDays: days }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Could not set cadence')
        return
      }
      const data = await res.json()
      setRecord(data.record)
      toast.success(days ? `Cadence: every ${days} days` : 'Cadence removed')
    } catch { toast.error('Could not set cadence') }
  }

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
        } catch { /* best-effort */ }
        finally { setReanalyzing(false) }
      }
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
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
    } catch { toast.error('Failed to delete') }
  }

  if (loading) {
    return (
      <div className="mem-page-wrap">
        <div className="mem-page">
          <div className="mem-empty">
            <Loader2 size={20} className="inline animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="mem-page-wrap">
        <div className="mem-page">
          <div className="mem-empty">
            <p>Memory not found</p>
            <Link href="/app/memories" className="mem-btn primary" style={{ marginTop: 16 }}>
              Back to Memories
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const tags: string[] = Array.isArray(record.tags)
    ? record.tags
    : (typeof record.tags === 'string' && record.tags.startsWith('[')
      ? (() => { try { return JSON.parse(record.tags) } catch { return [] } })()
      : [])
  const entities = record.entities || []
  const links = record.links || []
  const tm = TYPE_META[record.type] || TYPE_META.note
  const TypeIcon = tm.icon

  // Wiki jump link — first non-system tag → topic, else hierarchy.
  const firstTag = tags.find((t: string) => t && !/^(brain-dump|decision|open-question|action-item|observation)$/i.test(t))
  const wikiHref = firstTag
    ? `/app/wiki?tab=topics&topic=${encodeURIComponent(String(firstTag).toLowerCase().replace(/\s+/g, '-'))}`
    : `/app/wiki?tab=hierarchy`

  // Visibility chip
  const vis = record.visibility || 'team'
  const visMeta: Record<string, { icon: any; label: string }> = {
    private: { icon: Lock, label: 'Private' },
    team: { icon: Users, label: 'Team' },
    department: { icon: Building2, label: 'Department' },
    org: { icon: Globe, label: 'Organization' },
  }
  const VisIcon = visMeta[vis]?.icon || Users
  const visLabel = visMeta[vis]?.label || 'Team'

  const cadence: number | null = record?.verifyEveryDays ?? record?.verify_every_days ?? null
  const lastVerified = record?.lastVerifiedAt ?? record?.last_verified_at
  const trustState = computeTrustState({
    verifyEveryDays: record.verifyEveryDays ?? record.verify_every_days,
    lastVerifiedAt: record.lastVerifiedAt ?? record.last_verified_at,
  })

  return (
    <div className="mem-page-wrap">
      <div className="mem-page">
        {/* Action bar */}
        <div className="mem-actbar">
          <button className="mem-back" onClick={() => router.back()}>
            <ArrowLeft size={13} strokeWidth={2} /> Back
          </button>
          <div className="right">
            <button className="mem-act-btn" onClick={() => setPromoteOpen(true)}>
              <Gavel size={13} strokeWidth={1.8} /> Promote to decision
            </button>
            <button className="mem-act-btn" onClick={() => setShareOpen(true)}>
              <Share2 size={13} strokeWidth={1.8} /> Share
            </button>
            <Link href={wikiHref} className="mem-act-btn" title="See this in the Wiki roll-up">
              <BookOpen size={13} strokeWidth={1.8} /> On Wiki
            </Link>
            {isAdmin && activeOrg && (
              <Link
                href={`/app/admin/${activeOrg.orgId}/audit?resourceId=${recordId}`}
                className="mem-act-btn"
                title="View audit history for this memory"
              >
                <ScrollText size={13} strokeWidth={1.8} /> History
              </Link>
            )}
            <button
              className={cn('mem-act-btn', isEditing && 'primary')}
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? 'Cancel edit' : 'Edit'}
            >
              {isEditing ? <X size={13} strokeWidth={1.8} /> : <Edit3 size={13} strokeWidth={1.8} />}
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              className="mem-act-btn danger"
              onClick={handleDelete}
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* HERO */}
        <div className="mem-hero">
          <div className="mem-hero-strip" />
          <div className="mem-hero-body">
            <div className={cn('mem-hero-ico', record.type)}>
              <TypeIcon size={22} strokeWidth={1.8} />
            </div>
            <div>
              <div className="mem-pill-row">
                <span className={cn('mem-pill kind', record.type)}>{tm.label}</span>
                {record.locked && <span className="mem-pill muted"><Lock size={9} style={{ display: 'inline', marginRight: 3 }} /> locked</span>}
                {trustState && (
                  <span className="mem-pill muted">
                    <TrustBadge state={trustState} />
                  </span>
                )}
                {!trustState && cadence == null && (
                  <span className="mem-pill muted">no cadence</span>
                )}
              </div>
              {isEditing ? (
                <div className="mem-hero-edit">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                  />
                  <textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    rows={3}
                    placeholder="Summary"
                  />
                  <div className="actions">
                    <button className="mem-act-btn primary" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button className="mem-act-btn" onClick={() => setIsEditing(false)} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1>{record.title}</h1>
                  {record.summary && <p>{record.summary}</p>}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mem-grid2">
          {/* LEFT — content + linked */}
          <div>
            {/* Content */}
            <div className="mem-d-card">
              <h3>Content</h3>
              <div className="body">
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Full content…"
                  />
                ) : record.content ? (
                  (record.content as string).split('\n').map((line, i) => (
                    <p key={i}>{line || ' '}</p>
                  ))
                ) : (
                  <p style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>No content captured.</p>
                )}
              </div>
            </div>

            {/* Attachment (if any) */}
            {record.attachment && (
              <div className="mem-d-card">
                <h3>Attachment</h3>
                <div className="body">
                  <div className="mem-attach-card">
                    <div className="mem-attach-icon"><Paperclip size={14} /></div>
                    <div className="mem-attach-meta">
                      <div className="mem-attach-name">{record.attachment.fileName}</div>
                      <div className="mem-attach-size">{(record.attachment.fileSize / 1024).toFixed(0)} KB</div>
                    </div>
                    <a
                      href={`/api/files/${record.attachment.id}`}
                      download
                      className="mem-act-btn"
                      style={{ marginLeft: 'auto' }}
                    >
                      <Download size={13} /> Download
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Linked memories — moved to left column for prominence when present */}
            {links.length > 0 && (
              <div className="mem-d-card">
                <h3>Linked memories <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>· {links.length}</span></h3>
                <div className="body" style={{ paddingTop: 0 }}>
                  {links.map((link: any) => {
                    const lm = TYPE_META[link.targetType] || TYPE_META.note
                    const LinkIcon = lm.icon
                    return (
                      <Link
                        key={link.id}
                        href={`/app/memories/${link.targetId}`}
                        className="mem-li-row"
                      >
                        <div className={cn('mem-ico', link.targetType)} style={{ width: 26, height: 26 }}>
                          <LinkIcon size={12} strokeWidth={1.8} />
                        </div>
                        <span className="label">{link.targetTitle}</span>
                        {link.kind && (
                          <span className="ref" style={{ background: 'oklch(0.96 0.005 85)', color: 'var(--ink-3)' }}>
                            {String(link.kind).replace(/_/g, ' ')}
                          </span>
                        )}
                        <ChevronRight size={12} className="arr" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — sidebar panels */}
          <aside>
            {/* Details (gradient) */}
            <div className="mem-panel details">
              <div className="head">Details</div>
              <div className="body">
                {record.confidence != null && (
                  <div className="row" style={{ display: 'block', borderBottom: '1px solid oklch(1 0 0 / 0.18)', paddingBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="k">
                        <Gauge size={13} /> Confidence
                      </span>
                      <span className="v">
                        {reanalyzing
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}><Sparkles size={11} className="animate-pulse" /> AI</span>
                          : `${Math.round(record.confidence * 100)}%`}
                      </span>
                    </div>
                    <div className="mem-conf-bar">
                      <i style={{ width: `${Math.round(record.confidence * 100)}%` }} />
                    </div>
                  </div>
                )}
                <div className="row">
                  <span className="k"><Calendar size={13} /> Created</span>
                  <span className="v">
                    {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {record.updatedAt && record.updatedAt !== record.createdAt && (
                  <div className="row">
                    <span className="k"><PenLine size={13} /> Edited</span>
                    <span className="v">
                      {new Date(record.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
                <div className="row">
                  <span className="k"><User size={13} /> Created by</span>
                  <span className={cn('v chip', record.createdBy === 'agent' && 'lemon')}>
                    {record.createdBy === 'agent' ? 'AI Agent' : 'You'}
                  </span>
                </div>
                <div className="row">
                  <span className="k"><ShieldCheck size={13} /> Visibility</span>
                  <button
                    type="button"
                    className="v chip link"
                    onClick={() => setShareOpen(true)}
                  >
                    <VisIcon size={11} /> {visLabel}
                  </button>
                </div>
                {record.source && (
                  <div className="row">
                    <span className="k"><Globe size={13} /> Source</span>
                    <span className="v">{record.source}</span>
                  </div>
                )}
                {/* Verification — last-verified + change-cadence dropdown */}
                <div className="row" style={{ display: 'block', borderBottom: 0, paddingBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="k"><ShieldCheck size={13} /> Verify</span>
                    <button
                      type="button"
                      className="v chip link"
                      onClick={() => setVerifyOpen(!verifyOpen)}
                    >
                      {cadence ? `every ${cadence}d` : 'no cadence'}
                    </button>
                  </div>
                  {lastVerified && (
                    <div style={{ fontSize: 10.5, opacity: 0.8, marginTop: 4, paddingLeft: 20 }}>
                      Last verified {new Date(lastVerified).toLocaleDateString()}
                    </div>
                  )}
                  {verifyOpen && (
                    <div style={{ background: 'oklch(1 0 0 / 0.16)', borderRadius: 8, padding: 8, marginTop: 8, fontSize: 12 }}>
                      <button
                        type="button"
                        onClick={() => { verifyNow(); setVerifyOpen(false) }}
                        style={{ width: '100%', background: 'oklch(0.95 0.06 155)', color: 'oklch(0.35 0.12 155)', border: 0, borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 600, fontSize: 11.5, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <Check size={11} /> Mark verified now
                      </button>
                      <div style={{ fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, margin: '6px 0 4px' }}>Cadence</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                        {[30, 60, 90, null].map((d) => (
                          <button
                            key={String(d)}
                            type="button"
                            onClick={() => { setCadence(d); setVerifyOpen(false) }}
                            style={{
                              background: cadence === d ? 'oklch(1 0 0 / 0.4)' : 'oklch(1 0 0 / 0.14)',
                              color: 'white', border: 0, borderRadius: 6, padding: '5px 8px',
                              cursor: 'pointer', fontSize: 11, font: 'inherit', fontWeight: cadence === d ? 600 : 500,
                            }}
                          >
                            {d ? `${d} days` : 'Never'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="mem-panel">
              <div className="head-row">
                <span className="lab"><TagIcon size={12} strokeWidth={2} /> Tags</span>
                <button className="more" onClick={() => setIsEditing(true)}>edit</button>
              </div>
              <div className="pbody">
                {tags.length > 0 ? (
                  tags.map((t: string) => (
                    <span key={t} className="mem-side-tag">{t}</span>
                  ))
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>No tags yet — edit to add.</span>
                )}
              </div>
            </div>

            {/* Entities */}
            {entities.length > 0 && (
              <div className="mem-panel">
                <div className="head-row">
                  <span className="lab">
                    <User size={12} strokeWidth={2} /> Entities
                    <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>· {entities.length}</span>
                  </span>
                </div>
                <div className="pbody" style={{ padding: '6px 14px 12px' }}>
                  {entities.map((entity: any, i: number) => {
                    const kindClass = entityKindClass(entity.kind)
                    return (
                      <div key={i} className="mem-ent">
                        <span className={cn('mem-ent-kind', kindClass)}>{entity.kind || 'tag'}</span>
                        <span className="mem-ent-name">
                          {(!kindClass || kindClass === '') && (
                            <span className="av">{avatarInitials(entity.name)}</span>
                          )}
                          <span>{entity.name}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Activity */}
            <div className="mem-panel">
              <div className="head-row">
                <span className="lab"><Clock size={12} strokeWidth={2} /> Activity</span>
              </div>
              <div className="pbody" style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                <div>
                  <b style={{ color: 'var(--ink-2)' }}>{record.createdBy === 'agent' ? 'AI Agent' : 'You'}</b> created · {new Date(record.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
                {record.updatedAt && record.updatedAt !== record.createdAt && (
                  <div>
                    <b style={{ color: 'var(--ink-2)' }}>edited</b> · {new Date(record.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
                {lastVerified && (
                  <div>
                    <b style={{ color: 'var(--ink-2)' }}>verified</b> · {new Date(lastVerified).toLocaleString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          </aside>
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
    </div>
  )
}
