'use client'

import React from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'

interface Screenshot {
  src: string
  alt: string
  label: string
}

interface HeroShowcaseProps {
  screenshots: Screenshot[]
}

function ScreenshotCard({
  screenshot,
  className,
  delay,
  style,
}: {
  screenshot: Screenshot
  className?: string
  delay: number
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={`rounded-2xl border border-[#E6E8EE] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden ${className || ''}`}
      style={style}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#FAFAFA] border-b border-[#E6E8EE]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28CA42]" />
        <span className="ml-2 text-[10px] text-gray-400 font-medium">{screenshot.label}</span>
      </div>
      {/* Screenshot image */}
      <div className="relative aspect-[3/2] bg-[#F6F7F9]">
        <Image
          src={screenshot.src}
          alt={screenshot.alt}
          fill
          className="object-cover object-top"
          sizes="(max-width: 768px) 90vw, 600px"
          unoptimized={screenshot.src.endsWith('.svg')}
        />
      </div>
    </motion.div>
  )
}

function FloatingChip({
  label,
  color,
  delay,
  className,
}: {
  label: string
  color: string
  delay: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className={`absolute hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-[#E6E8EE] z-10 ${className || ''}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">{label}</span>
    </motion.div>
  )
}

export function HeroShowcase({ screenshots }: HeroShowcaseProps) {
  const prefersReduced = useReducedMotion()

  const main = screenshots[0]
  const secondary = screenshots.slice(1, 4)

  return (
    <div className="relative w-full max-w-[620px] mx-auto lg:mx-0">
      {/* Floating chips */}
      <FloatingChip
        label="Decision captured"
        color="bg-[#FF3B30]"
        delay={1.2}
        className="landing-float -top-3 -left-4 md:-left-10"
      />
      <FloatingChip
        label="Follow-up created"
        color="bg-[#FFB020]"
        delay={1.4}
        className="landing-float-delayed -bottom-2 -left-2 md:-left-8"
      />
      <FloatingChip
        label="Linked to project"
        color="bg-[#22C55E]"
        delay={1.6}
        className="landing-float -top-1 -right-2 md:-right-6"
      />

      {/* Main screenshot */}
      {main && (
        <motion.div
          whileHover={prefersReduced ? {} : { y: -3, transition: { duration: 0.2 } }}
          className="relative z-[3]"
        >
          <ScreenshotCard screenshot={main} delay={0.3} />
        </motion.div>
      )}

      {/* Overlapping secondary cards */}
      {secondary.length > 0 && (
        <div className="hidden sm:block">
          {secondary[0] && (
            <div className="absolute -bottom-8 -right-6 md:-right-10 w-[52%] z-[4]">
              <ScreenshotCard screenshot={secondary[0]} delay={0.55} />
            </div>
          )}
          {secondary[1] && (
            <div className="absolute -bottom-14 -left-4 md:-left-8 w-[44%] z-[2]">
              <ScreenshotCard screenshot={secondary[1]} delay={0.7} />
            </div>
          )}
        </div>
      )}

      {/* Mobile: show secondary cards stacked below */}
      {secondary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-4 sm:hidden">
          {secondary.slice(0, 2).map((s, i) => (
            <ScreenshotCard key={i} screenshot={s} delay={0.5 + i * 0.15} />
          ))}
        </div>
      )}
    </div>
  )
}
