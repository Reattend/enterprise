'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Brain, Lock, Zap, Heart, Mail } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'


// ─── Step card (own ref for inView) ────────────────────────────────────────────
function StepCard({ step, title, body, delay }: { step: string; title: string; body: string; delay: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay }}
      className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-2xl p-7"
    >
      <div className="text-[11px] font-bold text-[#4F46E5]/50 tracking-[0.15em] uppercase mb-3">{step}</div>
      <h3 className="text-[16px] font-bold text-[#1a1a2e] mb-3 leading-snug">{title}</h3>
      <p className="text-[14px] text-gray-500 leading-relaxed">{body}</p>
    </motion.div>
  )
}

// ─── Animated stat counter ────────────────────────────────────────────────────
function StatCard({ number, label, sub }: { number: string; label: string; sub: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="text-center px-6 py-8"
    >
      <div className="text-[48px] md:text-[64px] font-bold tracking-[-0.04em] text-[#4F46E5] leading-none mb-2">
        {number}
      </div>
      <div className="text-[15px] font-semibold text-[#1a1a2e] mb-1">{label}</div>
      <div className="text-[13px] text-gray-400 max-w-[180px] mx-auto leading-relaxed">{sub}</div>
    </motion.div>
  )
}

// ─── Principle card ────────────────────────────────────────────────────────────
function PrincipleCard({
  icon, title, body, delay,
}: { icon: React.ReactNode; title: string; body: string; delay: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay }}
      className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-2xl p-6"
    >
      <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-[#1a1a2e] mb-2">{title}</h3>
      <p className="text-[14px] text-gray-500 leading-relaxed">{body}</p>
    </motion.div>
  )
}


export default function AboutPage() {
  const problemRef = useRef(null)
  const problemInView = useInView(problemRef, { once: true, margin: '-80px' })

  const buildingRef = useRef(null)
  const buildingInView = useInView(buildingRef, { once: true, margin: '-80px' })

  return (
    <div className="min-h-screen bg-[#FAFAFA] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-32 px-5 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/6 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-[780px]"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4F46E5]/8 text-[#4F46E5] text-[13px] font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
              Our Story
            </div>
            <h1 className="text-[40px] md:text-[64px] font-bold tracking-[-0.04em] leading-[1.05] text-[#1a1a2e] mb-6">
              Organizations are suffering from{' '}
              <span className="text-[#4F46E5]">amnesia.</span>
            </h1>
            <p className="text-[18px] md:text-[20px] text-gray-500 leading-relaxed max-w-[620px]">
              We built Reattend because the most expensive problem in modern work is also the most invisible one -
              teams forgetting what they already know.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-200/60 bg-white/50">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200/60">
            <StatCard number="62" label="meetings per month" sub="The average professional attends 62 meetings every month" />
            <StatCard number="91%" label="forget meeting content" sub="91% of people admit they forget most of what was discussed within a week" />
            <StatCard number="31hrs" label="wasted every month" sub="Teams spend 31 hours per month in unproductive meetings with no lasting record" />
            <StatCard number="$47M" label="lost per year" sub="Companies with 10,000+ employees lose $47M annually to poor knowledge sharing" />
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────────────────── */}
      <section ref={problemRef} className="py-20 md:py-28 px-5">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={problemInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.55 }}
            >
              <div className="text-[12px] font-semibold text-[#4F46E5] uppercase tracking-widest mb-4">The Problem</div>
              <h2 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-6">
                Organizational amnesia is a crisis hiding in plain sight
              </h2>
              <div className="space-y-4 text-[15px] text-gray-600 leading-relaxed">
                <p>
                  Every week, your team makes dozens of decisions. Which direction to take the product.
                  How to handle a difficult customer. Why a certain architecture was chosen over another.
                  These decisions happen in meetings, Slack threads, and email chains.
                </p>
                <p>
                  And then they evaporate.
                </p>
                <p>
                  Three weeks later, the same question comes up again. The team re-debates it.
                  Someone misremembers what was decided. Another person contradicts a decision made last quarter -
                  without knowing it existed. The new hire spends their first month asking questions that were
                  already answered six months ago.
                </p>
                <p>
                  This is not a discipline problem. It is not a process problem. It is a memory problem.
                  Teams are generating enormous amounts of valuable knowledge every single day -
                  and losing almost all of it.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={problemInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="space-y-4"
            >
              {[
                {
                  title: 'The Re-Decision Tax',
                  body: 'The average team re-debates 30-40% of decisions already made. Every re-discussion costs an hour of focus, team energy, and trust. It compounds silently.',
                  color: 'from-red-50 to-orange-50',
                  border: 'border-red-100',
                  dot: 'bg-red-400',
                },
                {
                  title: 'The Onboarding Black Hole',
                  body: 'New hires take 3-6 months to reach full productivity - mostly because institutional knowledge lives in the heads of people who are too busy to share it.',
                  color: 'from-amber-50 to-yellow-50',
                  border: 'border-amber-100',
                  dot: 'bg-amber-400',
                },
                {
                  title: 'The Knowledge Drain',
                  body: 'When someone leaves, they take years of context with them. The person who knew why the codebase is structured a certain way, or why a key deal fell through, is gone.',
                  color: 'from-blue-50 to-indigo-50',
                  border: 'border-blue-100',
                  dot: 'bg-blue-400',
                },
                {
                  title: 'The Contradiction Problem',
                  body: 'Without a memory layer, teams make contradictory decisions without realizing it. One team builds left while another builds right - because nobody knew what was already decided.',
                  color: 'from-purple-50 to-violet-50',
                  border: 'border-purple-100',
                  dot: 'bg-purple-400',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className={`rounded-2xl bg-gradient-to-br ${item.color} border ${item.border} p-5`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                    <h3 className="text-[14px] font-semibold text-[#1a1a2e]">{item.title}</h3>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE'RE BUILDING ──────────────────────────────────────────── */}
      <section ref={buildingRef} className="py-20 md:py-28 px-5 bg-white/40">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={buildingInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <div className="text-[12px] font-semibold text-[#4F46E5] uppercase tracking-widest mb-4">What We're Building</div>
            <h2 className="text-[32px] md:text-[44px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-4">
              A memory layer for your organization
            </h2>
            <p className="text-[16px] text-gray-500 max-w-[560px] mx-auto leading-relaxed">
              Reattend is not another note-taking app or wiki. It is the AI-powered memory infrastructure
              that runs beneath the work your team already does.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            <StepCard
              step="01"
              title="Passive capture from every tool"
              body="Gmail, Google Calendar, Google Meet, Slack - Reattend connects to your existing tools and captures context automatically. No friction, no new habits required."
              delay={0}
            />
            <StepCard
              step="02"
              title="AI that thinks and links for you"
              body="Our AI doesn't just store information - it understands it. It extracts decisions, action items, and entities, then links related memories together across time and tools."
              delay={0.1}
            />
            <StepCard
              step="03"
              title="Instant recall, forever"
              body='Ask "what did we decide about X?" and get a sourced answer in seconds. The knowledge your team generated six months ago is as accessible as what happened this morning.'
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ── VISION STATEMENT - FULL WIDTH DARK ───────────────────────────── */}
      <section className="relative bg-[#0B0B0F] overflow-hidden py-20 md:py-28 px-5">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/15 via-transparent to-[#818CF8]/8 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#4F46E5]/10 blur-3xl pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-[780px] mx-auto text-center"
        >
          <p className="text-[13px] font-semibold text-[#818CF8] uppercase tracking-widest mb-6">Our Vision</p>
          <h2 className="text-[28px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.15] text-white mb-6">
            "The best teams don't just work harder -
            they <span className="text-[#818CF8]">remember better.</span>"
          </h2>
          <p className="text-[16px] text-white/60 leading-relaxed">
            We believe the next competitive advantage is not software, headcount, or strategy.
            It is the ability to retain and build on institutional knowledge across time, tools, and teams.
            Reattend is built to give every organization that advantage.
          </p>
        </motion.div>
      </section>

      {/* ── PRINCIPLES ───────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-5">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="text-[12px] font-semibold text-[#4F46E5] uppercase tracking-widest mb-4">How We Operate</div>
            <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.03em] text-[#1a1a2e]">Our principles</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <PrincipleCard
              icon={<Lock className="w-5 h-5" />}
              title="Privacy first"
              body="Your knowledge belongs to you. We never sell data, never train models on your content, and give you full control and deletion rights."
              delay={0}
            />
            <PrincipleCard
              icon={<Zap className="w-5 h-5" />}
              title="Invisible by design"
              body="The best memory system is one you never have to think about. Reattend works in the background - capturing, linking, and organizing without interrupting your flow."
              delay={0.08}
            />
            <PrincipleCard
              icon={<Brain className="w-5 h-5" />}
              title="AI that earns trust"
              body="Every AI action is traceable. We show sources, explain links, and never hallucinate context. If the AI says it, you can verify it."
              delay={0.16}
            />
            <PrincipleCard
              icon={<Heart className="w-5 h-5" />}
              title="Free forever matters"
              body="We offer a meaningful free plan because we believe the value of remembered knowledge should not be gated behind a paywall. Build your memory first."
              delay={0.24}
            />
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────────────────── */}
      <section className="py-12 px-5 border-t border-gray-200/50">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div>
              <h3 className="text-[18px] font-bold text-[#1a1a2e] mb-1">Get in touch</h3>
              <p className="text-[14px] text-gray-500">Questions, feedback, or just want to say hi.</p>
            </div>
            <a
              href="mailto:pb@reattend.ai"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full border-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/50 text-[#4F46E5] font-semibold text-[14px] transition-colors"
            >
              <Mail className="w-4 h-4" />
              pb@reattend.ai
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#0B0B0F] overflow-hidden py-20 md:py-28 px-5">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/20 via-transparent to-[#818CF8]/10 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-[600px] mx-auto text-center"
        >
          <h2 className="text-[28px] md:text-[40px] font-bold tracking-[-0.03em] leading-[1.1] text-white mb-4">
            Stop forgetting.<br />
            <span className="text-[#818CF8]">Start remembering.</span>
          </h2>
          <p className="text-[15px] text-white/60 mb-8 leading-relaxed">
            Free forever. No credit card required. Connect your first integration in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_20px_rgba(79,70,229,0.4)] active:scale-[0.98]"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-white/15 hover:border-white/30 text-white/80 font-semibold text-[14px] transition-colors"
            >
              View pricing
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
