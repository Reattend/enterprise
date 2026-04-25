'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Lock, Building, Brain, GraduationCap } from 'lucide-react'

export default function EnterpriseLanding() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-br from-neutral-200/40 via-neutral-100/20 to-transparent blur-3xl pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/black_logo.svg" alt="Reattend" width={32} height={32} className="h-8 w-8" unoptimized />
          <div>
            <span className="text-[17px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
            <span className="text-[10px] font-semibold text-neutral-400 ml-1.5 uppercase tracking-wider">Enterprise</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/sandbox" className="text-[13px] font-semibold text-neutral-500 hover:text-[#1a1a2e] transition-colors">
            Try sandbox
          </Link>
          <Link href="/login" className="text-[13px] font-semibold text-[#1a1a2e] hover:text-neutral-600 transition-colors">
            Sign in &rarr;
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-8 pt-16 pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-[42px] md:text-[56px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e]">
            Your organization&apos;s
            <br />
            <span className="text-neutral-400">memory, preserved.</span>
          </h1>
          <p className="text-[17px] text-neutral-500 mt-6 max-w-lg mx-auto leading-relaxed">
            Decisions, context, and institutional knowledge - captured, linked, and never lost. Even when people leave.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/sandbox" className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#1a1a2e] text-white text-[14px] font-semibold rounded-full hover:bg-[#2d2b55] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
              Try the sandbox <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/register" className="inline-flex items-center gap-2 px-7 py-3.5 border border-neutral-200 text-[14px] font-semibold text-neutral-600 rounded-full hover:border-neutral-300 hover:bg-white transition-all">
              Sign up
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-20">
          {[
            { icon: Building, title: 'Organizational Memory', desc: 'Every decision, meeting note, and policy — captured, linked, and indexed by time. Scrub through history, see what the org knew when, and what depends on what.' },
            { icon: GraduationCap, title: 'Exit Interview Agent', desc: 'When someone gives notice, the AI reads their memory footprint and writes a structured handoff for their successor. Six weeks of ramp time saved.' },
            { icon: Shield, title: 'Secure by Design', desc: 'Two-tier RBAC, hash-chain audit log, GDPR-grade controls, on-prem deployment with the LLM running on your hardware. Procurement-grade.' },
          ].map(f => (
            <div key={f.title} className="text-left p-6 rounded-2xl border border-neutral-200/60 bg-white/60 backdrop-blur-sm">
              <f.icon className="h-6 w-6 text-neutral-400 mb-3" />
              <h3 className="text-[15px] font-semibold text-[#1a1a2e]">{f.title}</h3>
              <p className="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-center justify-center gap-6 mt-16 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Enterprise-grade security</span>
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> On-premise available</span>
        </motion.div>
      </main>
    </div>
  )
}
