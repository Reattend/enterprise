'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { useReducedMotion } from 'framer-motion'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  opacity: number
  pulsePhase: number
}

const COLORS = ['#FF3B30', '#FFB020', '#22C55E', '#38BDF8', '#A78BFA']
const CONNECTION_DISTANCE = 150
const NODE_COUNT_DESKTOP = 40
const NODE_COUNT_MOBILE = 20

export function NetworkAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const animFrameRef = useRef<number>(0)
  const prefersReduced = useReducedMotion()

  const initNodes = useCallback((width: number, height: number) => {
    const count = width < 640 ? NODE_COUNT_MOBILE : NODE_COUNT_DESKTOP
    const nodes: Node[] = []
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 3 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: Math.random() * 0.5 + 0.5,
        pulsePhase: Math.random() * Math.PI * 2,
      })
    }
    nodesRef.current = nodes
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.scale(dpr, dpr)

      if (nodesRef.current.length === 0) {
        initNodes(rect.width, rect.height)
      }
    }

    resize()
    window.addEventListener('resize', resize)

    if (prefersReduced) {
      // Draw static frame
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        drawFrame(ctx, rect.width, rect.height, 0)
      }
      return () => window.removeEventListener('resize', resize)
    }

    let time = 0
    const animate = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return

      time += 0.01
      drawFrame(ctx, rect.width, rect.height, time)
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [initNodes, prefersReduced])

  function drawFrame(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
    ctx.clearRect(0, 0, width, height)

    const nodes = nodesRef.current

    // Update positions
    for (const node of nodes) {
      node.x += node.vx
      node.y += node.vy

      // Bounce off edges with padding
      if (node.x < 0 || node.x > width) node.vx *= -1
      if (node.y < 0 || node.y > height) node.vy *= -1

      // Keep in bounds
      node.x = Math.max(0, Math.min(width, node.x))
      node.y = Math.max(0, Math.min(height, node.y))
    }

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < CONNECTION_DISTANCE) {
          const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15
          ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.strokeStyle = `rgba(200, 200, 210, ${alpha})`
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7
      const r = node.radius * pulse

      // Outer glow
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 4)
      gradient.addColorStop(0, node.color + '18')
      gradient.addColorStop(1, node.color + '00')
      ctx.beginPath()
      ctx.arc(node.x, node.y, r * 4, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // Core dot
      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
      ctx.fillStyle = node.color
      ctx.globalAlpha = node.opacity * pulse
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  )
}
