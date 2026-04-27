'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ReasoningTrace, type TraceData } from '@/components/enterprise/reasoning-trace'
import { motion } from 'framer-motion'
import {
  Sparkles, ArrowUp,
  BookOpen, RefreshCw, ChevronDown, ChevronRight,
  ThumbsUp, ThumbsDown, Share2, Copy, Check,
  Bot, Crown,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { useSearchParams } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ChatModel = 'chat' | 'deepthink'

const MODEL_META: Record<ChatModel, { label: string; sub: string; icon: typeof Bot }> = {
  chat:      { label: 'Chat',      sub: 'Fast streaming · ~2s',         icon: Bot },
  deepthink: { label: 'Deepthink', sub: 'Structured dossier · ~30s',    icon: Crown },
}

const TYPE_COLORS: Record<string, string> = {
  decision: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  meeting: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  idea: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  insight: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  context: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
  tasklike: 'bg-red-500/15 text-red-600 dark:text-red-400',
  note: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
  transcript: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
}

const SUGGESTED = [
  'What decisions did I make this week?',
  'Summarize my recent meetings',
  'Draft a status update from my notes',
  'Prepare me for my next meeting',
]

// Sandbox-only: the guided demo questions that map 1:1 to canned fixtures
// on the server. When the user's email is @sandbox.reattend.local, we swap
// these in so visitors hit the scripted responses immediately.
const SANDBOX_SUGGESTED = [
  'What did we decide about the BEPS treaty position, and what depends on that decision?',
  'If Rajiv left tomorrow, what would we lose?',
  'What did the org know about Vendor X on March 3, 2025?',
  'Which of our active policies are stale and why?',
  'Which decisions have we reversed this year, and why?',
  'What should I prepare before tomorrow\'s BEPS sync with the EU delegation?',
]

// Matches follow-ups heading from AI responses. Covers:
//   ---FOLLOWUPS---, Follow-up questions:, Follow-ups:, FOLLOWUPS, followups:
// We look for the heading on its own line (or preceded by blank line) so we
// don't accidentally catch "follow up with Sarah" inside prose.
const FOLLOWUPS_RE = /(?:^|\n)(?:\*\*)?(?:---\s*)?(?:Follow-?ups?(?:\s+questions?)?|FOLLOWUPS)(?:\s*---)?(?:\*\*)?:?\s*\n/i
// Matches the offers heading. Covers ---OFFERS---, Offers:, OFFERS, "I can":
const OFFERS_RE = /(?:^|\n)(?:\*\*)?(?:---\s*)?(?:Offers?|OFFERS)(?:\s*---)?(?:\*\*)?:?\s*\n/i

type Source = { id: string; title: string; type: string; workspace?: string }

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  followUps?: string[]
  // Offer-style suggestions — "If you want, I can…" prompts.
  // Same shape as followUps (just a list of strings), rendered as a
  // separate pill row below the curious follow-ups.
  offers?: string[]
  // Reasoning trace — populated from X-Trace response header. Lets the
  // ReasoningTrace component replay the pipeline steps that found the answer.
  trace?: TraceData
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [userName, setUserName] = useState('')
  const [isSandbox, setIsSandbox] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  // Track which message's sources are expanded (collapsed by default)
  const [openSourceIds, setOpenSourceIds] = useState<Set<string>>(new Set())
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  // Default the model from the URL so legacy `?mode=oracle` links still
  // land in Deepthink. Plain `?mode=chat` (or no param) keeps Chat.
  const [model, setModel] = useState<ChatModel>(() => {
    if (typeof window === 'undefined') return 'chat'
    const m = new URLSearchParams(window.location.search).get('mode')
    if (m === 'oracle' || m === 'deepthink') return 'deepthink'
    return 'chat'
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { upsertRecentChat } = useAppStore()
  const searchParams = useSearchParams()
  const chatIdParam = searchParams.get('chat')
  const agentIdParam = searchParams.get('agent')
  const [agent, setAgent] = useState<{ id: string; name: string; description: string | null; systemPrompt: string; iconName: string | null; color: string | null } | null>(null)

  // Load agent config when ?agent= param is present
  useEffect(() => {
    if (!agentIdParam) {
      setAgent(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/enterprise/agents/${agentIdParam}`)
      if (cancelled) return
      if (res.ok) {
        const data = await res.json()
        setAgent({
          id: data.agent.id,
          name: data.agent.name,
          description: data.agent.description,
          systemPrompt: data.agent.systemPrompt,
          iconName: data.agent.iconName,
          color: data.agent.color,
        })
      }
    })()
    return () => { cancelled = true }
  }, [agentIdParam])

  // Load user name once
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d.user) {
        setUserName(d.user.name?.split(' ')[0] || d.user.email?.split('@')[0] || '')
        setIsSandbox((d.user.email || '').toLowerCase().endsWith('@sandbox.reattend.local'))
      }
    }).catch(() => {})
  }, [])

  // React to URL ?chat= param changes (covers New Chat + thread switching)
  useEffect(() => {
    if (chatIdParam) {
      if (chatIdParam !== chatId) {
        setMessages([])
        setOpenSourceIds(new Set())
        loadChat(chatIdParam)
      }
    } else {
      // No ?chat= param → new chat
      setMessages([])
      setChatId(null)
      setOpenSourceIds(new Set())
    }
  }, [chatIdParam]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages])

  const loadChat = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.chat) {
        setChatId(id)
        setMessages(data.chat.messages || [])
      }
    } catch {}
  }

  const saveChat = async (msgs: Message[], existingId: string | null, firstQuestion: string) => {
    try {
      if (existingId) {
        await fetch('/api/chats', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingId, messages: msgs }),
        })
        upsertRecentChat({ id: existingId, title: firstQuestion.slice(0, 60), updatedAt: new Date().toISOString() })
      } else {
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: firstQuestion.slice(0, 60), messages: msgs }),
        })
        const data = await res.json()
        if (data.chat?.id) {
          setChatId(data.chat.id)
          window.history.replaceState(null, '', `/app?chat=${data.chat.id}`)
          upsertRecentChat({ id: data.chat.id, title: firstQuestion.slice(0, 60), updatedAt: new Date().toISOString() })
          return data.chat.id
        }
      }
    } catch {}
    return existingId
  }

  const sendMessage = async (question: string) => {
    if (!question.trim() || streaming) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: question.trim() }
    const aiId = crypto.randomUUID()
    const aiMsg: Message = { id: aiId, role: 'assistant', content: '' }
    const nextMessages = [...messages, userMsg, aiMsg]

    setMessages(nextMessages)
    setStreaming(true)

    const firstQuestion = messages.length === 0 ? question.trim() : messages.find(m => m.role === 'user')?.content || question.trim()

    // ── Deepthink branch — hit the structured-dossier endpoint and render
    // the response as a single styled message (Situation / Evidence / Risks
    // / Recommendations / Unknowns). Does not stream, so the UI shows the
    // typing-dots indicator until the dossier lands.
    if (model === 'deepthink') {
      try {
        const orgId = useAppStore.getState().activeEnterpriseOrgId
        const res = await fetch('/api/ask/oracle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, question: question.trim() }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || 'Deepthink request failed')
        }
        const data = await res.json() as {
          dossier: { situation: string; evidence: string; risks: string; recommendations: string; unknowns: string }
          sources: Array<{ id: string; title: string; type: string; date?: string | null; passage?: string | null }>
        }
        const md = renderDossierMarkdown(data.dossier)
        const sources: Source[] = (data.sources || []).map((s) => ({
          id: s.id,
          title: s.title,
          type: s.type,
        }))
        const finalMessages = nextMessages.map((m) =>
          m.id === aiId ? { ...m, content: md, sources } : m
        )
        setMessages(finalMessages)
        await saveChat(finalMessages, chatId, firstQuestion)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Deepthink failed.'
        setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: msg } : m)))
      } finally {
        setStreaming(false)
      }
      return
    }

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'ai' as const,
        content: m.content,
      }))

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          history,
          // Pass agent context — /api/ask can use the system prompt + scope
          // to tailor retrieval and the answer persona. Server may ignore for
          // now; UI shows the agent identity either way.
          agentId: agent?.id ?? undefined,
          agentSystemPrompt: agent?.systemPrompt ?? undefined,
        }),
      })

      let sources: Source[] = []
      let trace: TraceData | undefined = undefined
      try {
        const h = res.headers.get('X-Sources')
        if (h) sources = JSON.parse(h)
      } catch {}
      try {
        const t = res.headers.get('X-Trace')
        if (t) trace = JSON.parse(t) as TraceData
      } catch {}

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          // During streaming, hide everything from the first ---FOLLOWUPS--- or ---OFFERS---
          // onward so the user only sees the clean answer growing in real time.
          const sepMatch = FOLLOWUPS_RE.exec(fullText) || OFFERS_RE.exec(fullText)
          const display = sepMatch
            ? fullText.slice(0, sepMatch.index).trim()
            : fullText
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: display } : m))
        }
      }

      // Parse both follow-ups and offers from the trailing sections.
      // Structure: ANSWER <---FOLLOWUPS---> questions <---OFFERS---> offers
      let mainContent = fullText.trim()
      let followUps: string[] = []
      let offers: string[] = []

      const parseBulletList = (block: string): string[] =>
        block.split('\n')
          .filter(l => l.trim().startsWith('- '))
          .map(l => l.trim().slice(2).trim())
          .filter(Boolean)

      // Strip trailing "Sources:" block that the AI often appends (redundant
      // with the X-Sources header the frontend already parses separately).
      mainContent = mainContent.replace(/\n\s*Sources?:\s*\n(\[?\d\].*\n?)*/gi, '').trim()

      const followupsMatch = FOLLOWUPS_RE.exec(fullText)
      const offersMatch = OFFERS_RE.exec(fullText)

      if (followupsMatch) {
        mainContent = fullText.slice(0, followupsMatch.index).trim()
        const afterFollowups = fullText.slice(followupsMatch.index + followupsMatch[0].length)
        // If OFFERS_RE is after FOLLOWUPS_RE in the stream, split there
        const offersInAfter = OFFERS_RE.exec(afterFollowups)
        if (offersInAfter) {
          followUps = parseBulletList(afterFollowups.slice(0, offersInAfter.index))
          offers = parseBulletList(afterFollowups.slice(offersInAfter.index + offersInAfter[0].length))
        } else {
          followUps = parseBulletList(afterFollowups)
        }
      } else if (offersMatch) {
        // Model skipped follow-ups, went straight to offers
        mainContent = fullText.slice(0, offersMatch.index).trim()
        offers = parseBulletList(fullText.slice(offersMatch.index + offersMatch[0].length))
      }

      const finalMessages = nextMessages.map(m =>
        m.id === aiId ? { ...m, content: mainContent, sources, followUps, offers, trace } : m
      )
      setMessages(finalMessages)

      await saveChat(finalMessages, chatId, firstQuestion)
    } catch (err) {
      const errorMsg = err instanceof Error && err.message.includes('fetch')
        ? 'Could not reach the AI service. Please try again in a moment.'
        : 'Something went wrong. Please try again.'
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: errorMsg } : m
      ))
    } finally {
      setStreaming(false)
    }
  }

  const startNewChat = () => {
    setMessages([])
    setChatId(null)
    setOpenSourceIds(new Set())
    window.history.replaceState(null, '', '/app')
  }

  const toggleSources = (msgId: string) => {
    setOpenSourceIds(prev => {
      const next = new Set(prev)
      if (next.has(msgId)) next.delete(msgId)
      else next.add(msgId)
      return next
    })
  }

  const giveFeedback = async (msgId: string, vote: 'up' | 'down') => {
    setFeedbackGiven(prev => ({ ...prev, [msgId]: vote }))
    const msgIdx = messages.findIndex(m => m.id === msgId)
    const answer = messages[msgIdx]
    const question = msgIdx > 0 ? messages[msgIdx - 1]?.content : ''
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          message: JSON.stringify({
            vote,
            question,
            answer: answer?.content?.slice(0, 1000),
            sources: answer?.sources?.map(s => s.title),
            chatId,
          }),
        }),
      })
    } catch { /* silent */ }
  }

  const copyAnswer = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(msgId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const shareAnswer = (content: string) => {
    if (navigator.share) {
      navigator.share({ text: content }).catch(() => {})
    } else {
      navigator.clipboard.writeText(content)
      alert('Answer copied to clipboard!')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isChat = messages.length > 0
  const suggestions = isSandbox ? SANDBOX_SUGGESTED : SUGGESTED

  // Reusable input bar JSX. Identical in empty + active states so the
  // user perceives it as one persistent surface that just slides down.
  const inputBar = (
    <div className="relative rounded-3xl border border-border bg-background shadow-sm focus-within:border-foreground/30 focus-within:shadow-md transition-all">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask AI anything"
        rows={1}
        disabled={streaming}
        className="w-full bg-transparent border-none outline-none resize-none text-[15px] placeholder:text-muted-foreground/50 min-h-[44px] max-h-[200px] px-5 pt-4 pb-2 leading-relaxed disabled:opacity-50"
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = Math.min(el.scrollHeight, 200) + 'px'
        }}
      />
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-muted hover:bg-muted/70 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors"
              title="Choose model"
            >
              {(() => {
                const I = MODEL_META[model].icon
                return <I className="h-3.5 w-3.5" />
              })()}
              {MODEL_META[model].label}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {(['chat', 'deepthink'] as const).map((m) => {
              const meta = MODEL_META[m]
              const I = meta.icon
              return (
                <DropdownMenuItem
                  key={m}
                  onClick={() => setModel(m)}
                  className="cursor-pointer flex items-start gap-2 py-2"
                >
                  <I className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-[11px] text-muted-foreground">{meta.sub}</div>
                  </div>
                  {model === m && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center transition-all shrink-0',
            input.trim() && !streaming
              ? 'bg-foreground text-background hover:bg-foreground/90'
              : 'bg-muted text-muted-foreground/40 cursor-not-allowed',
          )}
          title="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Scroll region — empty-state hero + suggestions when no messages,
          chat thread when there are. The chatbox below is glued to the
          bottom in both states (image 3 spec). */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!isChat ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-full flex items-center justify-center px-6 py-10"
          >
            <div className="w-full max-w-2xl space-y-8">
              <h1 className="text-center text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {agent ? agent.name : 'What can I help with?'}
              </h1>
              {agent && agent.description && (
                <p className="text-center text-sm text-muted-foreground -mt-4">{agent.description}</p>
              )}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground text-center">
                  {isSandbox ? 'Guided demo questions' : 'Examples of queries:'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors',
                        isSandbox
                          ? 'border-violet-500/30 bg-violet-500/5 text-violet-900 dark:text-violet-100 hover:bg-violet-500/10'
                          : 'border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      )}
                    >
                      {p}
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto px-6 py-6 space-y-6 pb-6"
          >
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {msg.role === 'user' ? (
                    <div className="flex justify-end group">
                      <button
                        onClick={() => copyAnswer(msg.id, msg.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground self-center mr-2"
                        title="Copy question"
                      >
                        {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <div className="max-w-[82%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Answer */}
                      <div className="flex gap-3">
                        <div className="h-7 w-7 shrink-0 mt-0.5 flex items-center justify-center">
                          <Image src="/black_logo.svg" alt="R" width={28} height={28} className="h-7 w-7 dark:hidden" />
                          <Image src="/white_logo.svg" alt="R" width={28} height={28} className="h-7 w-7 hidden dark:block" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {msg.content ? (
                            <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-headings:my-3 prose-strong:text-foreground prose-a:text-primary">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <motion.div
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}
                              className="flex gap-1 py-1"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 inline-block" />
                              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 inline-block" />
                              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 inline-block" />
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Action bar — thumbs, copy, share */}
                      {msg.content && !streaming && (
                        <div className="ml-10 flex items-center gap-1 pt-1">
                          <button
                            onClick={() => giveFeedback(msg.id, 'up')}
                            className={cn(
                              'p-1.5 rounded-lg transition-all',
                              feedbackGiven[msg.id] === 'up'
                                ? 'text-emerald-500 bg-emerald-500/10'
                                : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50'
                            )}
                            title="Good answer"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => giveFeedback(msg.id, 'down')}
                            className={cn(
                              'p-1.5 rounded-lg transition-all',
                              feedbackGiven[msg.id] === 'down'
                                ? 'text-red-500 bg-red-500/10'
                                : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50'
                            )}
                            title="Bad answer"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                          <div className="w-px h-4 bg-border/40 mx-1" />
                          <button
                            onClick={() => copyAnswer(msg.id, msg.content)}
                            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all"
                            title="Copy answer"
                          >
                            {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => shareAnswer(msg.content)}
                            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all"
                            title="Share answer"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Reasoning trace — animates the retrieval pipeline
                          that produced this answer. Only rendered for assistant
                          messages with a trace payload. */}
                      {msg.trace ? (
                        <div className="ml-10">
                          <ReasoningTrace trace={msg.trace} active={false} />
                        </div>
                      ) : null}

                      {/* Sources — collapsible chevron */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="ml-10 space-y-1.5">
                          <button
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                          >
                            <BookOpen className="h-3 w-3" />
                            Sources ({msg.sources.length})
                            {openSourceIds.has(msg.id)
                              ? <ChevronDown className="h-3 w-3 ml-0.5" />
                              : <ChevronRight className="h-3 w-3 ml-0.5" />
                            }
                          </button>
                          {openSourceIds.has(msg.id) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {msg.sources.map((s, i) => (
                                <Link
                                  key={s.id}
                                  href={`/app/memories/${s.id}`}
                                  className="group flex items-start gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all"
                                >
                                  <span className={cn(
                                    'h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5',
                                    TYPE_COLORS[s.type] || 'bg-muted text-muted-foreground'
                                  )}>
                                    {i + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                      {s.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                                      {s.workspace || 'Personal'} · {s.type}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Follow-up questions — what the user might ask next */}
                      {msg.followUps && msg.followUps.length > 0 && idx === messages.length - 1 && !streaming && (
                        <div className="ml-10 flex flex-wrap gap-2 pt-1">
                          {msg.followUps.map(q => (
                            <button
                              key={q}
                              onClick={() => sendMessage(q)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-all"
                            >
                              <Sparkles className="h-3 w-3 text-primary/50 shrink-0" />
                              {q}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Offers — things Reattend can do next for the user.
                          Tinted indigo to visually distinguish from the neutral
                          follow-up pills above. */}
                      {msg.offers && msg.offers.length > 0 && idx === messages.length - 1 && !streaming && (
                        <div className="ml-10 flex flex-wrap gap-2 pt-1">
                          {msg.offers.map(o => (
                            <button
                              key={o}
                              onClick={() => sendMessage(o)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-primary/90 hover:text-primary hover:bg-primary/10 hover:border-primary/40 transition-all"
                            >
                              <Sparkles className="h-3 w-3 text-primary shrink-0" />
                              {o}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
      </div>

      {/* Sticky chatbox — always glued to the bottom of the chat surface,
          in both empty and active states. The user can ask, scroll the
          answer, then keep typing without losing the input bar. */}
      <div className="shrink-0 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
          {isChat && (
            <div className="flex justify-center">
              <button
                onClick={startNewChat}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-full hover:bg-muted/50"
              >
                <RefreshCw className="h-3 w-3" /> New chat
              </button>
            </div>
          )}
          {inputBar}
          <p className="text-center text-[10px] text-muted-foreground/40">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

// Convert an Oracle dossier into a single markdown blob for the chat
// stream. Section headings mirror the Oracle UI; the Source list is
// rendered separately by the message-component's sources block.
function renderDossierMarkdown(d: { situation: string; evidence: string; risks: string; recommendations: string; unknowns: string }): string {
  const sections: Array<[string, string]> = [
    ['Situation', d.situation],
    ['Evidence', d.evidence],
    ['Risks', d.risks],
    ['Recommendations', d.recommendations],
    ['Unknowns', d.unknowns],
  ]
  return sections
    .filter(([, body]) => body && body.trim().length > 0)
    .map(([heading, body]) => `## ${heading}\n\n${body.trim()}`)
    .join('\n\n')
}

