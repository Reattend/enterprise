// Board model - types, relation kinds, the frame layout and saved positions.
// Pure functions only (plus one tiny theme hook); board-view.tsx owns state
// and board-parts.tsx owns the rendering.

import { useEffect, useState } from 'react'

// True while the app is in dark mode. Reads the `dark` class on <html>,
// which is what every dark style in the app keys off, and follows toggles.
export function useIsDark(): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const sync = () => setDark(el.classList.contains('dark'))
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return dark
}

export type RecordType =
  | 'decision' | 'insight' | 'meeting' | 'idea' | 'context' | 'tasklike' | 'note' | 'transcript'

export interface GraphNode {
  id: string
  title: string
  type: RecordType
  workspaceId: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  kind: string
  weight: number | null
  explanation?: string | null
  manual?: boolean
}

export type XY = { x: number; y: number }

// Sticky-note palette per memory type. `fill` is the card, `ink` the accent
// (type label, left bar, minimap). Dark mode swaps fills in board.css via
// the data-type attribute, so only the light values live here.
export const TYPE_META: Record<RecordType, { label: string; plural: string; ink: string; fill: string }> = {
  decision:   { label: 'Decision',   plural: 'Decisions',   ink: '#6d4aff', fill: '#ece6ff' },
  meeting:    { label: 'Meeting',    plural: 'Meetings',    ink: '#3559e0', fill: '#e1e8ff' },
  insight:    { label: 'Insight',    plural: 'Insights',    ink: '#0e8a82', fill: '#d9f4f0' },
  idea:       { label: 'Idea',       plural: 'Ideas',       ink: '#b7791f', fill: '#fff1b8' },
  tasklike:   { label: 'Task',       plural: 'Tasks',       ink: '#d9480f', fill: '#ffe3d6' },
  note:       { label: 'Note',       plural: 'Notes',       ink: '#4d7c2a', fill: '#eaf5d6' },
  context:    { label: 'Context',    plural: 'Context',     ink: '#5f6b7a', fill: '#eceff3' },
  transcript: { label: 'Transcript', plural: 'Transcripts', ink: '#c2255c', fill: '#fde2ee' },
}

export const TYPE_ORDER: RecordType[] = ['decision', 'meeting', 'insight', 'idea', 'tasklike', 'note', 'transcript', 'context']

// Relation kinds a person can pick, most common first. 'temporal' is
// inferred-only (same time window) so it is labelled but never offered.
export const RELATIONS: Array<{ kind: string; label: string; color: string; hint: string }> = [
  { kind: 'related_to',      label: 'related to',  color: '#7b8494', hint: 'Loosely connected' },
  { kind: 'supports',        label: 'supports',    color: '#2b9a66', hint: 'Backs it up' },
  { kind: 'contradicts',     label: 'contradicts', color: '#e5484d', hint: 'Says the opposite' },
  { kind: 'leads_to',        label: 'leads to',    color: '#3559e0', hint: 'Comes next' },
  { kind: 'causes',          label: 'causes',      color: '#6d4aff', hint: 'Is the reason for' },
  { kind: 'depends_on',      label: 'depends on',  color: '#0b7fb3', hint: 'Needs it first' },
  { kind: 'blocks',          label: 'blocks',      color: '#e8590c', hint: 'Stands in the way' },
  { kind: 'part_of',         label: 'part of',     color: '#0e8a82', hint: 'Belongs inside' },
  { kind: 'continuation_of', label: 'continues',   color: '#5b5bd6', hint: 'Picks up from' },
  { kind: 'same_topic',      label: 'same topic',  color: '#8e8c99', hint: 'About the same thing' },
  { kind: 'same_people',     label: 'same people', color: '#c2255c', hint: 'Same people involved' },
]

const TEMPORAL = { kind: 'temporal', label: 'same time', color: '#a0a4ad', hint: 'Happened around the same time' }

export function relationMeta(kind: string) {
  return RELATIONS.find((r) => r.kind === kind) ?? (kind === 'temporal' ? TEMPORAL : { ...TEMPORAL, kind, label: kind.replace(/_/g, ' ') })
}

// ─── Layout ────────────────────────────────────────────────────────────
// Miro-style frames: one frame per memory type, cards in a grid inside it.
// Inside a frame, cards that are linked sit next to each other (grouped by
// connected component, busiest first), so most links stay short.

export const NODE_W = 232
export const NODE_H = 104
const GAP = 28
const FRAME_PAD = 40
const FRAME_HEAD = 56
const FRAME_GAP = 140
const ROW_MAX_W = 5200

export interface Frame {
  type: RecordType
  x: number
  y: number
  w: number
  h: number
  count: number
}

export function autoLayout(nodes: GraphNode[], edges: GraphEdge[]): { positions: Map<string, XY>; frames: Frame[] } {
  // Union-find over links for component grouping.
  const parent = new Map<string, string>()
  const find = (a: string): string => {
    let r = a
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r)!
    parent.set(a, r)
    return r
  }
  for (const n of nodes) parent.set(n.id, n.id)
  const degree = new Map<string, number>()
  for (const e of edges) {
    if (!parent.has(e.from) || !parent.has(e.to)) continue
    parent.set(find(e.from), find(e.to))
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  const compSize = new Map<string, number>()
  for (const n of nodes) compSize.set(find(n.id), (compSize.get(find(n.id)) ?? 0) + 1)

  const byType = new Map<RecordType, GraphNode[]>()
  for (const n of nodes) {
    const t = (TYPE_META[n.type] ? n.type : 'note') as RecordType
    const list = byType.get(t) ?? []
    list.push(n)
    byType.set(t, list)
  }

  const positions = new Map<string, XY>()
  const frames: Frame[] = []
  let cx = 0
  let cy = 0
  let rowH = 0

  for (const t of TYPE_ORDER) {
    const list = byType.get(t)
    if (!list?.length) continue
    list.sort((a, b) => {
      const ca = find(a.id), cb = find(b.id)
      const sa = compSize.get(ca) ?? 1, sb = compSize.get(cb) ?? 1
      if (sa !== sb) return sb - sa
      if (ca !== cb) return ca < cb ? -1 : 1
      const da = degree.get(a.id) ?? 0, db = degree.get(b.id) ?? 0
      if (da !== db) return db - da
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    const cols = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(list.length * 1.3))))
    const rows = Math.ceil(list.length / cols)
    const w = FRAME_PAD * 2 + cols * NODE_W + (cols - 1) * GAP
    const h = FRAME_HEAD + FRAME_PAD + rows * NODE_H + (rows - 1) * GAP

    if (cx > 0 && cx + w > ROW_MAX_W) {
      cx = 0
      cy += rowH + FRAME_GAP
      rowH = 0
    }
    frames.push({ type: t, x: cx, y: cy, w, h, count: list.length })
    list.forEach((n, i) => {
      const c = i % cols
      const r = Math.floor(i / cols)
      positions.set(n.id, {
        x: cx + FRAME_PAD + c * (NODE_W + GAP),
        y: cy + FRAME_HEAD + r * (NODE_H + GAP),
      })
    })
    cx += w + FRAME_GAP
    rowH = Math.max(rowH, h)
  }
  return { positions, frames }
}

// ─── Saved positions ───────────────────────────────────────────────────
// Where a person drags a card is remembered per browser and per scope
// (each org, and Personal, get their own board). Kept client-side on
// purpose: the layout is a personal view, not org data.

const POS_KEY = (scope: string) => `reattend:board:v2:pos:${scope}`

export function loadPositions(scope: string): Map<string, XY> {
  try {
    const raw = window.localStorage.getItem(POS_KEY(scope))
    if (!raw) return new Map()
    const obj = JSON.parse(raw) as Record<string, [number, number]>
    return new Map(Object.entries(obj).map(([id, [x, y]]) => [id, { x, y }]))
  } catch {
    return new Map()
  }
}

export function savePositions(scope: string, positions: Map<string, XY>) {
  try {
    const obj: Record<string, [number, number]> = {}
    positions.forEach((p, id) => { obj[id] = [Math.round(p.x), Math.round(p.y)] })
    window.localStorage.setItem(POS_KEY(scope), JSON.stringify(obj))
  } catch { /* storage full or blocked - positions just won't stick */ }
}

export function clearPositions(scope: string) {
  try { window.localStorage.removeItem(POS_KEY(scope)) } catch { /* ignore */ }
}

// Rectangle edge point on the line from a rect's centre towards `to`, used
// by the floating connector so arrows meet the card border, not its centre.
export function borderPoint(rect: { x: number; y: number; w: number; h: number }, to: XY): XY {
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  const dx = to.x - cx
  const dy = to.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const sx = (rect.w / 2) / Math.abs(dx || 1e-9)
  const sy = (rect.h / 2) / Math.abs(dy || 1e-9)
  const s = Math.min(sx, sy)
  return { x: cx + dx * s, y: cy + dy * s }
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
