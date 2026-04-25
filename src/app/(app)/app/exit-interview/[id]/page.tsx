'use client'

// Exit interview — participant session page. Admin view read-only.
//
// The departing user answers questions one at a time. Each save persists
// immediately. On completion, the AI synthesizes a handoff doc and we
// redirect to the record detail.

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Loader2, Check, ArrowRight, ArrowLeft, Sparkles,
  HelpCircle, Users, BookOpen, AlertTriangle, Clock,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

type Topic = 'projects' | 'relationships' | 'tribal_knowledge' | 'gotchas' | 'open_loops'

interface QAItem {
  id: string
  topic: Topic
  question: string
  answer: string | null
  answeredAt: string | null
}

interface Interview {
  id: string
  organizationId: string
  departingUserId: string
  roleTitle: string | null
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  questions: QAItem[]
  handoffDoc: string | null
  handoffRecordId: string | null
  viewerIsDepartingUser: boolean
  viewerIsAdmin: boolean
  createdAt: string
  completedAt: string | null
}

const TOPIC_META: Record<Topic, { label: string; icon: any; tone: string; description: string }> = {
  projects:          { label: 'Projects',          icon: Sparkles,     tone: 'text-violet-600 bg-violet-500/10', description: 'Ongoing work and state' },
  relationships:     { label: 'Relationships',     icon: Users,        tone: 'text-blue-600 bg-blue-500/10',     description: 'People to preserve ties with' },
  tribal_knowledge:  { label: 'Tribal knowledge',  icon: BookOpen,     tone: 'text-emerald-600 bg-emerald-500/10', description: 'Undocumented "how we do X"' },
  gotchas:           { label: 'Gotchas',           icon: AlertTriangle,tone: 'text-red-600 bg-red-500/10',       description: 'Things that will surprise your successor' },
  open_loops:        { label: 'Open loops',        icon: Clock,        tone: 'text-amber-600 bg-amber-500/10',   description: 'Conversations and decisions in flight' },
}

export default function ExitInterviewSessionPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [interview, setInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/enterprise/exit-interviews/${id}`)
      if (!res.ok) {
        toast.error('Could not load interview')
        return
      }
      const data = await res.json()
      setInterview(data.interview)
      // Jump to the first unanswered question
      const firstUnanswered = data.interview.questions.findIndex((q: QAItem) => !q.answer)
      setCurrent(firstUnanswered === -1 ? 0 : firstUnanswered)
      if (firstUnanswered >= 0) {
        setDraft(data.interview.questions[firstUnanswered].answer || '')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (interview?.questions[current]) {
      setDraft(interview.questions[current].answer || '')
    }
  }, [current, interview])

  async function saveAnswer(moveNext: boolean) {
    if (!interview) return
    const q = interview.questions[current]
    if (!q) return
    if (!interview.viewerIsDepartingUser) {
      if (moveNext) setCurrent((c) => Math.min(c + 1, interview.questions.length - 1))
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/enterprise/exit-interviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'answer', questionId: q.id, answer: draft }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Save failed')
        return
      }
      // Update local state
      setInterview((prev) => prev ? {
        ...prev,
        questions: prev.questions.map((qq) => qq.id === q.id ? { ...qq, answer: draft.trim() || null, answeredAt: draft.trim() ? new Date().toISOString() : null } : qq),
      } : prev)
      if (moveNext) {
        setCurrent((c) => Math.min(c + 1, interview.questions.length - 1))
      }
    } finally {
      setSaving(false)
    }
  }

  async function completeInterview() {
    if (!interview) return
    setCompleting(true)
    try {
      // Save the current draft first
      if (interview.viewerIsDepartingUser && draft.trim() !== (interview.questions[current]?.answer || '')) {
        await saveAnswer(false)
      }
      const res = await fetch(`/api/enterprise/exit-interviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Complete failed')
        return
      }
      const data = await res.json()
      toast.success('Handoff doc generated')
      if (data.handoffRecordId) {
        router.push(`/app/memories/${data.handoffRecordId}`)
      } else {
        await load()
      }
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading interview…
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <p className="text-sm text-muted-foreground">Interview not found, or you don&apos;t have access.</p>
      </div>
    )
  }

  if (interview.status === 'completed') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-5">
        <div>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            <Check className="h-2.5 w-2.5 mr-0.5" /> Completed
          </Badge>
          <h1 className="font-display text-3xl tracking-tight mt-2">Handoff doc ready</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Interview complete. The AI synthesized the answers into the handoff below.
          </p>
        </div>

        {interview.handoffRecordId && (
          <Button asChild>
            <Link href={`/app/memories/${interview.handoffRecordId}`}>Open as a memory</Link>
          </Button>
        )}

        <Card className="p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{interview.handoffDoc || 'Handoff doc unavailable.'}</ReactMarkdown>
          </div>
        </Card>
      </motion.div>
    )
  }

  const q = interview.questions[current]
  const meta = q ? TOPIC_META[q.topic] : null
  const Icon = meta?.icon || HelpCircle
  const total = interview.questions.length
  const answered = interview.questions.filter((qq) => qq.answer).length
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-5"
    >
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <GraduationCap className="h-3.5 w-3.5" /> Exit interview
          {interview.roleTitle && <span>· {interview.roleTitle}</span>}
        </div>
        <h1 className="font-display text-3xl tracking-tight">Capture what you know before you leave</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          the AI pre-read your memory footprint to write these questions. Answer in 2-5 sentences —
          save as you go. We synthesize a handoff doc at the end for whoever takes over.
        </p>
      </div>

      {/* Progress + topic jumps */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-xs text-muted-foreground">Question {current + 1} of {total} · {answered} answered</div>
          <div className="flex-1 max-w-xs h-1.5 rounded-full bg-muted overflow-hidden mx-3">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs font-medium">{progress}%</div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {interview.questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              className={cn(
                'h-6 w-6 rounded text-[10px] font-semibold transition-colors',
                i === current
                  ? 'bg-primary text-primary-foreground'
                  : qq.answer
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-500'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
              title={`Q${i + 1}: ${qq.question.slice(0, 60)}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </Card>

      {/* Current question */}
      <AnimatePresence mode="wait">
        {q && meta && (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
          >
            <Card className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className={cn('h-9 w-9 rounded shrink-0 flex items-center justify-center', meta.tone)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{meta.label}</Badge>
                    <span className="text-[10px] text-muted-foreground">{meta.description}</span>
                  </div>
                  <h2 className="text-lg font-semibold leading-snug">{q.question}</h2>
                </div>
              </div>

              {interview.viewerIsDepartingUser ? (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={8}
                  placeholder="2-5 sentences. Name people, systems, projects specifically — the more concrete, the more useful the handoff doc."
                  disabled={saving || completing}
                  className="text-sm"
                />
              ) : (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  {q.answer ? q.answer : <span className="text-muted-foreground italic">Not answered yet.</span>}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t gap-2">
                <Button variant="ghost" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <div className="flex items-center gap-2">
                  {interview.viewerIsDepartingUser && (
                    <>
                      <Button variant="outline" onClick={() => saveAnswer(false)} disabled={saving || !draft.trim()}>
                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                        Save
                      </Button>
                      <Button onClick={() => saveAnswer(true)} disabled={saving || current === total - 1}>
                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                        Save + next
                      </Button>
                    </>
                  )}
                  {!interview.viewerIsDepartingUser && current < total - 1 && (
                    <Button onClick={() => setCurrent((c) => Math.min(c + 1, total - 1))}>
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete */}
      {answered > 0 && (
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Ready for the AI to synthesize?</div>
              <div className="text-xs text-muted-foreground">
                {answered}/{total} answers. Completion generates the handoff doc and saves it as a memory your successor can open on day one.
                {answered < total && ' You can still complete with some questions skipped.'}
              </div>
            </div>
            <Button
              onClick={completeInterview}
              disabled={completing || answered === 0}
              className="shrink-0"
            >
              {completing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Generate handoff
            </Button>
          </div>
        </Card>
      )}
    </motion.div>
  )
}
