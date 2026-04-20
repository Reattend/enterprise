'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, X, Glasses, Copy, Check, Paperclip } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const STARTERS = [
  "What patterns do you see in my recent decisions?",
  "What am I avoiding that I should be addressing?",
  "Based on everything I've saved, what's my biggest blind spot?",
  "If you were my advisor, what would you tell me to do this week?",
  "What contradictions exist in my recent thinking?",
  "Help me think through my biggest challenge right now",
]

export default function DeepThinkPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages])

  const sendMessage = async (text: string) => {
    const q = text.trim()
    if (!q || streaming) return
    setInput('')

    // If file attached, prepend it to the question
    let fullQuestion = q
    if (attachedFile) {
      fullQuestion = `[Attached document: ${attachedFile.name}]\n\n${attachedFile.content.slice(0, 8000)}\n\n---\n\nMy question about this document: ${q}`
      setAttachedFile(null)
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: q }
    const aiId = crypto.randomUUID()
    const aiMsg: Message = { id: aiId, role: 'assistant', content: '' }
    const nextMessages = [...messages, userMsg, aiMsg]
    setMessages(nextMessages)
    setStreaming(true)

    try {
      const history = nextMessages
        .filter(m => m.id !== aiId)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/deepthink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: fullQuestion, history }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Something went wrong' }))
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: err.error || 'Something went wrong. Try again.' } : m
        ))
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: fullText } : m
        ))
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: 'Connection lost. Try again.' } : m
      ))
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isChat = messages.length > 0

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,255,255,0.03),transparent)]" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Glasses className="h-4 w-4 text-amber-400/80" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white/90 tracking-tight">DeepThink</h1>
            <p className="text-[10px] text-white/30">An AI that knows your history and isn&apos;t afraid to challenge you. Private by design — nothing leaves this room.</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/app')}
          className="h-8 w-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white/40" />
        </button>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!isChat ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-full px-6 py-12"
            >
              <div className="max-w-xl w-full space-y-10">
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto"
                  >
                    <Glasses className="h-8 w-8 text-amber-400/60" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-white/90 tracking-tight"
                  >
                    Think deeper.
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-white/30 max-w-md mx-auto leading-relaxed"
                  >
                    This isn&apos;t search. I&apos;ve read everything you&apos;ve saved — and I&apos;ll push you to think harder. I&apos;ll surface what you&apos;re avoiding, connect dots you&apos;ve missed, and ask the questions nobody else will.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {STARTERS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-xs text-white/40 hover:text-white/60 transition-all leading-relaxed"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 pb-32">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-white/10 text-white/90 rounded-2xl rounded-tr-sm px-5 py-3 text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <div className="h-6 w-6 shrink-0 mt-1 rounded-md bg-white/5 flex items-center justify-center">
                          <Glasses className="h-3 w-3 text-amber-400/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {msg.content ? (
                            <div className="text-sm leading-relaxed text-white/80 prose prose-sm prose-invert max-w-none prose-p:my-2 prose-strong:text-white/90 prose-ul:my-2 prose-li:my-0.5">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="flex gap-1 py-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-white/20 animate-pulse" />
                              <span className="h-1.5 w-1.5 rounded-full bg-white/20 animate-pulse delay-100" />
                              <span className="h-1.5 w-1.5 rounded-full bg-white/20 animate-pulse delay-200" />
                            </div>
                          )}
                        </div>
                      </div>
                      {msg.content && !streaming && (
                        <div className="ml-9">
                          <button
                            onClick={() => copyText(msg.id, msg.content)}
                            className="p-1.5 rounded-md text-white/15 hover:text-white/40 transition-colors"
                          >
                            {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="relative shrink-0 p-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400/80">
              <Paperclip className="h-3 w-3" />
              <span className="truncate">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="ml-auto text-amber-400/50 hover:text-amber-400">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="relative rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <div className="flex items-end gap-3 p-3 pl-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white/15 hover:text-white/40 hover:bg-white/5 transition-colors shrink-0 mb-0.5"
                title="Attach a document for cross-referencing"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.pdf,.doc,.docx"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const text = await file.text()
                  setAttachedFile({ name: file.name, content: text })
                  e.target.value = ''
                }}
              />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachedFile ? "What should I look at in this document?" : "What's on your mind?"}
                rows={1}
                disabled={streaming}
                className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-white/80 placeholder:text-white/20 min-h-[28px] max-h-[120px] py-1 leading-relaxed disabled:opacity-50"
                style={{ height: 'auto' }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
                className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center transition-all shrink-0 mb-0.5',
                  input.trim() && !streaming
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                )}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-center text-[9px] text-white/20 mt-2">
            These conversations are not saved. Private by design — only you can see this.
          </p>
        </div>
      </div>
    </div>
  )
}
