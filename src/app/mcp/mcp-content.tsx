'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Search, MessageSquare, BookmarkPlus, Clock,
  Terminal, Zap, ArrowRight, Check, GitPullRequest,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

/* ── Particle canvas ──────────────────────────────────────────────────────── */
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = 55
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(Math.random() * 0.35 + 0.1),
      opacity: Math.random() * 0.45 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }))

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw connecting lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 90) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - dist / 90)})`
            ctx.lineWidth = 0.8
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      particles.forEach((p) => {
        p.pulse += 0.018
        const breathe = Math.sin(p.pulse) * 0.15
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r + breathe, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.opacity})`
        ctx.fill()

        p.x += p.vx
        p.y += p.vy

        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width }
        if (p.x < -5) p.x = canvas.width + 5
        if (p.x > canvas.width + 5) p.x = -5
      })

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}

/* ── Scroll reveal ────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── Code block ───────────────────────────────────────────────────────────── */
function CodeBlock({ code }: { code: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-900/10 shadow-lg">
      <div className="flex items-center gap-1.5 bg-[#1a1a2e] px-4 py-3">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
      </div>
      <pre className="bg-[#0d0d1a] px-5 py-5 overflow-x-auto text-sm text-gray-300 font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ── Step ─────────────────────────────────────────────────────────────────── */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-indigo-200 mt-0.5">
        {n}
      </div>
      <div className="flex-1 pb-8 border-b border-gray-100 last:border-0">
        <h3 className="text-gray-900 font-semibold text-base mb-3">{title}</h3>
        <div className="text-gray-500 text-sm leading-relaxed space-y-3">{children}</div>
      </div>
    </div>
  )
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function McpContent() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-white pt-28 pb-20">
        <Particles />
        {/* subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-[820px] mx-auto px-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white border border-indigo-200 rounded-full px-4 py-1.5 text-xs text-indigo-600 font-semibold mb-7 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse inline-block" />
            Model Context Protocol
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-gray-900 mb-5"
          >
            Persistent memory for<br />
            <span className="text-indigo-600">every AI tool you use</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="text-lg text-gray-500 max-w-[580px] mx-auto leading-relaxed mb-9"
          >
            Every AI conversation starts blank. Reattend's MCP server connects your meetings,
            Slack threads, emails, and notes to Claude, Cursor, and any AI assistant that supports
            the Model Context Protocol. One setup. Every tool. Permanent memory.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/app/settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm shadow-indigo-200"
            >
              Get your API token <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/Reattend/reattend-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              View on GitHub
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── What it does ── */}
      <section className="max-w-[900px] mx-auto px-5 py-20">
        <Reveal className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">What it does</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your AI assistant, finally has memory</h2>
          <p className="text-gray-500 max-w-[520px] mx-auto text-sm leading-relaxed">
            Reattend captures context from your tools automatically. The MCP server makes that memory
            available inside any AI assistant, without you asking.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: Search,
              title: 'Searches before it answers',
              desc: 'Claude checks your memory automatically when a question might have past context. No copy-pasting, no re-explaining.',
            },
            {
              icon: MessageSquare,
              title: 'Answers from real history',
              desc: '"What did we decide about the auth service?" gets answered from your actual meeting notes, not a guess.',
            },
            {
              icon: BookmarkPlus,
              title: 'Saves mid-conversation',
              desc: '"Remember we\'re using Zustand here" gets saved permanently and recalled in every future session.',
            },
            {
              icon: Zap,
              title: 'Works across all your AI tools',
              desc: 'One memory store, connected to Claude Desktop, Cursor, Windsurf, VS Code, and every other MCP client.',
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 0.07}>
              <div className="bg-gray-50 hover:bg-indigo-50/40 border border-gray-100 hover:border-indigo-100 rounded-2xl p-6 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center mb-4 transition-colors">
                  <Icon className="h-4.5 w-4.5 text-indigo-600" size={18} />
                </div>
                <h3 className="text-gray-900 font-semibold text-sm mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Tools ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-[900px] mx-auto px-5">
          <Reveal className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Tools exposed</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Four tools. Your AI decides when to use them.</h2>
            <p className="text-gray-500 text-sm">You don't need to prompt it. Claude calls these automatically when relevant.</p>
          </Reveal>
          <div className="space-y-3">
            {[
              { icon: Search, name: 'search_memories', desc: 'Semantic and keyword search across all your captured context. Used proactively before answering questions that may have past context.' },
              { icon: MessageSquare, name: 'ask_memory', desc: 'AI-synthesised answer from your full memory. Best for questions that span multiple captures or time periods.' },
              { icon: BookmarkPlus, name: 'save_memory', desc: 'Save something from inside the AI conversation. Decisions, preferences, notes. Stored permanently in your Reattend memory.' },
              { icon: Clock, name: 'recent_memories', desc: 'Your most recently captured memories. For "what have I been working on?" or end-of-day recaps.' },
            ].map(({ icon: Icon, name, desc }, i) => (
              <Reveal key={name} delay={i * 0.06}>
                <div className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={15} className="text-indigo-500" />
                  </div>
                  <div>
                    <code className="text-indigo-600 text-sm font-mono font-semibold">{name}</code>
                    <p className="text-gray-500 text-sm leading-relaxed mt-1">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Setup ── */}
      <section className="max-w-[860px] mx-auto px-5 py-20">
        <Reveal className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Setup</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Live in 2 minutes</h2>
          <p className="text-gray-500 text-sm">No install required. Uses npx, so it always runs the latest version.</p>
        </Reveal>

        <div className="space-y-8">
          <Step n={1} title="Get your API token">
            <p>
              Go to{' '}
              <Link href="/app/settings" className="text-indigo-600 hover:text-indigo-500 underline underline-offset-2">
                Settings → API Tokens
              </Link>{' '}
              and create a token. It starts with{' '}
              <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs font-mono">rat_</code>.
            </p>
          </Step>

          <Step n={2} title="Add to Claude Desktop">
            <p className="text-gray-400 text-xs">
              Mac: <code className="text-gray-500">~/Library/Application Support/Claude/claude_desktop_config.json</code><br />
              Windows: <code className="text-gray-500">%APPDATA%\Claude\claude_desktop_config.json</code>
            </p>
            <CodeBlock code={`{
  "mcpServers": {
    "reattend": {
      "command": "npx",
      "args": ["-y", "@reattend/mcp", "--token", "rat_your_token_here"]
    }
  }
}`} />
            <p>Restart Claude Desktop. Done.</p>
          </Step>

          <Step n={3} title="Add to Cursor">
            <p>Edit <code className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-xs">.cursor/mcp.json</code> in your project, or go to Cursor Settings → MCP:</p>
            <CodeBlock code={`{
  "mcpServers": {
    "reattend": {
      "command": "npx",
      "args": ["-y", "@reattend/mcp", "--token", "rat_your_token_here"]
    }
  }
}`} />
          </Step>

          <Step n={4} title="Add to VS Code (Copilot)">
            <p>Edit <code className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-xs">.vscode/mcp.json</code> in your workspace:</p>
            <CodeBlock code={`{
  "servers": {
    "reattend": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@reattend/mcp", "--token", "rat_your_token_here"]
    }
  }
}`} />
          </Step>

          <Step n={5} title="Prefer an environment variable?">
            <CodeBlock code={`{
  "mcpServers": {
    "reattend": {
      "command": "npx",
      "args": ["-y", "@reattend/mcp"],
      "env": { "REATTEND_TOKEN": "rat_your_token_here" }
    }
  }
}`} />
          </Step>
        </div>
      </section>

      {/* ── What gets captured ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-[900px] mx-auto px-5">
          <Reveal className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Sources</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What feeds your memory</h2>
            <p className="text-gray-500 text-sm">
              Install the{' '}
              <Link href="/" className="text-indigo-600 hover:text-indigo-500 underline underline-offset-2">
                Reattend Chrome extension
              </Link>{' '}
              to start capturing automatically. Everything flows into the same memory the MCP server reads from.
            </p>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { source: 'Google Meet', detail: 'Full transcription' },
              { source: 'Zoom', detail: 'Full transcription' },
              { source: 'Teams', detail: 'Full transcription' },
              { source: 'Slack', detail: 'Messages and threads' },
              { source: 'Gmail', detail: 'Emails you read' },
              { source: 'Notion', detail: 'Pages you open' },
              { source: 'Linear', detail: 'Issues and updates' },
              { source: 'Jira', detail: 'Tickets and boards' },
              { source: 'Google Docs', detail: 'Documents you edit' },
              { source: 'Manual save', detail: 'Highlight anything' },
            ].map((item, i) => (
              <Reveal key={item.source} delay={i * 0.04}>
                <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                  <div className="text-gray-900 text-sm font-medium">{item.source}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{item.detail}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Examples ── */}
      <section className="max-w-[860px] mx-auto px-5 py-20">
        <Reveal className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Examples</p>
          <h2 className="text-2xl font-bold text-gray-900">See it in action</h2>
        </Reveal>
        <div className="space-y-4">
          {[
            {
              prompt: "I'm about to jump on a call with Acme Corp. Give me a briefing.",
              response: "Last call was Feb 12. They raised concerns about pricing. Sarah is the decision maker. You agreed to a pilot before end of Q1.",
              note: 'Claude called search_memories("Acme Corp") automatically',
            },
            {
              prompt: "What did we decide about the auth service stack?",
              response: "You decided on Postgres with Drizzle ORM, JWT tokens in httpOnly cookies. Decision was made in the Feb 20 architecture meeting.",
              note: 'Answered from your actual meeting notes, not a guess',
            },
            {
              prompt: "Remember: no Redux in this project, we're using Zustand.",
              response: "Saved to memory. I'll keep that in mind for this and future sessions.",
              note: 'Stored permanently via save_memory',
            },
            {
              prompt: "What have I been working on this week?",
              response: "Based on recent captures: auth service refactor, Acme Corp pilot prep, three team standups, and a design review for the new onboarding flow.",
              note: 'Claude called recent_memories(20) and summarised',
            },
          ].map((ex, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium mb-1">You asked</p>
                  <p className="text-gray-800 text-sm font-medium">{ex.prompt}</p>
                </div>
                <div className="bg-white px-5 py-4">
                  <p className="text-xs text-gray-400 font-medium mb-1">Claude answered</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{ex.response}</p>
                  <p className="text-indigo-400 text-xs mt-3 font-mono">{ex.note}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── GitHub Action ── */}
      <section className="max-w-[860px] mx-auto px-5 py-20" id="github-action">
        <Reveal className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <GitPullRequest size={16} className="text-indigo-500" />
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">GitHub Action</p>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Save PRs, commits, and releases automatically</h2>
          <p className="text-gray-500 text-sm max-w-[560px]">
            One line in your workflow. Every PR, push, release, and issue gets saved to your Reattend memory.
            Ask Claude "what changed in the last release?" and get a real answer.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {[
            { event: 'pull_request', desc: 'Title, description, branch, author, merged or not' },
            { event: 'push', desc: 'Commit messages, branch, author' },
            { event: 'release', desc: 'Tag name, release title, release notes' },
            { event: 'issues', desc: 'Issue title, description, author' },
          ].map((item) => (
            <div key={item.event} className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <code className="text-indigo-500 text-xs font-mono flex-shrink-0 mt-0.5">{item.event}</code>
              <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <Reveal className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Add to any workflow:</p>
          <CodeBlock code={`name: Reattend memory sync
on:
  pull_request:
    types: [opened, closed]
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  save:
    runs-on: ubuntu-latest
    steps:
      - uses: Reattend/reattend-action@v1
        with:
          token: \${{ secrets.REATTEND_TOKEN }}`} />
        </Reveal>

        <Reveal>
          <p className="text-sm font-medium text-gray-700 mb-3">Or save a custom message at any point in a workflow:</p>
          <CodeBlock code={`- uses: Reattend/reattend-action@v1
  with:
    token: \${{ secrets.REATTEND_TOKEN }}
    content: "Deployed \${{ github.ref_name }} to production. SHA: \${{ github.sha }}"
    source: "deploy"`} />
        </Reveal>

        <Reveal className="mt-6">
          <a
            href="https://github.com/Reattend/reattend-action"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            View Reattend/reattend-action on GitHub
            <ArrowRight size={13} />
          </a>
        </Reveal>
      </section>

      {/* ── REST API ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20" id="api">
        <div className="max-w-[860px] mx-auto px-5">
          <Reveal className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={16} className="text-indigo-500" />
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">REST API</p>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Building on the API</h2>
            <p className="text-gray-500 text-sm">
              The same token works directly with the REST API. Use it in agents, automations, or any custom tool.
            </p>
          </Reveal>
          <CodeBlock code={`# Search memories
curl https://reattend.com/api/tray/search?q=acme+pricing \\
  -H "Authorization: Bearer rat_xxx"

# Save to memory
curl -X POST https://reattend.com/api/tray/capture \\
  -H "Authorization: Bearer rat_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Decided on Postgres for the new service", "source": "agent"}'

# Ask a question (streams response)
curl -X POST https://reattend.com/api/tray/ask \\
  -H "Authorization: Bearer rat_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"question": "What database decisions have we made?"}'

# Recent memories
curl https://reattend.com/api/tray/recent?limit=10 \\
  -H "Authorization: Bearer rat_xxx"`} />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-[860px] mx-auto px-5 py-24 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Start in 2 minutes</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-[400px] mx-auto">
            Sign up free, install the Chrome extension, paste 5 lines into your Claude Desktop config.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm shadow-indigo-100"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/Reattend/reattend-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
            >
              View on GitHub
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            {['Free plan available', 'No credit card required', 'Works in 2 minutes'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check size={11} className="text-indigo-400" />{t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
