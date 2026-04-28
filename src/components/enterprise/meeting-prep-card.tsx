'use client'

// Meeting Prep Card — a Home surface.
//
// Shows the next upcoming meeting within a configurable window (default 8h).
// Renders a Claude-synthesized brief, related memories, decisions, and
// attendees. Hidden when nothing upcoming, to keep Home uncluttered.
//
// Seed meetings via POST /api/enterprise/calendar/events — manual today,
// Nango later.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar, Loader2, Clock, MapPin, Users as UsersIcon, Sparkles,
  ChevronDown, ChevronUp, FileText, Gavel, Plus, X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Event {
  id: string
  title: string
  startAt: string
  endAt: string | null
  location: string | null
  description: string | null
  attendeeEmails: string[]
}

interface Brief {
  event: Event
  brief: string
  relatedRecords: Array<{ id: string; title: string; type: string; summary: string | null }>
  decisions: Array<{ id: string; title: string; status: string }>
  attendees: Array<{ id: string; email: string; name: string | null }>
}

function formatRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  const mins = Math.round(ms / 60000)
  if (mins < 0) return 'now'
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `in ${hrs}h`
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function MeetingPrepCard({ orgId }: { orgId: string }) {
  const [events, setEvents] = useState<Event[] | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [briefByEvent, setBriefByEvent] = useState<Record<string, Brief | 'loading'>>({})
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    ;(async () => {
      try {
        const from = new Date().toISOString()
        const to = new Date(Date.now() + 8 * 3600 * 1000).toISOString()
        const res = await fetch(`/api/enterprise/calendar/events?orgId=${orgId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          const evs = (data.events || []).map((e: any) => ({
            id: e.id,
            title: e.title,
            startAt: e.startAt,
            endAt: e.endAt,
            location: e.location,
            description: e.description,
            attendeeEmails: e.attendeeEmails || [],
          }))
          setEvents(evs)
          // Auto-expand the next one
          if (evs.length > 0) setExpandedId(evs[0].id)
        }
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [orgId])

  useEffect(() => {
    if (!expandedId) return
    if (briefByEvent[expandedId] && briefByEvent[expandedId] !== 'loading') return
    setBriefByEvent((prev) => ({ ...prev, [expandedId]: 'loading' }))
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/meeting-prep/${expandedId}`)
        if (!res.ok) {
          setBriefByEvent((prev) => ({ ...prev, [expandedId]: undefined as any }))
          return
        }
        const data = await res.json()
        setBriefByEvent((prev) => ({ ...prev, [expandedId]: data }))
      } catch {
        setBriefByEvent((prev) => {
          const next = { ...prev }
          delete next[expandedId]
          return next
        })
      }
    })()
  }, [expandedId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!events) return null
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <div className="font-medium">No meetings on deck in the next 8 hours</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            When you have one, Reattend will brief you 15 minutes ahead with context from memory.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
        {addOpen && <AddMeetingDialog orgId={orgId} onClose={() => setAddOpen(false)} onAdded={() => window.location.reload()} />}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="text-sm font-semibold">Meeting prep</div>
        <span className="text-[10px] text-muted-foreground">· next 8h</span>
        <Button size="sm" variant="ghost" className="ml-auto text-[11px]" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      <ul className="divide-y">
        {events.map((ev) => {
          const isExpanded = expandedId === ev.id
          const b = briefByEvent[ev.id]
          return (
            <li key={ev.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/20 transition-colors"
              >
                <div className="h-9 w-9 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{ev.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>{formatRelative(ev.startAt)} · {new Date(ev.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    {ev.location && <><span>·</span><MapPin className="h-3 w-3" /><span>{ev.location}</span></>}
                    {ev.attendeeEmails.length > 0 && <><span>·</span><UsersIcon className="h-3 w-3" /><span>{ev.attendeeEmails.length}</span></>}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden border-t bg-background/50"
                >
                  {b === 'loading' && (
                    <div className="px-4 py-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Composing brief…
                    </div>
                  )}
                  {b && b !== 'loading' && (
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Sparkles className="h-2.5 w-2.5" /> AI brief
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-sm">
                        <ReactMarkdown>{b.brief}</ReactMarkdown>
                      </div>
                      {(b.relatedRecords.length > 0 || b.decisions.length > 0) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                          {b.relatedRecords.length > 0 && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Related memories</div>
                              <ul className="space-y-1">
                                {b.relatedRecords.map((r) => (
                                  <li key={r.id}>
                                    <Link href={`/app/memories/${r.id}`} className="text-xs hover:text-primary inline-flex items-center gap-1.5">
                                      <FileText className="h-3 w-3" /> <span className="truncate">{r.title}</span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {b.decisions.length > 0 && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Decisions</div>
                              <ul className="space-y-1">
                                {b.decisions.map((d) => (
                                  <li key={d.id} className="text-xs inline-flex items-center gap-1.5">
                                    <Gavel className="h-3 w-3 text-violet-500" /> <span className="truncate">{d.title}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {b.attendees.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">In the room</div>
                          <div className="flex gap-1.5 flex-wrap">
                            {b.attendees.map((a) => (
                              <span key={a.id} className="text-[11px] border rounded-full px-2 py-0.5">
                                {a.name || a.email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </li>
          )
        })}
      </ul>
      {addOpen && <AddMeetingDialog orgId={orgId} onClose={() => setAddOpen(false)} onAdded={() => window.location.reload()} />}
    </div>
  )
}

function AddMeetingDialog({ orgId, onClose, onAdded }: { orgId: string; onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000)
    return d.toISOString().slice(0, 16)
  })
  const [attendees, setAttendees] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim() || !startAt) {
      toast.error('Title + start time required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/enterprise/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          title: title.trim(),
          startAt: new Date(startAt).toISOString(),
          attendeeEmails: attendees.split(',').map((s) => s.trim()).filter(Boolean),
          location: location.trim() || undefined,
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Failed')
        return
      }
      toast.success('Meeting added')
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl border bg-background shadow-xl w-full max-w-md p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Add a meeting</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Until calendar sync is live, add upcoming meetings here — so Reattend can brief you 15 minutes ahead.
        </p>
        <div className="space-y-2">
          <Input placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} disabled={saving} />
          <Input placeholder="Attendee emails (comma-separated)" value={attendees} onChange={(e) => setAttendees(e.target.value)} disabled={saving} />
          <Input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} disabled={saving} />
          <Textarea placeholder="Agenda / description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={saving} />
        </div>
        <div className="flex justify-end gap-2 pt-1 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
