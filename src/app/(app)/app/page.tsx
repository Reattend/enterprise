'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Lightbulb, CheckSquare, Sparkles, ArrowUp,
  BookOpen, RefreshCw, ChevronDown, ChevronRight,
  ThumbsUp, ThumbsDown, Share2, Copy, Check,
  MessageSquare, Zap, FileText,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { useSearchParams } from 'next/navigation'

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

const CAPABILITY_CARDS = [
  {
    icon: Brain,
    label: 'Synthesize',
    description: 'Connect dots across your meetings and notes',
    prompt: 'Synthesize the key insights and themes from my recent memories',
    gradient: 'from-violet-500/20 to-purple-500/10',
    border: 'border-violet-500/20 hover:border-violet-500/40',
    iconBg: 'bg-violet-500/20 text-violet-400',
  },
  {
    icon: FileText,
    label: 'Draft',
    description: 'Create emails, briefs, and updates from your notes',
    prompt: 'Draft a status update email based on my recent meetings and decisions',
    gradient: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    iconBg: 'bg-amber-500/20 text-amber-400',
  },
  {
    icon: Zap,
    label: 'Prepare',
    description: 'Get ready for your next meeting or call',
    prompt: 'What should I know before my next meeting? Summarize relevant context.',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
  },
]

const SUGGESTED = [
  'What decisions did I make this week?',
  'Summarize my recent meetings',
  'Draft a status update from my notes',
  'What risks should I flag before Friday?',
  'Who has open action items?',
  'Prepare me for my next meeting',
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
}

function ChatPageInner() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [userName, setUserName] = useState('')
  const [chatId, setChatId] = useState<string | null>(null)
  // Track which message's sources are expanded (collapsed by default)
  const [openSourceIds, setOpenSourceIds] = useState<Set<string>>(new Set())
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { upsertRecentChat } = useAppStore()
  const searchParams = useSearchParams()
  const chatIdParam = searchParams.get('chat')

  // Load user name once
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d.user) setUserName(d.user.name?.split(' ')[0] || d.user.email?.split('@')[0] || '')
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

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'ai' as const,
        content: m.content,
      }))

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), history }),
      })

      let sources: Source[] = []
      try {
        const h = res.headers.get('X-Sources')
        if (h) sources = JSON.parse(h)
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
        m.id === aiId ? { ...m, content: mainContent, sources, followUps, offers } : m
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

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 relative">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(139,92,246,0.10),transparent)]" />

      <div className="relative flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {!isChat ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center min-h-full p-6"
            >
              <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="flex justify-center mb-5"
                  >
                    <Image src="/black_logo.svg" alt="Reattend" width={64} height={64} className="h-16 w-16 dark:hidden" />
                    <Image src="/white_logo.svg" alt="Reattend" width={64} height={64} className="h-16 w-16 hidden dark:block" />
                  </motion.div>
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-4xl font-bold tracking-tight"
                  >
                    Hello{userName ? `, ${userName}` : ''}!
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-muted-foreground text-base"
                  >
                    Ask anything — I&apos;ll answer from your memories.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {CAPABILITY_CARDS.map(({ icon: Icon, label, description, prompt, gradient, border, iconBg }) => (
                    <motion.button
                      key={label}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => sendMessage(prompt)}
                      className={cn(
                        'group text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer backdrop-blur-sm hover:shadow-lg',
                        `bg-gradient-to-br ${gradient}`, border,
                      )}
                    >
                      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center mb-3', iconBg)}>
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <p className="text-sm font-semibold leading-tight mb-1">{label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                    </motion.button>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-2 justify-center"
                >
                  {SUGGESTED.map(p => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-all backdrop-blur-sm"
                    >
                      <Sparkles className="h-3 w-3 text-primary/60" />
                      {p}
                    </button>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto px-6 py-6 space-y-6 pb-32"
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
        </AnimatePresence>
      </div>

      {/* Input bar — outside scroll container, always at bottom */}
      <div className="relative shrink-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 z-10 border-t border-border/10">
        <div className="max-w-4xl mx-auto space-y-2">
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
          <div className="relative rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md shadow-lg transition-all duration-200">
            <div className="flex items-end gap-3 p-3 pl-4">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isChat ? 'Ask a follow-up...' : 'Ask me anything about your memories...'}
                rows={1}
                disabled={streaming}
                className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder:text-muted-foreground/40 min-h-[28px] max-h-[160px] py-1 leading-relaxed disabled:opacity-50"
                style={{ height: 'auto' }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
                className={cn(
                  'h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0 mb-0.5',
                  input.trim() && !streaming
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25'
                    : 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                )}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/30">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  )
}
