'use client'

// Ask — single unified chat surface.
//
// The Ask experience is one chat. The user picks a model inside the input
// bar (Chat for fast streaming, Deepthink for the structured dossier
// formerly known as Oracle). The page-level chrome is just the
// Anonymous + Prompts buttons floating in the top-right corner.

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { HatGlasses, SquareChevronRight } from 'lucide-react'
import { ChatView } from './chat-view'
import { PromptLibraryDrawer } from '@/components/enterprise/prompt-library-drawer'
import { useAppStore } from '@/stores/app-store'

function AskInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [libOpen, setLibOpen] = useState(false)
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)

  // Picking a prompt from the library pushes ?q= so ChatView treats it as
  // the initial question.
  function usePromptFromLibrary(body: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('q', body)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative bg-background">
      {/* Floating top-right controls — Incognito (Anonymous Ask) + Prompts.
          Absolute-positioned so they overlay the empty-state hero without
          consuming vertical space and keep their place when the chat thread
          fills the viewport. */}
      <div className="absolute top-3 right-4 z-30 flex items-center gap-2">
        <Link
          href="/app/anonymous-ask"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a2e] text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm hover:bg-[#2d2b55] transition-colors"
          title="Ask without attribution (HR / compliance questions)"
        >
          <HatGlasses className="h-3.5 w-3.5" />
          Incognito
        </Link>
        <button
          onClick={() => setLibOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted text-foreground/80 px-3.5 py-1.5 text-xs font-semibold hover:bg-muted/80 transition-colors"
          title="Team prompt library"
        >
          <SquareChevronRight className="h-3.5 w-3.5" />
          Prompts
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatView />
      </div>

      <PromptLibraryDrawer
        open={libOpen}
        onOpenChange={setLibOpen}
        orgId={activeOrgId}
        onUse={usePromptFromLibrary}
      />
    </div>
  )
}

export default function AskPage() {
  return (
    <Suspense>
      <AskInner />
    </Suspense>
  )
}
