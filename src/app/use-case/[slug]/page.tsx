import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Scale,
  UserPlus,
  Globe,
  ArrowRightLeft,
  BookOpen,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { USE_CASES, getUseCaseBySlug } from '@/lib/use-cases/data'
import { USE_CASE_CONTENT } from '@/lib/use-cases/content'

const ICON_MAP: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare className="w-7 h-7" />,
  Scale: <Scale className="w-7 h-7" />,
  UserPlus: <UserPlus className="w-7 h-7" />,
  Globe: <Globe className="w-7 h-7" />,
  ArrowRightLeft: <ArrowRightLeft className="w-7 h-7" />,
  BookOpen: <BookOpen className="w-7 h-7" />,
}

export function generateStaticParams() {
  return USE_CASES.map(u => ({ slug: u.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const uc = getUseCaseBySlug(params.slug)
  if (!uc) return {}
  return {
    title: `${uc.title} - Reattend Use Cases`,
    description: uc.description,
    openGraph: {
      title: `${uc.title} - Reattend`,
      description: uc.description,
      url: `https://reattend.com/use-case/${uc.slug}`,
    },
    alternates: { canonical: `https://reattend.com/use-case/${uc.slug}` },
  }
}

export default function UseCasePage({ params }: { params: { slug: string } }) {
  const uc = getUseCaseBySlug(params.slug)
  if (!uc) notFound()

  const content = USE_CASE_CONTENT[params.slug]
  const otherCases = USE_CASES.filter(u => u.slug !== params.slug)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${uc.title} - Reattend`,
    description: uc.description,
    url: `https://reattend.com/use-case/${uc.slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Reattend',
      url: 'https://reattend.com',
    },
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 to-[#818CF8]/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#818CF8]/6 to-[#C084FC]/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[900px] mx-auto px-5 pt-12 pb-24">
        {/* Back link */}
        <Link
          href="/use-case"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-[#4F46E5] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All use cases
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center shrink-0">
              {ICON_MAP[uc.icon]}
            </div>
            <span className="text-[12px] font-semibold text-[#4F46E5] bg-[#4F46E5]/10 px-3 py-1 rounded-full">
              Use Case
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[38px] font-bold tracking-[-0.02em] text-[#1a1a2e] mb-4 leading-tight">
            {uc.headline}
          </h1>
          <p className="text-[16px] text-gray-500 leading-relaxed max-w-[640px]">
            {uc.description}
          </p>
        </header>

        {/* Key benefits */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 mb-6">
          <h2 className="text-[13px] font-semibold text-[#1a1a2e] uppercase tracking-wider mb-4">Key benefits</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {uc.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4F46E5] mt-0.5 shrink-0" />
                <span className="text-[14px] text-gray-600">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Article body */}
        <article className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7 sm:p-10">
          {content || (
            <p className="text-[14px] text-gray-400">This content is coming soon.</p>
          )}
        </article>

        {/* CTA */}
        <div className="mt-10 rounded-2xl bg-[#0B0B0F] p-8 text-center text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/20 via-transparent to-[#818CF8]/10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-[20px] font-bold mb-2">Stop losing your team's knowledge</h2>
            <p className="text-[14px] text-white/70 mb-5 max-w-md mx-auto">
              Reattend captures, organizes, and connects your team's knowledge with AI. Free forever to get started.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-[#4F46E5] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-white/90 transition-colors"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Other use cases */}
        <div className="mt-10">
          <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-4">Explore other use cases</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {otherCases.slice(0, 4).map(other => (
              <Link
                key={other.slug}
                href={`/use-case/${other.slug}`}
                className="group rounded-xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-4 hover:shadow-[0_4px_20px_rgba(79,70,229,0.08)] hover:border-[#4F46E5]/20 transition-all"
              >
                <span className="text-[14px] font-semibold text-[#1a1a2e] group-hover:text-[#4F46E5] transition-colors leading-snug block mb-1">
                  {other.title}
                </span>
                <span className="text-[13px] text-gray-400 line-clamp-2">
                  {other.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </div>
  )
}
