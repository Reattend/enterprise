import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, FileText, Wrench, Link2 } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { getAllGlossaryTerms, getGlossaryTermBySlug } from '@/lib/glossary/data'

export function generateStaticParams() {
  return getAllGlossaryTerms().map(t => ({ slug: t.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const term = getGlossaryTermBySlug(params.slug)
  if (!term) return {}
  return {
    title: `${term.term} - Definition | Reattend Glossary`,
    description: term.definition,
    openGraph: {
      title: `${term.term} - Definition | Reattend Glossary`,
      description: term.definition,
      url: `https://reattend.com/glossary/${term.slug}`,
    },
    alternates: { canonical: `https://reattend.com/glossary/${term.slug}` },
  }
}

export default function GlossaryTermPage({ params }: { params: { slug: string } }) {
  const term = getGlossaryTermBySlug(params.slug)
  if (!term) notFound()

  const allTerms = getAllGlossaryTerms()
  const relatedTermObjects = term.relatedTerms
    .map(slug => allTerms.find(t => t.slug === slug))
    .filter(Boolean)

  const termJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.term,
    description: term.definition,
    url: `https://reattend.com/glossary/${term.slug}`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Reattend Glossary',
      url: 'https://reattend.com/glossary',
    },
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />

      <main className="relative py-16 md:py-24 px-5 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-[720px] mx-auto">
          {/* Back link */}
          <Link
            href="/glossary"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4F46E5] transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All glossary terms
          </Link>

          {/* Header */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-5">
              <BookOpen className="w-3.5 h-3.5" />
              Glossary
            </span>
            <h1 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.03em] leading-[1.15]">
              {term.term}
            </h1>
          </div>

          {/* Definition card */}
          <div className="rounded-2xl bg-[#4F46E5]/[0.04] border border-[#4F46E5]/15 p-6 mb-10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4 text-[#4F46E5]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4F46E5] mb-1.5">
                  Definition
                </p>
                <p className="text-[15px] text-[#1a1a2e] leading-relaxed font-medium">
                  {term.definition}
                </p>
              </div>
            </div>
          </div>

          {/* Long description */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] p-8 md:p-10 mb-10">
            <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">
              What is {term.term}?
            </h2>
            <div className="space-y-4">
              {term.description.map((paragraph, i) => (
                <p key={i} className="text-[15px] text-gray-600 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Related concepts */}
          {relatedTermObjects.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="w-4.5 h-4.5 text-[#4F46E5]" />
                <h2 className="text-[18px] font-bold text-[#1a1a2e]">Related concepts</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {relatedTermObjects.map(related => (
                  <Link
                    key={related!.slug}
                    href={`/glossary/${related!.slug}`}
                    className="group rounded-xl bg-white/60 backdrop-blur-xl border border-white/80 p-4 hover:shadow-[0_4px_20px_rgba(79,70,229,0.06)] transition-all"
                  >
                    <p className="text-[14px] font-semibold text-[#1a1a2e] group-hover:text-[#4F46E5] transition-colors mb-1">
                      {related!.term}
                    </p>
                    <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                      {related!.definition}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Learn more (blog links) */}
          {term.relatedBlog.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4.5 h-4.5 text-[#4F46E5]" />
                <h2 className="text-[18px] font-bold text-[#1a1a2e]">Learn more</h2>
              </div>
              <div className="space-y-3">
                {term.relatedBlog.map(blog => (
                  <Link
                    key={blog.slug}
                    href={`/blog/${blog.slug}`}
                    className="group flex items-center justify-between rounded-xl bg-white/60 backdrop-blur-xl border border-white/80 px-5 py-3.5 hover:shadow-[0_4px_20px_rgba(79,70,229,0.06)] transition-all"
                  >
                    <span className="text-[14px] font-medium text-[#1a1a2e] group-hover:text-[#4F46E5] transition-colors">
                      {blog.title}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#4F46E5] transition-colors shrink-0 ml-3" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Try it (tool links) */}
          {term.relatedTools.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-4.5 h-4.5 text-[#4F46E5]" />
                <h2 className="text-[18px] font-bold text-[#1a1a2e]">Try it</h2>
              </div>
              <div className="space-y-3">
                {term.relatedTools.map(tool => (
                  <Link
                    key={tool.path}
                    href={tool.path}
                    className="group flex items-center justify-between rounded-xl bg-[#4F46E5]/[0.04] border border-[#4F46E5]/15 px-5 py-3.5 hover:bg-[#4F46E5]/[0.07] transition-all"
                  >
                    <span className="text-[14px] font-medium text-[#4F46E5]">
                      {tool.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#4F46E5] shrink-0 ml-3" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-8 text-center text-white">
            <h2 className="text-lg font-bold mb-2">Stop losing your team&apos;s knowledge</h2>
            <p className="text-sm text-white/80 mb-5 max-w-md mx-auto">
              Reattend captures, organizes, and connects your team&apos;s knowledge with AI.
              Free to get started.
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termJsonLd) }}
      />
    </div>
  )
}
