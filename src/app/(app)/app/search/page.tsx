'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Search, Gavel, FileText, Mic, Lightbulb, Clock, X, Loader2,
  Filter, Hash,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'decision' | 'insight' | 'meeting' | 'idea' | 'context' | 'tasklike' | 'note' | 'transcript'
  title: string
  snippet: string
  createdAt: string
  updatedAt: string
  source: string
  tags: string[]
  workspaceId: string
  departmentName: string | null
  departmentKind: string | null
}

const TYPE_META: Record<SearchResult['type'], { label: string; icon: typeof FileText; color: string }> = {
  decision: { label: 'Decision', icon: Gavel, color: 'text-violet-500' },
  insight: { label: 'Insight', icon: Lightbulb, color: 'text-amber-500' },
  meeting: { label: 'Meeting', icon: Mic, color: 'text-emerald-500' },
  idea: { label: 'Idea', icon: Lightbulb, color: 'text-cyan-500' },
  context: { label: 'Context', icon: FileText, color: 'text-sky-500' },
  tasklike: { label: 'Task', icon: Clock, color: 'text-orange-500' },
  note: { label: 'Note', icon: FileText, color: 'text-slate-500' },
  transcript: { label: 'Transcript', icon: Mic, color: 'text-emerald-500' },
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [recentQueries, setRecentQueries] = useState<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const stored = typeof window !== 'undefined' ? localStorage.getItem('recent_searches') : null
    if (stored) {
      try { setRecentQueries(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.trim().length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const params = new URLSearchParams({ q: q.trim() })
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/enterprise/search?${params}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results)
        setRecentQueries((prev) => {
          const next = [q.trim(), ...prev.filter((r) => r !== q.trim())].slice(0, 8)
          if (typeof window !== 'undefined') localStorage.setItem('recent_searches', JSON.stringify(next))
          return next
        })
      } else {
        setResults([])
      }
      setLoading(false)
    }, 250)
  }, [q, typeFilter])

  function clearQuery() {
    setQ('')
    setResults(null)
    inputRef.current?.focus()
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && q) {
      e.preventDefault()
      clearQuery()
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-tight mb-1">Search</h1>
        <p className="text-sm text-muted-foreground">
          Every memory, decision, policy, and transcript your organization has ever captured — searchable in real time.
        </p>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search memories, decisions, policies, people…"
          className="pl-10 pr-10 h-12 text-base"
        />
        {q && (
          <button
            onClick={clearQuery}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Type filter chips */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto no-scrollbar">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <FilterChip active={typeFilter === ''} onClick={() => setTypeFilter('')}>All</FilterChip>
        {(['decision', 'meeting', 'insight', 'note', 'transcript'] as const).map((t) => (
          <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
            {TYPE_META[t].label}
          </FilterChip>
        ))}
      </div>

      {/* Recent / Empty state */}
      {q.length < 2 && (
        <div className="space-y-6">
          {recentQueries.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent searches</h3>
              <div className="flex flex-wrap gap-1.5">
                {recentQueries.map((r) => (
                  <button
                    key={r}
                    onClick={() => setQ(r)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-muted/40 text-[13px] hover:bg-muted transition-colors"
                  >
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Card className="p-6 text-center">
            <Hash className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium mb-1">Type to search across everything</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Hybrid full-text + semantic retrieval across records, decisions, policies, meeting transcripts, and attachments.
              Results are scoped to what you have access to.
            </p>
          </Card>
        </div>
      )}

      {/* Results */}
      {q.length >= 2 && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </div>
          ) : results === null || results.length === 0 ? (
            <Card className="p-8 text-center">
              <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-medium mb-1">No results for &ldquo;{q}&rdquo;</h3>
              <p className="text-sm text-muted-foreground">
                Try broader terms, or try <Link href="/app/chat" className="text-primary hover:underline">asking in Chat</Link> for a synthesized answer.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                {results.length} result{results.length === 1 ? '' : 's'}
              </div>
              {results.map((r, i) => (
                <ResultCard key={r.id} result={r} query={q} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-full text-xs transition-colors whitespace-nowrap',
        active ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function ResultCard({ result, query, index }: { result: SearchResult; query: string; index: number }) {
  const meta = TYPE_META[result.type] || TYPE_META.note
  const Icon = meta.icon

  const highlight = (text: string, q: string) => {
    if (!q) return text
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase()
        ? <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">{part}</mark>
        : part,
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
    >
      <Link href={`/app/memories/${result.id}`}>
        <Card className="p-4 hover:border-primary/40 transition-colors group cursor-pointer">
          <div className="flex items-start gap-3">
            <div className={cn('h-7 w-7 rounded flex items-center justify-center shrink-0 mt-0.5 bg-muted', meta.color)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-medium text-[15px] group-hover:text-primary transition-colors">
                  {highlight(result.title, query)}
                </h3>
                <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                {highlight(result.snippet, query)}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-2">
                {result.departmentName && (
                  <>
                    <span>{result.departmentName}</span>
                    <span>·</span>
                  </>
                )}
                <span className="capitalize">{result.source}</span>
                <span>·</span>
                <span>{new Date(result.updatedAt).toLocaleDateString()}</span>
                {result.tags.length > 0 && (
                  <>
                    <span>·</span>
                    {result.tags.slice(0, 3).map((t) => (
                      <span key={t} className="font-mono">#{t}</span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
