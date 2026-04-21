'use client'

import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Building, Network, Users2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Layout algorithm ──────────────────────────────────────────────────────
// Simple hierarchical top-down layout. Dagre would be nicer but adds a dep.
// We compute subtree widths bottom-up, then position siblings within each
// parent's allotted horizontal band.

const NODE_W = 200
const NODE_H = 76
const H_GAP = 24
const V_GAP = 60

interface Department {
  id: string
  parentId: string | null
  kind: string
  name: string
}

interface LayoutNode extends Department {
  children: LayoutNode[]
  width: number // total subtree width
  x: number
  y: number
}

function layout(depts: Department[]): LayoutNode[] {
  const byId = new Map<string, LayoutNode>()
  for (const d of depts) byId.set(d.id, { ...d, children: [], width: 0, x: 0, y: 0 })
  const roots: LayoutNode[] = []
  for (const d of depts) {
    const node = byId.get(d.id)!
    if (d.parentId && byId.has(d.parentId)) {
      byId.get(d.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Bottom-up: compute each subtree's width
  function computeWidth(n: LayoutNode): number {
    if (n.children.length === 0) {
      n.width = NODE_W
      return NODE_W
    }
    const childrenW = n.children.reduce((sum, c, i) => sum + computeWidth(c) + (i > 0 ? H_GAP : 0), 0)
    n.width = Math.max(NODE_W, childrenW)
    return n.width
  }
  // Top-down: place nodes
  function place(n: LayoutNode, xStart: number, depth: number) {
    const x = xStart + n.width / 2 - NODE_W / 2
    n.x = x
    n.y = depth * (NODE_H + V_GAP)
    let cursor = xStart
    for (const c of n.children) {
      place(c, cursor, depth + 1)
      cursor += c.width + H_GAP
    }
  }

  let totalX = 0
  for (const r of roots) {
    computeWidth(r)
    place(r, totalX, 0)
    totalX += r.width + H_GAP * 2
  }

  // Flatten
  const out: LayoutNode[] = []
  function walk(n: LayoutNode) {
    out.push(n)
    for (const c of n.children) walk(c)
  }
  for (const r of roots) walk(r)
  return out
}

// ─── Custom node ───────────────────────────────────────────────────────────

interface NodeData extends Record<string, unknown> {
  name: string
  kind: string
  memberCount?: number
  recordCount?: number
  isTeam: boolean
}

function iconForKind(kind: string) {
  const k = kind.toLowerCase()
  if (k === 'team' || k.includes('team') || k.includes('squad')) return Users2
  if (k.includes('division') || k.includes('wing') || k.includes('directorate')) return Network
  return Building
}

function DeptNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const Icon = iconForKind(data.kind)
  return (
    <div
      className={cn(
        'rounded border bg-card shadow-sm transition-all',
        'flex items-start gap-2.5 p-3',
        selected ? 'border-primary shadow-md ring-1 ring-primary/40' : 'border-border hover:border-border/80',
      )}
      style={{ width: NODE_W, height: NODE_H }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 0 }} />
      <div
        className={cn(
          'h-7 w-7 rounded flex items-center justify-center shrink-0',
          data.isTeam ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium leading-tight truncate">{data.name}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{data.kind}</div>
        {(data.memberCount != null || data.recordCount != null) && (
          <div className="text-[10px] text-muted-foreground mt-1">
            {data.memberCount != null && <>{data.memberCount} members</>}
            {data.memberCount != null && data.recordCount != null && <> · </>}
            {data.recordCount != null && <>{data.recordCount} records</>}
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes = { dept: DeptNode }

// ─── Main chart ────────────────────────────────────────────────────────────

export interface OrgChartProps {
  departments: Department[]
  memberCountByDept?: Record<string, number>
  recordCountByDept?: Record<string, number>
  onNodeClick?: (deptId: string) => void
}

export function OrgChart({ departments, memberCountByDept, recordCountByDept, onNodeClick }: OrgChartProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const laid = layout(departments)
    const initialNodes: Node<NodeData>[] = laid.map((n) => ({
      id: n.id,
      type: 'dept',
      position: { x: n.x, y: n.y },
      data: {
        name: n.name,
        kind: n.kind,
        memberCount: memberCountByDept?.[n.id],
        recordCount: recordCountByDept?.[n.id],
        isTeam: n.kind.toLowerCase() === 'team',
      },
    }))
    const initialEdges: Edge[] = []
    for (const n of laid) {
      if (n.parentId) {
        initialEdges.push({
          id: `e-${n.parentId}-${n.id}`,
          source: n.parentId,
          target: n.id,
          type: 'smoothstep',
          animated: false,
          style: { strokeWidth: 1.25, stroke: 'hsl(var(--border))' },
        })
      }
    }
    return { initialNodes, initialEdges }
  }, [departments, memberCountByDept, recordCountByDept])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const handleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onNodeClick) onNodeClick(node.id)
    },
    [onNodeClick],
  )

  if (departments.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded">
        No departments yet. Create your first one to see the org chart.
      </div>
    )
  }

  return (
    <div className="h-[640px] rounded border bg-muted/20">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.5}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} color="hsl(var(--border))" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const d = n.data as NodeData
              return d.isTeam ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)'
            }}
            maskColor="hsl(var(--background) / 0.6)"
            style={{ background: 'hsl(var(--card))' }}
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
