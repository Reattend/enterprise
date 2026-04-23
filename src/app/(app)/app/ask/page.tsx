'use client'

// Ask — the unified question-answering surface.
//
//   Chat:   multi-turn streaming conversational Q&A (fast, ~2s)
//   Oracle: one-shot 5-section dossier for high-stakes questions (~30s)
//
// Mode persists via ?mode=chat|oracle. We default to chat since most
// questions are quick; Oracle is the "deep research" opt-in.

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Sparkles, Crown, BookMarked } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatView } from './chat-view'
import { OracleView } from './oracle-view'
import { PromptLibraryDrawer } from '@/components/enterprise/prompt-library-drawer'
import { useAppStore } from '@/stores/app-store'

type Mode = 'chat' | 'oracle'

function AskInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const urlMode = (searchParams.get('mode') === 'oracle' ? 'oracle' : 'chat') as Mode
  const [mode, setMode] = useState<Mode>(urlMode)
  const [libOpen, setLibOpen] = useState(false)
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)

  useEffect(() => { setMode(urlMode) }, [urlMode])

  function pick(next: Mode) {
    setMode(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set('mode', next)
    router.replace(`${pathname}?${params.toString()}`)
  }

  // When a prompt is picked from the library, push it into the URL so the
  // underlying ChatView / OracleView can pick it up as the initial question.
  function usePrompt(body: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('q', body)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mode toggle pill. Floats above both views. The Chat view has a full-
          bleed dark gradient so we keep the toggle minimal + pill-shaped. */}
      <div className="sticky top-0 z-20 px-4 py-2 bg-background/70 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-full border bg-card p-0.5">
            <ModeButton active={mode === 'chat'} onClick={() => pick('chat')} icon={Sparkles} label="Chat" sub="Fast multi-turn" />
            <ModeButton active={mode === 'oracle'} onClick={() => pick('oracle')} icon={Crown} label="Oracle" sub="Deep dossier" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLibOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors"
              title="Team prompt library"
            >
              <BookMarked className="h-3 w-3" />
              <span className="hidden sm:inline">Prompts</span>
            </button>
            <span className="text-[10px] text-muted-foreground hidden lg:inline">
              {mode === 'chat' ? 'Quick, conversational. ~2-3s.' : 'Structured research. ~20-40s.'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'chat' ? <ChatView /> : <OracleView />}
      </div>

      <PromptLibraryDrawer
        open={libOpen}
        onOpenChange={setLibOpen}
        orgId={activeOrgId}
        onUse={usePrompt}
      />
    </div>
  )
}

function ModeButton({
  active, onClick, icon: Icon, label, sub,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Sparkles
  label: string
  sub: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold">{label}</span>
      <span className={cn('hidden sm:inline text-[10px]', active ? 'opacity-80' : 'opacity-60')}>· {sub}</span>
    </button>
  )
}

export default function AskPage() {
  return (
    <Suspense>
      <AskInner />
    </Suspense>
  )
}
