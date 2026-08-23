'use client'

// Space - the gorgeous-mode 3D memory constellation.
//
// Same /api/enterprise/graph data the Board view consumes. The Board owns
// editing (create / delete links); Space owns *looking* at the graph -
// dark cosmic background, soft bloom, drifting particles, slow auto-orbit.
// Optimized for Twitter screenshots: a "Capture" button in the corner
// exports a 2× PNG of just the canvas, no chrome.

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Camera, Loader2, Sparkles, Eye, EyeOff, Pause, Play } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import * as THREE from 'three'

// react-force-graph-3d pulls in Three.js - must be client-only.
const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d').then((m) => m.default),
  { ssr: false, loading: () => null },
)

// Distinct hues by memory type so the constellation reads as structured
// without needing labels. Tuned warm/cool so adjacent types contrast.
const TYPE_COLORS: Record<string, string> = {
  decision:   '#ff5dab', // hot pink - the high-stakes thing
  insight:    '#74e07a', // green - "aha" moment
  meeting:    '#5db4ff', // blue - collaborative
  idea:       '#ffd13a', // amber - spark
  context:    '#b88dff', // violet - background knowledge
  tasklike:   '#ff985e', // orange - actionable
  note:       '#dadada', // white - generic
  transcript: '#5beaff', // cyan - speech / source
}
const FALLBACK_COLOR = '#aaaaaa'

interface RawNode { id: string; title: string; type: string; createdAt: string }
interface RawEdge { id: string; fromRecordId: string; toRecordId: string; kind: string }
interface ApiResponse { nodes: RawNode[]; edges: RawEdge[] }

interface SpaceNode {
  id: string
  title: string
  type: string
  color: string
  val: number // node size
}
interface SpaceLink {
  source: string
  target: string
  kind: string
  color: string
}

export function SpaceView() {
  const activeEnterpriseOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const fgRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<{ nodes: SpaceNode[]; links: SpaceLink[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(false)
  const [autoOrbit, setAutoOrbit] = useState(true)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 1, h: 1 })

  // Fetch graph data - same endpoint as Board view.
  useEffect(() => {
    let cancelled = false
    setError(null)
    setData(null)
    const url = activeEnterpriseOrgId
      ? `/api/enterprise/graph?orgId=${activeEnterpriseOrgId}&limit=500`
      : `/api/enterprise/graph?limit=500`
    fetch(url)
      .then((r) => r.json())
      .then((raw: ApiResponse) => {
        if (cancelled) return
        if (!raw?.nodes) {
          setData({ nodes: [], links: [] })
          return
        }

        // Degree count for sizing - more-connected memories appear larger.
        const degree = new Map<string, number>()
        for (const e of raw.edges) {
          degree.set(e.fromRecordId, (degree.get(e.fromRecordId) || 0) + 1)
          degree.set(e.toRecordId, (degree.get(e.toRecordId) || 0) + 1)
        }

        setData({
          nodes: raw.nodes.map((n) => ({
            id: n.id,
            title: n.title,
            type: n.type,
            color: TYPE_COLORS[n.type] || FALLBACK_COLOR,
            val: Math.max(1, Math.min(8, (degree.get(n.id) || 0) * 0.7 + 1.5)),
          })),
          links: raw.edges.map((e) => ({
            source: e.fromRecordId,
            target: e.toRecordId,
            kind: e.kind,
            color: linkColor(e.kind),
          })),
        })
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => { cancelled = true }
  }, [activeEnterpriseOrgId])

  // Resize observer - keep canvas filling its container.
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setDims({ w: Math.max(1, r.width), h: Math.max(1, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // After the graph mounts: add bloom, particle starfield, and tune lighting.
  useEffect(() => {
    if (!fgRef.current || !data) return
    let cancelled = false
    let starsRef: THREE.Points | null = null

    ;(async () => {
      const [{ UnrealBloomPass }, { default: SpriteText }] = await Promise.all([
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        import('three-spritetext'),
      ])
      void SpriteText
      if (cancelled || !fgRef.current) return

      // Bloom - the "everything glows" effect. Tuned for taste, not science.
      try {
        const composer = fgRef.current.postProcessingComposer?.()
        if (composer) {
          const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.6,   // strength
            0.55,  // radius
            0.0,   // threshold - 0 = bloom everything
          )
          composer.addPass(bloomPass)
        }
      } catch (e) {
        console.warn('[SpaceView] bloom unavailable:', e)
      }

      // Starfield - pure decoration. ~1000 tiny dots scattered in a large
      // sphere around the graph. They never interact with anything; they
      // exist to make the screenshot feel alive.
      try {
        const scene = fgRef.current.scene?.()
        if (scene) {
          const count = 1200
          const positions = new Float32Array(count * 3)
          for (let i = 0; i < count; i++) {
            // Uniform points on a sphere shell of radius 1500-2500
            const r = 1500 + Math.random() * 1000
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            positions[i * 3 + 2] = r * Math.cos(phi)
          }
          const geom = new THREE.BufferGeometry()
          geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
          const mat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.6,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
          })
          starsRef = new THREE.Points(geom, mat)
          scene.add(starsRef)
        }
      } catch (e) {
        console.warn('[SpaceView] starfield unavailable:', e)
      }
    })()

    return () => {
      cancelled = true
      try {
        if (starsRef && fgRef.current) {
          const scene = fgRef.current.scene?.()
          if (scene) scene.remove(starsRef)
          starsRef.geometry.dispose()
          ;(starsRef.material as THREE.Material).dispose()
        }
      } catch { /* mount race - ignore */ }
    }
  }, [data])

  // Slow auto-orbit - the graph "breathes" even when nobody's interacting.
  // Stops on user pointer-down so dragging feels responsive.
  useEffect(() => {
    if (!fgRef.current || !data || !autoOrbit) return
    let frame = 0
    let stopped = false
    const start = performance.now()

    const tick = () => {
      if (stopped || !fgRef.current) return
      const t = (performance.now() - start) / 1000
      const camera = fgRef.current.camera?.()
      if (camera) {
        const dist = Math.hypot(camera.position.x, camera.position.z)
        // ~one revolution every 80 seconds
        const angle = t * (Math.PI * 2 / 80)
        camera.position.x = Math.sin(angle) * dist
        camera.position.z = Math.cos(angle) * dist
        camera.lookAt(0, 0, 0)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { stopped = true; cancelAnimationFrame(frame) }
  }, [data, autoOrbit])

  // Custom node - small glowing sphere. Material is `MeshBasicMaterial` so
  // the bloom pass catches the full color without needing lighting.
  const nodeThreeObject = useMemo(() => (node: SpaceNode) => {
    const radius = Math.sqrt(node.val) * 1.2
    const geometry = new THREE.SphereGeometry(radius, 16, 16)
    const material = new THREE.MeshBasicMaterial({ color: node.color, toneMapped: false })
    return new THREE.Mesh(geometry, material)
  }, [])

  function exportPNG() {
    if (!fgRef.current) return
    const renderer = fgRef.current.renderer?.()
    if (!renderer) return
    // Force-render at 2× resolution for a sharp screenshot.
    const prevSize = renderer.getSize(new THREE.Vector2())
    const prevPixelRatio = renderer.getPixelRatio()
    renderer.setPixelRatio(window.devicePixelRatio * 2)
    fgRef.current.refresh?.()
    requestAnimationFrame(() => {
      renderer.domElement.toBlob((blob: Blob | null) => {
        renderer.setPixelRatio(prevPixelRatio)
        renderer.setSize(prevSize.x, prevSize.y, false)
        fgRef.current.refresh?.()
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reattend-memory-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    })
  }

  return (
    <div className="lsc-page">
      <div className="lsc-crumb" style={{ background: 'linear-gradient(90deg, #1a0a2a 0%, #06010c 100%)' }}>
        <Sparkles size={14} strokeWidth={2} />
        <span>Memory · Constellation</span>
      </div>
      <h1 className="lsc-hero">
        Your memory, mapped in three dimensions.
      </h1>

      <div ref={containerRef} className="relative" style={{ width: '100%', height: '72vh', minHeight: 520 }}>
        {/* The canvas */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-white/5"
             style={{ background: 'radial-gradient(ellipse at center, #0c0820 0%, #050108 70%, #000000 100%)' }}>
          {data && data.nodes.length > 0 && (
            <ForceGraph3D
              ref={fgRef}
              graphData={data as any}
              width={dims.w}
              height={dims.h}
              backgroundColor="rgba(0,0,0,0)"
              nodeRelSize={5}
              nodeThreeObject={nodeThreeObject as any}
              nodeLabel={showLabels ? ((n: any) => n.title) : undefined}
              linkColor={(l: any) => l.color}
              linkOpacity={0.5}
              linkWidth={0.6}
              linkCurvature={0.18}
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={1.2}
              linkDirectionalParticleSpeed={0.005}
              cooldownTicks={120}
              warmupTicks={40}
              showNavInfo={false}
              enableNodeDrag={false}
            />
          )}

          {/* Empty state */}
          {data && data.nodes.length === 0 && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60 text-center px-6">
              <Sparkles className="w-6 h-6 text-violet-400 mb-2" />
              <p className="text-[15px] font-medium text-white/80">Your constellation will form here</p>
              <p className="text-[12.5px] text-white/50 max-w-xs leading-relaxed">
                Save a handful of memories - meetings, decisions, notes - and the graph will start drawing itself.
              </p>
              <Link href="/app" className="mt-3 text-[12px] text-violet-300 underline underline-offset-2 hover:text-violet-200">
                Capture your first memory →
              </Link>
            </div>
          )}

          {/* Loading */}
          {!data && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-rose-300 text-[13px] px-6 text-center">
              {error}
            </div>
          )}

          {/* Overlay controls - minimal, hide-able for screenshots */}
          {data && data.nodes.length > 0 && (
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
              <button
                type="button"
                onClick={exportPNG}
                title="Download 2× screenshot"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white text-[11px] font-medium border border-white/15 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                Capture
              </button>
              <button
                type="button"
                onClick={() => setShowLabels(!showLabels)}
                title={showLabels ? 'Hide labels' : 'Show labels'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white text-[11px] font-medium border border-white/15 transition-colors"
              >
                {showLabels ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showLabels ? 'Hide labels' : 'Labels'}
              </button>
              <button
                type="button"
                onClick={() => setAutoOrbit(!autoOrbit)}
                title={autoOrbit ? 'Pause auto-orbit' : 'Resume auto-orbit'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white text-[11px] font-medium border border-white/15 transition-colors"
              >
                {autoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {autoOrbit ? 'Pause' : 'Orbit'}
              </button>
            </div>
          )}

          {/* Color legend */}
          {data && data.nodes.length > 0 && (
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-white/60 max-w-md">
              {Object.entries(TYPE_COLORS).map(([t, c]) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                  <span className="capitalize">{t}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {data && data.nodes.length > 0 && (
            <div className="absolute bottom-3 right-3 text-[10px] text-white/45 font-mono">
              {data.nodes.length} memories · {data.links.length} links
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function linkColor(kind: string): string {
  switch (kind) {
    case 'supersedes':       return 'rgba(255,93,171,0.7)' // pink - newer overrides older
    case 'contradicts':      return 'rgba(255,80,80,0.8)'  // red - conflict
    case 'caused_by':        return 'rgba(180,140,255,0.6)'// violet - causal
    case 'mentions':         return 'rgba(255,255,255,0.18)'// soft white - reference
    default:                 return 'rgba(255,255,255,0.22)'
  }
}
