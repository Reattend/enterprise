'use client'

import React, { useMemo, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  typeConfig,
  seededMemories,
  graphNodePositions,
  graphEdges,
  edgeColors,
} from '../demo-data'

// ─── Border colors by type ──────────────────────────
const borderColors: Record<string, string> = {
  decision: '#8b5cf6',
  meeting: '#3b82f6',
  idea: '#f59e0b',
  insight: '#10b981',
  context: '#64748b',
  tasklike: '#ef4444',
  note: '#9ca3af',
}

// ─── Custom Node Component ──────────────────────────
function MemoryNode({ data }: { data: Record<string, unknown> }) {
  const type = data.type as string
  const tc = typeConfig[type]
  const borderColor = borderColors[type] || '#94a3b8'
  const isUser = data.isUser as boolean

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-transparent !border-0" />
      <div
        className={`rounded-lg border-2 bg-white px-3 py-2 shadow-sm min-w-[110px] max-w-[160px] ${
          isUser ? 'ring-2 ring-indigo-500/30 shadow-md' : ''
        }`}
        style={{ borderColor }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs">{tc?.emoji || '📝'}</span>
          <span className={`text-[10px] font-medium ${tc?.color || 'text-gray-600'}`}>{tc?.label || 'Note'}</span>
        </div>
        <p className="text-[11px] font-medium leading-tight line-clamp-2 text-[#1a1a2e]">
          {data.title as string}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-transparent !border-0" />
    </>
  )
}

const nodeTypes = { memoryNode: MemoryNode }

// ─── Props ──────────────────────────────────────────
interface DemoGraphProps {
  visibleCount: number // 1 = user only, 2 = user + seed-1, etc.
  showContradiction: boolean
  userTitle: string
  userType: string
}

// ─── Graph Inner ────────────────────────────────────
function GraphInner({ visibleCount, showContradiction, userTitle, userType }: DemoGraphProps) {
  const { fitView } = useReactFlow()

  // Build nodes based on visibleCount
  const allNodeDefs = useMemo(() => {
    const defs: { id: string; type: string; title: string; isUser: boolean }[] = [
      { id: 'user-note', type: userType, title: userTitle, isUser: true },
      ...seededMemories.map((m) => ({ id: m.id, type: m.type, title: m.title, isUser: false })),
    ]
    return defs
  }, [userTitle, userType])

  const visibleNodeDefs = useMemo(
    () => allNodeDefs.slice(0, visibleCount),
    [allNodeDefs, visibleCount],
  )

  const rfNodes: Node[] = useMemo(
    () => visibleNodeDefs.map((d) => ({
      id: d.id,
      type: 'memoryNode',
      position: graphNodePositions[d.id] || { x: 300, y: 200 },
      data: { title: d.title, type: d.type, isUser: d.isUser },
    })),
    [visibleNodeDefs],
  )

  // Build edges - only show if both source and target are visible
  const visibleIds = useMemo(() => new Set(visibleNodeDefs.map((n) => n.id)), [visibleNodeDefs])

  const rfEdges: Edge[] = useMemo(() => {
    const seedIdx = visibleCount - 1 // how many seeded (0-5)
    return graphEdges
      .filter((e) => e.appearsAfterSeed <= seedIdx && visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => {
        const isContradiction = e.isContradiction && showContradiction
        const isDashed = e.kind === 'contradicts' || e.kind === 'temporal'
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          style: {
            stroke: edgeColors[e.kind] || '#94a3b8',
            strokeWidth: isContradiction ? 3 : 2,
            strokeDasharray: isDashed ? '6 3' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColors[e.kind] || '#94a3b8',
            width: 14,
            height: 14,
          },
          animated: isContradiction,
          labelStyle: {
            fontSize: 9,
            fontWeight: isContradiction ? 700 : 500,
            fill: edgeColors[e.kind] || '#94a3b8',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.9,
          },
          labelBgPadding: [3, 2] as [number, number],
        }
      })
  }, [visibleCount, visibleIds, showContradiction])

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [edges, setEdges] = useEdgesState(rfEdges)

  // Update nodes/edges when props change
  useEffect(() => {
    setNodes(rfNodes)
  }, [rfNodes, setNodes])

  useEffect(() => {
    setEdges(rfEdges)
  }, [rfEdges, setEdges])

  // Fit view when nodes change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.3, maxZoom: 1, duration: 400 })
    }, 100)
    return () => clearTimeout(timer)
  }, [visibleCount, fitView])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.4}
        maxZoom={1.5}
        deleteKeyCode={[]}
        nodesConnectable={false}
        nodesDraggable={false}
        panOnDrag
        zoomOnScroll={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#f1f5f9" />
      </ReactFlow>
    </div>
  )
}

// ─── Exported Wrapper ───────────────────────────────
export function DemoGraph(props: DemoGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  )
}
