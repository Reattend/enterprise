import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import {
  ArrowRight,
  MessageSquare,
  Scale,
  UserPlus,
  Globe,
  ArrowRightLeft,
  BookOpen,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { USE_CASES } from '@/lib/use-cases/data'

export const metadata: Metadata = {
  title: 'Use Cases - Reattend',
  description:
    'See how teams use Reattend for decision tracking, contradiction detection, onboarding, remote context, project handoffs, and knowledge management.',
  openGraph: {
    title: 'Reattend Use Cases',
    description:
      'See how teams use Reattend for decision tracking, contradiction detection, onboarding, and more.',
    url: 'https://reattend.com/use-case',
  },
  alternates: { canonical: 'https://reattend.com/use-case' },
}

const ICON_MAP: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare className="w-6 h-6" />,
  Scale: <Scale className="w-6 h-6" />,
  UserPlus: <UserPlus className="w-6 h-6" />,
  Globe: <Globe className="w-6 h-6" />,
  ArrowRightLeft: <ArrowRightLeft className="w-6 h-6" />,
  BookOpen: <BookOpen className="w-6 h-6" />,
}

const useCaseJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Reattend Use Cases',
  description:
    'See how teams use Reattend for decision tracking, contradiction detection, onboarding, remote context, project handoffs, and knowledge management.',
  url: 'https://reattend.com/use-case',
  publisher: {
    '@type': 'Organization',
    name: 'Reattend',
    url: 'https://reattend.com',
  },
}

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 to-[#818CF8]/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#818CF8]/6 to-[#C084FC]/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[1100px] mx-auto px-5 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-[#4F46E5]/8 text-[#4F46E5] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-5">
            Use Cases
          </div>
          <h1 className="text-[36px] sm:text-[48px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-4">
            Built for how teams actually work
          </h1>
          <p className="text-[16px] text-gray-500 max-w-lg mx-auto leading-relaxed">
            See how teams use Reattend to track decisions, preserve context, and never lose knowledge again.
          </p>
        </div>

        {/* Use case cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {USE_CASES.map(uc => (
            <Link
              key={uc.slug}
              href={`/use-case/${uc.slug}`}
              className="group rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 hover:shadow-[0_8px_32px_rgba(79,70,229,0.1)] hover:border-[#4F46E5]/20 transition-all flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center shrink-0">
                  {ICON_MAP[uc.icon]}
                </div>
                <h2 className="text-[15px] font-semibold text-[#1a1a2e] group-hover:text-[#4F46E5] transition-colors">
                  {uc.title}
                </h2>
              </div>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-5 flex-1">
                {uc.description}
              </p>
              <div className="flex items-center justify-between">
                <ul className="flex flex-wrap gap-1.5">
                  {uc.benefits.slice(0, 2).map((b, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-[#4F46E5]/70 bg-[#4F46E5]/6 px-2 py-0.5 rounded-full"
                    >
                      {b.length > 40 ? b.slice(0, 37) + '...' : b}
                    </li>
                  ))}
                </ul>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#4F46E5] transition-colors shrink-0 ml-2" />
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-[#0B0B0F] p-10 text-center text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/20 via-transparent to-[#818CF8]/10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-[22px] font-bold mb-2">Ready to stop re-deciding?</h2>
            <p className="text-[14px] text-white/70 mb-6 max-w-md mx-auto">
              Reattend captures every decision, catches contradictions, and makes your team's knowledge searchable. Free forever to get started.
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(useCaseJsonLd) }}
      />
    </div>
  )
}
