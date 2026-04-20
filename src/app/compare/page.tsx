import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { COMPETITORS } from '@/lib/compare/data'

export const metadata: Metadata = {
  title: 'Compare Reattend - How We Stack Up Against Alternatives',
  description:
    'See how Reattend compares to Notion, Confluence, Obsidian, Roam Research, Mem, Slite, Microsoft Loop, and Coda. Feature-by-feature comparisons.',
  openGraph: {
    title: 'Compare Reattend - How We Stack Up',
    description: 'Feature-by-feature comparisons of Reattend vs popular knowledge management tools.',
    url: 'https://reattend.com/compare',
  },
  alternates: { canonical: 'https://reattend.com/compare' },
}

const compareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Compare Reattend',
  description: 'Feature-by-feature comparisons of Reattend vs popular knowledge management tools.',
  url: 'https://reattend.com/compare',
  publisher: {
    '@type': 'Organization',
    name: 'Reattend',
    url: 'https://reattend.com',
  },
}

export default function CompareIndexPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 to-[#818CF8]/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#818CF8]/6 to-[#C084FC]/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[1100px] mx-auto px-5 pt-16 pb-24">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#4F46E5] bg-[#4F46E5]/8 px-4 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Comparisons
          </div>
          <h1 className="text-[36px] sm:text-[48px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-4">
            How Reattend compares
          </h1>
          <p className="text-[16px] text-gray-500 max-w-xl mx-auto leading-relaxed">
            Reattend is the AI memory platform for teams. See how it stacks up against popular knowledge management and note-taking tools.
          </p>
        </div>

        {/* Comparison cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMPETITORS.map(c => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="group rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6 hover:shadow-[0_8px_32px_rgba(79,70,229,0.1)] hover:border-[#4F46E5]/20 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-[#1a1a2e] group-hover:text-[#4F46E5] transition-colors">
                  Reattend vs {c.name}
                </h2>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#4F46E5] transition-colors shrink-0" />
              </div>
              <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
                {c.description}
              </p>
              <p className="text-[11px] text-gray-400">
                {c.features.length} features compared
              </p>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl bg-[#0B0B0F] p-10 text-center text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/20 via-transparent to-[#818CF8]/10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-[22px] font-bold mb-2">Ready to see Reattend in action?</h2>
            <p className="text-[14px] text-white/70 mb-6 max-w-md mx-auto">
              Free forever. No credit card required. Connect your first integration in minutes.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-[#4F46E5] font-semibold text-[14px] px-7 py-3 rounded-full hover:bg-white/90 transition-colors shadow-[0_4px_14px_rgba(255,255,255,0.15)]"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(compareJsonLd) }}
      />
    </div>
  )
}
