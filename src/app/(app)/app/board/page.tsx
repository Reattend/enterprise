'use client'

import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  Handle,
  Position,
  MarkerType,
  NodeResizer,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  MousePointer2,
  Hand,
  Pencil,
  StickyNote,
  Type,
  Square,
  Diamond,
  Circle,
  ImagePlus,
  MessageSquare,
  Filter,
  X,
  ExternalLink,
  Layers,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Brain,
  Sparkles,
  Lock,
  Trash2,
  Search,
  Plus,
  RotateCcw,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Scan,
  Palette,
  ChevronDown,
  Link2,
  Globe,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────
interface GraphNode {
  id: string
  title: string
  type: string
  summary: string | null
  confidence: number
  tags: string | null
  createdAt: string
}

interface GraphEdge {
  id: string
  from: string
  to: string
  kind: string
  weight: number
  explanation: string | null
}

type ToolMode = 'select' | 'pan' | 'draw' | 'comment'

// ─── Config ────────────────────────────────────────────
const typeConfig: Record<string, { color: string; emoji: string }> = {
  decision: { color: '#8b5cf6', emoji: '🎯' },
  meeting: { color: '#3b82f6', emoji: '👥' },
  idea: { color: '#f59e0b', emoji: '💡' },
  insight: { color: '#10b981', emoji: '🔍' },
  context: { color: '#64748b', emoji: '📋' },
  tasklike: { color: '#ef4444', emoji: '✅' },
  note: { color: '#6b7280', emoji: '📝' },
}

const edgeColors: Record<string, string> = {
  same_topic: '#8b5cf6',
  depends_on: '#3b82f6',
  contradicts: '#ef4444',
  continuation_of: '#10b981',
  same_people: '#f59e0b',
  causes: '#ec4899',
  temporal: '#6b7280',
}

const stickyColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fecaca', '#fed7aa']
const penColors = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
const allColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fecaca', '#fed7aa', '#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#ec4899']

const relationshipOptions = [
  { value: 'related_to', label: 'Related to', color: '#8b5cf6' },
  { value: 'depends_on', label: 'Depends on', color: '#3b82f6' },
  { value: 'leads_to', label: 'Leads to', color: '#10b981' },
  { value: 'contradicts', label: 'Contradicts', color: '#ef4444' },
  { value: 'supports', label: 'Supports', color: '#f59e0b' },
  { value: 'part_of', label: 'Part of', color: '#ec4899' },
  { value: 'blocks', label: 'Blocks', color: '#6b7280' },
]

function detectUrlType(url: string): 'image' | 'video' | 'link' {
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url)) return 'image'
  if (/youtube\.com\/watch|youtu\.be\/|vimeo\.com\//i.test(url)) return 'video'
  return 'link'
}

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return null
}

// ─── Smooth path helper ────────────────────────────────
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  const mx0 = (pts[0].x + pts[1].x) / 2
  const my0 = (pts[0].y + pts[1].y) / 2
  d += `L${mx0},${my0}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    d += `Q${pts[i].x},${pts[i].y},${mx},${my}`
  }
  const last = pts[pts.length - 1]
  d += `L${last.x},${last.y}`
  return d
}

// ─── Custom Nodes ──────────────────────────────────────
function MemoryNodeComponent({ data, selected }: { data: any; selected: boolean }) {
  const config = typeConfig[data.type] || typeConfig.note
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={90} minHeight={45} lineClassName="!border-primary/50" handleClassName="!h-2 !w-2 !bg-primary !border-background !rounded-sm" />
      <div
        className={cn(
          'relative px-2 py-1.5 rounded-lg border-2 shadow-md w-full h-full overflow-hidden transition-all cursor-pointer',
          selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
        style={{ backgroundColor: `${config.color}15`, borderColor: selected ? config.color : `${config.color}40` }}
      >
        <Handle type="target" position={Position.Top} className="!bg-primary/30 !border !border-primary/20 !w-2.5 !h-2.5 !rounded-full" />
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs">{config.emoji}</span>
          <span className="text-[9px] font-medium opacity-70">{data.type}</span>
          <Lock className="h-2 w-2 text-muted-foreground/50 ml-auto" />
        </div>
        <p className="text-[11px] font-medium leading-tight line-clamp-2">{data.label}</p>
        {data.tags?.length > 0 && (
          <div className="flex gap-0.5 mt-1 flex-wrap">
            {data.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-[7px] px-1 py-0 rounded-full bg-background/50 border" style={{ borderColor: `${config.color}30` }}>
                {tag}
              </span>
          ))}
        </div>
      )}
      {(data.commentCount as number) > 0 && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full min-w-[16px] h-[16px] flex items-center justify-center text-[8px] font-bold px-0.5">
          <MessageSquare className="h-2 w-2 mr-0.5" />{data.commentCount}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary/30 !border !border-primary/20 !w-2.5 !h-2.5 !rounded-full" />
    </div>
    </>
  )
}

function StickyNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={60} lineClassName="!border-primary/50" handleClassName="!h-2 !w-2 !bg-primary !border-background !rounded-sm" />
      <div className={cn('p-3 rounded-md shadow-md w-full h-full transition-all', selected && 'ring-2 ring-primary ring-offset-2')} style={{ backgroundColor: data.color || '#fef08a' }}>
        <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />
        <p className="text-xs font-medium text-gray-900 whitespace-pre-wrap">{data.content || 'Double click to edit'}</p>
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
      </div>
    </>
  )
}

function TextNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={28} lineClassName="!border-primary/50" handleClassName="!h-2 !w-2 !bg-primary !border-background !rounded-sm" />
      <div className={cn('px-2 py-1 w-full h-full flex items-center', selected && 'ring-1 ring-primary rounded')}>
        <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
        <p className="text-sm font-semibold">{data.content || 'Text'}</p>
        <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />
      </div>
    </>
  )
}

function RectangleNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={40} lineClassName="!border-primary/50" handleClassName="!h-2 !w-2 !bg-primary !border-background !rounded-sm" />
      <div className={cn('px-4 py-3 rounded border-2 bg-card shadow-md w-full h-full flex items-center justify-center', selected && 'ring-2 ring-primary ring-offset-2')} style={{ borderColor: data.borderColor || '#6366f1' }}>
        <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
        <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" id="left-t" />
        <p className="text-xs font-medium text-center">{data.content || 'Process'}</p>
        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
        <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" id="right-s" />
      </div>
    </>
  )
}

function DiamondNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={80} keepAspectRatio lineClassName="!border-primary/50" handleClassName="!h-2 !w-2 !bg-primary !border-background !rounded-sm" />
      <div className="relative w-full h-full">
        <div className={cn('absolute inset-3 border-2 bg-card shadow-md rotate-45 rounded-sm', selected && 'ring-2 ring-primary')} style={{ borderColor: data.borderColor || '#f59e0b' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[10px] font-medium text-center max-w-[60px] leading-tight">{data.content || 'Decision'}</p>
        </div>
        <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" style={{ left: '50%' }} />
        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" style={{ left: '50%' }} />
        <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" id="left-t" style={{ top: '50%' }} />
        <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" id="right-s" style={{ top: '50%' }} />
      </div>
    </>
  )
}

function CircleNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={60} minHeight={60} keepAspectRatio lineClassName="!border-primary/50 !rounded-full" handleClassName="!h-2 !w-2 !bg-primary !border-background !rounded-sm" />
      <div className={cn('w-full h-full rounded-full border-2 bg-card shadow-md flex items-center justify-center', selected && 'ring-2 ring-primary ring-offset-2')} style={{ borderColor: data.borderColor || '#10b981' }}>
        <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
        <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" id="left-t" />
        <p className="text-[10px] font-medium text-center max-w-[50px] leading-tight">{data.content || 'Start'}</p>
        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
        <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" id="right-s" />
      </div>
    </>
  )
}

function ImageNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={60} lineClassName="!border-primary/50" handleClassName="!h-2 !w-2 !bg-primary !border-background !rounded-sm" />
      <div className={cn('rounded-lg border-2 bg-card shadow-md overflow-hidden w-full h-full', selected && 'ring-2 ring-primary ring-offset-2')}>
        <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.src} alt={data.alt || 'Image'} className="w-full h-full object-contain" />
        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
      </div>
    </>
  )
}

function LinkNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={40} lineClassName="!border-primary/50" handleClassName="!h-2 !w-2 !bg-primary !border-background !rounded-sm" />
      <div className={cn('px-3 py-2 rounded-lg border-2 bg-card shadow-md w-full h-full flex items-center gap-2', selected && 'ring-2 ring-primary ring-offset-2')} style={{ borderColor: '#3b82f6' }}>
        <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
        <Globe className="h-4 w-4 text-blue-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-500 hover:underline truncate block">{data.title || data.url}</a>
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
      </div>
    </>
  )
}

function EmbedNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={200} minHeight={120} lineClassName="!border-primary/50" handleClassName="!h-2 !w-2 !bg-primary !border-background !rounded-sm" />
      <div className={cn('rounded-lg border-2 bg-card shadow-md overflow-hidden w-full h-full relative', selected && 'ring-2 ring-primary ring-offset-2')}>
        <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
        <iframe src={data.embedUrl} className={cn('w-full h-full border-0', !selected && 'pointer-events-none')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Embed" />
        {!selected && <div className="absolute inset-0 cursor-grab" />}
        {data.originalUrl && (
          <a href={data.originalUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-1 right-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[9px] hover:bg-black/80 flex items-center gap-1">
            <ExternalLink className="h-2.5 w-2.5" /> Open
          </a>
        )}
        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
      </div>
    </>
  )
}

function DrawingNode({ data }: { data: any }) {
  const points = data.points as { x: number; y: number }[]
  const ox = data.ox as number
  const oy = data.oy as number
  const adjusted = points.map(p => ({ x: p.x - ox, y: p.y - oy }))
  const d = smoothPath(adjusted)
  return (
    <svg width={data.w} height={data.h} className="overflow-visible pointer-events-none">
      <path d={d} stroke={data.color} strokeWidth={data.sw || 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const nodeTypes = {
  memoryNode: MemoryNodeComponent,
  sticky: StickyNode,
  text: TextNode,
  rectangle: RectangleNode,
  diamond: DiamondNode,
  circle: CircleNode,
  image: ImageNode,
  link: LinkNode,
  embed: EmbedNode,
  drawing: DrawingNode,
}

// ─── Layout helpers ─────────────────────────────────────
function layoutNodes(graphNodes: GraphNode[]): Node[] {
  const count = graphNodes.length
  if (count === 0) return []
  if (count <= 20) {
    const cx = 400, cy = 300, radius = Math.max(200, count * 30)
    return graphNodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      let tags: string[] = []
      try { tags = n.tags ? JSON.parse(n.tags) : [] } catch { /* */ }
      return {
        id: n.id,
        position: { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) },
        style: { width: 155, height: 72 },
        data: { label: n.title, type: n.type, confidence: n.confidence, tags, summary: n.summary, createdAt: n.createdAt, isMemory: true, commentCount: 0 },
        type: 'memoryNode',
      }
    })
  }
  const cols = Math.ceil(Math.sqrt(count))
  return graphNodes.map((n, i) => {
    let tags: string[] = []
    try { tags = n.tags ? JSON.parse(n.tags) : [] } catch { /* */ }
    return {
      id: n.id,
      position: { x: (i % cols) * 220, y: Math.floor(i / cols) * 140 },
      style: { width: 155, height: 72 },
      data: { label: n.title, type: n.type, confidence: n.confidence, tags, summary: n.summary, createdAt: n.createdAt, isMemory: true, commentCount: 0 },
      type: 'memoryNode',
    }
  })
}

function buildEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((e) => {
    const color = edgeColors[e.kind] || '#6b7280'
    return {
      id: e.id, source: e.from, target: e.to,
      data: { kind: e.kind, explanation: e.explanation },
      style: { stroke: color, strokeWidth: 2, ...(e.kind === 'temporal' || e.kind === 'contradicts' ? { strokeDasharray: '5,5' } : {}) },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      animated: e.kind === 'same_topic',
    }
  })
}

// ─── Filter constants ───────────────────────────────────
const typeFilters = ['all', 'decision', 'meeting', 'idea', 'insight', 'context', 'tasklike', 'note']
const edgeFilters = ['all', 'same_topic', 'depends_on', 'contradicts', 'continuation_of', 'same_people', 'temporal', 'causes']

// ─── Main ───────────────────────────────────────────────
export default function BoardPage() {
  return (
    <ReactFlowProvider>
      <BoardCanvas />
    </ReactFlowProvider>
  )
}

function BoardCanvas() {
  const reactFlow = useReactFlow()

  // ── Core state ─────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allMemories, setAllMemories] = useState<GraphNode[]>([])

  // ── Tool state ─────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<ToolMode>('select')
  const [stickyColor, setStickyColor] = useState('#fef08a')
  const [penColor, setPenColor] = useState('#000000')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showShapesMenu, setShowShapesMenu] = useState(false)
  const [showColorMenu, setShowColorMenu] = useState(false)

  // ── Panel state ────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [edgeFilter, setEdgeFilter] = useState('all')
  const [showMemorySidebar, setShowMemorySidebar] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Edit dialog (double-click sticky/text/shapes) ─────
  const [editDialog, setEditDialog] = useState<{ nodeId: string; content: string } | null>(null)

  // ── Comment state ──────────────────────────────────────
  const [comments, setComments] = useState<Record<string, string[]>>({})
  const [commentDialog, setCommentDialog] = useState<{ nodeId: string; title: string } | null>(null)
  const [commentText, setCommentText] = useState('')

  // ── Delete confirmation ────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; nodeId: string; label: string }>({ open: false, nodeId: '', label: '' })

  // ── Connection relationship dialog ────────────────────
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)

  // ── URL insert dialog ─────────────────────────────────
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  // ── Drawing refs ───────────────────────────────────────
  const isDrawingRef = useRef(false)
  const clientPointsRef = useRef<{ x: number; y: number }[]>([])
  const drawPathRef = useRef<SVGPathElement>(null)
  const drawOverlayRef = useRef<HTMLDivElement>(null)

  // ── Image upload ref ───────────────────────────────────
  const imageInputRef = useRef<HTMLInputElement>(null)

  // ── Tool mode ref for stable callbacks ─────────────────
  const activeToolRef = useRef(activeTool)
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])

  // ── Board ID ref (for save) ────────────────────────────
  const boardIdRef = useRef<string | null>(null)
  const initialLoadDone = useRef(false)

  // ── Fetch graph data + saved board state ──────────────
  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [graphRes, boardRes] = await Promise.all([
          fetch('/api/graph'),
          fetch('/api/board'),
        ])
        if (!graphRes.ok) throw new Error((await graphRes.json().catch(() => ({}))).error || `Failed (${graphRes.status})`)
        const graphData: { nodes: GraphNode[]; edges: GraphEdge[] } = await graphRes.json()
        const boardData = boardRes.ok ? await boardRes.json() : null
        if (cancelled) return

        setAllMemories(graphData.nodes)
        if (boardData?.id) boardIdRef.current = boardData.id

        const savedState = boardData?.state as {
          customNodes?: any[]
          customEdges?: any[]
          comments?: Record<string, string[]>
          memoryPositions?: Record<string, { x: number; y: number; width?: number; height?: number }>
        } | null

        // Build memory nodes — use saved positions if available
        const memoryNodes = graphData.nodes.map((n, i) => {
          let tags: string[] = []
          try { tags = n.tags ? JSON.parse(n.tags) : [] } catch { /* */ }
          const saved = savedState?.memoryPositions?.[n.id]
          const count = graphData.nodes.length
          // Default layout position (circle or grid)
          let pos: { x: number; y: number }
          if (count <= 20) {
            const cx = 400, cy = 300, radius = Math.max(200, count * 30)
            const angle = (2 * Math.PI * i) / count - Math.PI / 2
            pos = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
          } else {
            const cols = Math.ceil(Math.sqrt(count))
            pos = { x: (i % cols) * 220, y: Math.floor(i / cols) * 140 }
          }
          return {
            id: n.id,
            position: saved ? { x: saved.x, y: saved.y } : pos,
            style: { width: saved?.width ?? 155, height: saved?.height ?? 72 },
            data: { label: n.title, type: n.type, confidence: n.confidence, tags, summary: n.summary, createdAt: n.createdAt, isMemory: true, commentCount: (savedState?.comments?.[n.id] || []).length },
            type: 'memoryNode' as const,
          }
        })

        // Build edges: record links from graph + saved custom edges
        const graphEdges = buildEdges(graphData.edges)
        const customEdges = (savedState?.customEdges || []) as Edge[]
        // Avoid duplicate edge IDs
        const graphEdgeIds = new Set(graphEdges.map(e => e.id))
        const dedupedCustomEdges = customEdges.filter(e => !graphEdgeIds.has(e.id))

        const customNodes = (savedState?.customNodes || []) as Node[]
        const savedComments = savedState?.comments || {}

        setNodes([...memoryNodes, ...customNodes])
        setEdges([...graphEdges, ...dedupedCustomEdges])
        setComments(savedComments)
        initialLoadDone.current = true
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [setNodes, setEdges])

  // ── Auto-save board state (debounced) ──────────────────
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveBoardState = useCallback(() => {
    if (!initialLoadDone.current) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      const currentNodes = reactFlow.getNodes()
      const currentEdges = reactFlow.getEdges()

      // Separate memory nodes from custom nodes
      const customNodes = currentNodes.filter(n => n.type !== 'memoryNode')
      const memoryPositions: Record<string, { x: number; y: number; width?: number; height?: number }> = {}
      currentNodes.filter(n => n.type === 'memoryNode').forEach(n => {
        memoryPositions[n.id] = {
          x: n.position.x,
          y: n.position.y,
          width: n.style?.width as number | undefined ?? n.measured?.width,
          height: n.style?.height as number | undefined ?? n.measured?.height,
        }
      })

      // Custom edges are user-created connections (React Flow auto-generates their IDs)
      const customEdges = currentEdges.filter(e =>
        e.id.startsWith('reactflow__') || e.id.startsWith('xy-edge__')
      )

      const state = {
        customNodes: customNodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
          style: n.style,
          data: n.data,
          draggable: n.draggable,
        })),
        customEdges: customEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          data: e.data,
          style: e.style,
          markerEnd: e.markerEnd,
          animated: e.animated,
        })),
        comments,
        memoryPositions,
      }

      fetch('/api/board', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      }).catch(() => { /* silent fail for auto-save */ })
    }, 1500)
  }, [reactFlow, comments])

  // Trigger save when nodes, edges, or comments change
  useEffect(() => {
    saveBoardState()
  }, [nodes, edges, comments, saveBoardState])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // ── Fullscreen ─────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }, [])

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  // ── Connection (shows relationship dialog) ─────────────
  const onConnect = useCallback((c: Connection) => {
    setPendingConnection(c)
  }, [])

  const submitConnection = (relationship: string) => {
    if (!pendingConnection) return
    const opt = relationshipOptions.find(r => r.value === relationship) || relationshipOptions[0]
    setEdges((eds) => addEdge({
      ...pendingConnection,
      style: { stroke: opt.color, strokeWidth: 2 },
      data: { kind: relationship, explanation: opt.label },
      markerEnd: { type: MarkerType.ArrowClosed, color: opt.color },
      animated: relationship === 'related_to',
    }, eds))
    // Create recordLink in DB so the AI knows about this relationship
    syncArtifact('create-link', {
      sourceId: pendingConnection.source,
      targetId: pendingConnection.target,
      kind: relationship,
      explanation: opt.label,
    })
    setPendingConnection(null)
    toast.success(`Connected: ${opt.label}`)
  }

  // ── Node click ─────────────────────────────────────────
  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    if (activeToolRef.current === 'comment' && node.type === 'memoryNode') {
      setCommentDialog({ nodeId: node.id, title: node.data.label as string })
    } else {
      setSelectedNode(node)
    }
  }, [])

  // ── Double click to edit ───────────────────────────────
  const onNodeDoubleClick = useCallback((_e: React.MouseEvent, node: Node) => {
    if (['sticky', 'text', 'rectangle', 'diamond', 'circle', 'link'].includes(node.type || '')) {
      const content = node.type === 'link' ? ((node.data.title as string) || (node.data.url as string) || '') : ((node.data.content as string) || '')
      setEditDialog({ nodeId: node.id, content })
    }
  }, [])

  const saveEdit = () => {
    if (!editDialog) return
    const node = nodes.find(n => n.id === editDialog.nodeId)
    setNodes(nds => nds.map(n => {
      if (n.id !== editDialog.nodeId) return n
      if (n.type === 'link') return { ...n, data: { ...n.data, title: editDialog.content } }
      return { ...n, data: { ...n.data, content: editDialog.content } }
    }))
    // Sync to records DB (skip for memory nodes — they already exist)
    if (node && node.type !== 'memoryNode') {
      syncArtifact('update-node', { id: editDialog.nodeId, title: editDialog.content, content: editDialog.content })
    }
    setEditDialog(null)
  }

  // ── Comment submit ─────────────────────────────────────
  const submitComment = () => {
    if (!commentDialog || !commentText.trim()) return
    const nid = commentDialog.nodeId
    const updated = { ...comments, [nid]: [...(comments[nid] || []), commentText.trim()] }
    setComments(updated)
    setNodes(nds => nds.map(n => n.id === nid ? { ...n, data: { ...n.data, commentCount: updated[nid].length } } : n))
    setCommentText('')
    setCommentDialog(null)
    toast.success('Comment added')
  }

  // ── Sync board artifact to records DB (fire-and-forget) ─
  const syncArtifact = useCallback((action: string, payload: Record<string, any>) => {
    fetch('/api/board/artifacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    }).catch(() => { /* silent */ })
  }, [])

  // ── Add node actions ───────────────────────────────────
  const addStickyNote = () => {
    const id = crypto.randomUUID()
    const content = 'New note...'
    setNodes(nds => [...nds, { id, type: 'sticky', position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 300 }, style: { width: 180, height: 100 }, data: { content, color: stickyColor } }])
    syncArtifact('create-node', { id, title: content, content, nodeType: 'sticky' })
  }
  const addTextNode = () => {
    const id = crypto.randomUUID()
    const content = 'Heading'
    setNodes(nds => [...nds, { id, type: 'text', position: { x: 200 + Math.random() * 400, y: 100 + Math.random() * 200 }, style: { width: 150, height: 36 }, data: { content } }])
    syncArtifact('create-node', { id, title: content, content, nodeType: 'text' })
  }
  const addRectangle = () => {
    const id = crypto.randomUUID()
    const content = 'Process'
    setNodes(nds => [...nds, { id, type: 'rectangle', position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 200 }, style: { width: 150, height: 80 }, data: { content } }])
    syncArtifact('create-node', { id, title: content, content, nodeType: 'rectangle' })
  }
  const addDiamond = () => {
    const id = crypto.randomUUID()
    const content = 'Decision?'
    setNodes(nds => [...nds, { id, type: 'diamond', position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 200 }, style: { width: 110, height: 110 }, data: { content } }])
    syncArtifact('create-node', { id, title: content, content, nodeType: 'diamond' })
  }
  const addCircle = () => {
    const id = crypto.randomUUID()
    const content = 'Start'
    setNodes(nds => [...nds, { id, type: 'circle', position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 200 }, style: { width: 90, height: 90 }, data: { content } }])
    syncArtifact('create-node', { id, title: content, content, nodeType: 'circle' })
  }

  const addMemoryToBoard = (memory: GraphNode) => {
    if (nodes.some(n => n.id === memory.id)) { toast.info('Already on the board'); return }
    let tags: string[] = []
    try { tags = memory.tags ? JSON.parse(memory.tags) : [] } catch { /* */ }
    setNodes(nds => [...nds, {
      id: memory.id, type: 'memoryNode',
      position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 300 },
      style: { width: 155, height: 72 },
      data: { label: memory.title, type: memory.type, confidence: memory.confidence, tags, summary: memory.summary, createdAt: memory.createdAt, isMemory: true, commentCount: comments[memory.id]?.length || 0 },
    }])
    toast.success(`Added "${memory.title}" to board`)
  }

  // ── Image upload ───────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const id = crypto.randomUUID()
      setNodes(nds => [...nds, {
        id, type: 'image',
        position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
        style: { width: 300, height: 250 },
        data: { src: ev.target?.result as string, alt: file.name },
      }])
      syncArtifact('create-node', { id, title: `Image: ${file.name}`, content: file.name, nodeType: 'image' })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Apply color to selected nodes ─────────────────────
  const applyColorToSelected = (color: string) => {
    setNodes(nds => nds.map(n => {
      if (!n.selected || n.type === 'memoryNode') return n
      if (n.type === 'sticky') return { ...n, data: { ...n.data, color } }
      if (n.type === 'drawing') return { ...n, data: { ...n.data, color } }
      if (['rectangle', 'diamond', 'circle'].includes(n.type || '')) return { ...n, data: { ...n.data, borderColor: color } }
      return n
    }))
  }

  // ── Close dropdowns ───────────────────────────────────
  const closeDropdowns = useCallback(() => {
    setShowShapesMenu(false)
    setShowColorMenu(false)
  }, [])

  // ── URL insert handler ────────────────────────────────
  const insertFromUrl = () => {
    const url = urlInput.trim()
    if (!url) return
    const type = detectUrlType(url)
    if (type === 'image') {
      const id = crypto.randomUUID()
      setNodes(nds => [...nds, {
        id, type: 'image',
        position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
        style: { width: 300, height: 250 },
        data: { src: url, alt: 'Image' },
      }])
      syncArtifact('create-node', { id, title: `Image: ${url}`, content: url, nodeType: 'image' })
      toast.success('Image added to board')
    } else if (type === 'video') {
      const embedUrl = getEmbedUrl(url)
      if (embedUrl) {
        const id = crypto.randomUUID()
        setNodes(nds => [...nds, {
          id, type: 'embed',
          position: { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
          style: { width: 420, height: 240 },
          data: { embedUrl, originalUrl: url },
        }])
        syncArtifact('create-node', { id, title: `Video: ${url}`, content: url, nodeType: 'embed' })
        toast.success('Video embed added to board')
      } else {
        toast.error('Unsupported video URL')
      }
    } else {
      const id = crypto.randomUUID()
      const domain = url.replace(/^https?:\/\//, '').split('/')[0]
      setNodes(nds => [...nds, {
        id, type: 'link',
        position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 200 },
        style: { width: 220, height: 40 },
        data: { url, title: domain },
      }])
      syncArtifact('create-node', { id, title: domain, content: url, nodeType: 'link' })
      toast.success('Link added to board')
    }
    setUrlInput('')
    setShowUrlDialog(false)
  }

  // ── Drawing handlers ───────────────────────────────────
  const handleDrawStart = useCallback((e: React.PointerEvent) => {
    isDrawingRef.current = true
    clientPointsRef.current = [{ x: e.clientX, y: e.clientY }]
    if (drawPathRef.current) {
      const rect = drawOverlayRef.current!.getBoundingClientRect()
      drawPathRef.current.setAttribute('d', `M${e.clientX - rect.left},${e.clientY - rect.top}`)
    }
  }, [])

  const handleDrawMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current || !drawPathRef.current || !drawOverlayRef.current) return
    const newPt = { x: e.clientX, y: e.clientY }
    const last = clientPointsRef.current[clientPointsRef.current.length - 1]
    const dx = newPt.x - last.x, dy = newPt.y - last.y
    if (dx * dx + dy * dy < 9) return
    clientPointsRef.current.push(newPt)
    const rect = drawOverlayRef.current.getBoundingClientRect()
    const adjusted = clientPointsRef.current.map(p => ({ x: p.x - rect.left, y: p.y - rect.top }))
    drawPathRef.current.setAttribute('d', smoothPath(adjusted))
  }, [])

  const handleDrawEnd = useCallback(() => {
    isDrawingRef.current = false
    if (drawPathRef.current) drawPathRef.current.setAttribute('d', '')
    const pts = clientPointsRef.current
    if (pts.length < 3) return
    const flowPts = pts.map(p => reactFlow.screenToFlowPosition(p))
    const xs = flowPts.map(p => p.x), ys = flowPts.map(p => p.y)
    const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys)
    setNodes(nds => [...nds, {
      id: `draw-${Date.now()}`, type: 'drawing', draggable: true,
      position: { x: minX, y: minY },
      data: { points: flowPts, ox: minX, oy: minY, w: maxX - minX + 4, h: maxY - minY + 4, color: penColor, sw: 2 },
    }])
  }, [reactFlow, setNodes, penColor])

  // ── Auto layout ────────────────────────────────────────
  const handleAutoLayout = () => {
    const mem = nodes.filter(n => n.type === 'memoryNode')
    const other = nodes.filter(n => n.type !== 'memoryNode')
    if (mem.length === 0) return
    const cx = 400, cy = 300, r = Math.max(200, mem.length * 30)
    setNodes([...mem.map((n, i) => {
      const a = (2 * Math.PI * i) / mem.length - Math.PI / 2
      return { ...n, position: { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) } }
    }), ...other])
    toast.success('Layout re-applied!')
  }

  // ── Reset board ────────────────────────────────────────
  const handleReset = async () => {
    try {
      const res = await fetch('/api/graph')
      const data = await res.json()
      setAllMemories(data.nodes)
      setNodes(layoutNodes(data.nodes))
      setEdges(buildEdges(data.edges))
      setComments({})
      // Clear saved board state
      fetch('/api/board', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: { customNodes: [], customEdges: [], comments: {}, memoryPositions: {} } }),
      }).catch(() => {})
      toast.success('Board reset')
    } catch { toast.error('Failed to reset') }
  }

  // ── Share (copy link) ──────────────────────────────────
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Board link copied to clipboard')
  }

  // ── Download (export JSON) ─────────────────────────────
  const handleDownload = () => {
    const data = {
      nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, data: e.data })),
      comments,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'board-export.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Board exported')
  }

  // ── Zoom controls ──────────────────────────────────────
  const handleZoomIn = () => reactFlow.zoomIn({ duration: 200 })
  const handleZoomOut = () => reactFlow.zoomOut({ duration: 200 })
  const handleFitView = () => reactFlow.fitView({ duration: 300 })

  // ── Protect memory nodes from deletion ─────────────────
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const filtered = changes.filter(c => {
      if (c.type === 'remove') {
        const node = nodes.find(n => n.id === c.id)
        if (node?.type === 'memoryNode' || node?.data?.isMemory) { toast.error('Memory nodes cannot be deleted'); return false }
      }
      return true
    })
    onNodesChange(filtered)
  }, [nodes, onNodesChange])

  // ── Delete key handler ─────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const sel = nodes.filter(n => n.selected)
      if (sel.some(n => n.type === 'memoryNode' || n.data?.isMemory)) toast.error('Memory nodes cannot be deleted')
      const ideation = sel.filter(n => n.type !== 'memoryNode' && !n.data?.isMemory)
      if (ideation.length > 0) {
        e.preventDefault(); e.stopPropagation()
        const label = ideation.length === 1 ? ((ideation[0].data.content || ideation[0].data.label || 'this node') as string) : `${ideation.length} nodes`
        setDeleteConfirm({ open: true, nodeId: ideation.map(n => n.id).join(','), label })
      }
    }
  }, [nodes])

  const confirmDelete = () => {
    const ids = new Set(deleteConfirm.nodeId.split(','))
    setNodes(nds => nds.filter(n => !ids.has(n.id)))
    setEdges(eds => eds.filter(e => !ids.has(e.source) && !ids.has(e.target)))
    // Delete records from DB so they're removed from AI memory too
    ids.forEach(id => {
      syncArtifact('delete-node', { id })
    })
    setDeleteConfirm({ open: false, nodeId: '', label: '' })
    toast.success('Deleted')
  }

  // ── Filtering memos ────────────────────────────────────
  const filteredNodes = useMemo(() => {
    if (typeFilter === 'all') return nodes
    return nodes.filter(n => n.type !== 'memoryNode' || n.data.type === typeFilter)
  }, [nodes, typeFilter])

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map(n => n.id))
    let result = edges.filter(e => ids.has(e.source) && ids.has(e.target))
    if (edgeFilter !== 'all') result = result.filter(e => e.data?.kind === edgeFilter)
    return result
  }, [edges, filteredNodes, edgeFilter])

  const filteredMemories = useMemo(() => {
    if (!searchQuery) return allMemories
    const q = searchQuery.toLowerCase()
    return allMemories.filter(m => m.title.toLowerCase().includes(q))
  }, [allMemories, searchQuery])

  // ── Active color (for display on button) ───────────────
  const activeColor = activeTool === 'draw' ? penColor : stickyColor

  // ── Loading / error states ─────────────────────────────
  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] -m-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm">Loading board...</p>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] -m-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-destructive" /><p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div
      className={cn('flex', isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[calc(100vh-8rem)] -m-6')}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Hidden image input */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={closeDropdowns}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={[]}
          minZoom={0.1}
          maxZoom={3}
          snapToGrid
          snapGrid={[10, 10]}
          panOnDrag={activeTool === 'pan' ? true : activeTool === 'draw' ? false : [1, 2]}
          selectionOnDrag={activeTool === 'select' || activeTool === 'comment'}
          nodesDraggable={activeTool === 'select' || activeTool === 'comment'}
          nodesConnectable={activeTool === 'select'}
          elementsSelectable={activeTool === 'select' || activeTool === 'comment'}
          defaultEdgeOptions={{ style: { strokeWidth: 2 } }}
        >
          <Background gap={20} size={1} className="!bg-background" />
          <MiniMap
            className="!bg-card !border !shadow-md !rounded-lg"
            nodeColor={(n) => {
              if (n.type === 'memoryNode') return (typeConfig[n.data.type as string] || typeConfig.note).color
              if (n.type === 'sticky') return (n.data.color as string) || '#fef08a'
              if (n.type === 'drawing') return (n.data.color as string) || '#000'
              return '#94a3b8'
            }}
            nodeStrokeWidth={3}
            maskColor="rgba(0,0,0,0.1)"
          />

          {/* Drawing overlay inside ReactFlow (z-index below panels) */}
          {activeTool === 'draw' && (
            <div
              ref={drawOverlayRef}
              className="absolute inset-0 cursor-crosshair"
              style={{ zIndex: 4 }}
              onPointerDown={handleDrawStart}
              onPointerMove={handleDrawMove}
              onPointerUp={handleDrawEnd}
            >
              <svg className="w-full h-full pointer-events-none">
                <path ref={drawPathRef} fill="none" stroke={penColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {/* ─── Top-center: Main Toolbar ─── */}
          <Panel position="top-center">
            <Card className="shadow-lg">
              <CardContent className="p-1.5 flex gap-0.5 items-center flex-wrap">
                {/* Mode buttons */}
                {([
                  { mode: 'select' as ToolMode, icon: MousePointer2, tip: 'Select (V)' },
                  { mode: 'pan' as ToolMode, icon: Hand, tip: 'Pan (H)' },
                  { mode: 'draw' as ToolMode, icon: Pencil, tip: 'Draw (P)' },
                  { mode: 'comment' as ToolMode, icon: MessageSquare, tip: 'Comment (C)' },
                ] as const).map(({ mode, icon: Icon, tip }) => (
                  <Button
                    key={mode}
                    variant={activeTool === mode ? 'secondary' : 'ghost'}
                    size="icon-sm"
                    onClick={() => { setActiveTool(mode); closeDropdowns() }}
                    title={tip}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}

                <div className="w-px h-5 bg-border mx-1" />

                {/* Add node buttons */}
                <Button variant="ghost" size="icon-sm" onClick={() => { addStickyNote(); closeDropdowns() }} title="Sticky Note"><StickyNote className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => { addTextNode(); closeDropdowns() }} title="Text"><Type className="h-4 w-4" /></Button>

                {/* Shapes dropdown */}
                <div className="relative">
                  <Button variant={showShapesMenu ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => { setShowShapesMenu(!showShapesMenu); setShowColorMenu(false) }} title="Shapes">
                    <Square className="h-4 w-4" />
                    <ChevronDown className="h-2.5 w-2.5 ml-px opacity-60" />
                  </Button>
                  {showShapesMenu && (
                    <div className="absolute top-full mt-1 left-0 bg-popover border rounded-md shadow-lg p-1 z-50 min-w-[120px]">
                      <button onClick={() => { addRectangle(); setShowShapesMenu(false) }} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted w-full text-left"><Square className="h-3.5 w-3.5" /> Rectangle</button>
                      <button onClick={() => { addDiamond(); setShowShapesMenu(false) }} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted w-full text-left"><Diamond className="h-3.5 w-3.5" /> Diamond</button>
                      <button onClick={() => { addCircle(); setShowShapesMenu(false) }} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted w-full text-left"><Circle className="h-3.5 w-3.5" /> Circle</button>
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="icon-sm" onClick={() => { imageInputRef.current?.click(); closeDropdowns() }} title="Image"><ImagePlus className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => { setShowUrlDialog(true); closeDropdowns() }} title="Insert URL"><Link2 className="h-4 w-4" /></Button>

                <div className="w-px h-5 bg-border mx-1" />

                {/* Color dropdown */}
                <div className="relative">
                  <Button variant={showColorMenu ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => { setShowColorMenu(!showColorMenu); setShowShapesMenu(false) }} title="Colors" className="gap-1">
                    <Palette className="h-4 w-4" />
                    <div className="h-2.5 w-2.5 rounded-full border border-foreground/20" style={{ backgroundColor: activeColor }} />
                  </Button>
                  {showColorMenu && (
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-popover border rounded-md shadow-lg p-2.5 z-50 min-w-[160px]">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Sticky / Fill</p>
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {stickyColors.map(c => (
                          <button key={c} onClick={() => { setStickyColor(c); applyColorToSelected(c) }} className={cn('h-5 w-5 rounded-full border-2 transition-transform', stickyColor === c ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105')} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Pen / Stroke</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {penColors.map(c => (
                          <button key={c} onClick={() => { setPenColor(c); applyColorToSelected(c) }} className={cn('h-5 w-5 rounded-full border-2 transition-transform', penColor === c ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105')} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-5 bg-border mx-1" />

                {/* Actions */}
                <Button variant="ghost" size="icon-sm" onClick={handleAutoLayout} title="AI Auto-Layout"><Sparkles className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={handleReset} title="Reset Board"><RotateCcw className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={handleDownload} title="Download"><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={handleShare} title="Share"><Share2 className="h-4 w-4" /></Button>

                <div className="w-px h-5 bg-border mx-1" />

                <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          </Panel>

          {/* ─── Top-left: Filters ─── */}
          <Panel position="top-left">
            <Card className="w-56 shadow-lg">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-1"><Filter className="h-3 w-3" /> Filters</CardTitle>
                  <Button variant="ghost" size="icon-sm" className="h-5 w-5" onClick={() => setShowFilters(!showFilters)}>
                    {showFilters ? <X className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                  </Button>
                </div>
              </CardHeader>
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <CardContent className="p-3 pt-0 space-y-3">
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Node Type</p>
                        <div className="flex flex-wrap gap-1">
                          {typeFilters.map((t) => (
                            <button key={t} onClick={() => setTypeFilter(t)} className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors', typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Edge Type</p>
                        <div className="flex flex-wrap gap-1">
                          {edgeFilters.map((t) => (
                            <button key={t} onClick={() => setEdgeFilter(t)} className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors', edgeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                              {t.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </Panel>

          {/* ─── Top-right: Sidebar toggle ─── */}
          <Panel position="top-right">
            <Button variant="outline" size="sm" onClick={() => setShowMemorySidebar(!showMemorySidebar)} className="shadow-md">
              <Brain className="h-4 w-4 mr-1" /> {showMemorySidebar ? 'Hide' : 'Show'} Memories
            </Button>
          </Panel>

          {/* ─── Bottom-left: Legend ─── */}
          <Panel position="bottom-left">
            <Card className="shadow-lg">
              <CardContent className="p-3">
                <p className="text-[10px] font-medium text-muted-foreground mb-2">Legend</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(typeConfig).map(([k, c]) => (
                    <div key={k} className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                      <span>{c.emoji} {k}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(edgeColors).map(([k, c]) => (
                    <div key={k} className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-0.5 w-3 rounded" style={{ backgroundColor: c }} />
                      <span>{k.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Panel>

          {/* ─── Bottom-right: Zoom controls ─── */}
          <Panel position="bottom-right">
            <Card className="shadow-lg">
              <CardContent className="p-1 flex gap-0.5 items-center">
                <Button variant="ghost" size="icon-sm" onClick={handleZoomOut} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={handleZoomIn} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                <div className="w-px h-5 bg-border mx-0.5" />
                <Button variant="ghost" size="icon-sm" onClick={handleFitView} title="Fit View"><Scan className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          </Panel>
        </ReactFlow>
      </div>

      {/* ─── Node Detail Side Panel ─── */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 border-l bg-background shadow-xl z-10 flex-shrink-0"
          >
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {selectedNode.type === 'memoryNode'
                      ? <>{typeConfig[selectedNode.data.type as string]?.emoji} {selectedNode.data.type as string}</>
                      : selectedNode.type === 'sticky' ? 'Sticky Note'
                      : selectedNode.type === 'link' ? 'Link'
                      : selectedNode.type === 'embed' ? 'Video'
                      : selectedNode.type === 'drawing' ? 'Drawing'
                      : (selectedNode.type || 'Node')}
                  </Badge>
                  <Button variant="ghost" size="icon-sm" onClick={() => setSelectedNode(null)}><X className="h-4 w-4" /></Button>
                </div>

                <h3 className="font-semibold text-sm">
                  {(selectedNode.data.label || selectedNode.data.content || selectedNode.data.title || selectedNode.type) as string}
                </h3>

                {/* Memory-specific details */}
                {selectedNode.type === 'memoryNode' ? (
                  <>
                    {(selectedNode.data.summary as string) ? <p className="text-xs text-muted-foreground">{selectedNode.data.summary as string}</p> : null}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Confidence: {Math.round(((selectedNode.data.confidence as number) || 0.5) * 100)}%</span>
                    </div>
                    {(selectedNode.data.createdAt as string) ? <p className="text-[10px] text-muted-foreground">Created: {new Date(selectedNode.data.createdAt as string).toLocaleDateString()}</p> : null}
                    {Array.isArray(selectedNode.data.tags) && (selectedNode.data.tags as string[]).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(selectedNode.data.tags as string[]).map((tag: string) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
                      </div>
                    ) : null}
                    <Separator />
                    <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                      <Link href={`/app/memories/${selectedNode.id}`}><ExternalLink className="h-3 w-3 mr-1" /> Open Memory</Link>
                    </Button>
                  </>
                ) : null}

                {/* Link-specific */}
                {selectedNode.type === 'link' && selectedNode.data.url ? (
                  <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                    <a href={selectedNode.data.url as string} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> Open Link</a>
                  </Button>
                ) : null}

                {/* Embed-specific */}
                {selectedNode.type === 'embed' && selectedNode.data.originalUrl ? (
                  <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                    <a href={selectedNode.data.originalUrl as string} target="_blank" rel="noopener noreferrer"><Video className="h-3 w-3 mr-1" /> Open Video</a>
                  </Button>
                ) : null}

                {/* Connections - for ALL node types */}
                <Separator />
                <div>
                  <p className="text-xs font-medium mb-2">Connections</p>
                  {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map(e => {
                    const connectedId = e.source === selectedNode.id ? e.target : e.source
                    const connectedNode = nodes.find(n => n.id === connectedId)
                    const connectedName = (connectedNode?.data?.label || connectedNode?.data?.content || connectedNode?.data?.title || connectedId) as string
                    const isMemory = connectedNode?.type === 'memoryNode'
                    const edgeKind = (e.data?.kind as string) || ''
                    const edgeColor = edgeColors[edgeKind] || relationshipOptions.find(r => r.value === edgeKind)?.color || '#94a3b8'
                    return (
                      <div key={e.id} className="flex items-center gap-2 text-xs py-1.5">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: edgeColor }} />
                        <div className="min-w-0 flex-1">
                          <span className="text-muted-foreground">{edgeKind.replace(/_/g, ' ') || 'connected'}</span>
                          <span className="text-foreground font-medium ml-1 truncate">→ {connectedName}</span>
                          {isMemory && (
                            <Link href={`/app/memories/${connectedId}`} className="ml-1 text-primary hover:underline inline-flex items-center">
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                    <p className="text-xs text-muted-foreground">No connections. Drag from a handle to connect nodes.</p>
                  )}
                </div>

                {/* Comments Section - for memory nodes */}
                {selectedNode.type === 'memoryNode' ? (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium mb-2 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Comments</p>
                      {(comments[selectedNode.id] || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No comments yet. Use the Comment tool to add one.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {comments[selectedNode.id].map((c, i) => (
                            <div key={i} className="text-xs bg-muted rounded-md p-2">{c}</div>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs"
                        onClick={() => setCommentDialog({ nodeId: selectedNode.id, title: selectedNode.data.label as string })}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Comment
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Add Memories Sidebar ─── */}
      <AnimatePresence>
        {showMemorySidebar && !selectedNode && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l bg-background flex-shrink-0"
          >
            <div className="p-3 border-b">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">ADD MEMORIES TO BOARD</h3>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search memories..." className="h-8 pl-8 text-xs" />
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-70px)]">
              <div className="p-2 space-y-1">
                {filteredMemories.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">{searchQuery ? 'No matching memories' : 'No memories yet'}</p>
                ) : (
                  filteredMemories.map((m) => {
                    const onBoard = nodes.some(n => n.id === m.id)
                    return (
                      <button key={m.id} onClick={() => addMemoryToBoard(m)} disabled={onBoard}
                        className={cn('flex items-center gap-2 w-full rounded-md p-2 text-left transition-colors group', onBoard ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50')}>
                        <Badge variant="secondary" className="text-[9px] shrink-0">{m.type}</Badge>
                        <span className="text-xs truncate flex-1">{m.title}</span>
                        {!onBoard && <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary shrink-0" />}
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Edit Node Dialog ─── */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
            <DialogDescription>Update the content of this node.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editDialog?.content || ''}
            onChange={(e) => setEditDialog(prev => prev ? { ...prev, content: e.target.value } : null)}
            rows={4}
            className="text-sm"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Comment Dialog ─── */}
      <Dialog open={!!commentDialog} onOpenChange={(open) => { if (!open) { setCommentDialog(null); setCommentText('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-blue-500" /> Add Comment</DialogTitle>
            <DialogDescription>Comment on: <span className="font-medium text-foreground">{commentDialog?.title}</span></DialogDescription>
          </DialogHeader>
          {commentDialog && (comments[commentDialog.nodeId] || []).length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {comments[commentDialog.nodeId].map((c, i) => (
                <div key={i} className="text-xs bg-muted rounded-md p-2">{c}</div>
              ))}
            </div>
          )}
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Type your comment..."
            rows={3}
            className="text-sm"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCommentDialog(null); setCommentText('') }}>Cancel</Button>
            <Button onClick={submitComment} disabled={!commentText.trim()}>Add Comment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, nodeId: '', label: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-destructive" /> Delete Node?</DialogTitle>
            <DialogDescription>Are you sure you want to delete <span className="font-medium text-foreground">{deleteConfirm.label}</span>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm({ open: false, nodeId: '', label: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Connection Relationship Dialog ─── */}
      <Dialog open={!!pendingConnection} onOpenChange={(open) => { if (!open) setPendingConnection(null) }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" /> Define Relationship</DialogTitle>
            <DialogDescription>How are these nodes related?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            {relationshipOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => submitConnection(opt.value)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-muted transition-colors text-left w-full"
              >
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingConnection(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── URL Insert Dialog ─── */}
      <Dialog open={showUrlDialog} onOpenChange={(open) => { if (!open) { setShowUrlDialog(false); setUrlInput('') } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-blue-500" /> Insert from URL</DialogTitle>
            <DialogDescription>Paste a link, image URL, or YouTube/Vimeo video URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="text-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && urlInput.trim()) insertFromUrl() }}
            />
            {urlInput.trim() && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {detectUrlType(urlInput.trim()) === 'image' && <><ImagePlus className="h-3.5 w-3.5" /> Detected: Image</>}
                {detectUrlType(urlInput.trim()) === 'video' && <><Video className="h-3.5 w-3.5" /> Detected: Video embed</>}
                {detectUrlType(urlInput.trim()) === 'link' && <><Globe className="h-3.5 w-3.5" /> Detected: Link</>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowUrlDialog(false); setUrlInput('') }}>Cancel</Button>
            <Button onClick={insertFromUrl} disabled={!urlInput.trim()}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
