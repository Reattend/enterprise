'use client'

// Board - the memory map as a Miro-style canvas. Takes the whole window
// (the app layout drops its sidebar, topbar and banners on this route) and
// brings its own chrome:
//
//   top-left     brand block, back to the app, which board (org or Personal)
//   left rail    Select (V), Add memory (N), Connect (C), Undo, Redo, Tidy up
//   top-right    search, counts, Rewind
//   bottom       type legend (click to hide a type), hint strip, zoom + map
//   right        memory drawer - opens on a card click, closes on any
//                press outside it
//
// Data:
//   GET    /api/enterprise/graph          records + links (scoped: org or Personal, never both)
//   POST   /api/records                   a memory typed on the board (same path as Capture)
//   DELETE /api/records                   undoing a memory made on the board
//   POST   /api/enterprise/graph/links    a link, created only once a relation is picked
//   PATCH  /api/enterprise/graph/links    change a link's relation
//   DELETE /api/enterprise/graph/links    remove a link
//
// Card positions are the viewer's own layout, saved per browser and scope
// (board-model.ts). Everything a person does here can be undone.

import './board.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, MiniMap, useReactFlow, useNodesState,
  ConnectionMode, MarkerType,
  type Node, type Edge, type NodeMouseHandler, type OnConnectEnd, type OnNodeDrag, type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toast } from 'sonner'
import {
  MousePointer2, StickyNote, Spline, Undo2, Redo2, LayoutGrid, Search, X, Minus, Plus, Maximize,
  Map as MapIcon, RotateCcw, ArrowLeft, Loader2, AlertCircle, ChevronUp, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import {
  TYPE_META, TYPE_ORDER, NODE_W, NODE_H, autoLayout, useIsDark, loadPositions, savePositions, clearPositions, relationMeta,
  type GraphNode, type GraphEdge, type RecordType, type XY, type Frame,
} from './board-model'
import {
  BoardCtx, MemoryCard, FrameCard, Connector, RelationPicker, MemoryDrawer, Composer,
  type BoardUi, type MemoryData, type FrameData, type LinkData,
} from './board-parts'

type Tool = 'select' | 'memory' | 'connect'
type Picker =
  | { mode: 'new'; from: string; to: string; x: number; y: number }
  | { mode: 'edit'; edgeId: string; x: number; y: number }
interface HistoryEntry { label: string; undo: () => Promise<void> | void; redo: () => Promise<void> | void }

const nodeTypes = { memory: MemoryCard, frame: FrameCard }
const edgeTypes = { rel: Connector }
const DRAWER_W = 420
const NEW_FRAME_GAP = 140
const TIP_KEY = 'reattend:board:tip:v1'

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

function toGraphNode(r: { id: string; title?: string | null; type?: string; workspaceId: string; createdAt: string; updatedAt: string; tags?: string | string[] | null }): GraphNode {
  let tags: string[] = []
  if (Array.isArray(r.tags)) tags = r.tags
  else if (typeof r.tags === 'string') { try { tags = JSON.parse(r.tags) } catch { tags = [] } }
  return {
    id: r.id,
    title: r.title || '',
    type: (r.type as RecordType) || 'note',
    workspaceId: r.workspaceId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    tags,
  }
}

export function BoardView() {
  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  )
}

function Board() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const hydrated = useAppStore((s) => s.hasHydratedStore)
  const orgs = useAppStore((s) => s.enterpriseOrgs)
  const scope = activeOrgId || 'personal'
  const scopeName = activeOrgId ? (orgs.find((o) => o.orgId === activeOrgId)?.orgName ?? 'Organization') : 'Personal'
  const dark = useIsDark()
  const rf = useReactFlow()
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Data ──────────────────────────────────────────────────────────
  const [records, setRecords] = useState<GraphNode[] | null>(null)
  const [links, setLinks] = useState<GraphEdge[]>([])
  const [err, setErr] = useState<string | null>(null)
  const linksRef = useRef(links)
  linksRef.current = links
  const recordsRef = useRef(records)
  recordsRef.current = records
  const scopeRef = useRef(scope)

  // ── Layout ────────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const baseRef = useRef<{ positions: Map<string, XY>; frames: Frame[] } | null>(null)
  const savedRef = useRef<Map<string, XY>>(new Map())
  const extraRef = useRef(0) // cards placed in the "New" frame since the layout was made
  const [layoutGen, setLayoutGen] = useState(0)
  const [arranging, setArranging] = useState(false)
  const didFitRef = useRef(false)

  // ── Interaction ───────────────────────────────────────────────────
  const [tool, setToolState] = useState<Tool>('select')
  const toolRef = useRef<Tool>('select')
  const setTool = useCallback((t: Tool) => { toolRef.current = t; setToolState(t) }, [])
  const [connectSource, setConnectSourceState] = useState<string | null>(null)
  const connectSourceRef = useRef<string | null>(null)
  const setConnectSource = useCallback((id: string | null) => { connectSourceRef.current = id; setConnectSourceState(id) }, [])
  const [connecting, setConnecting] = useState(false)
  const [picker, setPicker] = useState<Picker | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const drawerIdRef = useRef<string | null>(null)
  drawerIdRef.current = drawerId
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [composer, setComposer] = useState<XY | null>(null)
  const composerRef = useRef<XY | null>(null)
  composerRef.current = composer
  const [composerBusy, setComposerBusy] = useState(false)
  const [fresh, setFresh] = useState<Map<string, string>>(new Map()) // id -> title it was saved with
  const [query, setQuery] = useState('')
  const [matchIdx, setMatchIdx] = useState(0)
  const [hiddenTypes, setHiddenTypes] = useState<Set<RecordType>>(new Set())
  const [zoomPct, setZoomPct] = useState(100)
  const [showLabels, setShowLabels] = useState(true)
  const [showMap, setShowMap] = useState(true)
  const [tipOpen, setTipOpen] = useState(false)
  const refreshTimers = useRef<number[]>([])

  useEffect(() => {
    try { setTipOpen(window.localStorage.getItem(TIP_KEY) !== '1') } catch { setTipOpen(true) }
    if (window.innerWidth < 720) setShowMap(false)
  }, [])
  const dismissTip = () => { setTipOpen(false); try { window.localStorage.setItem(TIP_KEY, '1') } catch { /* ignore */ } }

  // ── History (undo / redo) ─────────────────────────────────────────
  const undoRef = useRef<HistoryEntry[]>([])
  const redoRef = useRef<HistoryEntry[]>([])
  const historyBusy = useRef(false)
  const [, setHistTick] = useState(0)
  const bumpHistory = () => setHistTick((t) => t + 1)
  const push = useCallback((e: HistoryEntry) => {
    undoRef.current.push(e)
    if (undoRef.current.length > 100) undoRef.current.shift()
    redoRef.current = []
    bumpHistory()
  }, [])
  const step = useCallback(async (dir: 'undo' | 'redo') => {
    if (historyBusy.current) return
    const from = dir === 'undo' ? undoRef.current : redoRef.current
    const to = dir === 'undo' ? redoRef.current : undoRef.current
    const e = from.pop()
    if (!e) return
    historyBusy.current = true
    bumpHistory()
    try {
      await (dir === 'undo' ? e.undo() : e.redo())
      to.push(e)
      toast(`${dir === 'undo' ? 'Undid' : 'Redid'}: ${e.label}`, { duration: 1400 })
    } catch {
      toast.error(`Could not ${dir} that.`)
    } finally {
      historyBusy.current = false
      bumpHistory()
    }
  }, [])

  // ── Load ──────────────────────────────────────────────────────────
  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    const forScope = scopeRef.current
    const q = new URLSearchParams()
    if (activeOrgId) q.set('orgId', activeOrgId)
    try {
      const res = await fetch(`/api/enterprise/graph?${q}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      const data = await res.json() as { nodes: GraphNode[]; edges: GraphEdge[] }
      if (scopeRef.current !== forScope) return
      setErr(null)
      setRecords(data.nodes)
      // Keep links still being saved; the server does not know them yet.
      setLinks((prev) => [...data.edges, ...prev.filter((l) => l.id.startsWith('tmp-'))])
      // A memory made here is "filing" until the AI rewrites its title.
      setFresh((prev) => {
        if (prev.size === 0) return prev
        const next = new Map(prev)
        for (const n of data.nodes) {
          const t0 = next.get(n.id)
          if (t0 !== undefined && n.title !== t0) next.delete(n.id)
        }
        return next.size === prev.size ? prev : next
      })
    } catch (e) {
      if (!opts?.quiet) setErr((e as Error).message || 'failed')
    }
  }, [activeOrgId])

  useEffect(() => {
    if (!hydrated) return
    scopeRef.current = scope
    baseRef.current = null
    extraRef.current = 0
    didFitRef.current = false
    savedRef.current = loadPositions(scope)
    undoRef.current = []
    redoRef.current = []
    setRecords(null)
    setLinks([])
    setNodes([])
    setDrawerId(null)
    setPicker(null)
    setComposer(null)
    setFresh(new Map())
    load()
  }, [hydrated, scope]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pick up memories that arrive from elsewhere (extension, integrations)
  // when the person comes back to the tab.
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') load({ quiet: true }) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  useEffect(() => () => { refreshTimers.current.forEach((t) => window.clearTimeout(t)) }, [])
  const scheduleRefresh = useCallback(() => {
    for (const ms of [4000, 10000, 20000, 40000]) {
      refreshTimers.current.push(window.setTimeout(() => load({ quiet: true }), ms))
    }
  }, [load])

  // ── Build the React Flow nodes ────────────────────────────────────
  const degree = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of links) {
      m.set(l.from, (m.get(l.from) ?? 0) + 1)
      m.set(l.to, (m.get(l.to) ?? 0) + 1)
    }
    return m
  }, [links])

  const typeCounts = useMemo(() => {
    const m = new Map<RecordType, number>()
    for (const r of records ?? []) m.set(r.type, (m.get(r.type) ?? 0) + 1)
    return m
  }, [records])

  useEffect(() => {
    if (!records) return
    if (!baseRef.current) baseRef.current = autoLayout(records, linksRef.current)
    const base = baseRef.current
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      let maxX = 0
      for (const f of base.frames) maxX = Math.max(maxX, f.x + f.w)
      const newX = base.frames.length ? maxX + NEW_FRAME_GAP : 0

      const mk = (r: GraphNode, p: XY): Node<MemoryData> => ({
        id: r.id,
        type: 'memory',
        position: p,
        width: NODE_W,
        height: NODE_H,
        zIndex: 1,
        selected: prevById.get(r.id)?.selected ?? false,
        hidden: hiddenTypes.has(r.type),
        data: {
          title: r.title,
          type: r.type,
          updatedAt: r.updatedAt,
          degree: degree.get(r.id) ?? 0,
          fresh: fresh.has(r.id),
        },
      })

      const cards: Node[] = []
      for (const r of records) {
        let p = prevById.get(r.id)?.position ?? savedRef.current.get(r.id) ?? base.positions.get(r.id)
        if (!p) {
          const i = extraRef.current++
          p = { x: newX + 40 + (i % 2) * (NODE_W + 28), y: 56 + Math.floor(i / 2) * (NODE_H + 28) }
        }
        cards.push(mk(r, p))
      }

      const frames: Node<FrameData>[] = base.frames.map((f) => ({
        id: `frame:${f.type}`,
        type: 'frame',
        position: { x: f.x, y: f.y },
        width: f.w,
        height: f.h,
        zIndex: -1,
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        hidden: hiddenTypes.has(f.type),
        data: {
          kind: f.type, label: TYPE_META[f.type].plural, ink: TYPE_META[f.type].ink,
          count: typeCounts.get(f.type) ?? 0, w: f.w, h: f.h,
        },
      }))
      // A frame whose cards have all been dragged elsewhere is just an empty
      // box - drop it rather than label nothing.
      const holds = (f: { position: XY; width?: number; height?: number }) => cards.some((c) => {
        const cx = c.position.x + NODE_W / 2
        const cy = c.position.y + NODE_H / 2
        return cx >= f.position.x && cx <= f.position.x + (f.width ?? 0) && cy >= f.position.y && cy <= f.position.y + (f.height ?? 0)
      })
      for (const f of frames) if (!f.hidden && !holds(f)) f.hidden = true
      if (extraRef.current > 0) {
        const rows = Math.ceil(extraRef.current / 2)
        const w = 80 + 2 * NODE_W + 28
        const h = 56 + 40 + rows * NODE_H + (rows - 1) * 28
        frames.push({
          id: 'frame:new', type: 'frame', position: { x: newX, y: 0 }, width: w, height: h, zIndex: -1,
          draggable: false, selectable: false, connectable: false, focusable: false,
          data: { kind: 'new', label: 'Just added', ink: '#4262ff', count: extraRef.current, w, h },
        })
      }
      return [...frames, ...cards]
    })
  }, [records, degree, typeCounts, hiddenTypes, fresh, layoutGen, setNodes])

  // Fit the whole board once, on first paint of each scope. The timer is
  // not cancelled by later node updates (React Flow measures cards right
  // after mount), only by leaving the page.
  const fitTimer = useRef<number | null>(null)
  useEffect(() => () => { if (fitTimer.current) window.clearTimeout(fitTimer.current) }, [])
  useEffect(() => {
    if (didFitRef.current || !records || nodes.length === 0) return
    didFitRef.current = true
    fitTimer.current = window.setTimeout(() => {
      // On a phone the whole board is postage-stamp sized, so open on the
      // first frame at a readable zoom instead.
      const firstFrame = rf.getNodes().find((n) => n.type === 'frame' && !n.hidden)
      if (window.innerWidth < 720 && firstFrame) rf.fitView({ nodes: [{ id: firstFrame.id }], padding: 0.08, maxZoom: 1 })
      else rf.fitView({ padding: 0.12, maxZoom: 1 })
    }, 60)
  }, [records, nodes.length, rf])

  // ── Edges ─────────────────────────────────────────────────────────
  const hiddenIds = useMemo(() => {
    const s = new Set<string>()
    if (hiddenTypes.size === 0) return s
    for (const r of records ?? []) if (hiddenTypes.has(r.type)) s.add(r.id)
    return s
  }, [records, hiddenTypes])

  const edges = useMemo<Edge<LinkData>[]>(() => {
    const out: Edge<LinkData>[] = links.map((l) => {
      const color = relationMeta(l.kind).color
      return {
        id: l.id,
        source: l.from,
        target: l.to,
        type: 'rel',
        hidden: hiddenIds.has(l.from) || hiddenIds.has(l.to),
        data: { kind: l.kind, manual: l.manual },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      }
    })
    if (picker?.mode === 'new') {
      out.push({
        id: '__pending', source: picker.from, target: picker.to, type: 'rel',
        data: { kind: 'related_to', pending: true },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4262ff', width: 16, height: 16 },
      })
    }
    return out
  }, [links, picker, hiddenIds])

  // ── Link operations ───────────────────────────────────────────────
  const findLinkId = (from: string, to: string) =>
    linksRef.current.find((l) => l.from === from && l.to === to && !l.id.startsWith('tmp-'))?.id

  const apiCreateLink = useCallback(async (from: string, to: string, kind: string): Promise<string | null> => {
    const temp = `tmp-${Math.random().toString(36).slice(2)}`
    setLinks((prev) => [...prev, { id: temp, from, to, kind, weight: 0.7, manual: true }])
    try {
      const res = await fetch('/api/enterprise/graph/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromRecordId: from, toRecordId: to, kind }),
      })
      if (!res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== temp))
        toast.error(res.status === 403
          ? 'You can link memories you created or manage. An admin can link these two.'
          : 'Could not save that link.')
        return null
      }
      const j = await res.json() as { id: string }
      setLinks((prev) => prev.some((l) => l.id === temp)
        ? prev.map((l) => (l.id === temp ? { ...l, id: j.id } : l))
        : prev.some((l) => l.id === j.id) ? prev : [...prev, { id: j.id, from, to, kind, weight: 0.7, manual: true }])
      return j.id
    } catch {
      setLinks((prev) => prev.filter((l) => l.id !== temp))
      toast.error('Could not save that link. Check your connection.')
      return null
    }
  }, [])

  const apiDeleteLink = useCallback(async (id: string): Promise<boolean> => {
    const was = linksRef.current.find((l) => l.id === id)
    setLinks((prev) => prev.filter((l) => l.id !== id))
    const res = await fetch(`/api/enterprise/graph/links?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) {
      if (was) setLinks((prev) => [...prev, was])
      toast.error(res?.status === 403 ? 'You can remove links on memories you manage.' : 'Could not remove that link.')
      return false
    }
    return true
  }, [])

  const apiSetKind = useCallback(async (id: string, kind: string): Promise<boolean> => {
    const was = linksRef.current.find((l) => l.id === id)
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, kind, manual: true } : l)))
    const res = await fetch('/api/enterprise/graph/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, kind }),
    }).catch(() => null)
    if (!res?.ok) {
      if (was) setLinks((prev) => prev.map((l) => (l.id === id ? was : l)))
      toast.error(res?.status === 403 ? 'You can change links on memories you manage.' : 'Could not change that link.')
      return false
    }
    return true
  }, [])

  const openNewLink = useCallback((from: string, to: string, x: number, y: number) => {
    if (from === to) return
    const existing = linksRef.current.find((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from))
    setDrawerId(null)
    if (existing && !existing.id.startsWith('tmp-')) {
      setPicker({ mode: 'edit', edgeId: existing.id, x, y })
      return
    }
    setPicker({ mode: 'new', from, to, x, y })
  }, [])

  const titleOf = useCallback((id: string) => recordsRef.current?.find((r) => r.id === id)?.title ?? null, [])

  const pickRelation = useCallback(async (kind: string) => {
    const p = picker
    if (!p) return
    setPicker(null)
    if (p.mode === 'new') {
      const { from, to } = p
      const id = await apiCreateLink(from, to, kind)
      if (!id) return
      push({
        label: `link (${relationMeta(kind).label})`,
        undo: async () => { const cur = findLinkId(from, to); if (cur) await apiDeleteLink(cur) },
        redo: async () => { await apiCreateLink(from, to, kind) },
      })
      return
    }
    const link = linksRef.current.find((l) => l.id === p.edgeId)
    if (!link || link.kind === kind) return
    const { from, to } = link
    const prevKind = link.kind
    if (!(await apiSetKind(link.id, kind))) return
    push({
      label: `relation (${relationMeta(kind).label})`,
      undo: async () => { const cur = findLinkId(from, to); if (cur) await apiSetKind(cur, prevKind) },
      redo: async () => { const cur = findLinkId(from, to); if (cur) await apiSetKind(cur, kind) },
    })
  }, [picker, apiCreateLink, apiDeleteLink, apiSetKind, push])

  const removePickedLink = useCallback(async () => {
    if (picker?.mode !== 'edit') return
    const link = linksRef.current.find((l) => l.id === picker.edgeId)
    setPicker(null)
    if (!link) return
    const { from, to, kind } = link
    if (!(await apiDeleteLink(link.id))) return
    push({
      label: 'remove link',
      undo: async () => { await apiCreateLink(from, to, kind) },
      redo: async () => { const cur = findLinkId(from, to); if (cur) await apiDeleteLink(cur) },
    })
  }, [picker, apiCreateLink, apiDeleteLink, push])

  const reversePickedLink = useCallback(async () => {
    if (picker?.mode !== 'edit') return
    const link = linksRef.current.find((l) => l.id === picker.edgeId)
    setPicker(null)
    if (!link) return
    const { from, to, kind } = link
    if (!(await apiDeleteLink(link.id))) return
    if (!(await apiCreateLink(to, from, kind))) { await apiCreateLink(from, to, kind); return }
    const flip = async (a: string, b: string) => {
      const cur = findLinkId(a, b)
      if (cur && (await apiDeleteLink(cur))) await apiCreateLink(b, a, kind)
    }
    push({ label: 'reverse link', undo: () => flip(to, from), redo: () => flip(from, to) })
  }, [picker, apiCreateLink, apiDeleteLink, push])

  // ── Memories ──────────────────────────────────────────────────────
  const placeComposer = useCallback((clientX: number, clientY: number) => {
    const p = rf.screenToFlowPosition({ x: clientX, y: clientY })
    setComposer({ x: p.x - NODE_W / 2 - 24, y: p.y - 28 })
    setTool('select')
    setDrawerId(null)
    setPicker(null)
    if (rf.getZoom() < 0.8) rf.setCenter(p.x, p.y + 60, { zoom: 1, duration: 350 })
  }, [rf, setTool])

  const addLocalRecord = useCallback((rec: GraphNode, pos: XY) => {
    savedRef.current.set(rec.id, pos)
    savePositions(scopeRef.current, savedRef.current)
    setFresh((prev) => new Map(prev).set(rec.id, rec.title))
    setRecords((prev) => (prev && !prev.some((r) => r.id === rec.id) ? [rec, ...prev] : prev ?? [rec]))
  }, [])

  const removeLocalRecord = useCallback((id: string) => {
    setRecords((prev) => prev?.filter((r) => r.id !== id) ?? prev)
    setLinks((prev) => prev.filter((l) => l.from !== id && l.to !== id))
    setNodes((prev) => prev.filter((n) => n.id !== id))
    if (drawerIdRef.current === id) setDrawerId(null)
  }, [setNodes])

  const postMemory = useCallback(async (content: string): Promise<{ rec: GraphNode; dedup: boolean } | null> => {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // orgId only when working in an org, so a Personal board never
      // writes into an org workspace and an org board never into Personal.
      body: JSON.stringify({ content, ...(activeOrgId ? { orgId: activeOrgId } : {}) }),
    }).catch(() => null)
    const j = await res?.json().catch(() => ({})) as { record?: Parameters<typeof toGraphNode>[0]; deduplicated?: boolean; error?: string } | undefined
    if (!res?.ok || !j?.record) {
      toast.error(j?.error ? `Could not save: ${j.error}` : 'Could not save the memory.')
      return null
    }
    return { rec: toGraphNode(j.record), dedup: !!j.deduplicated }
  }, [activeOrgId])

  const goTo = useCallback((id: string, open = true) => {
    const n = rf.getNode(id)
    if (!n) { toast('That memory is not on this board.'); return }
    const zoom = Math.max(rf.getZoom(), 0.9)
    const shift = open && window.innerWidth > 720 ? DRAWER_W / 2 / zoom : 0
    rf.setCenter(n.position.x + NODE_W / 2 + shift, n.position.y + NODE_H / 2, { zoom, duration: 450 })
    if (open) setDrawerId(id)
  }, [rf])

  const createMemory = useCallback(async (text: string) => {
    const at = composerRef.current
    if (!at) return
    setComposerBusy(true)
    try {
      const out = await postMemory(text)
      if (!out) return
      setComposer(null)
      if (out.dedup) {
        toast('That exact text is already saved.')
        if (rf.getNode(out.rec.id)) goTo(out.rec.id)
        return
      }
      const pos = { x: at.x + 24, y: at.y + 8 }
      let id = out.rec.id
      addLocalRecord(out.rec, pos)
      toast.success('Saved. The AI is filing it now.', { duration: 2200 })
      scheduleRefresh()
      push({
        label: 'add memory',
        undo: async () => {
          const res = await fetch('/api/records', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          })
          if (!res.ok) throw new Error('delete failed')
          removeLocalRecord(id)
        },
        redo: async () => {
          const again = await postMemory(text)
          if (!again) throw new Error('create failed')
          id = again.rec.id
          addLocalRecord(again.rec, pos)
          scheduleRefresh()
        },
      })
    } finally {
      setComposerBusy(false)
    }
  }, [postMemory, addLocalRecord, removeLocalRecord, scheduleRefresh, push, goTo, rf])

  // ── Tidy up ───────────────────────────────────────────────────────
  const arrange = useCallback((positions: Map<string, XY>) => {
    setArranging(true)
    setNodes((ns) => ns.map((n) => { const p = positions.get(n.id); return p ? { ...n, position: p } : n }))
    window.setTimeout(() => setArranging(false), 560)
  }, [setNodes])

  const tidy = useCallback(() => {
    if (!records?.length) return
    const before = {
      base: baseRef.current,
      saved: new Map(savedRef.current),
      extra: extraRef.current,
      pos: new Map(nodes.filter((n) => n.type === 'memory').map((n) => [n.id, n.position])),
    }
    const apply = () => {
      const base = autoLayout(recordsRef.current ?? [], linksRef.current)
      baseRef.current = base
      extraRef.current = 0
      savedRef.current = new Map()
      clearPositions(scopeRef.current)
      arrange(base.positions)
      setLayoutGen((g) => g + 1)
      window.setTimeout(() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 500 }), 80)
    }
    apply()
    push({
      label: 'tidy up',
      undo: () => {
        baseRef.current = before.base
        extraRef.current = before.extra
        savedRef.current = new Map(before.saved)
        savePositions(scopeRef.current, savedRef.current)
        arrange(before.pos)
        setLayoutGen((g) => g + 1)
      },
      redo: apply,
    })
  }, [records, nodes, arrange, push, rf])

  // ── Canvas handlers ───────────────────────────────────────────────
  const dragStart = useRef<Map<string, XY>>(new Map())
  const onNodeDragStart: OnNodeDrag = useCallback((_e, _n, dragged) => {
    dragStart.current = new Map(dragged.filter((n) => n.type === 'memory').map((n) => [n.id, { ...n.position }]))
  }, [])
  const onNodeDragStop: OnNodeDrag = useCallback((_e, _n, dragged) => {
    const moves = dragged
      .filter((n) => n.type === 'memory')
      .map((n) => ({ id: n.id, from: dragStart.current.get(n.id), to: { ...n.position } }))
      .filter((m): m is { id: string; from: XY; to: XY } => !!m.from && (m.from.x !== m.to.x || m.from.y !== m.to.y))
    if (!moves.length) return
    for (const m of moves) savedRef.current.set(m.id, m.to)
    savePositions(scopeRef.current, savedRef.current)
    const put = (which: 'from' | 'to') => {
      const map = new Map(moves.map((m) => [m.id, m[which]]))
      map.forEach((p, id) => savedRef.current.set(id, p))
      savePositions(scopeRef.current, savedRef.current)
      arrange(map)
    }
    push({ label: moves.length > 1 ? `move ${moves.length} cards` : 'move card', undo: () => put('from'), redo: () => put('to') })
  }, [arrange, push])

  const onNodeClick: NodeMouseHandler = useCallback((e, node) => {
    if (node.type !== 'memory') return
    if (toolRef.current === 'connect') {
      const src = connectSourceRef.current
      if (!src) { setConnectSource(node.id); return }
      if (src === node.id) { setConnectSource(null); return }
      openNewLink(src, node.id, e.clientX, e.clientY)
      setConnectSource(null)
      setTool('select')
      return
    }
    setPicker(null)
    setDrawerId(node.id)
    // Slide the board left if the drawer would land on top of the card.
    const vp = rf.getViewport()
    const right = (node.position.x + NODE_W) * vp.zoom + vp.x
    const limit = window.innerWidth - DRAWER_W - 32
    if (window.innerWidth > 720 && right > limit) {
      rf.setViewport({ x: vp.x - (right - limit), y: vp.y, zoom: vp.zoom }, { duration: 300 })
    }
  }, [openNewLink, setConnectSource, setTool, rf])

  const onPaneClick = useCallback((e: React.MouseEvent) => {
    if (toolRef.current === 'memory') { placeComposer(e.clientX, e.clientY); return }
    if (toolRef.current === 'connect') setConnectSource(null)
  }, [placeComposer, setConnectSource])

  const onConnectEnd: OnConnectEnd = useCallback((event, state) => {
    setConnecting(false)
    const from = state.fromNode?.id
    if (!from) return
    const pt = 'changedTouches' in event ? event.changedTouches[0] : event
    // Dropping anywhere on a card counts, not just on its small handle.
    let to: string | undefined = state.isValid ? state.toNode?.id : undefined
    if (!to) {
      const el = document.elementFromPoint(pt.clientX, pt.clientY) as HTMLElement | null
      to = el?.closest('.react-flow__node-memory')?.getAttribute('data-id') ?? undefined
    }
    if (!to || to === from) return
    openNewLink(from, to, pt.clientX, pt.clientY)
  }, [openNewLink])

  const onMove = useCallback((_: unknown, vp: Viewport) => {
    const el = wrapRef.current
    if (!el) return
    el.style.setProperty('--rb-label-scale', String(Math.min(6, Math.max(1, 1 / vp.zoom))))
    el.style.setProperty('--rb-frame-scale', String(Math.min(10, Math.max(1, 1 / vp.zoom))))
  }, [])
  // Relation labels keep a steady on-screen size (the CSS scale above), so
  // they stay readable when zoomed out. Only a very dense board drops the
  // unhighlighted ones once zoomed far out; hovering or opening a card
  // always shows its own.
  const linkCountRef = useRef(0)
  linkCountRef.current = links.length
  const zoomRef = useRef(1)
  const onMoveEnd = useCallback((_: unknown, vp: Viewport) => {
    zoomRef.current = vp.zoom
    setZoomPct(Math.round(vp.zoom * 100))
    setShowLabels(vp.zoom >= 0.3 || linkCountRef.current <= 80)
  }, [])
  useEffect(() => { setShowLabels(zoomRef.current >= 0.3 || links.length <= 80) }, [links.length])

  const onEdgeLabel = useCallback((edgeId: string, x: number, y: number) => {
    setDrawerId(null)
    setPicker({ mode: 'edit', edgeId, x, y })
  }, [])

  // ── Search ────────────────────────────────────────────────────────
  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () => (q ? (records ?? []).filter((r) => !hiddenTypes.has(r.type) && r.title.toLowerCase().includes(q)) : []),
    [q, records, hiddenTypes],
  )
  useEffect(() => { setMatchIdx(0) }, [q])
  const jump = (dir: 1 | -1) => {
    if (!matches.length) return
    const i = ((matchIdx % matches.length) + matches.length) % matches.length
    goTo(matches[i].id)
    setMatchIdx(i + dir)
  }

  // ── Keyboard ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isTyping(e.target)
      const meta = e.metaKey || e.ctrlKey
      if (meta && !typing && e.key.toLowerCase() === 'z') { e.preventDefault(); step(e.shiftKey ? 'redo' : 'undo'); return }
      if (meta && !typing && e.key.toLowerCase() === 'y') { e.preventDefault(); step('redo'); return }
      if (typing || meta || e.altKey) return
      switch (e.key) {
        case 'v': case 'V': setTool('select'); setConnectSource(null); break
        case 'n': case 'N': setTool('memory'); setConnectSource(null); break
        case 'c': case 'C': setTool('connect'); setConnectSource(drawerIdRef.current); setDrawerId(null); break
        case 'f': case 'F': rf.fitView({ padding: 0.12, maxZoom: 1, duration: 400 }); break
        case '=': case '+': rf.zoomIn({ duration: 180 }); break
        case '-': case '_': rf.zoomOut({ duration: 180 }); break
        case '/': e.preventDefault(); searchRef.current?.focus(); break
        case 'Escape':
          if (toolRef.current !== 'select' || connectSourceRef.current) { setTool('select'); setConnectSource(null) }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rf, step, setTool, setConnectSource])

  // ── Shared UI state for cards and connectors ──────────────────────
  const focus = useMemo(() => {
    if (!drawerId) return null
    const s = new Set([drawerId])
    for (const l of links) {
      if (l.from === drawerId) s.add(l.to)
      if (l.to === drawerId) s.add(l.from)
    }
    return s
  }, [drawerId, links])

  const ui = useMemo<BoardUi>(() => ({
    focus,
    focusId: drawerId,
    hoverId,
    query: q,
    showLabels,
    connectSource,
    drawerId,
    selectedEdgeId: picker?.mode === 'edit' ? picker.edgeId : null,
    onEdgeLabel,
  }), [focus, drawerId, hoverId, q, showLabels, connectSource, picker, onEdgeLabel])

  // ── Derived chrome ────────────────────────────────────────────────
  const drawerNode = drawerId ? records?.find((r) => r.id === drawerId) ?? null : null
  const pickerLink = picker?.mode === 'edit' ? links.find((l) => l.id === picker.edgeId) : null
  const pickerFrom = picker?.mode === 'new' ? picker.from : pickerLink?.from
  const pickerTo = picker?.mode === 'new' ? picker.to : pickerLink?.to
  const presentTypes = TYPE_ORDER.filter((t) => (typeCounts.get(t) ?? 0) > 0)
  const totalCards = records?.length ?? 0

  const hint = composer
    ? 'Type the memory, then ⌘↵ or click away to save. Esc cancels.'
    : tool === 'memory'
      ? 'Click anywhere on the board to place a memory. Esc to cancel.'
      : tool === 'connect'
        ? (connectSource ? 'Now click the memory to link it to.' : 'Click the first memory, then the second.')
        : connecting
          ? 'Drop on another memory to link them.'
          : null

  return (
    <BoardCtx.Provider value={ui}>
      <div
        ref={wrapRef}
        className={cn('rb-root', `tool-${tool}`, connecting && 'is-connecting', arranging && 'is-arranging')}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest('.react-flow__pane')) placeComposer(e.clientX, e.clientY)
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={(_, n) => { if (n.type === 'memory') setHoverId(n.id) }}
          onNodeMouseLeave={() => setHoverId(null)}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          onConnectStart={() => { setConnecting(true); setDrawerId(null) }}
          onConnectEnd={onConnectEnd}
          isValidConnection={(c) => c.source !== c.target}
          onMove={onMove}
          onMoveEnd={onMoveEnd}
          connectionMode={ConnectionMode.Loose}
          connectionLineStyle={{ stroke: '#4262ff', strokeWidth: 2, strokeDasharray: '6 5' }}
          colorMode={dark ? 'dark' : 'light'}
          panOnScroll
          zoomOnPinch
          zoomOnDoubleClick={false}
          selectionKeyCode="Shift"
          multiSelectionKeyCode={['Meta', 'Control']}
          deleteKeyCode={null}
          nodeClickDistance={4}
          minZoom={0.05}
          maxZoom={2.5}
          onlyRenderVisibleElements
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.6} className="rb-bg" />
          {showMap && (
            <MiniMap
              className="rb-minimap"
              pannable
              zoomable
              nodeColor={(n) => (n.type === 'frame' ? 'rgba(120,125,140,0.10)' : TYPE_META[(n.data as MemoryData).type]?.ink ?? '#888')}
              nodeStrokeWidth={0}
              maskColor={dark ? 'rgba(21, 23, 28, 0.72)' : 'rgba(246, 246, 243, 0.72)'}
              bgColor={dark ? '#1f2229' : '#ffffff'}
              nodeBorderRadius={4}
            />
          )}
          {composer && (
            <Composer
              at={composer}
              busy={composerBusy}
              onSave={createMemory}
              onCancel={() => setComposer(null)}
            />
          )}
        </ReactFlow>

        {/* Brand block */}
        <div className="rb-brand rb-panel">
          <Link href="/app" className="rb-back" title="Back to Reattend" aria-label="Back to Reattend">
            <ArrowLeft size={15} />
          </Link>
          <img src={dark ? '/white_logo.png' : '/black_logo.png'} alt="" className="logo" />
          <div className="names">
            <span className="app">Reattend</span>
            <span className="board">Memory board · {scopeName}</span>
          </div>
        </div>

        {/* Tool rail */}
        <div className="rb-rail rb-panel" role="toolbar" aria-label="Board tools">
          <RailButton tip="Select" keys="V" active={tool === 'select'} onClick={() => { setTool('select'); setConnectSource(null) }}>
            <MousePointer2 size={18} />
          </RailButton>
          <RailButton tip="Add memory" keys="N or double-click" active={tool === 'memory'} onClick={() => { setTool(tool === 'memory' ? 'select' : 'memory'); setConnectSource(null) }}>
            <StickyNote size={18} />
          </RailButton>
          <RailButton tip="Connect two memories" keys="C" active={tool === 'connect'} onClick={() => { setTool(tool === 'connect' ? 'select' : 'connect'); setConnectSource(null) }}>
            <Spline size={18} />
          </RailButton>
          <span className="sep" />
          <RailButton tip="Undo" keys="⌘Z" disabled={undoRef.current.length === 0} onClick={() => step('undo')}>
            <Undo2 size={18} />
          </RailButton>
          <RailButton tip="Redo" keys="⌘⇧Z" disabled={redoRef.current.length === 0} onClick={() => step('redo')}>
            <Redo2 size={18} />
          </RailButton>
          <span className="sep" />
          <RailButton tip="Tidy up" keys="Arrange by type" disabled={!totalCards} onClick={tidy}>
            <LayoutGrid size={18} />
          </RailButton>
        </div>

        {/* Top right */}
        <div className="rb-top-right">
          <div className="rb-search rb-panel">
            <Search size={14} className="ic" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); jump(e.shiftKey ? -1 : 1) }
                if (e.key === 'Escape') { setQuery(''); (e.target as HTMLInputElement).blur() }
              }}
              placeholder="Search memories  /"
              aria-label="Search memories on the board"
            />
            {q && (
              <>
                <span className="count">{matches.length ? `${(((matchIdx - 1) % matches.length) + matches.length) % matches.length + 1}/${matches.length}` : '0'}</span>
                <button type="button" onClick={() => jump(-1)} aria-label="Previous match" disabled={!matches.length}><ChevronUp size={14} /></button>
                <button type="button" onClick={() => jump(1)} aria-label="Next match" disabled={!matches.length}><ChevronDown size={14} /></button>
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={13} /></button>
              </>
            )}
          </div>
          <div className="rb-stats rb-panel">
            <b>{totalCards.toLocaleString()}</b> memories · <b>{links.filter((l) => !l.id.startsWith('tmp-')).length.toLocaleString()}</b> links
          </div>
          <Link href="/app/landscape?mode=rewind" className="rb-rewind rb-panel" title="Rewind: watch your memory grow over time">
            <RotateCcw size={14} /> <span>Rewind</span>
          </Link>
        </div>

        {/* Type legend */}
        {presentTypes.length > 0 && (
          <div className="rb-legend rb-panel">
            {presentTypes.map((t) => {
              const off = hiddenTypes.has(t)
              return (
                <button
                  key={t}
                  type="button"
                  className={cn('lg', off && 'is-off')}
                  style={{ ['--ink' as string]: TYPE_META[t].ink }}
                  onClick={() => setHiddenTypes((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n })}
                  title={off ? `Show ${TYPE_META[t].plural.toLowerCase()}` : `Hide ${TYPE_META[t].plural.toLowerCase()}`}
                >
                  <span className="sw" />{TYPE_META[t].plural}<span className="n">{typeCounts.get(t)}</span>
                </button>
              )
            })}
            {hiddenTypes.size > 0 && (
              <button type="button" className="lg all" onClick={() => setHiddenTypes(new Set())}>Show all</button>
            )}
          </div>
        )}

        {/* Zoom */}
        <div className="rb-zoom rb-panel" role="group" aria-label="Zoom">
          <button type="button" className={cn(showMap && 'is-on')} onClick={() => setShowMap((v) => !v)} title="Mini map" aria-label="Toggle mini map">
            <MapIcon size={15} />
          </button>
          <span className="sep" />
          <button type="button" onClick={() => rf.zoomOut({ duration: 180 })} title="Zoom out (-)" aria-label="Zoom out"><Minus size={15} /></button>
          <button type="button" className="pct" onClick={() => rf.zoomTo(1, { duration: 250 })} title="Zoom to 100%">{zoomPct}%</button>
          <button type="button" onClick={() => rf.zoomIn({ duration: 180 })} title="Zoom in (+)" aria-label="Zoom in"><Plus size={15} /></button>
          <button type="button" onClick={() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 400 })} title="Fit everything (F)" aria-label="Fit to screen"><Maximize size={15} /></button>
        </div>

        {/* Hint strip */}
        {hint ? (
          <div className="rb-hint">{hint}</div>
        ) : tipOpen && totalCards > 0 ? (
          <div className="rb-hint is-tip">
            <span>Double-click anywhere to add a memory · drag a card&apos;s edge dot onto another to link them · click a card to read it</span>
            <button type="button" onClick={dismissTip}>Got it</button>
          </div>
        ) : null}

        {/* States */}
        {records === null && !err && (
          <div className="rb-center"><div className="rb-panel rb-state"><Loader2 size={16} className="animate-spin" /> Laying out your board…</div></div>
        )}
        {err && (
          <div className="rb-center">
            <div className="rb-panel rb-state is-error">
              <AlertCircle size={16} /> Could not load the board ({err}).
              <button type="button" onClick={() => { setErr(null); load() }}>Try again</button>
            </div>
          </div>
        )}
        {records !== null && records.length === 0 && !composer && (
          <div className="rb-center">
            <div className="rb-panel rb-empty">
              <StickyNote size={26} />
              <h2>Your board is empty</h2>
              <p>Double-click anywhere, or press <kbd>N</kbd>, to add your first memory. Memories you capture anywhere in Reattend land here too.</p>
              <button type="button" onClick={() => { const r = wrapRef.current?.getBoundingClientRect(); placeComposer((r?.width ?? 800) / 2, (r?.height ?? 600) / 2) }}>
                <Plus size={14} /> Add a memory
              </button>
            </div>
          </div>
        )}

        <MemoryDrawer
          node={drawerNode}
          links={links}
          titleOf={titleOf}
          onClose={() => setDrawerId(null)}
          onGoTo={(id) => goTo(id)}
          onEditLink={onEdgeLabel}
          onConnectFrom={(id) => { setDrawerId(null); setTool('connect'); setConnectSource(id) }}
        />

        {picker && pickerFrom && pickerTo && (
          <RelationPicker
            key={picker.mode === 'new' ? `${picker.from}>${picker.to}` : picker.edgeId}
            x={picker.x}
            y={picker.y}
            fromTitle={titleOf(pickerFrom) || 'Memory'}
            toTitle={titleOf(pickerTo) || 'Memory'}
            current={pickerLink?.kind}
            onPick={pickRelation}
            onClose={() => setPicker(null)}
            onDelete={picker.mode === 'edit' ? removePickedLink : undefined}
            onReverse={picker.mode === 'edit' ? reversePickedLink : undefined}
          />
        )}
      </div>
    </BoardCtx.Provider>
  )
}

function RailButton({
  tip, keys, active, disabled, onClick, children,
}: {
  tip: string
  keys?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn('rb-tool', active && 'is-active')}
      onClick={onClick}
      disabled={disabled}
      aria-label={tip}
      aria-pressed={active}
    >
      {children}
      <span className="tip">{tip}{keys && <em>{keys}</em>}</span>
    </button>
  )
}
