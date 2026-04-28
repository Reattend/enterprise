'use client'

// Brain Particles — sand pouring into a brain.
//
// ~900 particles. Each one is born somewhere above the canvas, then
// falls under a soft gravity, steers toward its assigned target on a
// brain-shaped point cloud, and snaps into place once it's close
// enough. Births are staggered over the first ~3.5 seconds so the
// effect plays out as a cascade rather than a flash. After every
// particle has settled, a small continuous rain (~12/sec) keeps
// re-injecting fresh grains into the cluster so the visual never
// fully stops moving.
//
// Brain shape: two side-by-side ellipsoids (left + right hemisphere)
// with a compressed midline, plus a small stem at the bottom. Sampling
// is biased toward the surface so the silhouette reads as a brain
// rather than a fuzzy ball, and a thin gap between the lobes shows
// through as the central fissure.
//
// Sizes vary from ~0.6px sand grains up to ~3.6px rocks. Big particles
// are rarer so the silhouette stays delicate.
//
// The cluster rotates slowly around Y after formation; a tiny X-axis
// wobble keeps it breathing.

import { useEffect, useRef } from 'react'

interface Particle {
  // Target on the brain (3D unit-ish coordinates)
  tx: number
  ty: number
  tz: number
  // Current position (3D)
  x: number
  y: number
  z: number
  // Velocity (used during the falling-sand phase)
  vx: number
  vy: number
  vz: number
  // Visual
  size: number
  hue: number
  // Birth time in seconds. Before this, particle is invisible.
  birthTime: number
  // Once snapped in, formed = 1. Persistent drift uses phase.
  formed: number
  phase: number
}

const PARTICLE_COUNT = 900

// Color palette stops — violet → fuchsia → pink → indigo. Picked
// per-particle from a 0..1 hue seed. Far particles (low depth) dim.
function colorFor(hue: number, depth: number): string {
  const stops = [
    [167, 139, 250], // violet-400
    [232, 121, 249], // fuchsia-400
    [244, 114, 182], // pink-400
    [129, 140, 248], // indigo-400
    [165, 180, 252], // indigo-300
  ]
  const t = (hue * stops.length) % stops.length
  const i = Math.floor(t)
  const frac = t - i
  const a = stops[i]
  const b = stops[(i + 1) % stops.length]
  const r = Math.round(a[0] + (b[0] - a[0]) * frac)
  const g = Math.round(a[1] + (b[1] - a[1]) * frac)
  const bl = Math.round(a[2] + (b[2] - a[2]) * frac)
  const alpha = 0.3 + depth * 0.7
  return `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(3)})`
}

// Sample a target point on/inside a brain shape. Returns 3D coords.
// Two ellipsoids side-by-side with a compressed midline create the
// hemisphere silhouette; a small bottom blob adds the brain stem.
function brainTarget(rng: () => number): { x: number; y: number; z: number } {
  // 8% of particles go to the brain stem
  const stem = rng() < 0.08
  if (stem) {
    const r = 0.18 * (0.5 + rng() * 0.5)
    const u = rng()
    const v = rng()
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    return {
      x: r * Math.sin(phi) * Math.cos(theta) * 0.6,
      y: -0.85 + r * Math.cos(phi) * 0.5,
      z: r * Math.sin(phi) * Math.sin(theta) * 0.6,
    }
  }

  // Hemisphere
  const left = rng() < 0.5
  // Lobes are pulled apart slightly to leave a fissure visible.
  const cx = left ? -0.45 : 0.45
  const cy = (rng() - 0.5) * 0.08
  // Surface bias: 65% of particles sample a thin shell so the
  // silhouette reads sharp; the remaining 35% fill the volume so the
  // brain has depth.
  const surfaceShell = rng() < 0.65
  const baseR = 0.7
  const r = surfaceShell
    ? baseR * (0.9 + rng() * 0.1)        // 0.63..0.7
    : baseR * (0.4 + rng() * 0.5)         // 0.28..0.63
  const u = rng()
  const v = rng()
  const theta = u * Math.PI * 2
  const phi = Math.acos(2 * v - 1)
  // Squash X slightly toward the midline so the lobes look hemispheric
  // rather than perfect spheres.
  const sx = Math.sin(phi) * Math.cos(theta) * (left ? 0.92 : 0.92)
  // Push the inner edge of each lobe away from x=0 to keep the gap.
  const innerBias = left ? -0.08 : 0.08
  return {
    x: cx + r * sx + innerBias,
    y: cy + r * Math.sin(phi) * Math.sin(theta) * 1.05,
    z: r * Math.cos(phi),
  }
}

// Pick a starting position above the canvas — a random horizontal
// spread, well above the brain center. Particles fall from here.
function birthPosition(rng: () => number): { x: number; y: number; z: number } {
  return {
    x: (rng() - 0.5) * 3.0,
    y: -1.6 - rng() * 1.2,
    z: (rng() - 0.5) * 1.4,
  }
}

export function BrainParticles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Deterministic-ish RNG so the page looks consistent across loads
    // without being pixel-identical.
    let seed = (Date.now() & 0xffff) || 1
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) | 0
      return ((seed >>> 0) / 0xffffffff)
    }

    const particles: Particle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = brainTarget(rng)
      const start = birthPosition(rng)
      // Big-particle bias: ~15% are large grains, the rest are sand.
      const big = rng() < 0.15
      const size = big
        ? 1.8 + rng() * 1.8
        : 0.6 + rng() * 1.0
      // Stagger birth time across 0..3.5s so the cascade plays out.
      const birthTime = rng() * 3.5
      particles.push({
        tx: t.x, ty: t.y, tz: t.z,
        x: start.x, y: start.y, z: start.z,
        vx: 0, vy: 0, vz: 0,
        size,
        hue: rng(),
        birthTime,
        formed: 0,
        phase: rng() * Math.PI * 2,
      })
    }

    let raf = 0
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

    // Continuous rain: after formation, occasionally re-birth a
    // particle from above so the visual never freezes.
    let lastRainAt = 0

    function step(now: number) {
      if (!canvas || !ctx) return
      const t = (now - start) / 1000
      const rotation = t * 0.32
      const xWobble = Math.sin(t * 0.4) * 0.08

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cx = w / 2
      const cy = h / 2 - h * 0.02
      const scale = Math.min(w, h) * 0.32

      ctx.clearRect(0, 0, w, h)

      // Re-rain every ~80ms after the initial cascade has finished.
      if (t > 4 && now - lastRainAt > 80) {
        lastRainAt = now
        // Pick a few particles, send them back to a fresh start.
        for (let i = 0; i < 2; i++) {
          const idx = Math.floor(rng() * particles.length)
          const p = particles[idx]
          const start2 = birthPosition(rng)
          p.x = start2.x; p.y = start2.y; p.z = start2.z
          p.vx = 0; p.vy = 0; p.vz = 0
          p.formed = 0
          p.birthTime = t  // born now
        }
      }

      const projected: Array<{ p: Particle; sx: number; sy: number; sz: number; size: number }> = []

      for (const p of particles) {
        if (t < p.birthTime) continue

        if (p.formed < 1) {
          // Falling-sand physics: soft gravity + steering toward target.
          const dx = p.tx - p.x
          const dy = p.ty - p.y
          const dz = p.tz - p.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001

          if (dist < 0.04) {
            // Snap.
            p.x = p.tx; p.y = p.ty; p.z = p.tz
            p.vx = p.vy = p.vz = 0
            p.formed = 1
          } else {
            // Steering force pulls toward target. Stronger as we get
            // closer so particles converge quickly without orbiting.
            const pull = 0.08 + 0.12 * (1 - Math.min(1, dist / 1.5))
            p.vx += (dx / dist) * pull * 0.05
            p.vy += (dy / dist) * pull * 0.05 + 0.012 // a touch of extra gravity
            p.vz += (dz / dist) * pull * 0.05

            // Damping so they settle rather than overshoot
            p.vx *= 0.92
            p.vy *= 0.92
            p.vz *= 0.92

            p.x += p.vx
            p.y += p.vy
            p.z += p.vz
          }
        } else {
          // Formed — tiny breathing wobble around target.
          const bob = 0.012 * Math.sin(t * 0.85 + p.phase)
          p.x = p.tx + bob * 0.4
          p.y = p.ty + bob
          p.z = p.tz + bob * 0.3
        }

        // Rotate around Y, then apply small X wobble
        const cosY = Math.cos(rotation)
        const sinY = Math.sin(rotation)
        const cosX = Math.cos(xWobble)
        const sinX = Math.sin(xWobble)
        const rx = cosY * p.x + sinY * p.z
        const rz = -sinY * p.x + cosY * p.z
        const ry = cosX * p.y - sinX * rz
        const rz2 = sinX * p.y + cosX * rz

        // Orthographic projection with a touch of perspective.
        const persp = 1 / (1 + rz2 * 0.45)
        const sx = cx + rx * scale * persp
        const sy = cy + ry * scale * persp
        const depth = Math.max(0, Math.min(1, (rz2 + 1) / 2))
        const drawSize = p.size * (0.55 + depth * 0.85) * persp
        projected.push({ p, sx, sy, sz: rz2, size: drawSize })
      }

      // Sort back-to-front so closer particles overlap further ones.
      projected.sort((a, b) => a.sz - b.sz)

      // Halo pass — additive glow under each dot.
      ctx.globalCompositeOperation = 'lighter'
      for (const item of projected) {
        const depth = Math.max(0, Math.min(1, (item.sz + 1) / 2))
        ctx.beginPath()
        ctx.arc(item.sx, item.sy, item.size * 1.8, 0, Math.PI * 2)
        ctx.fillStyle = colorFor(item.p.hue, depth * 0.45)
        ctx.fill()
      }

      // Sharp pass — the dots themselves.
      ctx.globalCompositeOperation = 'source-over'
      for (const item of projected) {
        const depth = Math.max(0, Math.min(1, (item.sz + 1) / 2))
        ctx.beginPath()
        ctx.arc(item.sx, item.sy, item.size, 0, Math.PI * 2)
        ctx.fillStyle = colorFor(item.p.hue, depth)
        ctx.fill()
      }

      if (!reduced) raf = requestAnimationFrame(step)
    }

    if (reduced) {
      // Skip the cascade for users who opted out of motion.
      for (const p of particles) {
        p.x = p.tx; p.y = p.ty; p.z = p.tz
        p.formed = 1
        p.birthTime = 0
      }
      step(start + 5000)
    } else {
      raf = requestAnimationFrame(step)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
