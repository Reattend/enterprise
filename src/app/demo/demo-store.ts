'use client'

import { create } from 'zustand'

// ─── Types ──────────────────────────────────────────
export type DemoPhase =
  | 'input'
  | 'processing'
  | 'enriched'
  | 'compounding'
  | 'asking'
  | 'answering'
  | 'finale'

export interface TriageResult {
  should_store: boolean
  record_type: string
  title: string
  summary: string
  tags: string[]
  entities: { kind: string; name: string }[]
  dates: { date: string; label: string; type: string }[]
  confidence: number
  proposed_projects: { name: string; confidence: number; reason: string }[]
  suggested_links: { query_text: string; reason: string }[]
  why_kept_or_dropped: string
}

interface DemoStore {
  phase: DemoPhase
  setPhase: (p: DemoPhase) => void

  // Act 1: Input & Processing
  noteText: string
  setNoteText: (t: string) => void
  triageResult: TriageResult | null
  setTriageResult: (r: TriageResult) => void
  processStep: number
  setProcessStep: (s: number) => void

  // Act 2: Compounding
  seededCount: number
  incrementSeeded: () => void
  contradictionRevealed: boolean
  revealContradiction: () => void

  // Act 3: Ask
  selectedQuestion: number | null
  setSelectedQuestion: (i: number) => void
  answerProgress: number
  setAnswerProgress: (n: number) => void

  // Reset
  reset: () => void
}

const initialState = {
  phase: 'input' as DemoPhase,
  noteText: '',
  triageResult: null as TriageResult | null,
  processStep: 0,
  seededCount: 0,
  contradictionRevealed: false,
  selectedQuestion: null as number | null,
  answerProgress: 0,
}

export const useDemoStore = create<DemoStore>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setNoteText: (noteText) => set({ noteText }),
  setTriageResult: (triageResult) => set({ triageResult }),
  setProcessStep: (processStep) => set({ processStep }),
  incrementSeeded: () => set((s) => ({ seededCount: s.seededCount + 1 })),
  revealContradiction: () => set({ contradictionRevealed: true }),
  setSelectedQuestion: (selectedQuestion) => set({ selectedQuestion }),
  setAnswerProgress: (answerProgress) => set({ answerProgress }),
  reset: () => set(initialState),
}))
