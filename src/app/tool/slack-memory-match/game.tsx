'use client'

import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, MessageSquare, Users, Eye, Brain } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

// --------------- Shared Design ---------------

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

// --------------- Data ---------------

const steps = [
  {
    icon: MessageSquare,
    title: 'Start a round',
    description: 'Type /memory-match in any channel. The bot posts a recall question - random or custom.',
  },
  {
    icon: Users,
    title: 'Team answers privately',
    description: 'Each team member clicks "Submit Your Answer" and types what they remember. All answers are anonymous.',
  },
  {
    icon: Eye,
    title: 'Reveal the results',
    description: 'Type /memory-match reveal. The bot shows all answers side by side with a Memory Alignment score.',
  },
]

const examplePrompts = [
  'What did we decide in our last sync?',
  'What\'s the current top priority?',
  'What was the biggest risk discussed recently?',
  'Who\'s responsible for the most important open item?',
  'What did we say "no" to recently, and why?',
  'What trade-off did we accept recently?',
]

// --------------- Main ---------------

export function SlackMemoryMatch() {
  const searchParams = useSearchParams()
  const installed = searchParams.get('installed')
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] relative overflow-hidden">
      {/* Gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

      <Navbar />

      {/* Status banners */}
      {installed && (
        <div className="relative z-10 bg-emerald-50 border-b border-emerald-200 px-5 py-3 text-center">
          <p className="text-[14px] text-emerald-700 font-medium">
            Memory Match has been installed to your Slack workspace. Type <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-[13px]">/memory-match</code> in any channel to start.
          </p>
        </div>
      )}
      {error && (
        <div className="relative z-10 bg-red-50 border-b border-red-200 px-5 py-3 text-center">
          <p className="text-[14px] text-red-700 font-medium">
            Installation failed ({error}). Please try again.
          </p>
        </div>
      )}

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-24 pb-12 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
            Free Slack App
          </span>
          <h1 className="text-[36px] md:text-[50px] font-bold tracking-[-0.03em] leading-[1.08]">
            Memory Match
          </h1>
          <p className="text-gray-500 mt-4 text-[17px] leading-relaxed max-w-xl mx-auto">
            A lightweight Slack game that shows how differently your team remembers the same moment.
          </p>
          <p className="text-[20px] text-[#1a1a2e] font-bold mt-6">
            Same conversation. Different memories.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/api/slack-game/install"
              className="inline-flex items-center gap-3 text-[15px] font-bold text-white bg-[#4A154B] hover:bg-[#3a1139] active:scale-[0.97] transition-all px-7 py-4 rounded-full shadow-[0_4px_16px_rgba(74,21,75,0.3)]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Add to Slack
            </a>
            <span className="text-[13px] text-gray-400">Free forever. Zero configuration.</span>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[24px] font-bold text-center mb-10"
          >
            How it works
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-[#4A154B]/8 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-5 h-5 text-[#4A154B]" />
                </div>
                <h3 className="text-[15px] font-bold mb-1.5">{step.title}</h3>
                <p className="text-[13.5px] text-gray-500 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-[600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[18px] font-bold text-center mb-5">Quick Start Guide</h2>
            <GlassCard className="p-6 md:p-8">
              <div className="space-y-5 text-[14px] text-gray-600 leading-relaxed">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 text-[#4F46E5] text-[13px] font-bold">1</span>
                  <div>
                    <p className="font-bold text-[#1a1a2e] mb-0.5">Install the bot</p>
                    <p>Click the <strong>&ldquo;Add to Slack&rdquo;</strong> button above and authorize it for your workspace. That&apos;s it - no configuration needed.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 text-[#4F46E5] text-[13px] font-bold">2</span>
                  <div>
                    <p className="font-bold text-[#1a1a2e] mb-0.5">Go to any Slack channel</p>
                    <p>Type <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[13px] border border-white/80">/memory-match</code> and hit Enter. The bot will post a random recall question for your team.</p>
                    <p className="mt-1">Or ask your own question: <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[13px] border border-white/80">/memory-match What did we decide about the launch date?</code></p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 text-[#4F46E5] text-[13px] font-bold">3</span>
                  <div>
                    <p className="font-bold text-[#1a1a2e] mb-0.5">Team clicks &ldquo;Submit Your Answer&rdquo;</p>
                    <p>Each person clicks the button in the channel message, types what they remember in the popup, and submits. All answers are <strong>anonymous</strong>.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 text-[#4F46E5] text-[13px] font-bold">4</span>
                  <div>
                    <p className="font-bold text-[#1a1a2e] mb-0.5">Reveal the results</p>
                    <p>When everyone has answered, type <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[13px] border border-white/80">/memory-match reveal</code> in the same channel. The bot shows all answers side by side with a Memory Alignment score (High / Medium / Low).</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Example flow */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-[600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard className="overflow-hidden">
              <div className="px-6 py-4 border-b border-white/60">
                <span className="text-[12px] font-bold uppercase tracking-wider text-gray-400">Example Round</span>
              </div>
              <div className="p-6 space-y-5">
                {/* Bot prompt */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center shrink-0 text-white text-[11px] font-bold">
                    MM
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-gray-400 mb-1">Memory Match <span className="font-normal text-gray-300">APP</span></p>
                    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/60">
                      <p className="text-[14px] font-bold mb-1">Quick recall 👀</p>
                      <p className="text-[14px] text-gray-600 italic">&ldquo;What did we decide in our last sync?&rdquo;</p>
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div className="border-l-2 border-dashed border-[#4F46E5]/15 pl-6 ml-4 space-y-3 py-2">
                  <p className="text-[12px] text-gray-400 font-medium">3 answers submitted anonymously...</p>
                </div>

                {/* Results */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center shrink-0 text-white text-[11px] font-bold">
                    MM
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-gray-400 mb-1">Memory Match <span className="font-normal text-gray-300">APP</span></p>
                    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/60 space-y-3">
                      <p className="text-[14px] font-bold">🧠 Memory Match - Results</p>
                      <div className="space-y-2 text-[13.5px] text-gray-600">
                        <p className="border-l-2 border-[#4F46E5]/20 pl-3 italic">&ldquo;We agreed to switch to weekly sprints starting next Monday.&rdquo;</p>
                        <p className="border-l-2 border-[#4F46E5]/20 pl-3 italic">&ldquo;Something about changing our sprint cadence? Not sure of the details.&rdquo;</p>
                        <p className="border-l-2 border-[#4F46E5]/20 pl-3 italic">&ldquo;We talked about the Q2 roadmap and pushed the API launch.&rdquo;</p>
                      </div>
                      <p className="text-[13px] font-bold text-amber-600 pt-1">🟡 Memory Alignment: Medium</p>
                      <p className="text-[12px] text-gray-400 italic pt-1">Same conversation. 3 memories.</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Example prompts */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-[600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[18px] font-bold text-center mb-5">Built-in prompts</h2>
            <p className="text-[14px] text-gray-500 text-center mb-6">
              Use <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[13px] border border-white/80">/memory-match</code> for a random prompt, or write your own with <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[13px] border border-white/80">/memory-match What did we decide about X?</code>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {examplePrompts.map((prompt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className="px-4 py-3">
                    <span className="text-[13.5px] text-gray-600">
                      &ldquo;{prompt}&rdquo;
                    </span>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Principles */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-[600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard className="p-6 md:p-8">
              <h3 className="text-[15px] font-bold mb-4">How we built this</h3>
              <div className="space-y-3 text-[14px] text-gray-600 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]/40 mt-2 shrink-0" />
                  <p><strong>No shaming.</strong> No individual scores, no leaderboards. This is a team exercise.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]/40 mt-2 shrink-0" />
                  <p><strong>Fully anonymous.</strong> Nobody knows who said what.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]/40 mt-2 shrink-0" />
                  <p><strong>Asynchronous.</strong> Answer whenever. Reveal when the team is ready.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]/40 mt-2 shrink-0" />
                  <p><strong>No AI.</strong> Alignment is measured with simple word overlap - deterministic, transparent.</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-[600px] mx-auto relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
          <div className="relative z-10">
            <GlassCard className="p-10 md:p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-7 w-7 text-[#4F46E5]" />
              </div>
              <h3 className="text-[22px] md:text-[26px] font-bold text-[#1a1a2e] mb-3">
                Want one shared memory next time?
              </h3>
              <p className="text-gray-500 text-[15px] max-w-md mx-auto mb-6 leading-relaxed">
                Reattend captures meetings, decisions, and context automatically - so your team remembers the same thing.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-[15px] font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.97] transition-all px-7 py-3.5 rounded-full shadow-[0_4px_16px_rgba(79,70,229,0.3)]"
              >
                Try Reattend free <ArrowRight className="w-4 h-4" />
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
