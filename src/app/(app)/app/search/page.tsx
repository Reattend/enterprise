'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Search as SearchIcon,
  Sparkles,
  ArrowRight,
  Loader2,
  Send,
  Bot,
  User,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Markdown renderer for AI responses ──────────────────────
interface MemorySource { id: string; title: string; type: string; workspace: string; date?: string }

function MarkdownMessage({ content, sources }: { content: string; sources?: MemorySource[] }) {
  const renderInline = (text: string): React.ReactNode[] => {
    // Split on **bold**, *italic*, `code`, and [n] citation markers
    const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[\d+\])/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**'))
        return <em key={i} className="italic">{part.slice(1, -1)}</em>
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
        return <code key={i} className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">{part.slice(1, -1)}</code>
      const citMatch = part.match(/^\[(\d+)\]$/)
      if (citMatch) {
        const idx = parseInt(citMatch[1]) - 1
        const src = sources?.[idx]
        const num = citMatch[1]
        if (src) {
          return (
            <a key={i} href={`/app/memories/${src.id}`} title={src.title}
              className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-violet-500/15 text-[9px] font-bold text-violet-600 dark:text-violet-400 align-super ml-0.5 hover:bg-violet-500/25 transition-colors no-underline cursor-pointer">
              {num}
            </a>
          )
        }
        return <sup key={i} className="text-[9px] text-violet-400 ml-0.5 font-semibold">[{num}]</sup>
      }
      return part
    })
  }

  const lines = content.replace(/\r/g, '').split('\n')
  const elements: React.ReactNode[] = []
  let ulItems: string[] = []
  let olItems: string[] = []
  let key = 0

  const flushUl = () => {
    if (!ulItems.length) return
    elements.push(
      <ul key={key++} className="list-disc pl-5 space-y-1 my-1.5">
        {ulItems.map((item, i) => <li key={i} className="leading-relaxed">{renderInline(item)}</li>)}
      </ul>
    )
    ulItems = []
  }
  const flushOl = () => {
    if (!olItems.length) return
    elements.push(
      <ol key={key++} className="list-decimal pl-5 space-y-1 my-1.5">
        {olItems.map((item, i) => <li key={i} className="leading-relaxed">{renderInline(item)}</li>)}
      </ol>
    )
    olItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    // h2: ##
    if (/^#{1,2}\s/.test(line) || (line.startsWith('##') && !line.startsWith('###'))) {
      flushUl(); flushOl()
      const text = line.replace(/^#{1,2}\s*/, '')
      if (text) elements.push(
        <p key={key++} className="font-semibold text-[14px] text-foreground mt-5 mb-1.5">
          {renderInline(text)}
        </p>
      )
    // h3: ###
    } else if (/^###\s/.test(line)) {
      flushUl(); flushOl()
      const text = line.replace(/^###\s*/, '')
      if (text) elements.push(
        <p key={key++} className="font-medium text-[12px] text-foreground/90 mt-3 mb-0.5">
          {renderInline(text)}
        </p>
      )
    // horizontal rule: ---
    } else if (/^---+$/.test(line.trim())) {
      flushUl(); flushOl()
      elements.push(<hr key={key++} className="border-border/30 my-2" />)
    // bullet: "- " or "* " or "• "
    } else if (/^[-*•]\s/.test(line)) {
      flushOl()
      ulItems.push(line.replace(/^[-*•]\s+/, ''))
    // numbered list: "1. " "2. " etc.
    } else if (/^\d+\.\s/.test(line)) {
      flushUl()
      olItems.push(line.replace(/^\d+\.\s+/, ''))
    // blank line
    } else if (line.trim() === '') {
      flushUl(); flushOl()
      if (elements.length > 0) elements.push(<div key={key++} className="h-1.5" />)
    // plain paragraph
    } else {
      flushUl(); flushOl()
      elements.push(<p key={key++} className="leading-relaxed">{renderInline(line)}</p>)
    }
  }
  flushUl(); flushOl()

  return <div className="space-y-1 text-[14px] text-foreground/90 leading-relaxed">{elements}</div>
}

// ─── Sources panel ────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  meeting:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  decision:  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  idea:      'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  insight:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  tasklike:  'bg-red-500/10 text-red-600 dark:text-red-400',
  context:   'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  note:      'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  transcript:'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
}

function SourcesPanel({ sources }: { sources: MemorySource[] }) {
  const [open, setOpen] = React.useState(false)
  if (!sources.length) return null
  return (
    <div className="mt-2 rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <BookOpen className="h-3 w-3 shrink-0" />
        <span className="font-medium">{sources.length} {sources.length === 1 ? 'source' : 'sources'} referenced</span>
        <span className="ml-auto">
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>
      {open && (
        <div className="px-2 pb-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {sources.map((src, i) => (
            <a
              key={src.id}
              href={`/app/memories/${src.id}`}
              className="flex items-start gap-2 rounded-lg border border-border/30 bg-background px-2.5 py-2 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group no-underline"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[9px] font-bold text-violet-600 dark:text-violet-400 mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate transition-colors leading-tight">
                  {src.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={cn('text-[9px] font-medium px-1 py-0 rounded', TYPE_COLORS[src.type] || TYPE_COLORS.note)}>
                    {src.type}
                  </span>
                  {src.date && <span className="text-[9px] text-muted-foreground">{src.date}</span>}
                  {src.workspace && src.workspace !== 'Personal' && (
                    <span className="text-[9px] text-muted-foreground">· {src.workspace}</span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const typeColors: Record<string, string> = {
  ...TYPE_COLORS,
  project: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  'entity:person': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  'entity:topic': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  'entity:organization': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
}

interface SearchResult {
  id: string
  type: string
  title: string
  summary: string | null
  score: number
  source: 'text' | 'semantic'
}

interface AskMessage {
  role: 'user' | 'ai'
  content: string
  followUps?: string[]
  sources?: MemorySource[]
}

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'ask'>('search')

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchMode, setSearchMode] = useState<'hybrid' | 'text' | 'semantic'>('hybrid')
  const [hasSearched, setHasSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  // Ask AI state
  const [askInput, setAskInput] = useState('')
  const [askMessages, setAskMessages] = useState<AskMessage[]>([])
  const [askLoading, setAskLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [askMessages])

  const handleSearch = async (q?: string) => {
    const searchQuery = q || query
    if (!searchQuery.trim()) return
    setQuery(searchQuery)
    setHasSearched(true)
    setSearching(true)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&mode=${searchMode}`)
      const data = await res.json()
      if (data.results) {
        setResults(data.results)
      } else {
        setResults([])
      }
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAsk = async (overrideQuestion?: string) => {
    const question = overrideQuestion || askInput.trim()
    if (!question) return
    setAskInput('')

    const history = askMessages.map(m => ({ role: m.role, content: m.content }))
    setAskMessages(prev => [...prev, { role: 'user', content: question }])
    setAskLoading(true)
    setAskMessages(prev => [...prev, { role: 'ai', content: '' }])

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      })

      if (!res.ok) {
        const data = await res.json()
        setAskMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'ai', content: data.error || 'Sorry, I could not find an answer.' }
          return updated
        })
        return
      }

      // Parse sources from header before streaming starts
      let sources: MemorySource[] = []
      try {
        const raw = res.headers.get('X-Sources')
        if (raw) sources = JSON.parse(raw)
      } catch { /* ignore */ }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        // Hide everything from FOLLOWUPS/OFFERS onward during streaming.
        // TODO: search page doesn't render offers yet — only the main /app
        // chat view does. Kept simple here because this is the quick-search UI.
        const displayText = accumulated.split('---FOLLOWUPS---')[0].split('---OFFERS---')[0].trim()
        setAskMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'ai', content: displayText }
          return updated
        })
      }

      const parts = accumulated.split('---FOLLOWUPS---')
      // Strip any trailing ---OFFERS--- section from the answer body too.
      const answerText = parts[0].split('---OFFERS---')[0].trim()
      let followUps: string[] = []
      if (parts[1]) {
        followUps = parts[1]
          .split('\n')
          .map(line => line
            .replace(/^-\s*/, '')          // strip leading dash
            .replace(/\*\*([^*]+)\*\*/g, '$1')  // strip **bold**
            .replace(/\*([^*]+)\*/g, '$1')       // strip *italic*
            .replace(/\s*\[\d+\]\s*/g, '')       // strip [n] citations
            .replace(/,?\s*as (?:discussed|confirmed|presented|noted).*$/i, '')  // strip "as discussed on..." tails
            .replace(/,?\s*on \*{0,2}\d{2}\/\d{2}\/\d{4}\*{0,2}.*$/i, '')      // strip "on 03/16/2026" tails
            .trim()
          )
          .filter(line => line.length > 10 && line.length < 120)
          .slice(0, 3)
      }

      setAskMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'ai',
          content: answerText || 'I don\'t have enough context in your memories to answer that yet.',
          followUps: followUps.length > 0 ? followUps : undefined,
          sources: sources.length > 0 ? sources : undefined,
        }
        return updated
      })
    } catch {
      setAskMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'ai', content: 'Sorry, something went wrong. Please try again.' }
        return updated
      })
    } finally {
      setAskLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div className="text-center space-y-2 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Search Your Memory</h1>
        <p className="text-sm text-muted-foreground">
          Find memories or ask AI questions about your knowledge.
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
              activeTab === 'search'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <SearchIcon className="h-4 w-4" />
            Search
          </button>
          <button
            onClick={() => setActiveTab('ask')}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
              activeTab === 'ask'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="h-4 w-4" />
            Ask AI
          </button>
        </div>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <>
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search anything in your memory..."
              className="h-12 pl-12 pr-4 text-base rounded-xl"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                variant={searchMode === 'hybrid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => setSearchMode('hybrid')}
              >
                Hybrid
              </Button>
              <Button
                variant={searchMode === 'semantic' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => setSearchMode('semantic')}
              >
                <Sparkles className="h-3 w-3 mr-1" /> Semantic
              </Button>
            </div>
          </div>

          {/* Results */}
          {hasSearched && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {searching ? 'Searching...' : `${results.length} results for "${query}"`}
                </p>
              </div>

              {searching ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <AnimatePresence>
                  {results.map((result, i) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={
                        result.type === 'project'
                          ? `/app/projects/${result.id}`
                          : result.type.startsWith('entity')
                            ? `/app/search`
                            : `/app/memories/${result.id}`
                      }>
                        <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
                          <CardContent className="p-4 flex gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className={cn('text-[10px]', typeColors[result.type])}>
                                  {result.type.replace('entity:', '')}
                                </Badge>
                                <Badge variant="outline" className="text-[9px]">
                                  {result.source === 'semantic' ? 'semantic' : 'text'}
                                </Badge>
                              </div>
                              <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                                {result.title}
                              </h3>
                              {result.summary && (
                                <p className="text-xs text-muted-foreground mt-0.5">{result.summary}</p>
                              )}
                            </div>
                            <div className="flex items-center shrink-0">
                              <span className="text-xs text-muted-foreground">{Math.round(result.score * 100)}%</span>
                              <ArrowRight className="h-4 w-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {!searching && results.length === 0 && (
                <div className="text-center py-12">
                  <SearchIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">No results found. Try a different query.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Ask AI Tab */}
      {activeTab === 'ask' && (
        <div className="flex flex-col rounded-xl border bg-background shadow-sm" style={{ minHeight: '520px' }}>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: '580px' }}>
            {askMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 mb-4">
                  <Sparkles className="h-6 w-6 text-violet-500/60" />
                </div>
                <p className="text-sm font-medium mb-1">Ask your memory anything</p>
                <p className="text-xs text-muted-foreground mb-5 max-w-[300px]">
                  Get AI-powered answers from your memories, meetings, and decisions.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-[320px]">
                  {['What decisions did I make this week?', 'Summarize my meeting notes', 'What are my open tasks?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleAsk(q)}
                      className="group text-left text-xs px-3.5 py-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted hover:border-border transition-all text-muted-foreground hover:text-foreground"
                    >
                      <span className="opacity-70 group-hover:opacity-100 transition-opacity">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {askMessages.map((msg, i) => (
                  <React.Fragment key={i}>
                    {msg.role === 'user' ? (
                      /* User message: right-aligned bubble */
                      <div className="flex justify-end">
                        <div className="flex items-end gap-2 max-w-[75%]">
                          <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm bg-primary text-primary-foreground whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mb-0.5">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* AI message: full-width prose, no bubble */
                      <div className="flex gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 mt-0.5">
                          <Bot className="h-3.5 w-3.5 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          {msg.content === '' && askLoading ? (
                            <div className="flex items-center gap-2 py-1">
                              <div className="flex gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              <span className="text-muted-foreground text-xs">Thinking through your memories...</span>
                            </div>
                          ) : (
                            <>
                              <MarkdownMessage content={msg.content} sources={msg.sources} />
                              {askLoading && i === askMessages.length - 1 && (
                                <span className="inline-block w-1 h-4 bg-violet-500/50 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                              )}
                              {!askLoading && msg.sources && msg.sources.length > 0 && (
                                <SourcesPanel sources={msg.sources} />
                              )}
                              {msg.followUps && msg.followUps.length > 0 && !askLoading && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2, duration: 0.3 }}
                                  className="flex flex-wrap gap-1.5 mt-3"
                                >
                                  {msg.followUps.map((fq, fi) => (
                                    <button
                                      key={fi}
                                      onClick={() => handleAsk(fq)}
                                      className="text-[11px] px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 transition-all hover:border-violet-500/30 text-left"
                                    >
                                      {fq}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t bg-muted/20 p-3 rounded-b-xl">
            <form
              onSubmit={(e) => { e.preventDefault(); handleAsk() }}
              className="flex gap-2"
            >
              <Input
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                placeholder="Ask anything about your memories..."
                className="flex-1 bg-background border-border/60 focus-visible:ring-violet-500/30"
                disabled={askLoading}
                autoFocus={activeTab === 'ask'}
              />
              {askMessages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAskMessages([])}
                  title="Reset chat"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="submit"
                size="icon"
                disabled={!askInput.trim() || askLoading}
                className="bg-violet-500 hover:bg-violet-600 text-white shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  )
}
