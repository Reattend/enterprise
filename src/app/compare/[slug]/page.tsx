import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Check, X, ArrowRight, ChevronRight, Sparkles } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { COMPETITORS, getCompetitorBySlug } from '@/lib/compare/data'

export function generateStaticParams() {
  return COMPETITORS.map(c => ({ slug: c.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const comp = getCompetitorBySlug(params.slug)
  if (!comp) return {}
  return {
    title: `${comp.tagline} | Reattend`,
    description: comp.description,
    openGraph: {
      title: comp.tagline,
      description: comp.description,
      url: `https://reattend.com/compare/${comp.slug}`,
    },
    alternates: { canonical: `https://reattend.com/compare/${comp.slug}` },
  }
}

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border border-gray-200">
        <X className="w-3.5 h-3.5 text-gray-400" />
      </span>
    )
  }
  return (
    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
      {value}
    </span>
  )
}

export default function ComparePage({ params }: { params: { slug: string } }) {
  const comp = getCompetitorBySlug(params.slug)
  if (!comp) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: comp.tagline,
    description: comp.description,
    url: `https://reattend.com/compare/${comp.slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Reattend',
      url: 'https://reattend.com',
    },
  }

  const otherComparisons = COMPETITORS.filter(c => c.slug !== comp.slug)

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 to-[#818CF8]/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#818CF8]/6 to-[#C084FC]/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[1000px] mx-auto px-5 pt-12 pb-24">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-[13px] text-gray-400 mb-8 flex-wrap">
          <Link href="/" className="hover:text-[#4F46E5] transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <Link href="/compare" className="hover:text-[#4F46E5] transition-colors">Compare</Link>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <span className="text-[#1a1a2e] font-medium">vs {comp.name}</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#4F46E5] bg-[#4F46E5]/8 px-4 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Comparison
          </div>
          <h1 className="text-[32px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-4">
            Reattend vs {comp.name}
          </h1>
          <p className="text-[16px] text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {comp.description}
          </p>
        </div>

        {/* Feature comparison table */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-[16px] font-semibold text-[#1a1a2e]">Feature comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Feature
                  </th>
                  <th className="text-center text-[11px] font-semibold text-[#4F46E5] uppercase tracking-wider px-4 py-3 w-[140px]">
                    Reattend
                  </th>
                  <th className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 w-[140px]">
                    {comp.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comp.features.map((f, i) => (
                  <tr
                    key={f.name}
                    className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white/50' : ''}`}
                  >
                    <td className="text-[14px] text-[#1a1a2e] px-6 py-3">{f.name}</td>
                    <td className="text-center px-4 py-3">
                      <div className="flex justify-center">
                        <FeatureCell value={f.reattend} />
                      </div>
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex justify-center">
                        <FeatureCell value={f.competitor} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Wins sections */}
        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6">
            <h3 className="text-[13px] font-semibold text-[#4F46E5] uppercase tracking-wider mb-4">Where Reattend shines</h3>
            <ul className="space-y-3">
              {comp.reattendWins.map(w => (
                <li key={w} className="flex gap-2.5 text-[14px] text-[#1a1a2e]">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6">
            <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Where {comp.name} shines</h3>
            <ul className="space-y-3">
              {comp.competitorWins.map(w => (
                <li key={w} className="flex gap-2.5 text-[14px] text-[#1a1a2e]">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Best for */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6 mb-8">
          <h2 className="text-[16px] font-semibold text-[#1a1a2e] mb-6">Who should use what?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] font-semibold text-[#4F46E5] uppercase tracking-wider mb-2">
                Choose Reattend if...
              </div>
              <p className="text-[14px] text-gray-500 leading-relaxed">{comp.bestFor.reattend}</p>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Choose {comp.name} if...
              </div>
              <p className="text-[14px] text-gray-500 leading-relaxed">{comp.bestFor.competitor}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-[#0B0B0F] p-8 text-center text-white mb-12 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/20 via-transparent to-[#818CF8]/10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-[20px] font-bold mb-2">Ready to try Reattend?</h2>
            <p className="text-[14px] text-white/70 mb-5 max-w-md mx-auto">
              Start capturing and connecting your team&apos;s knowledge with AI. Free forever, no credit card required.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-[#4F46E5] font-semibold text-[14px] px-7 py-3 rounded-full hover:bg-white/90 transition-colors"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Other comparisons */}
        {otherComparisons.length > 0 && (
          <div>
            <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-4">Other comparisons</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {otherComparisons.map(c => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.03)] px-5 py-3.5 hover:shadow-[0_4px_20px_rgba(79,70,229,0.08)] hover:border-[#4F46E5]/20 transition-all group"
                >
                  <span className="text-[13px] font-medium text-[#1a1a2e] group-hover:text-[#4F46E5] transition-colors">
                    Reattend vs {c.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#4F46E5] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
