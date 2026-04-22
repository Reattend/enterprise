'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  type Node, type Edge, type NodeProps, Handle, Position,
  useNodesState, useEdgesState, addEdge, type Connection, type OnConnect,
  MarkerType, type NodeMouseHandler, type EdgeMouseHandler, Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Network, Gavel, Lightbulb, Mic, FileText, Clock, Loader2, AlertCircle, Filter,
  Maximize2, Minimize2, Trash2, Search, X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

const TYPE_META: Record<RecordType, { label: string; color: string; bg: string; icon: typeof FileText }> = {
  decision: { label: 'Decision', color: '#8b5cf6', bg: 'bg-violet-500/15 text-violet-500', icon: Gavel },
  insight: { label: 'Insight', color: '#f59e0b', bg: 'bg-amber-500/15 text-amber-500', icon: Lightbulb },
  meeting: { label: 'Meeting', color: '#10b981', bg: 'bg-emerald-500/15 text-emerald-500', icon: Mic },
  idea: { label: 'Idea', color: '#06b6d4', bg: 'bg-cyan-500/15 text-cyan-500', icon: Lightbulb },
  context: { label: 'Context', color: '#0ea5e9', bg: 'bg-sky-500/15 text-sky-500', icon: FileText },
  tasklike: { label: 'Task', color: '#f97316', bg: 'bg-orange-500/15 text-orange-500', icon: Clock },
  note: { label: 'Note', color: '#64748b', bg: 'bg-slate-500/15 text-slate-500', icon: FileText },
  transcript: { label: 'Transcript', color: '#10b981', bg: 'bg-emerald-500/15 text-emerald-500', icon: Mic },
}

const EDGE_KINDS = ['related_to', 'same_topic', 'contradicts', 'leads_to', 'continuation_of', 'causes', 'blocks', 'supports'] as const

function MemoryNode({ data, selected }: NodeProps<Node<{ title: string; type: RecordType; dimmed?: boolean }>>) {
  const meta = TYPE_META[data.type] || TYPE_META.note
  const Icon = meta.icon
  return (
    <div
      className={cn(
        'rounded border bg-card shadow-sm flex items-start gap-2 p-2.5 w-[180px] transition-opacity',
        selected ? 'border-primary ring-1 ring-primary/40' : 'border-border',
        data.dimmed && 'opacity-25',
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 8, height: 8, background: 'hsl(var(--primary))', border: '2px solid hsl(var(--background))' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 8, height: 8, background: 'hsl(var(--primary))', border: '2px solid hsl(var(--background))' }}
      />
      <div className={cn('h-6 w-6 rounded flex items-center justify-center shrink-0', meta.bg)}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium leading-tight line-clamp-2">{data.title}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{meta.label}</div>
      </div>
    </div>
  )
}

const nodeTypes = { memory: MemoryNode }

// Type-grouped circular layout
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
  if (kind === 'contradicts') return { stroke: '#e11d48', strokeWidth: 1.5, animated: true }
  if (kind === 'continuation_of' || kind === 'leads_to') return { stroke: '#6366f1', strokeWidth: 1.5, animated: false }
  if (kind === 'blocks') return { stroke: '#f97316', strokeWidth: 1.5, animated: false }
  return { stroke: 'hsl(var(--border))', strokeWidth: 1, animated: false }
}

export function CausalView() {
  const [nodes, setNodes] = useState<GraphNode[] | null>(null)
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<RecordType | ''>('')
  const [query, setQuery] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

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
        labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
        labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.9 },
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

  // Create a new edge on drag-release
  const onConnect: OnConnect = useCallback(async (conn: Connection) => {
    if (!conn.source || !conn.target) return
    // Optimistic render
    const tempId = `temp-${Date.now()}`
    setStateEdges((eds) => addEdge({
      id: tempId,
      source: conn.source!,
      target: conn.target!,
      label: 'related to',
      labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
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
      await reload() // resync with server truth
    } catch {
      setStateEdges((eds) => eds.filter((e) => e.id !== tempId))
    }
  }, [setStateEdges]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: delete selected edge
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
        document.getElementById('graph-search-input')?.focus()
      }
      if (ev.key === 'f' && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault()
        setFullscreen((f) => !f)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedEdgeId, fullscreen, setStateEdges])

  const onEdgeClick: EdgeMouseHandler = useCallback((_, edge) => {
    setSelectedEdgeId(edge.id)
    setSelectedNodeId(null)
  }, [])

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)
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

  const containerClasses = fullscreen
    ? 'fixed inset-0 z-50 bg-background flex flex-col'
    : 'h-[calc(100vh-8rem)] flex flex-col gap-3'

  return (
    <div ref={canvasRef} className={containerClasses}>
      {/* Header (hidden in fullscreen) */}
      {!fullscreen && (
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <Network className="h-3.5 w-3.5" />
            Memory graph
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-3xl tracking-tight">The shape of your memory</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Every record clustered by type, linked by relationships the AI inferred — drag between handles to create new links.
                <span className="inline-flex items-center gap-1 ml-2">
                  <kbd className="text-[10px] font-mono bg-muted rounded px-1">⌘F</kbd> fullscreen ·
                  <kbd className="text-[10px] font-mono bg-muted rounded px-1 ml-1">/</kbd> search ·
                  <kbd className="text-[10px] font-mono bg-muted rounded px-1 ml-1">Del</kbd> remove link
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2 flex-shrink-0">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      <Card className="flex-1 overflow-hidden p-0 relative rounded-none sm:rounded">
        {nodes === null ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Building graph…
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <Network className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <div className="font-medium mb-1">No memories yet</div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Capture some memories and the graph will render the relationships as the AI finds them.
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
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.08}
              maxZoom={2.5}
              proOptions={{ hideAttribution: true }}
              connectionLineStyle={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            >
              <Background gap={24} size={1} color="hsl(var(--border))" />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={(n) => {
                  const t = (n.data as { type: RecordType }).type
                  return TYPE_META[t]?.color ?? '#64748b'
                }}
                maskColor="hsl(var(--background) / 0.6)"
                style={{ background: 'hsl(var(--card))' }}
              />

              {/* Top-left: search + filters */}
              <Panel position="top-left" className="m-2 flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="graph-search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search nodes"
                    className="h-8 pl-7 pr-7 w-[240px] text-[13px] bg-background/90 backdrop-blur"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-background/90 backdrop-blur border border-border rounded-md h-8 px-1.5">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <button
                    onClick={() => setTypeFilter('')}
                    className={cn(
                      'text-[11px] px-1.5 py-0.5 rounded transition-colors',
                      typeFilter === '' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    All ({nodes?.length ?? 0})
                  </button>
                  {(['decision', 'meeting', 'insight', 'note'] as RecordType[]).map((t) => {
                    const count = typeCounts.get(t) ?? 0
                    if (count === 0 && typeFilter !== t) return null
                    return (
                      <button
                        key={t}
                        onClick={() => setTypeFilter((f) => (f === t ? '' : t))}
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded transition-colors',
                          typeFilter === t ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {TYPE_META[t].label} ({count})
                      </button>
                    )
                  })}
                </div>
              </Panel>

              {/* Top-right: fullscreen toggle */}
              <Panel position="top-right" className="m-2">
                <button
                  onClick={() => setFullscreen((f) => !f)}
                  className="h-8 w-8 flex items-center justify-center rounded bg-background/90 backdrop-blur border border-border text-muted-foreground hover:text-foreground transition-colors"
                  title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (⌘F)'}
                >
                  {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              </Panel>

              {/* Selected edge delete panel */}
              {selectedEdgeId && (
                <Panel position="bottom-center" className="mb-6">
                  <div className="flex items-center gap-2 bg-background/95 backdrop-blur border border-border rounded-md px-3 py-2 shadow-lg">
                    <span className="text-xs text-muted-foreground">Link selected</span>
                    <button
                      onClick={async () => {
                        setStateEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId))
                        await fetch(`/api/enterprise/graph/links?id=${selectedEdgeId}`, { method: 'DELETE' })
                        setSelectedEdgeId(null)
                        await reload()
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 text-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </Panel>
              )}

              {/* Selected node detail panel */}
              {selectedNode && (
                <Panel position="bottom-right" className="m-4 max-w-sm">
                  <Card className="p-3 shadow-lg bg-background/95 backdrop-blur">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-sm font-medium pr-2">{selectedNode.title}</div>
                      <button
                        onClick={() => setSelectedNodeId(null)}
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="uppercase tracking-wider">{TYPE_META[selectedNode.type]?.label}</span>
                        <span>·</span>
                        <span>{connectedEdgeCount} connection{connectedEdgeCount === 1 ? '' : 's'}</span>
                      </div>
                      <div>Updated {new Date(selectedNode.updatedAt).toLocaleDateString()}</div>
                    </div>
                    {selectedNode.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedNode.tags.slice(0, 6).map((t) => (
                          <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>
                        ))}
                      </div>
                    )}
                  </Card>
                </Panel>
              )}
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </Card>

      {fullscreen && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] bg-background/95 backdrop-blur border border-border rounded-full px-3 py-1 text-[11px] text-muted-foreground shadow-lg flex items-center gap-2">
          <Network className="h-3 w-3" />
          Memory graph
          <span className="opacity-60">· Esc to exit</span>
        </div>
      )}
    </div>
  )
}
