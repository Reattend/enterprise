'use client'

// /sandbox — public try-it-now entry.
//
// Five role cards. Visitor clicks one → POST /api/sandbox/launch with the
// role → server clones the demo org, creates a sandbox user, returns a
// 60-second SSO ticket → we call signIn('sso-ticket', { ticket, callbackUrl:
// '/app' }) to drop a session cookie and redirect into the app.
//
// AI features inside the sandbox serve pre-canned fixtures instead of hitting
// the LLM — we explain that up-front here so visitors know what they're
// seeing is a scripted demo.

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Loader2, Crown, Briefcase, Building2, User, UserCheck,
  Sparkles, Shield, Clock, Bot,
} from 'lucide-react'

type RoleKey = 'super_admin' | 'admin' | 'dept_head' | 'member' | 'guest'

type RoleCard = {
  key: RoleKey
  name: string
  title: string
  tagline: string
  sees: string[]
  icon: typeof Crown
  accent: string
}

const ROLES: RoleCard[] = [
  {
    key: 'super_admin',
    name: 'Aarti Mehta',
    title: 'Secretary · Super Admin',
    tagline: 'See everything. Org-wide memory, every department, audit log, policy graph.',
    sees: ['Every department', 'All decisions + blast radius', 'Audit trail + hash chain', 'Self-healing contradictions'],
    icon: Crown,
    accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
  },
  {
    key: 'admin',
    name: 'Vikram Rao',
    title: 'Joint Secretary · Admin',
    tagline: 'Run the org. Member management, policy publishing, announcements.',
    sees: ['Cross-department view', 'Publish policies', 'Compose broadcasts', 'Exit interview agent'],
    icon: Briefcase,
    accent: 'from-violet-500/20 to-indigo-500/10 border-violet-500/30',
  },
  {
    key: 'dept_head',
    name: 'Rajiv Sharma',
    title: 'Director, International Taxation',
    tagline: 'Own a department. BEPS treaty thread, EU delegation, 47 decisions authored.',
    sees: ['International Taxation memory', 'Meeting prep + prior context', 'Team members + agents', 'Verify & publish records'],
    icon: Building2,
    accent: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
  },
  {
    key: 'member',
    name: 'Priya Iyer',
    title: 'Deputy Director, Cross-Border Tax',
    tagline: 'Work the day. Ask Oracle, meeting prep, prompts, personal memory.',
    sees: ['Department memory (read)', 'Ask Chat + Oracle', 'Personal inbox', 'Prompt library'],
    icon: User,
    accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
  },
  {
    key: 'guest',
    name: 'Sanjay Verma',
    title: 'External Legal Advisor · Guest',
    tagline: 'Scoped access. Only sees what\'s explicitly shared. No write access.',
    sees: ['Only explicitly shared records', 'No write, no delete', 'No policy acks', 'No admin surfaces'],
    icon: UserCheck,
    accent: 'from-slate-500/20 to-gray-500/10 border-slate-500/30',
  },
]

export default function SandboxLanding() {
  const [launching, setLaunching] = useState<RoleKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function launch(role: RoleKey) {
    if (launching) return
    setLaunching(role)
    setError(null)
    try {
      const res = await fetch('/api/sandbox/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `launch failed (${res.status})`)
      }
      const { ticket } = await res.json() as { ticket: string }
      const result = await signIn('sso-ticket', {
        ticket,
        redirect: false,
        callbackUrl: '/app',
      })
      if (result?.error) throw new Error(result.error)
      // Hard navigate so middleware re-runs with the new cookie
      window.location.href = result?.url || '/app'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not launch sandbox. Please try again.')
      setLaunching(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-br from-neutral-200/40 via-neutral-100/20 to-transparent blur-3xl pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/black_logo.svg" alt="Reattend" width={32} height={32} className="h-8 w-8" unoptimized />
          <div>
            <span className="text-[17px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
            <span className="text-[10px] font-semibold text-neutral-400 ml-1.5 uppercase tracking-wider">Enterprise</span>
          </div>
        </Link>
        <div className="flex items-center gap-5 text-[13px] font-medium text-neutral-600">
          <Link href="/pricing" className="hover:text-[#1a1a2e] transition-colors">Pricing</Link>
          <Link href="/compliance" className="hover:text-[#1a1a2e] transition-colors">Compliance</Link>
          <Link href="/login" className="font-semibold text-[#1a1a2e] hover:text-neutral-600 transition-colors">
            Sign in →
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-10 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1a2e]/5 text-[11px] font-semibold text-[#1a1a2e] uppercase tracking-wider mb-5">
            <Sparkles className="h-3 w-3" /> Sandbox · no signup
          </div>
          <h1 className="text-[42px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.05] text-[#1a1a2e]">
            Try Reattend Enterprise
            <br />
            <span className="text-neutral-400">as someone else.</span>
          </h1>
          <p className="text-[16px] text-neutral-500 mt-5 max-w-xl mx-auto leading-relaxed">
            Pick a role. We&apos;ll drop you into a pre-loaded demo org — <strong>Ministry of Finance</strong> with
            22 members, 12 decisions, 5 policies, 3 agents, and a completed exit interview.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 max-w-3xl mx-auto bg-white/70 border border-neutral-200 rounded-2xl p-4 flex items-start gap-3 backdrop-blur-sm"
        >
          <div className="h-8 w-8 rounded-lg bg-[#1a1a2e]/5 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-[#1a1a2e]" />
          </div>
          <div className="text-[13px] text-neutral-600 leading-relaxed">
            <strong className="text-[#1a1a2e]">AI runs in guided-demo mode in the sandbox.</strong> Ask Chat,
            Oracle, and the agents will serve <em>pre-canned scripted responses</em> that show what the real answer
            would look like on your org&apos;s data. Every sandbox session also gets a list of suggested questions
            that trigger full demos. Your real deployment hits Claude Sonnet on your live memory graph.
          </div>
        </motion.div>

        {error && (
          <div className="mt-6 max-w-xl mx-auto text-center text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            {error}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((role, idx) => (
            <motion.div
              key={role.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.07, duration: 0.45 }}
              className={`group relative rounded-2xl border bg-white/80 backdrop-blur-sm p-5 hover:shadow-xl transition-all bg-gradient-to-br ${role.accent}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center">
                  <role.icon className="h-5 w-5 text-[#1a1a2e]" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {role.key.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-[17px] font-bold text-[#1a1a2e] leading-tight">{role.name}</h3>
              <p className="text-[12px] font-medium text-neutral-500 mt-0.5">{role.title}</p>

              <p className="text-[13px] text-neutral-600 mt-3 leading-relaxed">{role.tagline}</p>

              <ul className="mt-4 space-y-1.5">
                {role.sees.map(s => (
                  <li key={s} className="text-[11px] text-neutral-500 flex items-start gap-1.5">
                    <span className="text-[#1a1a2e]/40 mt-0.5">—</span>
                    {s}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => launch(role.key)}
                disabled={!!launching}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-full hover:bg-[#2d2b55] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {launching === role.key ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cloning demo org…
                  </>
                ) : (
                  <>
                    Try as {role.name.split(' ')[0]} <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-neutral-500"
        >
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Sandbox orgs auto-delete after 1 hour of idle
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Nothing you do persists beyond the session
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Real deployment: Claude Sonnet on your live memory
          </span>
        </motion.div>

        <AnimatePresence>
          {launching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none"
            >
              <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-2xl pointer-events-auto">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a1a2e] mx-auto mb-4" />
                <h3 className="text-[16px] font-bold text-[#1a1a2e]">Cloning Ministry of Finance demo…</h3>
                <p className="text-[13px] text-neutral-500 mt-2 leading-relaxed">
                  Spinning up a fresh sandbox org just for you with 22 members, 12 decisions, and all the memory.
                  Takes a couple of seconds.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
