'use client'

// Brain Particles — the hero's right-side animation.
//
// ~700 particles distributed across two overlapping spheres (left + right
// hemisphere), gently rotating in 3D. On first mount each particle starts
// at a random scattered position and eases toward its target on the brain
// surface, giving the "sand pouring into a brain" feel the design called
// for. After formation the cluster keeps rotating slowly with subtle
// jitter so it never reads as static.
//
// Pure canvas, no dependency. Resizes with the container. Pauses on
// `prefers-reduced-motion`.

import { useEffect, useRef } from 'react'

interface Particle {
  // Target on the brain surface (3D unit-radius sphere model)
  tx: number
  ty: number
  tz: number
  // Current position (drifts during formation, then sticks near target)
  x: number
  y: number
  z: number
  // Visual
  size: number
  hueSeed: number
  // Per-particle drift phase so the cloud never moves in lockstep
  phase: number
  // Formation progress: 0 → 1
  formed: number
}

const PARTICLE_COUNT = 700

// Color stops for the violet → fuchsia → cyan palette. Picked per-particle
// from a deterministic hue seed so the cloud has visual variation but no
// strobing.
function colorFor(seed: number, depth: number): string {
  // depth in [0, 1] (1 = nearest, 0 = farthest)
  const stops = [
    [139, 92, 246],   // violet-500
    [217, 70, 239],   // fuchsia-500
    [79, 70, 229],    // indigo-600
    [14, 165, 233],   // sky-500
  ]
  const t = (seed * stops.length) % stops.length
  const i = Math.floor(t)
  const frac = t - i
  const a = stops[i]
  const b = stops[(i + 1) % stops.length]
  const r = Math.round(a[0] + (b[0] - a[0]) * frac)
  const g = Math.round(a[1] + (b[1] - a[1]) * frac)
  const bl = Math.round(a[2] + (b[2] - a[2]) * frac)
  // Far particles dimmer
  const alpha = 0.25 + depth * 0.75
  return `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(3)})`
}

// Generate a target point inside one of two side-by-side spheres so the
// silhouette reads as a brain. Returns a unit-ish 3D point.
function brainTarget(rng: () => number): { x: number; y: number; z: number } {
  // Pick left or right hemisphere
  const left = rng() < 0.5
  const cx = left ? -0.55 : 0.55
  // Slight vertical noise so the lobes aren't perfectly aligned
  const cy = (rng() - 0.5) * 0.12
  // Sample inside a sphere of radius 0.75 with a bias toward the surface
  // so the cluster has structure rather than being a fuzzy ball.
  const surfaceBias = 0.55 + rng() * 0.45
  const u = rng()
  const v = rng()
  const theta = u * Math.PI * 2
  const phi = Math.acos(2 * v - 1)
  const r = 0.75 * surfaceBias
  const x = cx + r * Math.sin(phi) * Math.cos(theta)
  const y = cy + r * Math.sin(phi) * Math.sin(theta) * 1.05  // taller
  const z = r * Math.cos(phi)
  return { x, y, z }
}

export function BrainParticles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reducedRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reducedRef.current = reduced

    // Deterministic-ish RNG so every page load looks consistent enough but
    // not identical pixel-for-pixel.
    let seed = Date.now() & 0xffff
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      return ((seed >>> 0) / 0xffffffff)
    }

    const particles: Particle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = brainTarget(rng)
      // Start each particle at a wide random position offscreen-ish so the
      // formation has somewhere dramatic to come from.
      const startTheta = rng() * Math.PI * 2
      const startR = 1.6 + rng() * 1.2
      particles.push({
        tx: t.x, ty: t.y, tz: t.z,
        x: Math.cos(startTheta) * startR,
        y: Math.sin(startTheta) * startR,
        z: (rng() - 0.5) * 2,
        size: 0.6 + rng() * 1.6,
        hueSeed: rng(),
        phase: rng() * Math.PI * 2,
        formed: 0,
      })
    }

    let raf = 0
    let rotation = 0
    const start = performance.now()

    function resize() {
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function draw(now: number) {
      if (!canvas || !ctx) return
      const t = (now - start) / 1000
      // Slow gentle rotation around Y. After formation, also a tiny X
      // wobble so the silhouette breathes.
      rotation = t * 0.35
      const xWobble = Math.sin(t * 0.4) * 0.08

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cx = w / 2
      const cy = h / 2
      const scale = Math.min(w, h) * 0.32

      ctx.clearRect(0, 0, w, h)

      // Sort particles by z so far points draw first
      const projected: Array<{ p: Particle; sx: number; sy: number; sz: number; size: number }> = []
      for (const p of particles) {
        // Update formation 0 → 1 over the first ~2.4s
        const formedTarget = Math.min(1, t / 2.4)
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - formedTarget, 3)
        p.formed = eased

        // Where the particle should be right now: lerp(start, target, eased)
        // After it's "formed" we layer in a tiny per-particle bob so the
        // cloud feels alive rather than frozen.
        const bob = 0.015 * Math.sin(t * 0.9 + p.phase)
        const lerpX = p.tx + bob * 0.4
        const lerpY = p.ty + bob
        const lerpZ = p.tz + bob * 0.3

        const sx = p.x + (lerpX - p.x) * eased
        const sy = p.y + (lerpY - p.y) * eased
        const sz = p.z + (lerpZ - p.z) * eased
        // Persist so the next frame keeps continuity if formed === 1
        if (eased >= 1) {
          p.x = lerpX
          p.y = lerpY
          p.z = lerpZ
        }

        // Rotate around Y by `rotation` and around X by xWobble
        const cosY = Math.cos(rotation)
        const sinY = Math.sin(rotation)
        const cosX = Math.cos(xWobble)
        const sinX = Math.sin(xWobble)
        const rx1 = cosY * sx + sinY * sz
        const rz1 = -sinY * sx + cosY * sz
        const ry1 = cosX * sy - sinX * rz1
        const rz2 = sinX * sy + cosX * rz1

        // Project orthographically with a touch of perspective for depth
        const persp = 1 / (1 + rz2 * 0.5)
        const screenX = cx + rx1 * scale * persp
        const screenY = cy + ry1 * scale * persp
        const depth = Math.max(0, Math.min(1, (rz2 + 1) / 2))
        projected.push({ p, sx: screenX, sy: screenY, sz: rz2, size: p.size * (0.6 + depth) * persp })
      }

      projected.sort((a, b) => a.sz - b.sz)

      // Soft additive glow for "live" feel — tiny halo behind each dot
      ctx.globalCompositeOperation = 'lighter'
      for (const item of projected) {
        const depth = Math.max(0, Math.min(1, (item.sz + 1) / 2))
        ctx.beginPath()
        ctx.arc(item.sx, item.sy, item.size * 1.6, 0, Math.PI * 2)
        ctx.fillStyle = colorFor(item.p.hueSeed, depth * 0.5)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      for (const item of projected) {
        const depth = Math.max(0, Math.min(1, (item.sz + 1) / 2))
        ctx.beginPath()
        ctx.arc(item.sx, item.sy, item.size, 0, Math.PI * 2)
        ctx.fillStyle = colorFor(item.p.hueSeed, depth)
        ctx.fill()
      }

      if (!reducedRef.current) raf = requestAnimationFrame(draw)
    }

    if (reducedRef.current) {
      // Skip to formed state for users who opted out of motion
      for (const p of particles) {
        p.x = p.tx
        p.y = p.ty
        p.z = p.tz
        p.formed = 1
      }
      draw(start + 3000)
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
