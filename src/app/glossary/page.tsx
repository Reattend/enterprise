import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { getAllGlossaryTerms } from '@/lib/glossary/data'

export const metadata: Metadata = {
  title: 'Glossary | Team Knowledge & Decision Intelligence Terms',
  description:
    'Definitions for concepts in team knowledge management, decision intelligence, and organizational memory. Learn about meeting debt, decision decay, tribal knowledge, and more.',
  openGraph: {
    title: 'Glossary | Team Knowledge & Decision Intelligence Terms',
    description:
      'Definitions for concepts in team knowledge management, decision intelligence, and organizational memory.',
    url: 'https://reattend.com/glossary',
  },
  alternates: { canonical: 'https://reattend.com/glossary' },
}

export default function GlossaryPage() {
  const terms = getAllGlossaryTerms()

  const glossaryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Reattend Glossary',
    description:
      'Definitions for concepts in team knowledge management, decision intelligence, and organizational memory.',
    url: 'https://reattend.com/glossary',
    hasDefinedTerm: terms.map(term => ({
      '@type': 'DefinedTerm',
      name: term.term,
      description: term.definition,
      url: `https://reattend.com/glossary/${term.slug}`,
    })),
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />

      <main className="relative py-16 md:py-24 px-5 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-[900px] mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5]">
              <BookOpen className="w-3.5 h-3.5" />
              Glossary
            </span>
            <h1 className="text-[32px] md:text-[46px] font-bold tracking-[-0.03em] leading-[1.1] mt-5">
              Glossary of Team <span className="text-[#4F46E5]">Knowledge Terms</span>
            </h1>
            <p className="text-gray-500 text-[15px] mt-4 max-w-lg mx-auto leading-relaxed">
              Definitions for concepts in team knowledge management, decision intelligence, and organizational memory.
            </p>
          </div>

          {/* Terms grid */}
          <div className="grid md:grid-cols-2 gap-5">
            {terms.map(term => (
              <Link
                key={term.slug}
                href={`/glossary/${term.slug}`}
                className="group rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 p-6 hover:shadow-[0_8px_32px_rgba(79,70,229,0.08)] transition-all flex flex-col"
              >
                <h2 className="text-[17px] font-bold text-[#1a1a2e] group-hover:text-[#4F46E5] transition-colors mb-2.5">
                  {term.term}
                </h2>
                <p className="text-[14px] text-gray-600 leading-relaxed flex-1 line-clamp-3">
                  {term.definition}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4F46E5] mt-4">
                  Read definition <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-8 text-center text-white">
            <h2 className="text-lg font-bold mb-2">Turn these concepts into action</h2>
            <p className="text-sm text-white/80 mb-5 max-w-md mx-auto">
              Reattend helps your team capture decisions, preserve context, and build lasting institutional memory with AI.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-[#4F46E5] font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-white/90 transition-colors"
            >
              Try Reattend free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glossaryJsonLd) }}
      />
    </div>
  )
}
