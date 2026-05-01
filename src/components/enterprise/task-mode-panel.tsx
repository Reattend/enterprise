'use client'

// Compose panel — the Copilot-style memory-grounded workflow page.
//
// Flow:
//   1. User fills the form (To, Subject, key points, tone, etc.)
//   2. Click "Draft" → POST /api/ask with `question = mode.buildPrompt(fields)`
//   3. Stream answer; parse the `X-Sources` header (set by /api/ask) into
//      memory-source chips that render alongside the draft
//   4. Inline `[1]`, `[2]` markers in the draft body become clickable
//      citation pills that link back to /app/memories/<id>
//   5. Refine chat lets the user iterate without losing the source context
//
// The wiring is unchanged from the previous version — this is a
// design/UX rework. All previous public behavior preserved:
//   - same /api/ask endpoint + history shape
//   - same field schema from TASK_MODES
//   - same streaming reader pattern

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, Send, Loader2, Copy, Check, RefreshCw,
  Mail, Calendar, FileText, LayoutDashboard, ShieldCheck, Pin,
  ExternalLink,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TaskMode } from '@/lib/ai/task-modes'

const ICONS: Record<string, any> = {
  Mail, Calendar, FileText, LayoutDashboard,
}

type SourceMeta = {
  id: string
  title: string
  type: string
  workspace?: string
  date?: string
}

// Parse the X-Sources header into typed records.
function parseSources(header: string | null): SourceMeta[] {
  if (!header) return []
  try {
    // /api/ask escapes non-ASCII chars to \uXXXX so the header stays Latin-1.
    // Decode them back so titles render correctly.
    const decoded = header.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    const arr = JSON.parse(decoded)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

// Build initial form state from the task's field schema.
function initialFields(mode: TaskMode): Record<string, string> {
  const init: Record<string, string> = {}
  for (const f of mode.fields) {
    if (f.type === 'select' && f.options?.length) init[f.key] = f.options[0].value
    else init[f.key] = ''
  }
  return init
}

// Compose-action label per mode (e.g. "Send via Outlook" for email,
// "Open in Calendar" for meeting prep). Falls back to "Copy to clipboard".
function modeAction(mode: TaskMode): { label: string; href?: string; copy?: boolean; icon: any } {
  if (mode.id === 'draft-email') return { label: 'Send via mail', icon: ExternalLink, href: 'mailto:' }
  return { label: 'Copy', icon: Copy, copy: true }
}

export function TaskModePanel({ mode }: { mode: TaskMode }) {
  const Icon = ICONS[mode.iconName] || Sparkles

  const [fields, setFields] = useState<Record<string, string>>(() => initialFields(mode))
  const [streaming, setStreaming] = useState(false)
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<SourceMeta[]>([])
  const [droppedIds, setDroppedIds] = useState<Set<string>>(new Set())
  const [version, setVersion] = useState(0) // increments on each draft
  const [draftMs, setDraftMs] = useState(0)
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [refineText, setRefineText] = useState('')
  const [refining, setRefining] = useState(false)
  const [copied, setCopied] = useState(false)
  const draftRef = useRef<HTMLDivElement>(null)

  const canSubmit = mode.fields.every((f) => !f.required || (fields[f.key] || '').trim().length > 0)

  const action = modeAction(mode)
  const ActionIcon = action.icon

  // Visible sources (after the user dropped some).
  const visibleSources = useMemo(() => sources.filter((s) => !droppedIds.has(s.id)), [sources, droppedIds])

  // Citation lookup: map [1] → first source, [2] → second, etc.
  // Sources arrive in retrieval-rank order from the server.
  const citationFor = (n: number): SourceMeta | undefined => sources[n - 1]

  // Replace `[1]`, `[2]` in the streamed text with React-rendered pills
  // that link to /app/memories/<id>. We do this in a markdown component
  // override so prose layout stays intact.
  const renderWithCitations = (text: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = []
    const re = /\[(\d{1,3})\]/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index))
      const n = parseInt(m[1], 10)
      const src = citationFor(n)
      parts.push(
        src ? (
          <Link
            key={`c-${m.index}-${n}`}
            href={`/app/memories/${src.id}`}
            title={`${src.title}${src.date ? ' · ' + src.date : ''}`}
            className="tsk-cite"
          >
            {n}
          </Link>
        ) : (
          <span key={`c-${m.index}-${n}`} className="tsk-cite">{n}</span>
        ),
      )
      last = m.index + m[0].length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts
  }

  const runDraft = async () => {
    if (!canSubmit) {
      toast.error('Fill out the required fields first')
      return
    }
    const prompt = mode.buildPrompt(fields)
    setStreaming(true)
    setAnswer('')
    setSources([])
    setDroppedIds(new Set())
    setHistory([{ role: 'user', content: `[${mode.label}]\n${JSON.stringify(fields, null, 2)}` }])
    const t0 = performance.now()
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt }),
      })
      if (!res.ok || !res.body) {
        toast.error(res.status === 401 ? 'Sign in required' : 'Draft failed — check LLM API key in env')
        return
      }
      // Pull X-Sources before draining the body — the header is sent with
      // the response head, so it's available immediately.
      const parsedSources = parseSources(res.headers.get('X-Sources'))
      setSources(parsedSources)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setAnswer(acc)
        draftRef.current?.scrollTo({ top: draftRef.current.scrollHeight, behavior: 'auto' })
      }
      setHistory((h) => [...h, { role: 'assistant', content: acc }])
      setDraftMs(Math.round(performance.now() - t0))
      setVersion((v) => v + 1)
    } finally {
      setStreaming(false)
    }
  }

  const runRefine = async () => {
    const q = refineText.trim()
    if (!q || refining) return
    setRefineText('')
    setRefining(true)
    const nextHistory = [...history, { role: 'user' as const, content: q }]
    setHistory(nextHistory)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history: nextHistory.slice(-6) }),
      })
      if (!res.ok || !res.body) {
        toast.error('Refinement failed')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      setHistory((h) => [...h, { role: 'assistant', content: '' }])
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setHistory((h) => {
          const copy = h.slice()
          copy[copy.length - 1] = { role: 'assistant', content: acc }
          return copy
        })
      }
    } finally {
      setRefining(false)
    }
  }

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
      toast.success('Copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  // For "Send via mail" (draft-email mode): construct a mailto: with subject
  // pulled from "Subject:" line of the draft and body = the rest. Fallback to
  // the raw `topic` field if parsing fails.
  const sendMail = () => {
    const lines = answer.split('\n')
    const subjectLine = lines.find((l) => l.toLowerCase().startsWith('subject:'))
    const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '') : (fields.topic || '')
    const body = answer
      .replace(/^subject:.*\n?/i, '')
      .replace(/^\n+/, '')
      // Strip [1] [2] citations for clean email — recipient won't have the
      // memory linked, just the prose. Future: include sources as a footer.
      .replace(/\[\d{1,3}\]/g, '')
    const mailto = `mailto:${encodeURIComponent(fields.recipient || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
  }

  return (
    <div className="tsk-page-wrap">
      <div className="tsk-page tsk-compose">
        <Link href="/app/tasks" className="tsk-back" style={{ alignSelf: 'flex-start' }}>
          <ArrowLeft size={13} strokeWidth={2} /> Tasks
        </Link>

        {/* Hero */}
        <div className="tsk-hero">
          <div className={cn('tsk-hero-ico', mode.category)}>
            <Icon size={22} strokeWidth={1.8} />
          </div>
          <div className="tsk-hero-body">
            <h2>{mode.label}</h2>
            <p>{mode.description}</p>
          </div>
        </div>

        {/* Form */}
        <div className="tsk-form">
          <div className="tsk-form-grid">
            {mode.fields.map((f, i) => {
              // First two fields go side-by-side; the rest are full-width.
              const full = f.type === 'textarea' || i >= 2
              return (
                <div key={f.key} className={cn('tsk-field', full && 'full')}>
                  <label>
                    {f.label}
                    {f.required && <span className="req">*</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={fields[f.key] || ''}
                      onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={f.rows || 4}
                    />
                  ) : f.type === 'select' ? (
                    <select
                      value={fields[f.key]}
                      onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))}
                    >
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      value={fields[f.key] || ''}
                      onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                  )}
                  {f.helpText && <div className="help">{f.helpText}</div>}
                  {/* Recipient chip preview for the To field */}
                  {f.key === 'recipient' && fields.recipient.trim().length > 0 && (
                    <span className="tsk-chip">
                      <span className="av">{fields.recipient.slice(0, 1).toUpperCase()}</span>
                      {fields.recipient}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="tsk-form-foot">
            <span className="tsk-privacy">
              <ShieldCheck size={13} strokeWidth={1.8} />
              Stays in your workspace · 0 external calls
            </span>
            <button
              type="button"
              className="tsk-draft-btn"
              onClick={runDraft}
              disabled={!canSubmit || streaming}
            >
              {streaming ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {streaming ? 'Drafting…' : answer ? 'Redraft' : 'Draft'}
            </button>
          </div>
        </div>

        {/* Source chips — appear once the response headers arrive */}
        {visibleSources.length > 0 && (
          <div className="tsk-sources">
            <div className="tsk-sources-head">
              <span>Memory sources</span>
              <span className="auto">
                <Sparkles size={10} strokeWidth={1.8} /> Auto-selected · {visibleSources.length} of {sources.length}
              </span>
            </div>
            <div className="tsk-sources-list">
              {visibleSources.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/app/memories/${s.id}`}
                  className="tsk-source-chip"
                  title={s.workspace || ''}
                >
                  <span className={cn('pip', s.type)} />
                  <span className="ttl">{s.title}</span>
                  {s.date && <span className="when">{s.date}</span>}
                  <button
                    type="button"
                    className="x"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDroppedIds((d) => new Set(d).add(s.id))
                    }}
                    aria-label="Drop source"
                    title="Drop this source"
                  >×</button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Generated draft */}
        {(streaming || answer) && (
          <div className="tsk-draft">
            <div className="tsk-draft-head">
              <span className="label">Generated draft</span>
              {version > 0 && (
                <span className="meta">
                  v{version} <span>·</span> {(draftMs / 1000).toFixed(1)}s
                  {sources.length > 0 && <><span>·</span> {sources.length} sources</>}
                </span>
              )}
              {streaming && <span className="meta">streaming…</span>}
              {!streaming && answer && (
                <div className="tsk-draft-actions">
                  <button type="button" className="tsk-act-btn" onClick={runDraft} title="Regenerate">
                    <RefreshCw size={11} /> Regenerate
                  </button>
                  <button type="button" className="tsk-act-btn" onClick={copyAnswer}>
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  {action.href === 'mailto:' ? (
                    <button type="button" className="tsk-act-btn dark" onClick={sendMail}>
                      <ActionIcon size={11} /> {action.label}
                    </button>
                  ) : (
                    <button type="button" className="tsk-act-btn dark" onClick={copyAnswer}>
                      <ActionIcon size={11} /> {action.label}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div ref={draftRef} className="tsk-draft-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {answer ? (
                <ReactMarkdown
                  components={{
                    // Wrap any text node that contains [n] markers with our
                    // citation pill renderer. Using `p` and `li` is enough
                    // since prose content lands inside one of those.
                    p: ({ children }) => <p>{flattenWithCites(children, renderWithCitations)}</p>,
                    li: ({ children }) => <li>{flattenWithCites(children, renderWithCitations)}</li>,
                  }}
                >
                  {answer}
                </ReactMarkdown>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13 }}>
                  <Loader2 size={14} className="animate-spin" /> Pulling from memory…
                </div>
              )}
            </div>
            {!streaming && answer && (
              <div className="tsk-draft-meta">
                Citations link back to source memories. Edits stay local until you copy or send.
              </div>
            )}
          </div>
        )}

        {/* Refine — chat with the draft */}
        {answer && !streaming && (
          <div className="tsk-refine">
            <div className="tsk-refine-head">
              <Pin size={11} strokeWidth={1.8} />
              Refine the draft
              <span style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0, fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>
                Ask for shorter, longer, different tone, more detail on any section…
              </span>
            </div>
            {history.length > 2 && (
              <div className="tsk-refine-msgs">
                {history.slice(2).map((m, i) => (
                  <div key={i} className={cn('tsk-refine-msg', m.role)}>
                    <div className="bubble">
                      {m.role === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p>{flattenWithCites(children, renderWithCitations)}</p>,
                            li: ({ children }) => <li>{flattenWithCites(children, renderWithCitations)}</li>,
                          }}
                        >
                          {m.content || '…'}
                        </ReactMarkdown>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="tsk-refine-input">
              <input
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runRefine() } }}
                placeholder="e.g. Make it 2 sentences shorter. Or: add a line about the Q3 numbers."
                disabled={refining}
              />
              <button type="button" onClick={runRefine} disabled={refining || !refineText.trim()}>
                {refining ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ReactMarkdown gives us children as React nodes (string | element[] mix).
// Walk them; for each string node, expand `[n]` markers into citation pills
// via the `renderCites` callback. Element nodes pass through unchanged.
function flattenWithCites(
  children: React.ReactNode,
  renderCites: (text: string) => (string | JSX.Element)[],
): React.ReactNode[] {
  const arr = Array.isArray(children) ? children : [children]
  const out: React.ReactNode[] = []
  arr.forEach((c, i) => {
    if (typeof c === 'string') {
      out.push(...renderCites(c).map((node, j) =>
        typeof node === 'string' ? <span key={`s-${i}-${j}`}>{node}</span> : node,
      ))
    } else {
      out.push(c)
    }
  })
  return out
}
