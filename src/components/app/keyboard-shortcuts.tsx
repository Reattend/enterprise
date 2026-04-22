'use client'

// Global keyboard shortcuts — mounted once at the app layout.
//
// Shortcuts:
//   ⌘K / Ctrl-K   → Search
//   ⌘N / Ctrl-N   → New memory (Capture drawer)
//   ⌘J / Ctrl-J   → Inbox
//   ⌘G / Ctrl-G   → Graph
//   ⌘\ / Ctrl-\   → Toggle sidebar
//   ?             → Show this shortcuts modal (ignored while typing)
//   g h / g w ... → Go-to combos (vim-style, optional; not yet enabled)
//
// Shortcuts are suppressed while the user is typing in an input, textarea,
// contenteditable, or wrapped in our Dialog/Drawer components (they handle
// their own ⌘Enter / Esc).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Keyboard } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

interface Shortcut {
  keys: string[]
  label: string
  group: 'Navigation' | 'Actions' | 'Misc'
  mac?: boolean // if true, also fires on ⌘; all shortcuts default to both ⌘+key and Ctrl+key
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['⌘', 'K'], label: 'Search', group: 'Navigation' },
  { keys: ['⌘', 'N'], label: 'New memory (Capture)', group: 'Actions' },
  { keys: ['⌘', 'J'], label: 'Inbox', group: 'Navigation' },
  { keys: ['⌘', 'G'], label: 'Graph', group: 'Navigation' },
  { keys: ['⌘', '\\'], label: 'Toggle sidebar', group: 'Misc' },
  { keys: ['?'], label: 'Show shortcuts', group: 'Misc' },
]

export function KeyboardShortcuts() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const toggleSidebar = useAppStore((s) => () => {
    // Inline to avoid needing the setter in the selector return
    useAppStore.setState((prev: any) => ({ sidebarCollapsed: !prev.sidebarCollapsed }))
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      const typing = isTyping(e.target)

      // ? (Shift-/) opens the cheat sheet, only when not typing.
      if (!typing && !meta && !e.altKey && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault()
        setShowModal(true)
        return
      }

      // Escape always closes the shortcuts modal.
      if (e.key === 'Escape' && showModal) {
        setShowModal(false)
        return
      }

      if (!meta || typing) return

      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault()
          router.push('/app/search')
          break
        case 'n':
          e.preventDefault()
          useAppStore.getState().setCaptureOpen(true)
          break
        case 'j':
          e.preventDefault()
          router.push('/app/inbox')
          break
        case 'g':
          e.preventDefault()
          router.push('/app/landscape?mode=causal')
          break
        case '\\':
          e.preventDefault()
          toggleSidebar()
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router, showModal, toggleSidebar])

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Works anywhere except while typing in a text field.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {(['Navigation', 'Actions', 'Misc'] as const).map((group) => {
            const list = SHORTCUTS.filter((s) => s.group === group)
            if (list.length === 0) return null
            return (
              <div key={group}>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 font-semibold">{group}</div>
                <div className="space-y-1.5">
                  {list.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-sm">
                      <span>{s.label}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          <div className="text-[10px] text-muted-foreground border-t pt-3">
            On Windows/Linux, <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-mono">Ctrl</Badge> replaces <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-mono">⌘</Badge>.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
