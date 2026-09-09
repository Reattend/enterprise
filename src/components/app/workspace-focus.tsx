'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Sparkles, Network, Plus, Plug, ArrowRight, Activity, Database, RefreshCcw } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

/** Uses the existing chat and capture flows, without a parallel AI API. */
export function WorkspaceFocus() {
  const [query, setQuery] = useState('')
  const router = useRouter()
  function ask(event: FormEvent) {
    event.preventDefault()
    if (query.trim()) router.push(`/app/ask?q=${encodeURIComponent(query.trim())}`)
  }
  return (
    <section className="workspace-focus" aria-label="Find clarity in your memories">
      <div className="focus-caption"><Sparkles size={14} /> YOUR MIND, WITH MORE ROOM</div>
      <form onSubmit={ask} className="focus-search">
        <label htmlFor="workspace-query">Pick up a thought. Find a new connection.</label>
        <div><Sparkles size={20} aria-hidden="true" /><input id="workspace-query" value={query} onChange={event => setQuery(event.target.value)} placeholder="What’s on your mind?" /><button type="submit" aria-label="Continue in Ask Reattend" disabled={!query.trim()}><ArrowUpRight size={20} /></button></div>
      </form>
      <div className="focus-shortcuts"><Link href="/app/ask">Ask your second brain <ArrowUpRight size={12} /></Link><Link href="/app/landscape">Explore connections <ArrowUpRight size={12} /></Link></div>
    </section>
  )
}

/** A compact, data-backed daily briefing for the home screen. */
export function MemoryPulse({
  scope,
  totalMemories,
  recentCount,
  needsReview = 0,
  connectedSources = 0,
  totalSources = 0,
}: {
  scope: 'personal' | 'team'
  totalMemories: number
  recentCount: number
  needsReview?: number
  connectedSources?: number
  totalSources?: number
}) {
  const title = scope === 'team'
    ? needsReview > 0
      ? `${needsReview.toLocaleString()} ${needsReview === 1 ? 'memory is' : 'memories are'} ready for a fresh look.`
      : recentCount > 0
        ? `${recentCount.toLocaleString()} new ${recentCount === 1 ? 'memory is' : 'memories are'} becoming useful context.`
        : 'Your shared memory is calm and ready.'
    : totalMemories > 0
      ? `${totalMemories.toLocaleString()} ${totalMemories === 1 ? 'memory is' : 'memories are'} within reach.`
      : 'Start with one thought. Your second brain will grow around it.'

  const prompt = scope === 'team'
    ? 'What changed in our organization this week, and what deserves attention?'
    : 'What patterns and unfinished ideas can you find in my recent memories?'

  return (
    <section className="memory-pulse" aria-label="Memory pulse">
      <div className="memory-pulse-intro">
        <span className="memory-pulse-icon"><Activity size={17} /></span>
        <div>
          <div className="memory-pulse-kicker"><span /> Live memory pulse</div>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="memory-pulse-signals">
        {scope === 'team' ? (
          <>
            <div><Database size={14} /><span><b>{recentCount.toLocaleString()}</b><small>new this week</small></span></div>
            <div><RefreshCcw size={14} /><span><b>{needsReview.toLocaleString()}</b><small>need review</small></span></div>
            <div><Plug size={14} /><span><b>{connectedSources}/{totalSources}</b><small>sources flowing</small></span></div>
          </>
        ) : (
          <>
            <div><Database size={14} /><span><b>{totalMemories.toLocaleString()}</b><small>saved memories</small></span></div>
            <div><RefreshCcw size={14} /><span><b>{recentCount.toLocaleString()}</b><small>recently in view</small></span></div>
          </>
        )}
      </div>
      <Link className="memory-pulse-ask" href={`/app/ask?q=${encodeURIComponent(prompt)}`}>
        Ask for a briefing <ArrowUpRight size={14} />
      </Link>
    </section>
  )
}

/** A home-only third pane: useful entry points, never invented analytics. */
export function WorkspacePerspective() {
  const recentChats = useAppStore(state => state.recentChats)
  return (
    <aside className="workspace-perspective" aria-label="Your perspective">
      <div className="perspective-heading"><Sparkles size={16} /> A little perspective</div>
      <div className="perspective-art" aria-hidden="true"><span /><span /><span /><Network size={38} strokeWidth={1} /></div>
      <h2>Good ideas<br />are connected.</h2>
      <p>Follow the threads between what you know and what comes next.</p>
      <Link className="perspective-link" href="/app/landscape">Explore your landscape <ArrowUpRight size={15} /></Link>
      <div className="perspective-section"><span>MAKE A LITTLE SPACE</span><button onClick={() => useAppStore.getState().setCaptureOpen(true)}><Plus size={16} /><div>Catch a thought<small>Save it before it slips away.</small></div><ArrowRight size={13} /></button><Link href="/app/integrations"><Plug size={16} /><div>Bring it all together<small>Connect the tools you use.</small></div><ArrowRight size={13} /></Link></div>
      {!!recentChats?.length && <div className="perspective-section"><span>PICK UP WHERE YOU LEFT OFF</span>{recentChats.slice(0, 3).map(chat => <Link key={chat.id} href={`/app/ask?chat=${encodeURIComponent(chat.id)}`}><span className="perspective-chat">{chat.title || 'Untitled conversation'}</span><ArrowUpRight size={13} /></Link>)}</div>}
      <div className="perspective-foot"><Sparkles size={14} /><p>A place for everything.<br />More room for you.</p></div>
    </aside>
  )
}
