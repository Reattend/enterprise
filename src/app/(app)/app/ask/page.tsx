'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  HatGlasses, SquareChevronRight, Search, Plus, MessageSquare,
  Trash2, Database, ShieldCheck, Sparkles, Clock3, History,
} from 'lucide-react'
import { ChatView } from './chat-view'
import { PromptLibraryDrawer } from '@/components/enterprise/prompt-library-drawer'
import { useAppStore } from '@/stores/app-store'

// Ask - single unified chat surface. The page chrome adopts the new
// dashboard design (Incognito + Prompts as pill buttons in the chat-toolbar);
// the chat itself is still rendered by the existing ChatView, so the
// streaming, citations, ⌘ Enter, etc. all keep working.

function AskInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [libOpen, setLibOpen] = useState(false)
  const [historyQuery, setHistoryQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { activeEnterpriseOrgId: activeOrgId, enterpriseOrgs, recentChats, removeRecentChat } = useAppStore()
  const activeChatId = searchParams.get('chat')
  const activeOrg = enterpriseOrgs.find((org) => org.orgId === activeOrgId)
  const visibleChats = useMemo(() => {
    const query = historyQuery.trim().toLowerCase()
    if (!query) return recentChats
    return recentChats.filter((chat) => (chat.title || 'Untitled chat').toLowerCase().includes(query))
  }, [historyQuery, recentChats])

  function usePromptFromLibrary(body: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('q', body)
    router.replace(`${pathname}?${params.toString()}`)
  }

  async function deleteChat(id: string) {
    if (deletingId) return
    setDeletingId(id)
    try {
      const response = await fetch('/api/chats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (response.ok) {
        removeRecentChat(id)
        if (activeChatId === id) router.replace('/app/ask')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const historyList = (
    <div className="ask-history-list">
      {visibleChats.length > 0 ? visibleChats.map((chat) => (
        <div key={chat.id} className={`ask-history-row ${activeChatId === chat.id ? 'active' : ''}`}>
          <Link href={`/app/ask?chat=${encodeURIComponent(chat.id)}`}>
            <span className="ask-history-glyph"><MessageSquare size={13} /></span>
            <span className="ask-history-copy">
              <b>{chat.title || 'Untitled chat'}</b>
              <small><Clock3 size={9} /> {formatChatAge(chat.updatedAt)}</small>
            </span>
          </Link>
          <button
            type="button"
            className="ask-history-delete"
            title="Delete conversation"
            aria-label={`Delete ${chat.title || 'conversation'}`}
            disabled={deletingId === chat.id}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              deleteChat(chat.id)
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )) : (
        <div className="ask-history-empty">
          <MessageSquare size={18} />
          <b>{historyQuery ? 'No conversations found' : 'Your conversations will appear here'}</b>
          <small>Ask something worth returning to.</small>
        </div>
      )}
    </div>
  )

  return (
    <div className="ask-product-shell">
      <aside className="ask-history-pane">
        <div className="ask-history-head">
          <div><span>Conversations</span><small>{recentChats.length} saved</small></div>
          <Link href="/app/ask" aria-label="New chat" title="New chat"><Plus size={14} /></Link>
        </div>
        <label className="ask-history-search">
          <Search size={12} />
          <input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search history" />
        </label>
        {historyList}
        <div className="ask-history-foot"><ShieldCheck size={12} /><span><b>Private by default</b><small>Chat history stays in your account.</small></span></div>
      </aside>

      <section className="ask-conversation-pane">
        <header className="ask-local-header">
          <div className="ask-local-title">
            <span className="ask-ai-mark"><Sparkles size={13} /></span>
            <span><b>Ask your brain</b><small>Grounded in {activeOrg?.orgName || 'your private memory'}</small></span>
          </div>
          <details className="ask-history-mobile">
            <summary><History size={13} /> History</summary>
            <div className="ask-history-popover">{historyList}</div>
          </details>
          <div className="ask-local-actions">
            <Link href="/app/anonymous-ask" className="pill-btn dark" title="Ask without attribution">
              <HatGlasses className="h-3.5 w-3.5" /> Incognito
            </Link>
            <button onClick={() => setLibOpen(true)} className="pill-btn" title="Team prompt library" type="button">
              <SquareChevronRight className="h-3.5 w-3.5" /> Prompts
            </button>
          </div>
        </header>

        <div className="ask-chat-slot">
          <ChatView />
        </div>
      </section>

      <aside className="ask-context-pane">
        <div className="ask-context-head"><span>Memory scope</span><small>What the AI can use</small></div>
        <div className="ask-scope-card">
          <span className="ask-scope-icon"><Database size={15} /></span>
          <div><b>{activeOrg?.orgName || 'Personal memory'}</b><small>{activeOrg ? 'Organization-wide, permission aware' : 'Private to your account'}</small></div>
          <i />
        </div>
        <div className="ask-context-map" aria-hidden="true">
          <span className="ask-context-core">✦</span>
          <span className="ask-context-node node-a">Decisions</span>
          <span className="ask-context-node node-b">Meetings</span>
          <span className="ask-context-node node-c">People</span>
          <span className="ask-context-node node-d">Wiki</span>
        </div>
        <div className="ask-standard">
          <span>Answer standard</span>
          <div><ShieldCheck size={13} /><p><b>Cited first</b><small>Claims link back to memory.</small></p></div>
          <div><Sparkles size={13} /><p><b>Reasoning visible</b><small>Inspect how context was retrieved.</small></p></div>
        </div>
      </aside>

      <PromptLibraryDrawer
        open={libOpen}
        onOpenChange={setLibOpen}
        orgId={activeOrgId}
        onUse={usePromptFromLibrary}
      />
    </div>
  )
}

function formatChatAge(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function AskPage() {
  return (
    <Suspense>
      <AskInner />
    </Suspense>
  )
}
