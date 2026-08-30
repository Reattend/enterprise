'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Send, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { emit, SCOPES } from '@/lib/data-bus'
import { toast } from 'sonner'

export function QuickCapture() {
  const { commandOpen, setCommandOpen } = useAppStore()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Cmd+K global listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(!useAppStore.getState().commandOpen)
      }
      if (e.key === 'Escape' && useAppStore.getState().commandOpen) {
        setCommandOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCommandOpen])

  // Auto-focus textarea when dialog opens
  useEffect(() => {
    if (commandOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    } else {
      setText('')
    }
  }, [commandOpen])

  const handleSave = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      const orgId = useAppStore.getState().activeEnterpriseOrgId
      const res = await fetch('/api/raw-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), orgId }),
      })
      if (res.ok) {
        const body = await res.json().catch(() => null)
        if (body?.aiConfigured === false) {
          // Never lose the capture just because no AI key is configured -
          // agents.ts already stored it as a plain-text record (visible,
          // searchable), this just tells the user why it wasn't titled/
          // classified and how to fix it going forward.
          toast.success('Saved as plain text - connect an AI key in Settings for auto-titling & search.', { duration: 6000 })
        } else {
          toast.success('Memory saved successfully.')
        }
        setText('')
        setCommandOpen(false)
        // Without this, a capture made while already sitting on /app/memories
        // (no tab switch, no focus event) left the list stale until a manual
        // reload - looked exactly like "the memory didn't save" even when it
        // did. brain-dump/page.tsx already does this on its commit path.
        emit(SCOPES.memories)
      } else {
        const body = await res.json().catch(() => null)
        toast.error(body?.message || body?.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {commandOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm"
          onClick={() => setCommandOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg mx-4 rounded-2xl border bg-background shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Quick Capture</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">ESC</kbd>
                <Button variant="ghost" size="icon-sm" onClick={() => setCommandOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Textarea */}
            <div className="p-4">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
                placeholder="Capture a thought, decision, or note..."
                className="w-full min-h-[120px] max-h-[300px] rounded-lg border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                disabled={saving}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <p className="text-[11px] text-muted-foreground">
                <kbd className="font-mono bg-muted px-1 py-0.5 rounded border text-[10px]">{navigator?.platform?.includes('Mac') ? '&#8984;' : 'Ctrl'}+Enter</kbd> to save
              </p>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!text.trim() || saving}
                className="gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {saving ? 'Saving...' : 'Capture'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
