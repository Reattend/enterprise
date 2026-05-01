'use client'

// Board — memory map. ReactFlow canvas of records and inferred links.
//
// New design (Landscape.html): violet crumb, serif heading, board-card with
// legend strip + zoom controls + filter chips. The actual graph is still
// React Flow — node component restyled with the design's pill-shape (pip
// dot + title + monospace sub-text). All wiring preserved verbatim:
//
//   - GET /api/enterprise/graph (with optional ?type=)
//   - POST /api/enterprise/graph/links on connect-drag
//   - DELETE /api/enterprise/graph/links?id=… on Del / Backspace
//   - ⌘F fullscreen, / focus search, Esc exits fullscreen
//   - Type filter chips, free-text search dimming, type-grouped circular layout
//   - Selected-edge "Delete" pop, selected-node detail card with Open Memory link

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ReactFlow, ReactFlowProvider, Background, MiniMap,
  type Node, type Edge, type NodeProps, Handle, Position,
  useNodesState, useEdgesState, addEdge, type Connection, type OnConnect,
  MarkerType, type NodeMouseHandler, type EdgeMouseHandler, Panel,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Loader2, AlertCircle, Maximize2, Minimize2, Trash2, Search, X,
  GitBranch, ChevronRight, Plus, Minus, Maximize,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type RecordType = 'decision' | 'insight' | 'meeting' | 'idea' | 'context' | 'tasklike' | 'note' | 'transcript'

interface GraphNode {
  id: string
  title: string
  type: RecordType
  workspaceId: string
  createdAt: string
  updatedAt: string
  tags: string[]
}
interface GraphEdge {
  id: string
  from: string
  to: string
  kind: string
  weight: number | null
}

const TYPE_META: Record<RecordType, { label: string; color: string }> = {
  decision:   { label: 'Decisions',   color: 'oklch(0.5 0.18 290)' },
  meeting:    { label: 'Meetings',    color: 'oklch(0.52 0.18 275)' },
  insight:    { label: 'Insights',    color: 'oklch(0.65 0.10 200)' },
  idea:       { label: 'Ideas',       color: 'oklch(0.78 0.13 75)' },
  context:    { label: 'Context',     color: 'oklch(0.72 0.008 270)' },
  tasklike:   { label: 'Tasks',       color: 'oklch(0.62 0.16 25)' },
  note:       { label: 'Notes',       color: 'oklch(0.72 0.008 270)' },
  transcript: { label: 'Transcripts', color: 'oklch(0.5 0.16 350)' },
}

// Memory node — design's pill-shape with pip dot, title, optional sub label
function MemoryNode({ data, selected }: NodeProps<Node<{ title: string; type: RecordType; sub?: string; dimmed?: boolean }>>) {
  return (
    <div className={cn('lsc-rf-node', selected && 'selected', data.dimmed && 'dimmed')}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 7, height: 7, background: 'oklch(0.52 0.18 275)', border: '2px solid white' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 7, height: 7, background: 'oklch(0.52 0.18 275)', border: '2px solid white' }}
      />
      <span className={cn('pip', data.type)} />
      <span className="ttl">{data.title}</span>
      {data.sub && <span className="sub">{data.sub}</span>}
    </div>
  )
}

const nodeTypes = { memory: MemoryNode }

// Type-grouped circular layout — same algorithm as before, just inline.
function layout(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const byType = new Map<RecordType, GraphNode[]>()
  for (const n of nodes) {
    const list = byType.get(n.type) ?? []
    list.push(n)
    byType.set(n.type, list)
  }
  const types = Array.from(byType.keys())
  const ringRadius = 360
  const typeAngleStep = (2 * Math.PI) / Math.max(1, types.length)
  types.forEach((t, i) => {
    const baseAngle = i * typeAngleStep - Math.PI / 2
    const cluster = byType.get(t)!
    const clusterCenter = { x: Math.cos(baseAngle) * ringRadius, y: Math.sin(baseAngle) * ringRadius }
    const clusterRadius = Math.min(200, Math.max(40, cluster.length * 14))
    cluster.forEach((n, j) => {
      const a = (j / cluster.length) * Math.PI * 2
      positions.set(n.id, {
        x: clusterCenter.x + Math.cos(a) * clusterRadius,
        y: clusterCenter.y + Math.sin(a) * clusterRadius,
      })
    })
  })
  return positions
}

function edgeStyle(kind: string) {
  if (kind === 'contradicts') return { stroke: 'oklch(0.62 0.16 25)', strokeWidth: 1.5, animated: true }
  if (kind === 'continuation_of' || kind === 'leads_to') return { stroke: 'oklch(0.52 0.18 275)', strokeWidth: 1.5, animated: false }
  if (kind === 'blocks') return { stroke: 'oklch(0.62 0.18 30)', strokeWidth: 1.5, animated: false }
  return { stroke: 'oklch(0.72 0.008 270)', strokeWidth: 1, animated: false }
}

export function BoardView() {
  const [nodes, setNodes] = useState<GraphNode[] | null>(null)
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<RecordType | ''>('')
  const [query, setQuery] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  async function reload() {
    setErr(null)
    const q = new URLSearchParams()
    if (typeFilter) q.set('type', typeFilter)
    const res = await fetch(`/api/enterprise/graph?${q}`)
    if (!res.ok) {
      setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    const data = await res.json()
    setNodes(data.nodes)
    setEdges(data.edges)
  }

  useEffect(() => { reload() }, [typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!nodes) return { rfNodes: [] as Node[], rfEdges: [] as Edge[] }
    const pos = layout(nodes)
    const q = query.trim().toLowerCase()
    const rfNodes: Node[] = nodes.map((n) => {
      const dimmed = q.length > 0 && !n.title.toLowerCase().includes(q)
      return {
        id: n.id,
        type: 'memory',
        position: pos.get(n.id) ?? { x: 0, y: 0 },
        data: { title: n.title, type: n.type, dimmed },
      }
    })
    const rfEdges: Edge[] = edges.map((e) => {
      const st = edgeStyle(e.kind)
      return {
        id: e.id,
        source: e.from,
        target: e.to,
        label: e.kind === 'contradicts' ? '⚠ contradicts' : e.kind.replace('_', ' '),
        labelStyle: { fontSize: 10, fill: 'oklch(0.52 0.01 270)' },
        labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
        style: { stroke: st.stroke, strokeWidth: st.strokeWidth },
        animated: st.animated,
        markerEnd: { type: MarkerType.ArrowClosed, color: st.stroke },
      }
    })
    return { rfNodes, rfEdges }
  }, [nodes, edges, query])

  const [stateNodes, setStateNodes, onNodesChange] = useNodesState(rfNodes)
  const [stateEdges, setStateEdges, onEdgesChange] = useEdgesState(rfEdges)

  useEffect(() => { setStateNodes(rfNodes) }, [rfNodes, setStateNodes])
  useEffect(() => { setStateEdges(rfEdges) }, [rfEdges, setStateEdges])

  // Create a new edge on drag-release — optimistic add, then resync on success.
  const onConnect: OnConnect = useCallback(async (conn: Connection) => {
    if (!conn.source || !conn.target) return
    const tempId = `temp-${Date.now()}`
    setStateEdges((eds) => addEdge({
      id: tempId,
      source: conn.source!,
      target: conn.target!,
      label: 'related to',
      labelStyle: { fontSize: 10, fill: 'oklch(0.52 0.01 270)' },
      style: { stroke: 'oklch(0.52 0.18 275)', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'oklch(0.52 0.18 275)' },
    }, eds))
    try {
      const res = await fetch('/api/enterprise/graph/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromRecordId: conn.source,
          toRecordId: conn.target,
          kind: 'related_to',
        }),
      })
      if (!res.ok) throw new Error('create failed')
      await reload()
    } catch {
      setStateEdges((eds) => eds.filter((e) => e.id !== tempId))
    }
  }, [setStateEdges]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts — preserved from the old implementation.
  useEffect(() => {
    const handler = async (ev: KeyboardEvent) => {
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        if (selectedEdgeId && !(ev.target as HTMLElement).closest('input, textarea')) {
          ev.preventDefault()
          setStateEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId))
          await fetch(`/api/enterprise/graph/links?id=${selectedEdgeId}`, { method: 'DELETE' })
          setSelectedEdgeId(null)
          await reload()
        }
      }
      if (ev.key === 'Escape' && fullscreen) setFullscreen(false)
      if (ev.key === '/' && !(ev.target as HTMLElement).closest('input, textarea')) {
        ev.preventDefault()
        document.getElementById('lsc-board-search-input')?.focus()
      }
      if (ev.key === 'f' && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault()
        setFullscreen((f) => !f)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedEdgeId, fullscreen, setStateEdges]) // eslint-disable-line react-hooks/exhaustive-deps

  const onEdgeClick: EdgeMouseHandler = useCallback((_, edge) => {
    setSelectedEdgeId(edge.id); setSelectedNodeId(null)
  }, [])
  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNodeId(node.id); setSelectedEdgeId(null)
  }, [])

  const selectedNode = nodes?.find((n) => n.id === selectedNodeId)
  const connectedEdgeCount = selectedNode
    ? edges.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id).length
    : 0

  const typeCounts = useMemo(() => {
    const m = new Map<RecordType, number>()
    for (const n of nodes ?? []) m.set(n.type, (m.get(n.type) ?? 0) + 1)
    return m
  }, [nodes])

  const totalNodes = nodes?.length ?? 0
  const totalEdges = edges.length

  // Zoom % state lives at this level so the bar can display it. The actual
  // zoom calls happen inside ReactFlowProvider via ZoomBridge below.
  const [zoomPct, setZoomPct] = useState(100)

  return (
    <>
      {!fullscreen && (
        <>
          <span className="lsc-crumb accent">
            <GitBranch size={9} strokeWidth={2} /> Board
          </span>
          <div className="lsc-head">
            <h1>The shape of your <em>memory</em>.</h1>
            <p className="sub">
              Every record clustered by type, linked by inferred relationships. Drag between handles to create new links.
              Use <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: 5, background: 'var(--bg)' }}>⌘F</span> fullscreen ·{' '}
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: 5, background: 'var(--bg)' }}>/</span> search ·{' '}
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: 5, background: 'var(--bg)' }}>Del</span> remove link.
            </p>
          </div>
        </>
      )}

      {err && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--mem-rose)', border: '1px solid color-mix(in oklch, var(--mem-rose), white 60%)', background: 'var(--mem-rose-soft)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <AlertCircle size={14} />
          {err}
        </div>
      )}

      <div className={cn('lsc-board-card', fullscreen && 'fullscreen')} style={fullscreen ? {
        position: 'fixed', inset: 0, zIndex: 50, borderRadius: 0, border: 0,
      } : undefined}>
        <div className="lsc-board-bar">
          <div className="lsc-legend">
            {(['meeting', 'decision', 'tasklike', 'insight', 'idea', 'note'] as RecordType[]).map((t) => {
              const count = typeCounts.get(t) ?? 0
              if (count === 0 && nodes && nodes.length > 0) return null
              return (
                <span key={t} className="lg">
                  <span className="sw" style={{ background: TYPE_META[t].color }} />
                  {TYPE_META[t].label} · {count}
                </span>
              )
            })}
          </div>
          <div className="right">
            <BoardSearchAndZoom
              query={query}
              onQuery={setQuery}
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen((f) => !f)}
              zoomPct={zoomPct}
            />
          </div>
        </div>

        {/* Filter chips strip */}
        <div className="lsc-filter-row">
          <div className="lsc-filter-chips">
            <button
              type="button"
              className={cn('lsc-fchip', typeFilter === '' && 'active')}
              onClick={() => setTypeFilter('')}
            >
              All types
            </button>
            {(['decision', 'meeting', 'insight', 'idea', 'tasklike', 'note'] as RecordType[]).map((t) => {
              const count = typeCounts.get(t) ?? 0
              if (count === 0 && typeFilter !== t) return null
              return (
                <button
                  key={t}
                  type="button"
                  className={cn('lsc-fchip', typeFilter === t && 'active')}
                  onClick={() => setTypeFilter((f) => (f === t ? '' : t))}
                >
                  {TYPE_META[t].label} · {count}
                </button>
              )
            })}
          </div>
          <span className="lsc-board-meta">
            {totalNodes.toLocaleString()} nodes · {totalEdges.toLocaleString()} links
          </span>
        </div>

        {/* The canvas */}
        <div className={cn('lsc-board', fullscreen && 'fullscreen')}>
          {nodes === null ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
              <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }} />
              Building graph…
            </div>
          ) : nodes.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
              <div>
                <GitBranch size={32} style={{ color: 'var(--ink-3)', margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>No memories yet</div>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 280 }}>
                  Capture a few memories and the graph will render the relationships as soon as they&apos;re inferred.
                </p>
              </div>
            </div>
          ) : (
            <ReactFlowProvider>
              <ReactFlow
                nodes={stateNodes}
                edges={stateEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={() => { setSelectedEdgeId(null); setSelectedNodeId(null) }}
                onMoveEnd={(_, vp) => setZoomPct(Math.round(vp.zoom * 100))}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.08}
                maxZoom={2.5}
                proOptions={{ hideAttribution: true }}
                connectionLineStyle={{ stroke: 'oklch(0.52 0.18 275)', strokeWidth: 2 }}
              >
                <ZoomBridge onZoomChange={setZoomPct} />
                <Background gap={22} size={1} color="oklch(0.86 0.005 85)" />
                <MiniMap
                  nodeColor={(n) => {
                    const t = (n.data as { type: RecordType }).type
                    return TYPE_META[t]?.color ?? 'oklch(0.72 0.008 270)'
                  }}
                  maskColor="oklch(0.985 0.005 85 / 0.6)"
                />

                {/* Selected edge popover */}
                {selectedEdgeId && (
                  <Panel position="bottom-center" className="m-6">
                    <div className="lsc-edge-pop">
                      <span>Link selected</span>
                      <button
                        type="button"
                        onClick={async () => {
                          setStateEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId))
                          await fetch(`/api/enterprise/graph/links?id=${selectedEdgeId}`, { method: 'DELETE' })
                          setSelectedEdgeId(null)
                          await reload()
                        }}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </Panel>
                )}

                {/* Selected node detail card */}
                {selectedNode && (
                  <Panel position="bottom-right" className="m-4">
                    <div className="lsc-nodecard">
                      <div className="ttl-row">
                        <div className="ttl">{selectedNode.title}</div>
                        <button
                          type="button"
                          className="x"
                          onClick={() => setSelectedNodeId(null)}
                          aria-label="Close"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="meta">
                        {TYPE_META[selectedNode.type]?.label} · {connectedEdgeCount} connection{connectedEdgeCount === 1 ? '' : 's'} · updated {new Date(selectedNode.updatedAt).toLocaleDateString()}
                      </div>
                      {selectedNode.tags.length > 0 && (
                        <div className="row">
                          {selectedNode.tags.slice(0, 6).map((t) => (
                            <span key={t} className="t">#{t}</span>
                          ))}
                        </div>
                      )}
                      <Link href={`/app/memories/${selectedNode.id}`} className="open">
                        Open memory <ChevronRight size={11} strokeWidth={2} />
                      </Link>
                    </div>
                  </Panel>
                )}
              </ReactFlow>
            </ReactFlowProvider>
          )}
        </div>
      </div>

      {!fullscreen && (
        <div className="lsc-foot-note">
          <AlertCircle size={14} strokeWidth={1.8} />
          <div>
            Drag any node to rearrange. Drag between two nodes to create a manual link — the AI will ask you to label the relationship (e.g. <i>supersedes</i>, <i>contradicts</i>, <i>follows from</i>). Inferred links are dotted; manual links are solid.
          </div>
        </div>
      )}
    </>
  )
}

// Search bar + zoom controls + fullscreen toggle — sit in the board-bar
// chrome (outside the ReactFlow canvas). The zoom buttons broadcast a
// window CustomEvent that ZoomBridge inside the canvas translates into
// real ReactFlow zoomIn / zoomOut / fitView calls.
function BoardSearchAndZoom({
  query, onQuery, fullscreen, onToggleFullscreen, zoomPct,
}: {
  query: string
  onQuery: (v: string) => void
  fullscreen: boolean
  onToggleFullscreen: () => void
  zoomPct: number
}) {
  return (
    <>
      <div className="lsc-board-search">
        <Search size={12} style={{ color: 'var(--ink-3)' }} />
        <input
          id="lsc-board-search-input"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search nodes ( / )"
        />
        {query && (
          <button type="button" onClick={() => onQuery('')} aria-label="Clear search">
            <X size={11} />
          </button>
        )}
      </div>
      <div className="lsc-zoom" role="group" aria-label="Zoom">
        <button
          type="button"
          title="Zoom out"
          onClick={() => window.dispatchEvent(new CustomEvent('lsc-board-zoom', { detail: { dir: 'out' } }))}
        >
          <Minus size={12} />
        </button>
        <span className="lvl">{zoomPct}%</span>
        <button
          type="button"
          title="Zoom in"
          onClick={() => window.dispatchEvent(new CustomEvent('lsc-board-zoom', { detail: { dir: 'in' } }))}
        >
          <Plus size={12} />
        </button>
        <button
          type="button"
          title="Fit to screen"
          onClick={() => window.dispatchEvent(new CustomEvent('lsc-board-zoom', { detail: { fit: true } }))}
        >
          <Maximize size={12} />
        </button>
      </div>
      <button
        type="button"
        className="lsc-ibtn"
        onClick={onToggleFullscreen}
        title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (⌘F)'}
        aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </>
  )
}

// ZoomBridge — listens for the window 'lsc-board-zoom' events emitted by
// the chrome zoom buttons and dispatches them to the actual ReactFlow
// instance. Mounted *inside* the ReactFlowProvider so useReactFlow() works.
function ZoomBridge({ onZoomChange }: { onZoomChange: (pct: number) => void }) {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow()
  useEffect(() => {
    const sync = () => {
      // setTimeout so we read the zoom *after* RF applies the change.
      setTimeout(() => onZoomChange(Math.round(getZoom() * 100)), 50)
    }
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<{ dir?: 'in' | 'out'; fit?: boolean }>
      if (detail?.fit) { fitView({ padding: 0.2 }); sync(); return }
      if (detail?.dir === 'in') { zoomIn(); sync(); return }
      if (detail?.dir === 'out') { zoomOut(); sync(); return }
    }
    window.addEventListener('lsc-board-zoom', handler)
    return () => window.removeEventListener('lsc-board-zoom', handler)
  }, [zoomIn, zoomOut, fitView, getZoom, onZoomChange])
  return null
}
