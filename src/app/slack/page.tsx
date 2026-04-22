import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'Slack Integration - Reattend',
  description: 'Connect Reattend to Slack. Sync messages from your channels, save notes with /reattend, and search your memory without leaving Slack.',
  alternates: { canonical: 'https://reattend.com/slack' },
}

const features = [
  {
    icon: '⚡',
    title: 'Auto-sync channels',
    desc: 'Pick the channels that matter. Reattend pulls messages every 30 minutes and enriches them into searchable memory — zero effort.',
  },
  {
    icon: '💾',
    title: 'Save any message',
    desc: 'Right-click any Slack message → More actions → Save to Reattend. The bot confirms instantly via DM.',
  },
  {
    icon: '📝',
    title: '/reattend save',
    desc: 'Type a note directly from Slack. It lands in your Reattend memory, tagged and linked automatically.',
  },
  {
    icon: '🔍',
    title: '/reattend search',
    desc: 'Search your entire memory without leaving Slack. Get results with direct links back to your memories.',
  },
  {
    icon: '🤖',
    title: 'AI enrichment',
    desc: 'Every saved message is automatically tagged, summarised, categorised (decision / insight / context), and linked to related memories.',
  },
  {
    icon: '🔒',
    title: 'Read-only, private',
    desc: 'Reattend only reads channels you select. It never posts, never reads DMs, and your data is never shared or sold.',
  },
]

const steps = [
  { n: '1', title: 'Create a free Reattend account', desc: 'Sign up at reattend.com — takes 30 seconds, no credit card required.' },
  { n: '2', title: 'Connect Slack', desc: 'Go to Settings → Integrations → Slack and click Connect. Authorise the app in your workspace.' },
  { n: '3', title: 'Pick your channels', desc: 'Select which channels to sync. You can change these any time.' },
  { n: '4', title: 'Use it', desc: 'Messages sync automatically. Use /reattend save to save notes and /reattend search to find anything.' },
]

export default function SlackLandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] overflow-x-hidden">
      {/* Gradient bg */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-br from-[#4A154B]/6 via-[#4F46E5]/5 to-transparent blur-3xl" />
      </div>

      <Navbar />

      {/* Hero */}
      <section className="px-5 pt-20 pb-16 text-center max-w-[760px] mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4A154B]/8 text-[#4A154B] text-[13px] font-semibold mb-6">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
          Slack Integration
        </div>

        <h1 className="text-[40px] md:text-[56px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-5">
          Slack messages →<br />
          <span className="text-[#4F46E5]">permanent memory</span>
        </h1>

        <p className="text-[18px] text-gray-500 leading-relaxed mb-10 max-w-[560px] mx-auto">
          Reattend connects to your Slack workspace and turns conversations, decisions, and notes into a searchable AI memory — automatically.
        </p>

        {/* Add to Slack button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 bg-[#4A154B] hover:bg-[#3d1040] text-white px-6 py-3.5 rounded-xl font-semibold text-[15px] transition-colors shadow-lg shadow-[#4A154B]/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
            Add to Slack
          </Link>
          <Link
            href="/app/integrations"
            className="text-[14px] text-gray-500 hover:text-[#4F46E5] transition-colors"
          >
            Already have an account? Connect here →
          </Link>
        </div>

        <p className="text-[12px] text-gray-400 mt-4">
          Free to connect. Requires a{' '}
          <Link href="/register" className="text-[#4F46E5] hover:underline">Reattend account</Link>.
        </p>
      </section>

      {/* Features grid */}
      <section className="max-w-[1100px] mx-auto px-5 pb-20">
        <h2 className="text-center text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-10">
          What you get
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-2xl p-6"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-[15px] text-[#1a1a2e] mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to install */}
      <section className="max-w-[760px] mx-auto px-5 pb-20">
        <h2 className="text-[28px] font-bold text-[#1a1a2e] tracking-tight mb-2 text-center">
          How to install
        </h2>
        <p className="text-center text-gray-500 text-[15px] mb-10">Up and running in under 2 minutes.</p>
        <div className="space-y-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="flex gap-5 bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-2xl p-5"
            >
              <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[13px] font-bold shrink-0 mt-0.5">
                {s.n}
              </div>
              <div>
                <p className="font-semibold text-[15px] text-[#1a1a2e] mb-0.5">{s.title}</p>
                <p className="text-[13px] text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 bg-[#4A154B] hover:bg-[#3d1040] text-white px-6 py-3.5 rounded-xl font-semibold text-[15px] transition-colors shadow-lg shadow-[#4A154B]/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
            Get started free
          </Link>
        </div>
      </section>

      {/* Privacy strip */}
      <section className="border-t border-gray-100 bg-white/50">
        <div className="max-w-[760px] mx-auto px-5 py-10 text-center">
          <p className="text-[13px] font-semibold text-[#1a1a2e] mb-2">Privacy first</p>
          <p className="text-[13px] text-gray-500 leading-relaxed max-w-[520px] mx-auto">
            Reattend reads only the channels you select. We never read DMs, never post without your action,
            and never sell your data. Read our{' '}
            <Link href="/privacy#third-party-integrations" className="text-[#4F46E5] hover:underline">
              full data policy for integrations
            </Link>.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
