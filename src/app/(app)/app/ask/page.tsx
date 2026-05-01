'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { HatGlasses, SquareChevronRight } from 'lucide-react'
import { ChatView } from './chat-view'
import { PromptLibraryDrawer } from '@/components/enterprise/prompt-library-drawer'
import { useAppStore } from '@/stores/app-store'

// Ask — single unified chat surface. The page chrome adopts the new
// dashboard design (Incognito + Prompts as pill buttons in the chat-toolbar);
// the chat itself is still rendered by the existing ChatView, so the
// streaming, citations, ⌘ Enter, etc. all keep working.

function AskInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [libOpen, setLibOpen] = useState(false)
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)

  function usePromptFromLibrary(body: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('q', body)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="chat-wrap">
      <div className="chat-toolbar">
        <Link
          href="/app/anonymous-ask"
          className="pill-btn dark"
          title="Ask without attribution (HR / compliance questions)"
        >
          <HatGlasses className="h-3.5 w-3.5" />
          Incognito
        </Link>
        <button
          onClick={() => setLibOpen(true)}
          className="pill-btn"
          title="Team prompt library"
          type="button"
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
