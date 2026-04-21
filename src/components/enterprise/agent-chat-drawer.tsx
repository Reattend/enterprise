'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Sparkles, Loader2, Send, Bot, FileText, Gavel, Landmark, MessageSquare,
  User as UserIcon, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// Map server icon names → lucide components. Keep in sync with agents page.
const ICONS: Record<string, typeof Bot> = { Bot, Sparkles, FileText, Gavel, Landmark, MessageSquare }

interface Agent {
  id: string
  name: string
  description: string | null
  iconName: string | null
  color: string | null
  systemPrompt: string
  scopeConfig: Record<string, unknown>
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface AgentChatDrawerProps {
  agentId: string | null
  onClose: () => void
}

export function AgentChatDrawer({ agentId, onClose }: AgentChatDrawerProps) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const open = agentId !== null

  // Load agent config when opened
  useEffect(() => {
    if (!agentId) return
    let cancelled = false
    setLoading(true)
    setMessages([])
    setErr(null)
    ;(async () => {
      const res = await fetch(`/api/enterprise/agents/${agentId}`)
      if (cancelled) return
      if (res.ok) {
        const data = await res.json()
        setAgent(data.agent)
      } else {
        setErr('Failed to load agent')
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [agentId])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  // Keyboard: Esc to close
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !streaming) onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, streaming, onClose])

  async function send() {
    const q = input.trim()
    if (!q || streaming || !agent) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: q }
    const aiMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '' }
    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput('')
    setStreaming(true)
    setErr(null)

    try {
      const history = messages.map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'ai' as const,
        content: m.content,
      }))
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          history,
          agentId: agent.id,
          agentSystemPrompt: agent.systemPrompt,
        }),
      })

      if (!res.ok || !res.body) {
        setErr('Chat failed — check server logs')
        setStreaming(false)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        // Strip follow-ups + offers sections from the live-streaming display
        const clean = acc.split(/---FOLLOWUPS---|---OFFERS---/i)[0]
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: clean }
          return next
        })
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setStreaming(false)
    }
  }

  function reset() {
    setMessages([])
    setErr(null)
  }

  const Icon = ICONS[agent?.iconName ?? 'Bot'] ?? Bot

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => !streaming && onClose()}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] z-50 bg-background border-l border-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn('h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0', agent?.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-lg leading-tight truncate">
                    {loading ? 'Loading…' : agent?.name ?? 'Agent'}
                  </div>
                  {agent?.description && (
                    <div className="text-[11px] text-muted-foreground line-clamp-1">{agent.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={reset}
                    className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Reset conversation"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading agent…
                </div>
              ) : messages.length === 0 && agent ? (
                <EmptyState agent={agent} onSuggest={(q) => setInput(q)} />
              ) : (
                messages.map((m) => (
                  <MessageBubble key={m.id} message={m} agent={agent} />
                ))
              )}
              {err && (
                <div className="text-xs text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">{err}</div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={agent ? `Ask ${agent.name}…` : 'Ask anything…'}
                  rows={1}
                  className="min-h-[40px] max-h-[200px] resize-none text-[13px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                />
                <Button onClick={send} disabled={!input.trim() || streaming || !agent} className="h-10">
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                <span>
                  <kbd className="font-mono bg-muted rounded px-1">↵</kbd> to send ·{' '}
                  <kbd className="font-mono bg-muted rounded px-1">Shift+↵</kbd> newline ·{' '}
                  <kbd className="font-mono bg-muted rounded px-1">Esc</kbd> close
                </span>
                {agent && <span className="capitalize">Scope: {scopeLabel(agent.scopeConfig)}</span>}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function scopeLabel(scope: Record<string, unknown>): string {
  if (!scope || Object.keys(scope).length === 0) return 'All memory'
  if (scope.types && Array.isArray(scope.types) && scope.types.length > 0) return (scope.types as string[]).join(', ')
  if (scope.departmentPrefix) return `${scope.departmentPrefix}`
  if (scope.tags && Array.isArray(scope.tags) && scope.tags.length > 0) return `tags: ${(scope.tags as string[]).slice(0, 2).join(', ')}`
  return 'Scoped'
}

function EmptyState({ agent, onSuggest }: { agent: Agent; onSuggest: (q: string) => void }) {
  const Icon = ICONS[agent.iconName ?? 'Bot'] ?? Bot
  // Agent-specific suggested prompts
  const prompts: Record<string, string[]> = {
    'policy-helper': [
      'What is the travel expense limit for a Joint Secretary?',
      'Summarize our data classification policy.',
      'Which policies are pending my acknowledgment?',
    ],
    'decision-lookup': [
      'What did we decide about the hiring freeze?',
      'Have we ever reversed a tax treaty decision?',
      'Show me recent reversed decisions.',
    ],
    'hr-onboarding': [
      'What should I do in my first week?',
      'How do I request equipment?',
      'Who approves my leave?',
    ],
    'finance-faq': [
      'What\'s the expense submission deadline?',
      'Vendor onboarding checklist',
      'How to reclaim GST on office supplies',
    ],
    'my-daily-digest': [
      'What changed since yesterday?',
      'Any new decisions affecting me?',
      'Policies I need to acknowledge',
    ],
  }
  const starters = prompts[agent.id] ?? ['What can you help with?', 'Tell me what you know about.']

  return (
    <div className="py-6">
      <div className="flex flex-col items-center text-center mb-5">
        <div className={cn('h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-3', agent.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-display text-xl mb-1">{agent.name}</h3>
        {agent.description && (
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{agent.description}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground text-center mb-2">Try asking</div>
        {starters.map((p, i) => (
          <button
            key={i}
            onClick={() => onSuggest(p)}
            className="w-full text-left px-3 py-2 rounded border border-border text-[13px] text-foreground hover:bg-muted/50 hover:border-primary/40 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message, agent }: { message: Message; agent: Agent | null }) {
  const Icon = ICONS[agent?.iconName ?? 'Bot'] ?? Bot
  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-lg rounded-tr-none px-3 py-2 text-[13px]">
          {message.content}
        </div>
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
          <UserIcon className="h-3.5 w-3.5" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3">
      <div className={cn('h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0', agent?.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0 text-[13px] leading-relaxed whitespace-pre-wrap">
        {message.content || <span className="text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> thinking…</span>}
      </div>
    </div>
  )
}
