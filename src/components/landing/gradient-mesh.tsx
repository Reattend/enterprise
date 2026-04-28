'use client'

// Stripe-style animated gradient mesh.
//
// Five large soft blobs (pink, orange, magenta, violet, electric blue)
// drifting independently over a deep purple base. Heavy gaussian blur
// merges them into the morphing color field that's become the dominant
// SaaS hero idiom (Stripe, Pitch, Linear's older hero). Each blob has
// its own slow Lissajous-ish drift so the mesh never repeats visibly.
//
// Pure CSS + Framer Motion — no canvas, GPU-accelerated transforms.
// Falls back to a static composition for prefers-reduced-motion.

import { motion, useReducedMotion } from 'framer-motion'

const BLOB_BLUR = 'blur(160px)'

interface BlobSpec {
  className: string
  color: string
  // Movement amplitudes & duration tuned so each blob orbits the hero
  // on its own period; together they read as one continuous mesh.
  xPath: number[]
  yPath: number[]
  duration: number
  delay?: number
}

const BLOBS: BlobSpec[] = [
  {
    className: '-top-32 -left-24 w-[820px] h-[820px]',
    color: '#ff5e9c', // hot pink
    xPath: [0, 220, -120, 80, 0],
    yPath: [0, -140, 90, -40, 0],
    duration: 28,
  },
  {
    className: 'top-[-10%] right-[-15%] w-[860px] h-[860px]',
    color: '#ff8c3e', // amber-orange
    xPath: [0, -180, 120, -60, 0],
    yPath: [0, 130, -80, 40, 0],
    duration: 32,
    delay: 1.2,
  },
  {
    className: 'top-[35%] left-[20%] w-[680px] h-[680px]',
    color: '#a855f7', // violet
    xPath: [0, 140, -180, 60, 0],
    yPath: [0, -90, 100, -40, 0],
    duration: 26,
    delay: 0.6,
  },
  {
    className: 'bottom-[-20%] right-[10%] w-[720px] h-[720px]',
    color: '#3b82f6', // electric blue
    xPath: [0, -100, 90, -50, 0],
    yPath: [0, 110, -70, 30, 0],
    duration: 30,
    delay: 2.4,
  },
  {
    className: 'bottom-[-15%] left-[-10%] w-[600px] h-[600px]',
    color: '#ec4899', // bright magenta
    xPath: [0, 90, -150, 60, 0],
    yPath: [0, -130, 80, -40, 0],
    duration: 34,
    delay: 1.8,
  },
]

export function GradientMesh({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  return (
    <div className={`absolute inset-0 overflow-hidden ${className ?? ''}`} aria-hidden="true">
      {/* Deep base color so the blobs sit against rich darkness */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1c0a4a_0%,#0c0427_55%,#06031a_100%)]" />

      {/* Color blobs */}
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full mix-blend-screen ${b.className}`}
          style={{ background: b.color, filter: BLOB_BLUR, opacity: 0.7 }}
          animate={reduced ? undefined : { x: b.xPath, y: b.yPath }}
          transition={{ duration: b.duration, repeat: Infinity, ease: 'easeInOut', delay: b.delay ?? 0 }}
        />
      ))}

      {/* Subtle grain texture so the mesh doesn't look plastic */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence baseFrequency=%220.8%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")',
        }}
      />
    </div>
  )
}
